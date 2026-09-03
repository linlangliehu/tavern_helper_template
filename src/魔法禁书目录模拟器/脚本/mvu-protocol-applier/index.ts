import * as protocolNormalizer from './protocol-normalizer.js';
const { reconstructUpdateVariableFromSummary } = protocolNormalizer;
import {
  createDebouncedSingleFlight,
  createObjectKeyedSingleFlight,
  runProtocolApplicationController,
  selectFalselyAppliedRepairIndexes,
} from './falsely-applied-controller';
import { applyRawProtocolToMvuData, isFalselyAppliedStat } from './raw-status-writer';
import { registerMfrsRuntimeBuild } from '../_runtime_identity';

registerMfrsRuntimeBuild('mvu-protocol-applier');

/**
 * Hotfix: 注册 MVU 和自动更新的 GENERATION_ENDED 监听器
 *
 * 根因：MagVarUpdate bundle 和自动更新逻辑没有注册 GENERATION_ENDED 监听器，
 * 导致 AI 生成完成后 MVU 未消费 <UpdateVariable> 块，数据库未自动填表。
 *
 * 修复方案：
 * 1. 监听 GENERATION_ENDED 事件
 * 2. 触发 MVU 解析当前消息的 <UpdateVariable> 块
 * 3. 触发数据库自动更新逻辑
 * 4. 清洗 mes 字段：
 *    - 整段删除 <UpdateVariable> 和 <choices>（纯内部协议）
 *    - 整段删除 <sp_*> / <mfrs_*> 旧文本面板（保留开局/输入交互面板）
 *    - raw 协议写入 extra._mfrs_raw_protocol_message 供 UI/MVU 读取
 */

type MvuData = Record<string, unknown> & {
  stat_data?: Record<string, unknown>;
};

type MessageVariableOption = {
  type: 'message';
  message_id: number | 'latest';
};

type ChatMessage = {
  mes?: string;
  message_id?: number;
  is_user?: boolean;
  swipe_id?: number;
  swipes?: string[];
  extra?: Record<string, unknown>;
  variables?: Record<string, unknown>[] | Record<string, unknown>;
};

const { normalizeMfrsUpdateVariableProtocol } = protocolNormalizer as {
  normalizeMfrsUpdateVariableProtocol: (message: string) => {
    message: string;
    changed: boolean;
    stats: {
      blocks: number;
      legacyWrapped: number;
      addToInsert: number;
      addToReplace: number;
      skipped: number;
    };
  };
};

const RAW_PROTOCOL_EXTRA_KEY = '_mfrs_raw_protocol_message';
const RAW_PROTOCOL_APPLIED_HASH_KEY = '_mfrs_raw_protocol_applied_hash';
const RAW_PROTOCOL_APPLIED_AT_KEY = '_mfrs_raw_protocol_applied_at';
let runProtocolApplicationSingleFlight = createObjectKeyedSingleFlight<ChatMessage, string, boolean>();
let hotfixEpoch = 0;
let installScanTimer: ReturnType<typeof window.setTimeout> | undefined;
let periodicSweepTimer: ReturnType<typeof window.setInterval> | undefined;
const hotfixRetryTimers = new Set<ReturnType<typeof window.setTimeout>>();

function scheduleHotfixRetry(callback: () => void, delay: number, epoch = hotfixEpoch) {
  let timer: ReturnType<typeof window.setTimeout>;
  timer = window.setTimeout(() => {
    hotfixRetryTimers.delete(timer);
    if (epoch !== hotfixEpoch) return;
    callback();
  }, delay);
  hotfixRetryTimers.add(timer);
  return timer;
}

type HostWindow = Window & {
  SillyTavern?: {
    getContext?: () => {
      eventSource?: {
        on?: (event: string, handler: (...args: unknown[]) => void) => void;
        off?: (event: string, handler: (...args: unknown[]) => void) => void;
        removeListener?: (event: string, handler: (...args: unknown[]) => void) => void;
        emit?: (event: string, ...args: unknown[]) => void;
        events?: Record<string, unknown[]>;
      };
      chat?: ChatMessage[];
      saveChat?: () => unknown | Promise<unknown>;
      deleteLastMessage?: () => unknown | Promise<unknown>;
      characterId?: string | number;
      event_types?: Record<string, string>;
      activateSendButtons?: () => void;
      deactivateSendButtons?: () => void;
      stopGeneration?: () => void;
    };
  };
  toastr?: {
    warning?: (message: string, title?: string, options?: Record<string, unknown>) => void;
    info?: (message: string, title?: string, options?: Record<string, unknown>) => void;
  };
  Mvu?: {
    parseMessage?: (message: string, oldData: MvuData) => Promise<MvuData | undefined>;
    getMvuData?: (options: MessageVariableOption) => MvuData;
    replaceMvuData?: (mvuData: MvuData, options: MessageVariableOption) => Promise<void>;
  };
  AutoCardUpdaterAPI?: {
    updateCell?: (...args: unknown[]) => unknown;
    insertRow?: (...args: unknown[]) => unknown;
    deleteRow?: (...args: unknown[]) => unknown;
    refreshDataAndWorldbook?: () => unknown | Promise<unknown>;
  };
  eventSource?: {
    on?: (event: string, handler: (...args: unknown[]) => void) => void;
    off?: (event: string, handler: (...args: unknown[]) => void) => void;
    removeListener?: (event: string, handler: (...args: unknown[]) => void) => void;
    emit?: (event: string, ...args: unknown[]) => void;
    events?: Record<string, unknown[]>;
  };
  eventOn?: (event: string, handler: (...args: unknown[]) => void) => void;
  __mfrsHotfixInstalled__?: boolean;
  __mfrsHotfixCleanup__?: () => void;
  tavern_events?: Record<string, string>;
  getVariables?: (options: MessageVariableOption) => Record<string, unknown>;
  updateVariablesWith?: (
    updater: (variables: Record<string, unknown>) => Record<string, unknown>,
    options: MessageVariableOption,
  ) => Record<string, unknown> | Promise<Record<string, unknown>>;
  TavernHelper?: {
    getVariables?: (options: MessageVariableOption) => Record<string, unknown>;
    updateVariablesWith?: (
      updater: (variables: Record<string, unknown>) => Record<string, unknown>,
      options: MessageVariableOption,
    ) => Record<string, unknown> | Promise<Record<string, unknown>>;
  };
  MagicIndexMessagePanel?: {
    refreshMessage?: (messageId: number | string) => void;
  };
  parent?: Window;
};

function getHostWindow(): HostWindow {
  try {
    return (window.parent ?? window) as HostWindow;
  } catch {
    return window as HostWindow;
  }
}

/**
 * 安全读取跨窗口属性。
 *
 * 酒馆助手给脚本 iframe 注入的 `SillyTavern` / `Mvu` 是 throwing getter：
 * getter 内部会立即解引用 `window.parent.SillyTavern` 并调用 `getContext()`，
 * 因此宿主未就绪时**读属性本身**就抛 TypeError，`?.` 与后置 try 都拦不住。
 * 所有跨窗口读取都必须经由本函数。
 */
function safeRead<T>(read: () => T): T | undefined {
  try {
    return read();
  } catch {
    return undefined;
  }
}

function getSillyTavernContext(hostWindow: HostWindow) {
  const localWindow = window as HostWindow;
  const candidates = [
    safeRead(() => hostWindow.SillyTavern),
    safeRead(() => localWindow.SillyTavern),
    safeRead(() => (hostWindow.parent as HostWindow | undefined)?.SillyTavern),
  ];
  for (const st of candidates) {
    const context = safeRead(() => st?.getContext?.());
    if (context) return context;
  }
  return null;
}

function getEventSource(hostWindow: HostWindow) {
  const context = getSillyTavernContext(hostWindow);
  if (context?.eventSource) return context.eventSource;

  // Fallback: 尝试 window.eventSource
  return hostWindow.eventSource;
}

