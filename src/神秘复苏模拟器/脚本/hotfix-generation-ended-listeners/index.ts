import * as protocolNormalizer from './protocol-normalizer.js';

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
 *    - 整段删除 <sp_*> / <mfrs_*> 旧文本面板（保留开局/输入交互面板与掷骰条 mfrs_roll）
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
  MysteryMessagePanel?: {
    refreshMessage?: (messageId: number | string) => void;
  };
};

function getHostWindow(): HostWindow {
  try {
    return (window.parent ?? window) as HostWindow;
  } catch {
    return window as HostWindow;
  }
}

function getSillyTavernContext(hostWindow: HostWindow) {
  const localWindow = window as HostWindow;
  for (const st of [hostWindow.SillyTavern, localWindow.SillyTavern]) {
    try {
      const context = st?.getContext?.();
      if (context) return context;
    } catch {
      // Ignore
    }
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
  return hostWindow.Mvu ?? localWindow.Mvu;
}

function getRuntimeFunction<K extends 'getVariables' | 'updateVariablesWith'>(hostWindow: HostWindow, key: K) {
  const localWindow = window as HostWindow;
  return hostWindow[key] ?? hostWindow.TavernHelper?.[key] ?? localWindow[key] ?? localWindow.TavernHelper?.[key];
}

function getTavernEventName(hostWindow: HostWindow, key: 'MESSAGE_RECEIVED' | 'GENERATION_ENDED', fallback: string) {
  const context = getSillyTavernContext(hostWindow);
  const fromContext = context?.event_types?.[key];
  if (typeof fromContext === 'string' && fromContext) return fromContext;

  const fromHost = hostWindow.tavern_events?.[key];
  if (typeof fromHost === 'string' && fromHost) return fromHost;

  const localWindow = window as HostWindow;
  const fromLocal = localWindow.tavern_events?.[key];
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
  return /<UpdateVariable\b|<choices\b/i.test(message);
}

function cloneMvuData(data: MvuData): MvuData {
  try {
    return JSON.parse(JSON.stringify(data || {})) as MvuData;
  } catch {
    return { ...(data || {}) };
  }
}

/** MagVar replace/set 要求路径已存在；旧档/initvar 常缺这些键，需在 parseMessage 前补种。 */
const DEFAULT_ACTION_JUDGEMENT = {
  类型: '未判定',
  行动: '',
  依据: [] as string[],
  触发项: [] as string[],
  结果: '未结算',
  代价: '无',
  死亡风险变化: '无变化',
  复苏风险变化: '无变化',
  资源代价: '无',
  后续建议: '',
  可见结论: '',
};

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

  seeded = seedIfMissing(stat, '行动建议', []) || seeded;
  seeded = seedIfMissing(stat, '最近行动判定', { ...DEFAULT_ACTION_JUDGEMENT, 依据: [] }) || seeded;
  seeded = seedIfMissing(stat, '在场人物', []) || seeded;
  seeded = seedIfMissing(stat, '规律推理记录', []) || seeded;
  seeded = seedIfMissing(stat, '收录档案', []) || seeded;
  seeded = seedIfMissing(stat, '收录规律', []) || seeded;
  seeded = seedIfMissing(stat, '世界线记录', []) || seeded;
  seeded = seedIfMissing(stat, 'is_dead', false) || seeded;
  seeded = seedIfMissing(stat, 'is_supernatural_scene', false) || seeded;
  seeded = seedIfMissing(stat, 'has_entered_supernatural', false) || seeded;
  seeded = seedIfMissing(stat, 'revive_streak', 0) || seeded;

  if (!hasOwn(stat, '灵异资源') || typeof stat['灵异资源'] !== 'object' || Array.isArray(stat['灵异资源'])) {
    stat['灵异资源'] = { 鬼拼图: [], 灵异物品: [], 黄金储备: '未准备' };
    seeded = true;
  } else {
    const res = stat['灵异资源'] as Record<string, unknown>;
    seeded = seedIfMissing(res, '鬼拼图', []) || seeded;
    seeded = seedIfMissing(res, '灵异物品', []) || seeded;
  }

  if (!hasOwn(stat, '势力关系') || typeof stat['势力关系'] !== 'object' || Array.isArray(stat['势力关系'])) {
    stat['势力关系'] = {
      总部备案状态: '未备案',
      所属城市: '未知',
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

  if (!hasOwn(stat, '可见档案') || typeof stat['可见档案'] !== 'object' || Array.isArray(stat['可见档案'])) {
    stat['可见档案'] = { 玩家已知: [], NPC已知: [], 已验证线索: [], 未验证猜测: [] };
    seeded = true;
  } else {
    const visible = stat['可见档案'] as Record<string, unknown>;
    seeded = seedIfMissing(visible, '玩家已知', []) || seeded;
    seeded = seedIfMissing(visible, 'NPC已知', []) || seeded;
    seeded = seedIfMissing(visible, '已验证线索', []) || seeded;
    seeded = seedIfMissing(visible, '未验证猜测', []) || seeded;
  }

  if (!hasOwn(stat, '主线进度') || typeof stat['主线进度'] !== 'object' || Array.isArray(stat['主线进度'])) {
    stat['主线进度'] = {
      当前阶段: '开局接入',
      阶段序号: 0,
      权限层级: '玩家可见层',
      已开放主题: [],
      锁定主题: [],
      阶段状态: '未启动',
      已完成节点: [],
      可触发节点: [],
      偏移等级: 0,
      正史锚点: { 当前锚点: '自定义开局', 默认走向: '', 玩家偏移: [] },
      世界压力: { 灵异复苏强度: 0, 总部关注度: 0, 社会公开度: 0 },
      下一步推进提示: '',
    };
    seeded = true;
  } else {
    const progress = stat['主线进度'] as Record<string, unknown>;
    seeded = seedIfMissing(progress, '已开放主题', []) || seeded;
    seeded = seedIfMissing(progress, '锁定主题', []) || seeded;
    seeded = seedIfMissing(progress, '已完成节点', []) || seeded;
    seeded = seedIfMissing(progress, '可触发节点', []) || seeded;
    if (!hasOwn(progress, '正史锚点') || typeof progress['正史锚点'] !== 'object' || Array.isArray(progress['正史锚点'])) {
      progress['正史锚点'] = { 当前锚点: '自定义开局', 默认走向: '', 玩家偏移: [] };
      seeded = true;
    } else {
      const anchor = progress['正史锚点'] as Record<string, unknown>;
      seeded = seedIfMissing(anchor, '玩家偏移', []) || seeded;
    }
  }

  if (hasOwn(stat, '当前灵异事件') && typeof stat['当前灵异事件'] === 'object' && !Array.isArray(stat['当前灵异事件'])) {
    const event = stat['当前灵异事件'] as Record<string, unknown>;
    seeded = seedIfMissing(event, '已知杀人规律', []) || seeded;
    seeded = seedIfMissing(event, '猜测杀人规律', []) || seeded;
    seeded = seedIfMissing(event, '错误推断', []) || seeded;
  }

  if (seeded) {
    console.info('[Hotfix] 已补种缺失 MVU 路径', {
      hasActionSuggestions: hasOwn(stat, '行动建议'),
      hasActionJudgement: hasOwn(stat, '最近行动判定'),
      hasPeople: hasOwn(stat, '在场人物'),
      hasRuleRecords: hasOwn(stat, '规律推理记录'),
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

function assignMessageVariablesDirectly(chat: ChatMessage[], messageIndex: number, data: MvuData) {
  const message = chat[messageIndex];
  if (!message) return '';

  const clonedData = cloneMvuData(data);
  if (!message.variables) {
    const swipeId = getMessageSwipeId(message);
    const variables: Record<string, unknown>[] = [];
    variables[swipeId] = clonedData;
    message.variables = variables;
    return `chat.variables[${swipeId}]`;
  }

  if (Array.isArray(message.variables)) {
    const swipeId = getMessageSwipeId(message);
    message.variables[swipeId] = clonedData;
    return `chat.variables[${swipeId}]`;
  }

  message.variables = clonedData;
  return 'chat.variables';
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
  data: MvuData,
  messageOption: MessageVariableOption,
) {
  const primaryWriter = await replaceMvuData(hostWindow, data, messageOption);
  let verified = hasSameStatData(readOldMvuData(hostWindow, messageOption), data);
  let directWriter = '';
  let persisted = false;

  if (!verified) {
    directWriter = assignMessageVariablesDirectly(chat, messageIndex, data);
    verified = hasSameStatData(readOldMvuData(hostWindow, messageOption), data);
    if (directWriter) {
      persisted = await persistDirectMessageVariables(hostWindow, messageIndex);
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
    hostWindow.MysteryMessagePanel?.refreshMessage?.(messageId);
    window.setTimeout(() => hostWindow.MysteryMessagePanel?.refreshMessage?.(messageId), 250);
  } catch (error) {
    console.debug('[Hotfix] 消息内面板刷新失败，忽略并保留 MVU 写回结果', error);
  }
}

async function parseAndWriteMvuMessage(messageIndex: number, eventMessageId?: unknown) {
  const hostWindow = getHostWindow();
  const context = getSillyTavernContext(hostWindow);
  const chat = context?.chat;
  if (!chat || messageIndex < 0 || messageIndex >= chat.length) return;

  const mvu = getMvuApi(hostWindow);
  if (typeof mvu?.parseMessage !== 'function') {
    console.warn('[Hotfix] window.Mvu.parseMessage 不可用，跳过 MVU 解析');
    return;
  }

  const message = chat[messageIndex];
  const rawMessage = readMessageTextForMvu(message);
  if (!rawMessage.trim() || !hasInternalProtocol(rawMessage)) {
    console.debug('[Hotfix] 最新 AI 消息无可解析协议块，跳过 MVU 解析', { messageIndex, eventMessageId });
    return;
  }

  const messageOption: MessageVariableOption = {
    type: 'message',
    message_id: getMessageVariableId(message, messageIndex),
  };
  const normalized = normalizeMfrsUpdateVariableProtocol(rawMessage);
  const oldData = seedMissingStatPaths(readOldMvuData(hostWindow, messageOption));
  const newData = await mvu.parseMessage(normalized.message, oldData);
  if (!newData || typeof newData !== 'object') {
    console.info('[Hotfix] MVU parseMessage 未产生变量变化', {
      messageIndex,
      messageId: messageOption.message_id,
      normalized: normalized.stats,
    });
    return;
  }

  if (hasSameStatData(oldData, newData)) {
    console.debug('[Hotfix] MVU 变量已是解析结果，跳过重复写回', {
      messageIndex,
      messageId: messageOption.message_id,
      normalized: normalized.stats,
    });
    return;
  }

  const writeResult = await writeMvuDataWithVerification(hostWindow, chat, messageIndex, newData, messageOption);
  refreshMessagePanel(hostWindow, messageOption.message_id);
  console.info('[Hotfix] MVU parseMessage 已解析并写回消息变量', {
    messageIndex,
    messageId: messageOption.message_id,
    writer: writeResult.writer,
    verified: writeResult.verified,
    persisted: writeResult.persisted,
    normalized: normalized.stats,
  });

  if (!writeResult.verified) {
    console.warn('[Hotfix] MVU 写回后读回仍不一致，保留延迟重试', {
      messageIndex,
      messageId: messageOption.message_id,
    });
  }
}

function scheduleMvuWriteBackRetries(messageIndex: number, eventMessageId?: unknown) {
  for (const delay of [250, 1000, 2500]) {
    window.setTimeout(() => {
      parseAndWriteMvuMessage(messageIndex, eventMessageId).catch(error => {
        console.warn('[Hotfix] MVU 延迟写回重试失败', { messageIndex, delay, error });
      });
    }, delay);
  }
}

async function recoverRecentRawProtocolMessages() {
  const hostWindow = getHostWindow();
  const context = getSillyTavernContext(hostWindow);
  const chat = context?.chat;
  if (!chat || chat.length === 0) return;

  let candidates = 0;
  for (let index = Math.max(0, chat.length - 12); index < chat.length; index += 1) {
    const message = chat[index];
    if (!message || message.is_user) continue;
    const rawMessage = readMessageTextForMvu(message);
    if (!rawMessage.trim() || !hasInternalProtocol(rawMessage)) continue;

    candidates += 1;
    try {
      await parseAndWriteMvuMessage(index);
    } catch (error) {
      console.warn('[Hotfix] 历史 raw protocol 消息补写失败', { messageIndex: index, error });
    }
  }

  if (candidates > 0) {
    console.info('[Hotfix] 已扫描历史 raw protocol 消息补写', { candidates });
  }
}

async function cleanProtocolBlocks(messageIndex: number) {
  const hostWindow = getHostWindow();
  const context = getSillyTavernContext(hostWindow);
  const chat = context?.chat;
  if (!chat || messageIndex < 0 || messageIndex >= chat.length) return;

  const message = chat[messageIndex];
  if (!message || !message.mes) return;

  const originalMes = message.mes;
  const snapshotted = snapshotRawProtocolMessage(message);

  // 清洗内部协议和旧文本面板。正文保留剧情、【本轮摘要】与掷骰条 <mfrs_roll/>。
  // RM8（BF6）：本段旧 sp/mfrs 面板清洗白名单 = {sp_start, sp_input, mfrs_roll}，
  // 必须与显示正则 index.yaml #「[显示]隐藏旧 sp/mfrs 文本面板」(id …2025) 保持同步。
  // 该显示正则白名单为 {sp_start, sp_input}（不含 mfrs_roll）——因掷骰条实际输出为自闭合
  // <mfrs_roll .../>，成对匹配的显示正则天然不误伤，故此处多列 mfrs_roll 无害且更保险。
  // 改动任一方白名单时，务必同步另一方；G3(verify-mfrs-regex-ids) 有断言守护此关系（防 RH6 式漂移）。
  const cleanedMes = originalMes
    .replace(/<UpdateVariable\b[^>]*>[\s\S]*?<\/UpdateVariable>/gi, '')
    .replace(/<choices\b[^>]*>[\s\S]*?<\/choices>/gi, '')
    // 删除旧 <sp_*> / <mfrs_*> 文本面板，保留开局/输入/掷骰。
    .replace(/<((?!(?:sp_start|sp_input|mfrs_roll)\b)(?:sp|mfrs)_[a-z_]+)\b[^>]*>[\s\S]*?<\/\1>/gi, '');

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

async function handleMessageReceived(eventMessageId?: unknown) {
  const hostWindow = getHostWindow();
  const context = getSillyTavernContext(hostWindow);
  const chat = context?.chat;

  if (!chat || chat.length === 0) {
    console.debug('[Hotfix] MESSAGE_RECEIVED: 聊天记录为空，跳过处理');
    return;
  }

  const lastMessageIndex = resolveMessageIndex(chat, eventMessageId);
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
      hostWindow.toastr?.warning?.('本轮 AI 回复为空，请重试或重新生成。', '神秘复苏', {
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
  const hostWindow = getHostWindow();
  const context = getSillyTavernContext(hostWindow);
  const chat = context?.chat;

  if (!chat || chat.length === 0) {
    console.debug('[Hotfix] GENERATION_ENDED: 聊天记录为空，跳过处理');
    forceRecoverSendUi(hostWindow, 'generation_ended_empty_chat');
    return;
  }

  const lastMessageIndex = resolveMessageIndex(chat, eventMessageId);
  if (lastMessageIndex < 0) {
    forceRecoverSendUi(hostWindow, 'generation_ended_no_message');
    return;
  }
  const lastMessage = chat[lastMessageIndex];

  console.info('[Hotfix] GENERATION_ENDED 触发', {
    messageIndex: lastMessageIndex,
    messageId: getMessageVariableId(lastMessage, lastMessageIndex),
    hasUpdateVariable: lastMessage.mes?.includes('<UpdateVariable>'),
    hasChoices: lastMessage.mes?.includes('<choices>'),
  });

  // 假流式/上游空 content：先恢复发送态
  recoverSendUiAfterEmptyGeneration(hostWindow, lastMessage, lastMessageIndex, 'generation_ended');

  // 1. 触发 MVU 解析
  try {
    await parseAndWriteMvuMessage(lastMessageIndex, eventMessageId);
    scheduleMvuWriteBackRetries(lastMessageIndex, eventMessageId);
  } catch (error) {
    console.error('[Hotfix] MVU parseMessage 执行失败', error);
  }

  // 2. 再次清洗协议块（防御性清洗，以防 MESSAGE_RECEIVED 未触发或 MVU 解析后内容变化）
  await cleanProtocolBlocks(lastMessageIndex);

  // 3. 触发数据库刷新（如果需要）
  // 注意：自动填表逻辑应该由数据库前端自己的监听器处理
  // 这里只确保 AutoCardUpdaterAPI 存在
  if (hostWindow.AutoCardUpdaterAPI) {
    console.debug('[Hotfix] AutoCardUpdaterAPI 可用，数据库前端应该有自己的监听器');
  } else {
    console.warn('[Hotfix] AutoCardUpdaterAPI 不可用，数据库自动更新可能失败');
  }

  // 清洗后若正文+raw 皆空，再恢复一次发送态
  recoverSendUiAfterEmptyGeneration(hostWindow, chat[lastMessageIndex], lastMessageIndex, 'generation_ended_after_clean');

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

function bindHotfixListener(
  hostWindow: HostWindow,
  eventSource: NonNullable<ReturnType<typeof getEventSource>>,
  eventName: string,
  handler: (...args: unknown[]) => void,
) {
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
  const events = eventSource.events || {};
  const existingGenerationEndedListeners = events[generationEndedEvent] || events.GENERATION_ENDED || events.generation_ended || [];
  const existingMessageReceivedListeners = events[messageReceivedEvent] || events.MESSAGE_RECEIVED || events.message_received || [];

  console.info('[Hotfix] 当前监听器数量', {
    messageReceivedEvent,
    generationEndedEvent,
    generationStoppedEvent,
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
  unbindHotfixListeners();
  hostWindow.__mfrsHotfixInstalled__ = false;
  delete hostWindow.__mfrsHotfixCleanup__;
  console.info('[Hotfix] 已卸载 GENERATION_ENDED 监听器补丁');
}

// 主入口
async function installHotfix() {
  const hostWindow = getHostWindow();
  if (hostWindow.__mfrsHotfixInstalled__) {
    console.info('[Hotfix] 已安装，跳过重复注册');
    return;
  }

  console.info('[Hotfix] 开始安装 GENERATION_ENDED 监听器补丁');

  const ready = await waitForDependencies();
  if (!ready) {
    console.error('[Hotfix] SillyTavern eventSource 初始化超时，放弃安装补丁');
    return;
  }

  const success = registerEventListeners();
  if (success) {
    hostWindow.__mfrsHotfixInstalled__ = true;
    hostWindow.__mfrsHotfixCleanup__ = () => cleanupHotfix(hostWindow);
    console.info('[Hotfix] GENERATION_ENDED 监听器补丁安装成功');
    window.setTimeout(() => {
      recoverRecentRawProtocolMessages().catch(error => {
        console.warn('[Hotfix] 历史 raw protocol 消息补写扫描失败', error);
      });
    }, 1000);
  } else {
    console.error('[Hotfix] GENERATION_ENDED 监听器补丁安装失败');
  }
}

// 立即执行
installHotfix();
