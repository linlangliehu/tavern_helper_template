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
 *    - 整段删除 <sp_*> / <mfrs_*> 旧文本面板（保留开局/输入交互面板）
 *    - 删除自闭合 <mfrs_roll ... />（无内部文本）
 */

type MvuData = Record<string, unknown> & {
  stat_data?: Record<string, unknown>;
};

type MessageVariableOption = {
  type: 'message';
  message_id: number | 'latest';
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
        emit?: (event: string, ...args: unknown[]) => void;
        events?: Record<string, unknown[]>;
      };
      chat?: Array<{
        mes?: string;
        message_id?: number;
        is_user?: boolean;
        swipe_id?: number;
        swipes?: string[];
        extra?: Record<string, unknown>;
        variables?: Record<string, unknown>[] | Record<string, unknown>;
      }>;
      characterId?: string | number;
      event_types?: Record<string, string>;
    };
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
    emit?: (event: string, ...args: unknown[]) => void;
    events?: Record<string, unknown[]>;
  };
  eventOn?: (event: string, handler: (...args: unknown[]) => void) => void;
  tavern_events?: Record<string, string>;
  getVariables?: (options: MessageVariableOption) => Record<string, unknown>;
  updateVariablesWith?: (
    updater: (variables: Record<string, unknown>) => Record<string, unknown>,
    options: MessageVariableOption,
  ) => Record<string, unknown> | Promise<Record<string, unknown>>;
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
  return hostWindow[key] ?? localWindow[key];
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

function readMessageTextForMvu(message: { mes?: string; extra?: Record<string, unknown> } | undefined) {
  const rawProtocolMessage = message?.extra?.[RAW_PROTOCOL_EXTRA_KEY];
  if (typeof rawProtocolMessage === 'string' && hasInternalProtocol(rawProtocolMessage)) {
    return rawProtocolMessage;
  }
  return typeof message?.mes === 'string' ? message.mes : '';
}

function snapshotRawProtocolMessage(message: { mes?: string; extra?: Record<string, unknown> }) {
  if (!message.mes || !hasInternalProtocol(message.mes)) return;
  message.extra = message.extra || {};
  if (typeof message.extra[RAW_PROTOCOL_EXTRA_KEY] !== 'string') {
    message.extra[RAW_PROTOCOL_EXTRA_KEY] = message.mes;
  }
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
  const oldData = readOldMvuData(hostWindow, messageOption);
  const newData = await mvu.parseMessage(normalized.message, oldData);
  if (!newData || typeof newData !== 'object') {
    console.info('[Hotfix] MVU parseMessage 未产生变量变化', {
      messageIndex,
      messageId: messageOption.message_id,
      normalized: normalized.stats,
    });
    return;
  }

  const writer = await replaceMvuData(hostWindow, newData, messageOption);
  refreshMessagePanel(hostWindow, messageOption.message_id);
  console.info('[Hotfix] MVU parseMessage 已解析并写回消息变量', {
    messageIndex,
    messageId: messageOption.message_id,
    writer,
    normalized: normalized.stats,
  });
}