function getMvuApi(hostWindow: HostWindow) {
  const localWindow = window as HostWindow;
  return safeRead(() => hostWindow.Mvu) ?? safeRead(() => localWindow.Mvu);
}

function getRuntimeFunction<K extends 'getVariables' | 'updateVariablesWith'>(hostWindow: HostWindow, key: K) {
  const localWindow = window as HostWindow;
  return (
    safeRead(() => hostWindow[key]) ??
    safeRead(() => hostWindow.TavernHelper?.[key]) ??
    safeRead(() => localWindow[key]) ??
    safeRead(() => localWindow.TavernHelper?.[key])
  );
}

function getTavernEventName(
  hostWindow: HostWindow,
  key: 'MESSAGE_RECEIVED' | 'GENERATION_ENDED' | 'GENERATION_STOPPED' | 'CHAT_CHANGED',
  fallback: string,
) {
  const context = getSillyTavernContext(hostWindow);
  const fromContext = context?.event_types?.[key];
  if (typeof fromContext === 'string' && fromContext) return fromContext;

  const fromHost = safeRead(() => hostWindow.tavern_events?.[key]);
  if (typeof fromHost === 'string' && fromHost) return fromHost;

  const localWindow = window as HostWindow;
  const fromLocal = safeRead(() => localWindow.tavern_events?.[key]);
  if (typeof fromLocal === 'string' && fromLocal) return fromLocal;

  return fallback;
}

function getMessageVariableId(message: { message_id?: number } | undefined, fallbackIndex: number) {
  return typeof message?.message_id === 'number' ? message.message_id : fallbackIndex;
}

function getMessageSwipeId(message: { swipe_id?: number } | undefined) {
  const swipeId = Number(message?.swipe_id ?? 0);
  return Number.isInteger(swipeId) && swipeId >= 0 ? swipeId : 0;
}

function resolveMessageIndex(
  chat: NonNullable<ReturnType<typeof getSillyTavernContext>>['chat'],
  eventMessageId?: unknown,
) {
  if (!chat || chat.length === 0) return -1;

  if (typeof eventMessageId === 'number' && Number.isFinite(eventMessageId)) {
    const byMessageId = chat.findIndex(message => message?.message_id === eventMessageId);
    if (byMessageId >= 0) return byMessageId;
    if (eventMessageId >= 0 && eventMessageId < chat.length) return eventMessageId;
  }

  for (let index = chat.length - 1; index >= 0; index -= 1) {
    if (!chat[index]?.is_user) return index;
  }
  return chat.length - 1;
}

function hasInternalProtocol(message: string) {
  // <choices> 计为内部协议（与 cleanProtocolBlocks 剥离自洽）；hotfix-05 回滚 hotfix-03 显示层升级
  return /<UpdateVariable\b|<choices\b/i.test(message);
}

/**
 * GENERATION_ENDED 偶发在真实回复后追加一个空 AI 楼层。事件若指向该空楼，
 * 通用 resolveMessageIndex 会错过前一楼的协议，导致变量虽被其它链路写入，
 * 但 raw 快照和 mes 清洗永久遗漏。仅当当前候选是空 AI 且紧邻前一楼含协议时回退，
 * 避免在普通无协议回复中误扫更早的历史协议。
 */
function resolveProtocolMessageIndex(
  chat: NonNullable<ReturnType<typeof getSillyTavernContext>>['chat'],
  eventMessageId?: unknown,
) {
  const candidateIndex = resolveMessageIndex(chat, eventMessageId);
  if (!chat || candidateIndex < 0) return -1;

  const candidate = chat[candidateIndex];
  if (hasInternalProtocol(readMessageTextForMvu(candidate))) return candidateIndex;

  if (candidate && !candidate.is_user && !messageHasDisplayableContent(candidate)) {
    const previousIndex = candidateIndex - 1;
    const previous = chat[previousIndex];
    if (previous && !previous.is_user && hasInternalProtocol(readMessageTextForMvu(previous))) {
      return previousIndex;
    }
  }

  return candidateIndex;
}