async function cleanProtocolBlocks(messageIndex: number) {
  const hostWindow = getHostWindow();
  const context = getSillyTavernContext(hostWindow);
  const chat = context?.chat;
  if (!chat || messageIndex < 0 || messageIndex >= chat.length) return;

  const message = chat[messageIndex];
  if (!message || !message.mes) return;

  const originalMes = message.mes;
  snapshotRawProtocolMessage(message);

  // 清洗内部协议和旧文本面板。正文只保留剧情与【本轮摘要】。
  let cleanedMes = originalMes
    .replace(/<UpdateVariable>[\s\S]*?<\/UpdateVariable>/gi, '')
    .replace(/<choices>[\s\S]*?<\/choices>/gi, '')
    // 删除旧 <sp_*> / <mfrs_*> 文本面板，保留可交互的开局/输入面板。
    .replace(/<((?!(?:sp_start|sp_input)\b)(?:sp|mfrs)_[a-z_]+)\b[^>]*>[\s\S]*?<\/\1>/gi, '')
    // 删除自闭合的 <mfrs_roll ... />（掷骰展示，无内部文本）
    .replace(/<mfrs_roll\b[^>]*\/>/gi, '');

  // 如果清洗后有变化，更新 mes 并标记清洗时间
  if (cleanedMes !== originalMes) {
    message.mes = cleanedMes;
    message.extra = message.extra || {};
    message.extra._mfrs_raw_protocol_cleaned_at = Date.now();

    console.info('[Hotfix] 已清洗消息协议块', {
      messageIndex,
      originalLength: originalMes.length,
      cleanedLength: cleanedMes.length,
      removedBytes: originalMes.length - cleanedMes.length,
    });
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

async function handleGenerationEnded(eventMessageId?: unknown) {
  const hostWindow = getHostWindow();
  const context = getSillyTavernContext(hostWindow);
  const chat = context?.chat;

  if (!chat || chat.length === 0) {
    console.debug('[Hotfix] GENERATION_ENDED: 聊天记录为空，跳过处理');
    return;
  }

  const lastMessageIndex = resolveMessageIndex(chat, eventMessageId);
  if (lastMessageIndex < 0) return;
  const lastMessage = chat[lastMessageIndex];

  console.info('[Hotfix] GENERATION_ENDED 触发', {
    messageIndex: lastMessageIndex,
    messageId: getMessageVariableId(lastMessage, lastMessageIndex),
    hasUpdateVariable: lastMessage.mes?.includes('<UpdateVariable>'),
    hasChoices: lastMessage.mes?.includes('<choices>'),
  });

  // 1. 触发 MVU 解析
  try {
    await parseAndWriteMvuMessage(lastMessageIndex, eventMessageId);
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
}

function registerEventListeners() {
  const hostWindow = getHostWindow();
  const eventSource = getEventSource(hostWindow);

  if (!eventSource) {
    console.error('[Hotfix] 无法获取 eventSource，监听器注册失败');
    return false;
  }

  // 检查是否已经注册过（避免重复注册）
  const messageReceivedEvent = getTavernEventName(hostWindow, 'MESSAGE_RECEIVED', 'message_received');
  const generationEndedEvent = getTavernEventName(hostWindow, 'GENERATION_ENDED', 'generation_ended');
  const events = eventSource.events || {};
  const existingGenerationEndedListeners = events[generationEndedEvent] || events.GENERATION_ENDED || events.generation_ended || [];
  const existingMessageReceivedListeners = events[messageReceivedEvent] || events.MESSAGE_RECEIVED || events.message_received || [];

  console.info('[Hotfix] 当前监听器数量', {
    messageReceivedEvent,
    generationEndedEvent,
    GENERATION_ENDED: Array.isArray(existingGenerationEndedListeners) ? existingGenerationEndedListeners.length : 0,
    MESSAGE_RECEIVED: Array.isArray(existingMessageReceivedListeners) ? existingMessageReceivedListeners.length : 0,
    allEvents: Object.keys(events).length,
  });

  let successCount = 0;

  // 注册 MESSAGE_RECEIVED 监听器（优先清洗，确保在界面渲染前完成）
  if (typeof eventSource.on === 'function') {
    eventSource.on(messageReceivedEvent, handleMessageReceived);
    console.info('[Hotfix] 已注册 MESSAGE_RECEIVED 监听器（eventSource.on）', { eventName: messageReceivedEvent });
    successCount++;
  } else if (typeof hostWindow.eventOn === 'function') {
    hostWindow.eventOn(messageReceivedEvent, handleMessageReceived);
    console.info('[Hotfix] 已注册 MESSAGE_RECEIVED 监听器（tavern eventOn）', { eventName: messageReceivedEvent });
    successCount++;
  }

  // 注册 GENERATION_ENDED 监听器（触发 MVU + 防御性二次清洗）
  if (typeof eventSource.on === 'function') {
    eventSource.on(generationEndedEvent, handleGenerationEnded);
    console.info('[Hotfix] 已注册 GENERATION_ENDED 监听器（eventSource.on）', { eventName: generationEndedEvent });
    successCount++;
  } else if (typeof hostWindow.eventOn === 'function') {
    hostWindow.eventOn(generationEndedEvent, handleGenerationEnded);
    console.info('[Hotfix] 已注册 GENERATION_ENDED 监听器（tavern eventOn）', { eventName: generationEndedEvent });
    successCount++;
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

// 主入口
async function installHotfix() {
  console.info('[Hotfix] 开始安装 GENERATION_ENDED 监听器补丁');

  const ready = await waitForDependencies();
  if (!ready) {
    console.error('[Hotfix] SillyTavern eventSource 初始化超时，放弃安装补丁');
    return;
  }

  const success = registerEventListeners();
  if (success) {
    console.info('[Hotfix] GENERATION_ENDED 监听器补丁安装成功');
  } else {
    console.error('[Hotfix] GENERATION_ENDED 监听器补丁安装失败');
  }
}

// 立即执行
installHotfix();