/** 稳定、轻量的 FNV-1a 指纹；同一 swipe 的同一协议只能应用一次。 */
function fingerprintProtocol(message: string) {
  let hash = 0x811c9dc5;
  for (let index = 0; index < message.length; index += 1) {
    hash ^= message.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

function getProtocolApplicationKey(message: ChatMessage, normalizedMessage: string) {
  return `${getMessageSwipeId(message)}:${fingerprintProtocol(normalizedMessage)}`;
}

function cloneMvuData(data: MvuData): MvuData {
  try {
    return JSON.parse(JSON.stringify(data || {})) as MvuData;
  } catch {
    return { ...(data || {}) };
  }
}

/** MagVar replace/set 要求路径已存在；旧档/initvar 常缺这些键，需在 parseMessage 前补种。 */

function hasOwn(obj: Record<string, unknown>, key: string) {
  return Object.prototype.hasOwnProperty.call(obj, key);
}

function seedIfMissing(stat: Record<string, unknown>, key: string, value: unknown): boolean {
  if (hasOwn(stat, key)) return false;
  stat[key] = value;
  return true;
}

function seedMissingStatPaths(data: MvuData): MvuData {
  const next = cloneMvuData(data);
  if (!next.stat_data || typeof next.stat_data !== 'object' || Array.isArray(next.stat_data)) {
    next.stat_data = {};
  }
  const stat = next.stat_data as Record<string, unknown>;
  let seeded = false;

  seeded = seedIfMissing(stat, '在场人物', []) || seeded;
  seeded = seedIfMissing(stat, '世界线记录', []) || seeded;
  seeded = seedIfMissing(stat, '任务追踪', []) || seeded;
  seeded = seedIfMissing(stat, 'NPC关系', []) || seeded;

  if (!hasOwn(stat, '物品') || typeof stat['物品'] !== 'object' || Array.isArray(stat['物品'])) {
    stat['物品'] = { 持有物: [], 资金: '未知', 其他资源: [] };
    seeded = true;
  } else {
    const res = stat['物品'] as Record<string, unknown>;
    seeded = seedIfMissing(res, '持有物', []) || seeded;
    seeded = seedIfMissing(res, '资金', '未知') || seeded;
    seeded = seedIfMissing(res, '其他资源', []) || seeded;
  }


  if (!hasOwn(stat, '势力关系') || typeof stat['势力关系'] !== 'object' || Array.isArray(stat['势力关系'])) {
    stat['势力关系'] = {
      所属阵营: '',
      所属组织: '',
      联系人: [],
      敌对势力: [],
      可调用资源: [],
    };
    seeded = true;
  } else {
    const force = stat['势力关系'] as Record<string, unknown>;
    seeded = seedIfMissing(force, '联系人', []) || seeded;
    seeded = seedIfMissing(force, '敌对势力', []) || seeded;
    seeded = seedIfMissing(force, '可调用资源', []) || seeded;
  }


  if (!hasOwn(stat, '主线进度') || typeof stat['主线进度'] !== 'object' || Array.isArray(stat['主线进度'])) {
    stat['主线进度'] = {
      当前阶段: '开局接入',
      阶段序号: 0,
      阶段状态: '未启动',
      已完成节点: [],
      可触发节点: [],
      偏移等级: 0,
      正史锚点: { 当前锚点: '自定义开局', 默认走向: '', 玩家偏移: [] },
      下一步推进提示: '',
    };
    seeded = true;
  } else {
    const progress = stat['主线进度'] as Record<string, unknown>;
    seeded = seedIfMissing(progress, '已完成节点', []) || seeded;
    seeded = seedIfMissing(progress, '可触发节点', []) || seeded;
    if (
      !hasOwn(progress, '正史锚点') ||
      typeof progress['正史锚点'] !== 'object' ||
      Array.isArray(progress['正史锚点'])
    ) {
      progress['正史锚点'] = { 当前锚点: '自定义开局', 默认走向: '', 玩家偏移: [] };
      seeded = true;
    } else {
      const anchor = progress['正史锚点'] as Record<string, unknown>;
      seeded = seedIfMissing(anchor, '玩家偏移', []) || seeded;
    }
  }


  if (seeded) {
    console.info('[Hotfix] 已补种缺失 MVU 路径', {
      hasPeople: hasOwn(stat, '在场人物'),
    });
  }
  return next;
}

function stringifyStatData(data: MvuData | undefined) {
  try {
    return JSON.stringify(data?.stat_data ?? {});
  } catch {
    return '';
  }
}

function hasSameStatData(actual: MvuData | undefined, expected: MvuData | undefined) {
  return stringifyStatData(actual) === stringifyStatData(expected);
}

function readMessageTextForMvu(message: { mes?: string; extra?: Record<string, unknown> } | undefined) {
  const rawProtocolMessage = message?.extra?.[RAW_PROTOCOL_EXTRA_KEY];
  if (typeof rawProtocolMessage === 'string' && hasInternalProtocol(rawProtocolMessage)) {
    return rawProtocolMessage;
  }
  return typeof message?.mes === 'string' ? message.mes : '';
}

function snapshotRawProtocolMessage(message: { mes?: string; extra?: Record<string, unknown> }) {
  if (!message.mes || !hasInternalProtocol(message.mes)) return false;
  message.extra = message.extra || {};
  if (typeof message.extra[RAW_PROTOCOL_EXTRA_KEY] !== 'string') {
    message.extra[RAW_PROTOCOL_EXTRA_KEY] = message.mes;
    return true;
  }
  return false;
}

function messageHasDisplayableContent(message: ChatMessage | undefined) {
  if (!message) return false;
  const mes = typeof message.mes === 'string' ? message.mes.trim() : '';
  if (mes) return true;
  const raw = message.extra?.[RAW_PROTOCOL_EXTRA_KEY];
  if (typeof raw === 'string' && raw.trim()) return true;
  return false;
}

function readOldMvuData(hostWindow: HostWindow, messageOption: MessageVariableOption): MvuData {
  const mvu = getMvuApi(hostWindow);
  try {
    const data = mvu?.getMvuData?.(messageOption);
    if (data && typeof data === 'object') return data;
  } catch (error) {
    console.debug('[Hotfix] Mvu.getMvuData 读取失败，回退 getVariables', error);
  }

  const getVariables = getRuntimeFunction(hostWindow, 'getVariables');
  try {
    const variables = getVariables?.(messageOption);
    if (variables && typeof variables === 'object') return variables as MvuData;
  } catch (error) {
    console.debug('[Hotfix] getVariables 读取失败，使用空 MVU 数据兜底', error);
  }

  return { initialized_lorebooks: {}, stat_data: {} };
}

async function replaceMvuData(hostWindow: HostWindow, data: MvuData, messageOption: MessageVariableOption) {
  const mvu = getMvuApi(hostWindow);
  if (typeof mvu?.replaceMvuData === 'function') {
    await mvu.replaceMvuData(data, messageOption);
    return 'Mvu.replaceMvuData';
  }

  const updateVariablesWith = getRuntimeFunction(hostWindow, 'updateVariablesWith');
  if (typeof updateVariablesWith === 'function') {
    await updateVariablesWith(() => data, messageOption);
    return 'updateVariablesWith';
  }

  throw new Error('Mvu.replaceMvuData / updateVariablesWith 均不可用');
}

function assignMessageVariablesDirectly(
  chat: ChatMessage[],
  messageIndex: number,
  expectedSwipeId: number,
  data: MvuData,
) {
  const message = chat[messageIndex];
  if (!message) return '';

  const clonedData = cloneMvuData(data);
  if (!message.variables) {
    const variables: Record<string, unknown>[] = [];
    variables[expectedSwipeId] = clonedData;
    message.variables = variables;
    return `chat.variables[${expectedSwipeId}]`;
  }

  if (Array.isArray(message.variables)) {
    message.variables[expectedSwipeId] = clonedData;
    return `chat.variables[${expectedSwipeId}]`;
  }

  if (expectedSwipeId !== 0) return '';
  message.variables = clonedData;
  return 'chat.variables';
}

function readMessageVariablesDirectly(
  chat: ChatMessage[],
  messageIndex: number,
  expectedSwipeId: number,
): MvuData | undefined {
  const message = chat[messageIndex];
  if (!message?.variables) return undefined;
  if (Array.isArray(message.variables)) return message.variables[expectedSwipeId] as MvuData | undefined;
  return expectedSwipeId === 0 ? message.variables as MvuData : undefined;
}

async function persistDirectMessageVariables(hostWindow: HostWindow, messageIndex: number) {
  const context = getSillyTavernContext(hostWindow);
  if (typeof context?.saveChat !== 'function') return false;

  try {
    await context.saveChat();
    return true;
  } catch (error) {
    console.warn('[Hotfix] 直接写入消息变量后保存聊天失败', { messageIndex, error });
    return false;
  }
}

async function writeMvuDataWithVerification(
  hostWindow: HostWindow,
  chat: ChatMessage[],
  messageIndex: number,
  expectedSwipeId: number,
  data: MvuData,
  messageOption: MessageVariableOption,
  isCurrentProtocol: () => boolean,
) {
  if (!isCurrentProtocol()) return { writer: '', verified: false, persisted: false };
  const primaryWriter = await replaceMvuData(hostWindow, data, messageOption);
  if (!isCurrentProtocol()) return { writer: primaryWriter, verified: false, persisted: false };
  let verified = hasSameStatData(readOldMvuData(hostWindow, messageOption), data);
  let directWriter = '';
  let persisted = false;

  if (!verified && isCurrentProtocol()) {
    directWriter = assignMessageVariablesDirectly(chat, messageIndex, expectedSwipeId, data);
    verified = hasSameStatData(readOldMvuData(hostWindow, messageOption), data);
    if (directWriter && isCurrentProtocol()) {
      persisted = await persistDirectMessageVariables(hostWindow, messageIndex);
      if (persisted && hasSameStatData(readMessageVariablesDirectly(chat, messageIndex, expectedSwipeId), data)) {
        verified = true;
      }
    }
  }

  return {
    writer: directWriter ? `${primaryWriter}+${directWriter}` : primaryWriter,
    verified,
    persisted,
  };
}

function refreshMessagePanel(hostWindow: HostWindow, messageId: number | string) {
  try {
    hostWindow.MagicIndexMessagePanel?.refreshMessage?.(messageId);
    window.setTimeout(() => hostWindow.MagicIndexMessagePanel?.refreshMessage?.(messageId), 250);
  } catch (error) {
    console.debug('[Hotfix] 消息内面板刷新失败，忽略并保留 MVU 写回结果', error);
  }
}

/**
 * 解析目标楼层的 <UpdateVariable> 协议并写回 MVU 变量。
 * 返回 true 表示写回未通过验证、需要延迟重试；返回 false 表示已写回或无需写回（不应重试）。
 * 重要：只有在 verified=false 时才应安排重试，否则 delta patch 会在每次重试时重复累积。
 */
async function parseAndWriteMvuMessage(
  messageIndex: number,
  eventMessageId?: unknown,
  entryEpoch = hotfixEpoch,
): Promise<boolean> {
  if (entryEpoch !== hotfixEpoch) return false;
  const hostWindow = getHostWindow();
  const context = getSillyTavernContext(hostWindow);
  const chat = context?.chat;
  if (!chat || messageIndex < 0 || messageIndex >= chat.length) return false;

  const message = chat[messageIndex];
  const rawMessage = readMessageTextForMvu(message);
  if (!rawMessage.trim() || !hasInternalProtocol(rawMessage)) {
    console.debug('[Hotfix] 最新 AI 消息无可解析协议块，跳过 MVU 解析', { messageIndex, eventMessageId });
    return false;
  }

  const messageOption: MessageVariableOption = {
    type: 'message',
    message_id: getMessageVariableId(message, messageIndex),
  };
  const normalized = normalizeMfrsUpdateVariableProtocol(rawMessage);
  const applicationKey = getProtocolApplicationKey(message, normalized.message);
  return runProtocolApplicationSingleFlight(message, applicationKey, async () => {
    const transactionEpoch = entryEpoch;
    const expectedSwipeId = getMessageSwipeId(message);
    const isCurrentProtocol = () => {
      if (transactionEpoch !== hotfixEpoch) return false;
      const latestContext = getSillyTavernContext(hostWindow);
      const latestMessage = latestContext?.chat?.[messageIndex];
      if (latestContext?.chat !== chat || latestMessage !== message || getMessageSwipeId(message) !== expectedSwipeId) {
        return false;
      }
      const latestRaw = readMessageTextForMvu(message);
      if (!latestRaw.trim() || !hasInternalProtocol(latestRaw)) return false;
      const latestNormalized = normalizeMfrsUpdateVariableProtocol(latestRaw);
      return getProtocolApplicationKey(message, latestNormalized.message) === applicationKey;
    };
    if (!isCurrentProtocol()) return false;

    const markerMatches = message.extra?.[RAW_PROTOCOL_APPLIED_HASH_KEY] === applicationKey;
    const oldDataForCheck = markerMatches
      ? seedMissingStatPaths(readOldMvuData(hostWindow, messageOption))
      : undefined;
    const falselyApplied = markerMatches && isFalselyAppliedStat(oldDataForCheck, normalized.message);
  if (falselyApplied) {
    console.info('[Hotfix] 检测到假性已应用，清除标记并重新写回', {
      messageIndex,
      messageId: messageOption.message_id,
      applicationKey,
    });
  }

  const controllerResult = await runProtocolApplicationController({
    markerMatches,
    falselyApplied,
    clearMarker: () => {
      if (message.extra) delete message.extra[RAW_PROTOCOL_APPLIED_HASH_KEY];
    },
    write: async () => {
      if (!isCurrentProtocol()) return null;
      const oldData = seedMissingStatPaths(readOldMvuData(hostWindow, messageOption));

      // 根因 v2（P7 真实对话复现）：Mvu.parseMessage 对 <UpdateVariable><JSONPatch> 的解析不可靠——
      // delta 操作会被静默丢弃，仅 replace/insert 生效。
      // 因此 JSONPatch 的写回一律以本地 applyRawProtocolToMvuData 为权威，
      // 不再依赖 Mvu.parseMessage（它只能解析原生宏指令格式，无法正确消费 JSONPatch）。
      const fallback = applyRawProtocolToMvuData(oldData, normalized.message);
      if (fallback.applied === 0) {
        console.info('[Hotfix] JSONPatch 无可写 patch，跳过', {
          messageIndex,
          messageId: messageOption.message_id,
          normalized: normalized.stats,
          skipped: fallback.skipped,
        });
        return null;
      }
      const writeResult = await writeMvuDataWithVerification(
        hostWindow,
        chat,
        messageIndex,
        expectedSwipeId,
        fallback.data,
        messageOption,
        isCurrentProtocol,
      );
      if (!isCurrentProtocol()) return null;
      refreshMessagePanel(hostWindow, messageOption.message_id);
      console.info('[Hotfix] 已通过本地 JSONPatch 写回消息变量', {
        messageIndex,
        messageId: messageOption.message_id,
        applied: fallback.applied,
        skipped: fallback.skipped,
        writer: writeResult.writer,
        verified: writeResult.verified,
        persisted: writeResult.persisted,
        applicationKey,
        normalized: normalized.stats,
      });
      if (!writeResult.verified) {
        console.warn('[Hotfix] JSONPatch 写回后读回仍不一致，保留延迟重试', {
          messageIndex,
          messageId: messageOption.message_id,
        });
      }
      // 根因 v3（2026-08-29 真实对话复现）：写后验证通过 ≠ 数据存活——MVU 自身的
      // MESSAGE_RECEIVED 处理器（3s 节流）会在本热修写回之后重新初始化楼层变量，
      // 覆盖掉刚写入的协议数据。写回成功后必须无条件安排延迟复核：
      // 数据被抹 → marker 仍命中 + 判定 B 命中 → 重写；数据完好 → skip，无副作用。
      schedulePostWriteVerification(messageIndex, eventMessageId, entryEpoch, chat, message);
      return writeResult;
    },
    markApplied: () => {
      if (!isCurrentProtocol()) return;
      message.extra = message.extra || {};
      message.extra[RAW_PROTOCOL_APPLIED_HASH_KEY] = applicationKey;
      message.extra[RAW_PROTOCOL_APPLIED_AT_KEY] = Date.now();
    },
    persistMarker: () => isCurrentProtocol() ? persistDirectMessageVariables(hostWindow, messageIndex) : Promise.resolve(false),
  });

    if (controllerResult.action === 'skip') {
      console.debug('[Hotfix] 当前 swipe 协议已写回，跳过重复应用', {
        messageIndex,
        messageId: messageOption.message_id,
        applicationKey,
        markerPersisted: controllerResult.markerPersisted,
      });
    }
    return controllerResult.needsRetry;
  });
}

/**
 * 写回成功后的延迟复核：MVU 自身的 MESSAGE_RECEIVED 处理器（3s 节流）会在本热修
 * 写回之后重新初始化楼层变量并覆盖协议数据。写回成功后于 4s/9s/15s 复查，
 * 复用 parseAndWriteMvuMessage：marker 仍命中 + 判定 B 命中（数据被抹）→ 重写；
 * 数据完好 → single-flight skip，无副作用。
 */
function schedulePostWriteVerification(
  messageIndex: number,
  eventMessageId?: unknown,
  scheduleEpoch = hotfixEpoch,
  expectedChat?: ChatMessage[],
  expectedMessage?: ChatMessage,
) {
  if (scheduleEpoch !== hotfixEpoch) return;
  const hostWindow = getHostWindow();
  const currentChat = getSillyTavernContext(hostWindow)?.chat;
  const targetChat = expectedChat ?? currentChat;
  const targetMessage = expectedMessage ?? targetChat?.[messageIndex];
  if (!targetChat || !targetMessage || currentChat !== targetChat || targetChat[messageIndex] !== targetMessage) return;

  const delays = [4000, 9000, 15000];
  for (const delay of delays) {
    scheduleHotfixRetry(() => {
      const latestChat = getSillyTavernContext(hostWindow)?.chat;
      if (latestChat !== targetChat || latestChat?.[messageIndex] !== targetMessage) return;
      parseAndWriteMvuMessage(messageIndex, eventMessageId, scheduleEpoch).catch(error => {
        console.warn('[Hotfix] 写后延迟复核失败', { messageIndex, delay, error });
      });
    }, delay, scheduleEpoch);
  }
}

function scheduleMvuWriteBackRetries(
  messageIndex: number,
  eventMessageId?: unknown,
  attempt = 0,
  expectedChat?: ChatMessage[],
  expectedMessage?: ChatMessage,
  scheduleEpoch = hotfixEpoch,
) {
  if (scheduleEpoch !== hotfixEpoch) return;
  const hostWindow = getHostWindow();
  const currentChat = getSillyTavernContext(hostWindow)?.chat;
  const targetChat = expectedChat ?? currentChat;
  const targetMessage = expectedMessage ?? targetChat?.[messageIndex];
  if (!targetChat || !targetMessage || currentChat !== targetChat || targetChat[messageIndex] !== targetMessage) return;

  const delays = [250, 1000, 2500];
  if (attempt >= delays.length) return;
  const delay = delays[attempt];
  scheduleHotfixRetry(() => {
    const latestChat = getSillyTavernContext(hostWindow)?.chat;
    if (latestChat !== targetChat || latestChat?.[messageIndex] !== targetMessage) return;
    parseAndWriteMvuMessage(messageIndex, eventMessageId, scheduleEpoch)
      .then(needsRetry => {
        if (needsRetry) {
          scheduleMvuWriteBackRetries(
            messageIndex,
            eventMessageId,
            attempt + 1,
            targetChat,
            targetMessage,
            scheduleEpoch,
          );
        }
      })
      .catch(error => {
        console.warn('[Hotfix] MVU 延迟写回重试失败', { messageIndex, delay, error });
        scheduleMvuWriteBackRetries(
          messageIndex,
          eventMessageId,
          attempt + 1,
          targetChat,
          targetMessage,
          scheduleEpoch,
        );
      });
  }, delay, scheduleEpoch);
}

/** 上下文不可用时重跑整条 GENERATION_ENDED 流水线（写回 + 清洗），避免本轮协议永久丢失。 */
function scheduleGenerationEndedRetry(eventMessageId?: unknown, attempt = 0, scheduleEpoch = hotfixEpoch) {
  if (scheduleEpoch !== hotfixEpoch) return;
  const delays = [200, 800, 2000];
  if (attempt >= delays.length) {
    console.warn('[Hotfix] GENERATION_ENDED 重试次数耗尽，本轮放弃', { eventMessageId });
    return;
  }
  scheduleHotfixRetry(() => {
    const context = getSillyTavernContext(getHostWindow());
    if (!context?.chat || context.chat.length === 0) {
      scheduleGenerationEndedRetry(eventMessageId, attempt + 1, scheduleEpoch);
      return;
    }
    console.info('[Hotfix] GENERATION_ENDED 上下文已就绪，重跑流水线', { attempt, eventMessageId });
    runGenerationEndedPipeline(eventMessageId, scheduleEpoch).catch(error => {
      console.warn('[Hotfix] GENERATION_ENDED 重试失败', { attempt, error });
    });
  }, delays[attempt], scheduleEpoch);
}

/**
 * 修复历史「假性已应用」楼层：扫全楼层，只对「标记命中且 stat_data 退回初值」的楼层重写。
 *
 * 与 recoverRecentRawProtocolMessages 的区别：后者扫最近 12 条、对所有含协议楼补写
 * （面向「导入旧档缺协议快照」）；本函数扫全部、只对假性已应用楼层重写（面向重载后
 * stat_data 被 MVU 重建为初值、applied_hash 留存导致永久卡死的存量历史楼）。
 *
 * 竞态防护：仅在生成 UI 仍处于忙碌态时跳过最后一条 AI 楼；稳定聊天的最后一楼也必须参与修复。
 * CHAT_CHANGED 扫描由 debounce + single-flight 合并，避免重复事件并发重放同一 delta。
 */
async function repairFalselyAppliedFloors() {
  const repairEpoch = hotfixEpoch;
  const hostWindow = getHostWindow();
  const context = getSillyTavernContext(hostWindow);
  const chat = context?.chat;
  if (!chat || chat.length === 0) return;

  let activeGenerationMessageIndex = -1;
  if (isSendUiStuck(hostWindow)) {
    for (let index = chat.length - 1; index >= 0; index -= 1) {
      if (!chat[index]?.is_user) {
        activeGenerationMessageIndex = index;
        break;
      }
    }
  }

  let repaired = 0;
  for (const index of selectFalselyAppliedRepairIndexes(chat, activeGenerationMessageIndex)) {
    if (repairEpoch !== hotfixEpoch || getSillyTavernContext(hostWindow)?.chat !== chat) return;
    const message = chat[index];
    if (!message?.extra) continue;

    const rawMessage = readMessageTextForMvu(message);
    if (!rawMessage.trim() || !hasInternalProtocol(rawMessage)) continue;

    const normalized = normalizeMfrsUpdateVariableProtocol(rawMessage);
    const applicationKey = getProtocolApplicationKey(message, normalized.message);
    if (message.extra[RAW_PROTOCOL_APPLIED_HASH_KEY] !== applicationKey) continue;

    const messageOption: MessageVariableOption = {
      type: 'message',
      message_id: getMessageVariableId(message, index),
    };
    const oldData = seedMissingStatPaths(readOldMvuData(hostWindow, messageOption));
    if (!isFalselyAppliedStat(oldData, normalized.message)) continue;

    try {
      console.info('[Hotfix] 历史楼层假性已应用，重新写回', { messageIndex: index });
      const needsRetry = await parseAndWriteMvuMessage(index);
      if (needsRetry) {
        scheduleMvuWriteBackRetries(index);
        continue;
      }
      repaired += 1;
    } catch (error) {
      console.warn('[Hotfix] 历史楼层假性已应用修复失败', { messageIndex: index, error });
    }
  }

  if (repaired > 0) {
    console.info('[Hotfix] 假性已应用楼层修复完成', { repaired });
  }
}

async function recoverRecentRawProtocolMessages(entryEpoch = hotfixEpoch) {
  if (entryEpoch !== hotfixEpoch) return;
  const hostWindow = getHostWindow();
  const context = getSillyTavernContext(hostWindow);
  const chat = context?.chat;
  if (!chat || chat.length === 0) return;

  let candidates = 0;
  for (let index = Math.max(0, chat.length - 12); index < chat.length; index += 1) {
    if (entryEpoch !== hotfixEpoch || getSillyTavernContext(hostWindow)?.chat !== chat) return;
    const message = chat[index];
    if (!message || message.is_user) continue;
    const rawMessage = readMessageTextForMvu(message);
    if (!rawMessage.trim() || !hasInternalProtocol(rawMessage)) continue;

    candidates += 1;
    try {
      const needsRetry = await parseAndWriteMvuMessage(index, undefined, entryEpoch);
      if (entryEpoch !== hotfixEpoch || getSillyTavernContext(hostWindow)?.chat !== chat) return;
      if (needsRetry) scheduleMvuWriteBackRetries(index, undefined, 0, chat, message, entryEpoch);
      // RH3（BF6）：导入旧档/历史 raw 消息补写 MVU 后，同样清洗 mes 里的协议残块。
      // 此前只补 MVU 不洗 mes → 导入旧档时协议块仍留在正文并回传 AI。
      // cleanProtocolBlocks 内部会先 snapshot raw（幂等，不覆盖已存 raw），故 UI/MVU 仍可读原文。
      await cleanProtocolBlocks(index, entryEpoch);
    } catch (error) {
      console.warn('[Hotfix] 历史 raw protocol 消息补写失败', { messageIndex: index, error });
    }
  }

  if (candidates > 0) {
    console.info('[Hotfix] 已扫描历史 raw protocol 消息补写', { candidates });
  }
}

async function cleanProtocolBlocks(messageIndex: number, entryEpoch = hotfixEpoch) {
  if (entryEpoch !== hotfixEpoch) return;
  const hostWindow = getHostWindow();
  const context = getSillyTavernContext(hostWindow);
  const chat = context?.chat;
  if (!chat || messageIndex < 0 || messageIndex >= chat.length) return;

  const message = chat[messageIndex];
  if (!message || !message.mes) return;

  const originalMes = message.mes;
  const snapshotted = snapshotRawProtocolMessage(message);

  // 清洗内部协议和旧文本面板。正文保留剧情、【本轮摘要】。
  // 魔禁卡白名单 = {sp_start}：开局容器保留，其余 sp_*/mfrs_* 旧面板删除。
  // 必须与显示正则 index.yaml #「[显示]隐藏旧 sp/mfrs 文本面板」保持同步。
  const cleanedMes = originalMes
    .replace(/<UpdateVariable\b[^>]*>[\s\S]*?<\/UpdateVariable>/gi, '')
    .replace(/<choices\b[^>]*>[\s\S]*?<\/choices>/gi, '') // 整段删除 <choices>（纯内部协议，显示层无消费者；hotfix-05 回滚 hotfix-03）
    // 删除内部草稿/节奏/确认块与独立 JSONPatch 残渣（显示层已隐藏，此处从 mes 清除避免回传 AI）。
    .replace(/<draft\b[^>]*>[\s\S]*?<\/draft>/gi, '')
    .replace(/<pacing_rules\b[^>]*>[\s\S]*?<\/pacing_rules>/gi, '')
    // 中文标签名不能用 \b（中文非 \w），用可选属性组容错。
    .replace(/<修改确认(?:\s[^>]*)?>[\s\S]*?<\/修改确认>/gi, '')
    .replace(/<JSON[P]atch\b[^>]*>[\s\S]*?<\/JSON[P]atch>/gi, '')
    // 删除旧 <sp_*> / <mfrs_*> 文本面板，保留开局容器 sp_start。
    .replace(/<((?!sp_start\b)(?:sp|mfrs)_[a-z_]+)\b[^>]*>[\s\S]*?<\/\1>/gi, '');

  let changed = snapshotted;
  if (cleanedMes !== originalMes) {
    message.mes = cleanedMes;
    message.extra = message.extra || {};
    message.extra._mfrs_raw_protocol_cleaned_at = Date.now();
    changed = true;

    console.info('[Hotfix] 已清洗消息协议块', {
      messageIndex,
      originalLength: originalMes.length,
      cleanedLength: cleanedMes.length,
      removedBytes: originalMes.length - cleanedMes.length,
    });
  }

  if (changed && typeof context?.saveChat === 'function') {
    try {
      await context.saveChat();
    } catch (error) {
      console.debug('[Hotfix] 清洗后 saveChat 失败', error);
    }
  }
}

/**
 * 清理宿主偶发追加的尾随空 AI 占位楼。
 * 仅允许删除：最后一楼为空 AI、紧邻前一楼正是本轮协议 AI；其它空回复仍走原恢复提示，
 * 防止误删真实历史消息或用户内容。
 */
async function removeTrailingEmptyAiPlaceholder(
  hostWindow: HostWindow,
  chat: ChatMessage[],
  placeholderIndex: number,
  protocolMessageIndex: number,
) {
  if (placeholderIndex !== chat.length - 1 || protocolMessageIndex !== placeholderIndex - 1) return false;

  const placeholder = chat[placeholderIndex];
  const protocolMessage = chat[protocolMessageIndex];
  if (!placeholder || placeholder.is_user || messageHasDisplayableContent(placeholder)) return false;
  if (!protocolMessage || protocolMessage.is_user || !hasInternalProtocol(readMessageTextForMvu(protocolMessage))) return false;

  const context = getSillyTavernContext(hostWindow);
  if (typeof context?.deleteLastMessage !== 'function') return false;

  await context.deleteLastMessage();
  if (typeof context.saveChat === 'function') await context.saveChat();
  console.info('[Hotfix] 已删除协议回复后的尾随空 AI 占位楼', {
    placeholderIndex,
    protocolMessageIndex,
  });
  return true;
}

async function handleMessageReceived(eventMessageId?: unknown) {
  const hostWindow = getHostWindow();
  const context = getSillyTavernContext(hostWindow);
  const chat = context?.chat;

  if (!chat || chat.length === 0) {
    console.debug('[Hotfix] MESSAGE_RECEIVED: 聊天记录为空，跳过处理');
    return;
  }

  const lastMessageIndex = resolveProtocolMessageIndex(chat, eventMessageId);
  if (lastMessageIndex < 0) return;
  const lastMessage = chat[lastMessageIndex];

  console.debug('[Hotfix] MESSAGE_RECEIVED 触发', {
    messageIndex: lastMessageIndex,
    messageId: getMessageVariableId(lastMessage, lastMessageIndex),
    hasUpdateVariable: lastMessage.mes?.includes('<UpdateVariable>'),
    hasChoices: lastMessage.mes?.includes('<choices>'),
  });

  // 立即清洗协议块（在界面渲染之前）
  // 这样可以确保内存与界面同步
  await cleanProtocolBlocks(lastMessageIndex);
}

const chatChangedRepair = createDebouncedSingleFlight({
  task: repairFalselyAppliedFloors,
  delay: 800,
  schedule: (callback, delay) => window.setTimeout(callback, delay),
  cancel: timer => window.clearTimeout(timer),
  onError: error => console.warn('[Hotfix] CHAT_CHANGED 假性已应用修复扫描失败', error),
});

/**
 * 切卡/重载聊天后修复历史假性已应用楼层。
 * CHAT_CHANGED 在新聊天加载完成时触发；重复事件合并为一次扫描，且扫描本身 single-flight。
 */
function handleChatChanged() {
  chatChangedRepair.trigger();
}

function isStopButtonVisible(hostWindow: HostWindow) {
  try {
    const stopButton = hostWindow.document?.querySelector?.('#mes_stop, #stscript_stop') as HTMLElement | null;
    if (!stopButton) return false;
    return getComputedStyle(stopButton).display !== 'none';
  } catch {
    return false;
  }
}

function isSendButtonHidden(hostWindow: HostWindow) {
  try {
    const sendButton = hostWindow.document?.querySelector?.('#send_but') as HTMLElement | null;
    if (!sendButton) return false;
    const style = getComputedStyle(sendButton);
    return style.display === 'none' || style.visibility === 'hidden';
  } catch {
    return false;
  }
}

function isSendUiStuck(hostWindow: HostWindow) {
  return isStopButtonVisible(hostWindow) || isSendButtonHidden(hostWindow);
}

/** 恢复发送态：默认仅 activate；卡住时才点 stop / 强制露出发送钮 */
function forceRecoverSendUi(
  hostWindow: HostWindow,
  reason: string,
  options?: { hideStop?: boolean; toastEmpty?: boolean; force?: boolean },
) {
  const context = getSillyTavernContext(hostWindow);
  const stuck = isSendUiStuck(hostWindow);
  const force = options?.force === true || stuck;
  let activated = false;
  let stopped = false;

  try {
    context?.activateSendButtons?.();
    activated = true;
  } catch (error) {
    console.debug('[Hotfix] activateSendButtons 失败', error);
  }

  if (force && options?.hideStop !== false && isStopButtonVisible(hostWindow)) {
    try {
      const stopButton = hostWindow.document?.querySelector?.('#mes_stop, #stscript_stop') as HTMLElement | null;
      stopButton?.click?.();
      stopped = true;
    } catch {
      // ignore
    }
    try {
      context?.activateSendButtons?.();
    } catch {
      // ignore
    }
  }

  if (force) {
    try {
      const sendButton = hostWindow.document?.querySelector?.('#send_but') as HTMLElement | null;
      if (sendButton && getComputedStyle(sendButton).display === 'none') {
        sendButton.style.display = '';
      }
      const stopButton = hostWindow.document?.querySelector?.('#mes_stop, #stscript_stop') as HTMLElement | null;
      if (stopButton && getComputedStyle(stopButton).display !== 'none' && options?.hideStop !== false) {
        stopButton.style.display = 'none';
      }
    } catch {
      // ignore
    }
  }

  if (options?.toastEmpty) {
    try {
      hostWindow.toastr?.warning?.('本轮 AI 回复为空，请重试或重新生成。', '魔法禁书目录', {
        timeOut: 5000,
      });
    } catch {
      // ignore
    }
  }

  console.info('[Hotfix] 已恢复发送按钮', {
    reason,
    activated,
    stopped,
    force,
    stuck,
    sendHidden: isSendButtonHidden(hostWindow),
    stopVisible: isStopButtonVisible(hostWindow),
  });
  return activated || stopped;
}

function recoverSendUiAfterEmptyGeneration(
  hostWindow: HostWindow,
  lastMessage: ChatMessage | undefined,
  lastMessageIndex: number,
  reason: string,
) {
  if (!lastMessage || lastMessage.is_user) return false;
  // 清洗后 mes 可能为空，但 raw 协议仍在 → 不算空生成
  if (messageHasDisplayableContent(lastMessage)) return false;

  forceRecoverSendUi(hostWindow, reason, { toastEmpty: true, force: true });
  console.warn('[Hotfix] 检测到空 AI 回复，已尝试恢复发送按钮', {
    messageIndex: lastMessageIndex,
    reason,
  });
  return true;
}

async function handleGenerationEnded(eventMessageId?: unknown) {
  await runGenerationEndedPipeline(eventMessageId, hotfixEpoch);
}

async function runGenerationEndedPipeline(eventMessageId?: unknown, entryEpoch = hotfixEpoch) {
  if (entryEpoch !== hotfixEpoch) return;
  const hostWindow = getHostWindow();
  const context = getSillyTavernContext(hostWindow);
  const chat = context?.chat;

  if (!chat || chat.length === 0) {
    // 上下文可能只是"尚未就绪"而非真的空聊天（宿主切卡/重建期间读不到 SillyTavern）。
    // 此时直接 return 会让本轮协议永久丢失，故安排一次延迟重试。
    console.debug('[Hotfix] GENERATION_ENDED: 上下文或聊天记录不可用，安排重试', {
      hasContext: !!context,
      eventMessageId,
    });
    scheduleGenerationEndedRetry(eventMessageId, 0, entryEpoch);
    forceRecoverSendUi(hostWindow, 'generation_ended_empty_chat');
    return;
  }

  const eventMessageIndex = resolveMessageIndex(chat, eventMessageId);
  if (eventMessageIndex < 0) {
    forceRecoverSendUi(hostWindow, 'generation_ended_no_message');
    return;
  }
  const eventMessage = chat[eventMessageIndex];
  const protocolMessageIndex = resolveProtocolMessageIndex(chat, eventMessageId);
  const protocolMessage = protocolMessageIndex >= 0 ? chat[protocolMessageIndex] : undefined;

  console.info('[Hotfix] GENERATION_ENDED 触发', {
    eventMessageIndex,
    protocolMessageIndex,
    messageId: getMessageVariableId(protocolMessage ?? eventMessage, protocolMessageIndex >= 0 ? protocolMessageIndex : eventMessageIndex),
    hasUpdateVariable: protocolMessage?.mes?.includes('<UpdateVariable>'),
    hasChoices: protocolMessage?.mes?.includes('<choices>'),
  });

  // 若空楼只是协议回复后的尾随占位，不弹“空回复”误报；稍后在协议处理完成后删除。
  if (protocolMessageIndex === eventMessageIndex) {
    recoverSendUiAfterEmptyGeneration(hostWindow, eventMessage, eventMessageIndex, 'generation_ended');
  }

  // 1. 触发 MVU 解析；仅在写回未通过验证时才安排延迟重试，
  //    避免 delta patch 因重试幂等性缺失而在每次重试时重复累积。
  if (protocolMessageIndex >= 0) {
    // 协议重建：如果消息中没有 <UpdateVariable>，尝试从【本轮摘要】重建
    if (protocolMessage && protocolMessage.mes && !hasInternalProtocol(protocolMessage.mes)) {
      try {
        const messageOption: MessageVariableOption = {
          type: 'message',
          message_id: getMessageVariableId(protocolMessage, protocolMessageIndex),
        };
        const oldData = readOldMvuData(hostWindow, messageOption);
        const reconstructed = reconstructUpdateVariableFromSummary(protocolMessage.mes, oldData);
        if (reconstructed) {
          // 快照原文（保留预设标签和原始内容）
          snapshotRawProtocolMessage(protocolMessage as { mes?: string; extra?: Record<string, unknown> });
          // 追加重建的协议块到消息末尾（不删除任何已有内容）
          protocolMessage.mes = protocolMessage.mes + '\n' + reconstructed;
          protocolMessage.extra = protocolMessage.extra || {};
          protocolMessage.extra._mfrs_protocol_reconstructed = true;
          if (typeof context?.saveChat === 'function') await context.saveChat();
          console.info('[Hotfix] 已从【本轮摘要】重建协议块', {
            messageIndex: protocolMessageIndex,
            patchCount: (reconstructed.match(/"op"/g) || []).length,
          });
        } else {
          console.warn('[Hotfix] 消息缺少 <UpdateVariable> 且无法从摘要重建', {
            messageIndex: protocolMessageIndex,
          });
        }
      } catch (error) {
        console.error('[Hotfix] 协议重建失败', error);
      }
    }

    try {
      const needsRetry = await parseAndWriteMvuMessage(protocolMessageIndex, eventMessageId, entryEpoch);
      if (needsRetry && entryEpoch === hotfixEpoch) {
        scheduleMvuWriteBackRetries(protocolMessageIndex, eventMessageId, 0, chat, protocolMessage, entryEpoch);
      }
    } catch (error) {
      console.error('[Hotfix] MVU parseMessage 执行失败', error);
    }

    // 2. 再次清洗协议块（防御性清洗，以防 MESSAGE_RECEIVED 未触发或 MVU 解析后内容变化）
    await cleanProtocolBlocks(protocolMessageIndex, entryEpoch);
  }

  // 3. 触发数据库刷新（如果需要）
  // 注意：自动填表逻辑应该由数据库前端自己的监听器处理
  // 这里只确保 AutoCardUpdaterAPI 存在
  if (hostWindow.AutoCardUpdaterAPI) {
    console.debug('[Hotfix] AutoCardUpdaterAPI 可用，数据库前端应该有自己的监听器');
  } else {
    console.warn('[Hotfix] AutoCardUpdaterAPI 不可用，数据库自动更新可能失败');
  }

  const removedTrailingPlaceholder = await removeTrailingEmptyAiPlaceholder(
    hostWindow,
    chat,
    eventMessageIndex,
    protocolMessageIndex,
  );

  // 清洗后若正文+raw 皆空，再恢复一次发送态；已删除的尾随占位不再误报。
  if (!removedTrailingPlaceholder) {
    recoverSendUiAfterEmptyGeneration(
      hostWindow,
      chat[eventMessageIndex],
      eventMessageIndex,
      'generation_ended_after_clean',
    );
  }

  // 每轮轻量解锁；仅发送卡住时强制点 stop / 露出发送钮
  forceRecoverSendUi(hostWindow, 'generation_ended_always', { hideStop: true, force: isSendUiStuck(hostWindow) });
}

async function handleGenerationStopped(eventMessageId?: unknown) {
  const hostWindow = getHostWindow();
  const context = getSillyTavernContext(hostWindow);
  const chat = context?.chat;
  if (!chat || chat.length === 0) {
    forceRecoverSendUi(hostWindow, 'generation_stopped_empty_chat', { force: true });
    return;
  }
  const lastMessageIndex = resolveMessageIndex(chat, eventMessageId);
  if (lastMessageIndex >= 0) {
    recoverSendUiAfterEmptyGeneration(hostWindow, chat[lastMessageIndex], lastMessageIndex, 'generation_stopped');
  }
  forceRecoverSendUi(hostWindow, 'generation_stopped_always', { hideStop: true, force: true });
}

type HotfixListenerBinding = {
  eventName: string;
  handler: (...args: unknown[]) => void;
  off?: () => void;
};

const hotfixListenerBindings: HotfixListenerBinding[] = [];

function unbindHotfixListeners() {
  for (const binding of hotfixListenerBindings) {
    try {
      binding.off?.();
    } catch {
      // ignore
    }
  }
  hotfixListenerBindings.length = 0;
}

/**
 * 事件回调护栏：把 handler 的同步抛出与 rejected promise 都收敛为一条日志。
 *
 * handler 由 ST 的 EventEmitter 直接 emit —— 抛出会中断本轮处理，且因为
 * emit 侧多为 `await` 串行调用，还可能连带打断其它监听器。真页曾因跨窗口
 * throwing getter（见 safeRead 注释）在 handler 入口处静默死亡，表现为
 * 「变量不更新、协议块不清洗、控制台无任何 [Hotfix] 日志」，极难定位。
 */
function guardHotfixHandler(eventName: string, handler: (...args: unknown[]) => unknown) {
  return (...args: unknown[]) => {
    const report = (error: unknown) => {
      console.error('[Hotfix] 事件处理异常', { eventName, error });
      try {
        forceRecoverSendUi(getHostWindow(), `${eventName}_exception`, { hideStop: true, force: true });
      } catch {
        // 连恢复发送态都失败时不再升级，避免次生异常淹没原始错误
      }
    };
    try {
      const result = handler(...args);
      if (result && typeof (result as Promise<unknown>).catch === 'function') {
        (result as Promise<unknown>).catch(report);
      }
      return result;
    } catch (error) {
      report(error);
      return undefined;
    }
  };
}

function bindHotfixListener(
  hostWindow: HostWindow,
  eventSource: NonNullable<ReturnType<typeof getEventSource>>,
  eventName: string,
  rawHandler: (...args: unknown[]) => void,
) {
  const handler = guardHotfixHandler(eventName, rawHandler);
  if (typeof eventSource.on === 'function') {
    eventSource.on(eventName, handler);
    hotfixListenerBindings.push({
      eventName,
      handler,
      off: () => {
        if (typeof eventSource.off === 'function') eventSource.off(eventName, handler);
        else if (typeof eventSource.removeListener === 'function') eventSource.removeListener(eventName, handler);
      },
    });
    return true;
  }
  if (typeof hostWindow.eventOn === 'function') {
    hostWindow.eventOn(eventName, handler);
    hotfixListenerBindings.push({ eventName, handler });
    return true;
  }
  return false;
}

function registerEventListeners() {
  const hostWindow = getHostWindow();
  const eventSource = getEventSource(hostWindow);

  if (!eventSource) {
    console.error('[Hotfix] 无法获取 eventSource，监听器注册失败');
    return false;
  }

  unbindHotfixListeners();

  const messageReceivedEvent = getTavernEventName(hostWindow, 'MESSAGE_RECEIVED', 'message_received');
  const generationEndedEvent = getTavernEventName(hostWindow, 'GENERATION_ENDED', 'generation_ended');
  const generationStoppedEvent = getTavernEventName(hostWindow, 'GENERATION_STOPPED', 'generation_stopped');
  const chatChangedEvent = getTavernEventName(hostWindow, 'CHAT_CHANGED', 'chat_changed');
  const events = eventSource.events || {};
  const existingGenerationEndedListeners =
    events[generationEndedEvent] || events.GENERATION_ENDED || events.generation_ended || [];
  const existingMessageReceivedListeners =
    events[messageReceivedEvent] || events.MESSAGE_RECEIVED || events.message_received || [];

  console.info('[Hotfix] 当前监听器数量', {
    messageReceivedEvent,
    generationEndedEvent,
    generationStoppedEvent,
    chatChangedEvent,
    GENERATION_ENDED: Array.isArray(existingGenerationEndedListeners) ? existingGenerationEndedListeners.length : 0,
    MESSAGE_RECEIVED: Array.isArray(existingMessageReceivedListeners) ? existingMessageReceivedListeners.length : 0,
    allEvents: Object.keys(events).length,
  });

  let successCount = 0;
  if (bindHotfixListener(hostWindow, eventSource, messageReceivedEvent, handleMessageReceived)) {
    console.info('[Hotfix] 已注册 MESSAGE_RECEIVED 监听器', { eventName: messageReceivedEvent });
    successCount++;
  }
  if (bindHotfixListener(hostWindow, eventSource, generationEndedEvent, handleGenerationEnded)) {
    console.info('[Hotfix] 已注册 GENERATION_ENDED 监听器', { eventName: generationEndedEvent });
    successCount++;
  }
  if (bindHotfixListener(hostWindow, eventSource, generationStoppedEvent, handleGenerationStopped)) {
    console.info('[Hotfix] 已注册 GENERATION_STOPPED 监听器', { eventName: generationStoppedEvent });
  }
  if (chatChangedEvent && bindHotfixListener(hostWindow, eventSource, chatChangedEvent, handleChatChanged)) {
    console.info('[Hotfix] 已注册 CHAT_CHANGED 监听器（假性已应用修复）', { eventName: chatChangedEvent });
  }

  if (successCount === 0) {
    console.error('[Hotfix] 无可用的事件注册方法，监听器注册失败');
    return false;
  }

  return true;
}

// 等待 SillyTavern 和 Mvu 初始化
async function waitForDependencies(maxAttempts = 30, interval = 500) {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const hostWindow = getHostWindow();
    const context = getSillyTavernContext(hostWindow);
    const eventSource = getEventSource(hostWindow);

    if (context && eventSource) {
      // eventSource 已就绪，可以注册监听器
      // MVU 可以稍后加载，监听器会等待它
      return true;
    }

    await new Promise(resolve => setTimeout(resolve, interval));
  }

  return false;
}

function cleanupHotfix(hostWindow: HostWindow = getHostWindow()) {
  hotfixEpoch += 1;
  runProtocolApplicationSingleFlight = createObjectKeyedSingleFlight<ChatMessage, string, boolean>();
  if (installScanTimer !== undefined) {
    window.clearTimeout(installScanTimer);
    installScanTimer = undefined;
  }
  if (periodicSweepTimer !== undefined) {
    window.clearInterval(periodicSweepTimer);
    periodicSweepTimer = undefined;
  }
  for (const timer of hotfixRetryTimers) window.clearTimeout(timer);
  hotfixRetryTimers.clear();
  chatChangedRepair.cancel();
  unbindHotfixListeners();
  hostWindow.__mfrsHotfixInstalled__ = false;
  delete hostWindow.__mfrsHotfixCleanup__;
  console.info('[Hotfix] 已卸载 GENERATION_ENDED 监听器补丁');
}

// 主入口
async function installHotfix() {
  const hostWindow = getHostWindow();
  if (hostWindow.__mfrsHotfixInstalled__) {
    // 2026-08-29 实机教训：TH 重启脚本后旧实例的监听器可能残留（纪元失配 → 一切事件静默 no-op），
    // 且旧实例不会再跑启动扫描。此时不能直接跳过——必须先清理旧实例再重装，
    // 保证总线上挂着的守卫处理器与活跃实例同纪元。
    console.warn('[Hotfix] 检测到历史安装标志，先清理旧实例再重装', {
      hadCleanup: typeof hostWindow.__mfrsHotfixCleanup__ === 'function',
    });
    try {
      hostWindow.__mfrsHotfixCleanup__?.();
    } catch (error) {
      console.warn('[Hotfix] 清理旧实例失败，继续重装', error);
    }
  }

  console.info('[Hotfix] 开始安装 GENERATION_ENDED 监听器补丁');

  const ready = await waitForDependencies();
  if (!ready) {
    console.error('[Hotfix] SillyTavern eventSource 初始化超时，放弃安装补丁');
    return;
  }

  const success = registerEventListeners();
  if (success) {
    hotfixEpoch += 1;
    hostWindow.__mfrsHotfixInstalled__ = true;
    hostWindow.__mfrsHotfixCleanup__ = () => cleanupHotfix(hostWindow);
    console.info('[Hotfix] GENERATION_ENDED 监听器补丁安装成功');
    // 首装扫描 + 周期安全扫描：事件可能被整段错过（重导入后脚本重启窗口内的生成、
    // 监听器静默失配、流式中断等）。每 30s 扫描最近 AI 楼层，发现「mes 内有协议且无
    // applied 标记」的漏网楼层就补跑管线；已处理楼层由 single-flight + applied 标记兜住，
    // 幂等无副作用。
    const startupSweep = () => {
      recoverRecentRawProtocolMessages(hotfixEpoch).catch(error => {
        console.warn('[Hotfix] 历史 raw protocol 消息补写扫描失败', error);
      });
      chatChangedRepair.runNow().catch(error => {
        console.warn('[Hotfix] 假性已应用修复扫描失败', error);
      });
    };
    installScanTimer = window.setTimeout(() => {
      installScanTimer = undefined;
      startupSweep();
    }, 1000);
    if (periodicSweepTimer !== undefined) window.clearInterval(periodicSweepTimer);
    periodicSweepTimer = window.setInterval(() => {
      if (hotfixEpoch === 0) return;
      startupSweep();
    }, 30000);
  } else {
    console.error('[Hotfix] GENERATION_ENDED 监听器补丁安装失败');
  }
}

// 立即执行
installHotfix();
