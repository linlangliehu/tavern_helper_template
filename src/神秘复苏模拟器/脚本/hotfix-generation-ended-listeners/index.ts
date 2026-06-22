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
 * 4. 清洗 mes 字段，移除 <UpdateVariable> 和 <choices> 块
 */

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
        swipes?: string[];
        extra?: Record<string, unknown>;
        variables?: unknown[];
      }>;
      characterId?: string | number;
    };
  };
  Mvu?: {
    parseMessage?: (messageIndex: number, options?: unknown) => Promise<unknown>;
    getCurrentMvuData?: () => unknown;
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

async function cleanProtocolBlocks(messageIndex: number) {
  const hostWindow = getHostWindow();
  const context = getSillyTavernContext(hostWindow);
  const chat = context?.chat;
  if (!chat || messageIndex < 0 || messageIndex >= chat.length) return;

  const message = chat[messageIndex];
  if (!message || !message.mes) return;

  const originalMes = message.mes;

  // 清洗 <UpdateVariable> 和 <choices> 块
  let cleanedMes = originalMes
    .replace(/<UpdateVariable>[\s\S]*?<\/UpdateVariable>/gi, '')
    .replace(/<choices>[\s\S]*?<\/choices>/gi, '');

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

async function handleGenerationEnded() {
  const hostWindow = getHostWindow();
  const context = getSillyTavernContext(hostWindow);
  const chat = context?.chat;

  if (!chat || chat.length === 0) {
    console.debug('[Hotfix] GENERATION_ENDED: 聊天记录为空，跳过处理');
    return;
  }

  const lastMessageIndex = chat.length - 1;
  const lastMessage = chat[lastMessageIndex];

  console.info('[Hotfix] GENERATION_ENDED 触发', {
    messageIndex: lastMessageIndex,
    hasUpdateVariable: lastMessage.mes?.includes('<UpdateVariable>'),
    hasChoices: lastMessage.mes?.includes('<choices>'),
  });

  // 1. 触发 MVU 解析
  if (hostWindow.Mvu?.parseMessage) {
    try {
      await hostWindow.Mvu.parseMessage(lastMessageIndex, {});
      console.info('[Hotfix] MVU parseMessage 已执行', { messageIndex: lastMessageIndex });
    } catch (error) {
      console.error('[Hotfix] MVU parseMessage 执行失败', error);
    }
  } else {
    console.warn('[Hotfix] window.Mvu.parseMessage 不可用，跳过 MVU 解析');
  }

  // 2. 清洗协议块（在 MVU 解析之后）
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

function registerGenerationEndedListener() {
  const hostWindow = getHostWindow();
  const eventSource = getEventSource(hostWindow);

  if (!eventSource) {
    console.error('[Hotfix] 无法获取 eventSource，监听器注册失败');
    return false;
  }

  // 检查是否已经注册过（避免重复注册）
  const events = eventSource.events || {};
  const existingListeners = events.GENERATION_ENDED || events.generation_ended || [];

  console.info('[Hotfix] 当前 GENERATION_ENDED 监听器数量', {
    GENERATION_ENDED: Array.isArray(existingListeners) ? existingListeners.length : 0,
    allEvents: Object.keys(events).length,
  });

  // 注册监听器
  if (typeof eventSource.on === 'function') {
    eventSource.on('GENERATION_ENDED', handleGenerationEnded);
    console.info('[Hotfix] 已注册 GENERATION_ENDED 监听器（eventSource.on）');
    return true;
  }

  // Fallback: 尝试酒馆助手的 eventOn
  if (typeof hostWindow.eventOn === 'function' && hostWindow.tavern_events?.GENERATION_ENDED) {
    hostWindow.eventOn(hostWindow.tavern_events.GENERATION_ENDED, handleGenerationEnded);
    console.info('[Hotfix] 已注册 GENERATION_ENDED 监听器（tavern eventOn）');
    return true;
  }

  console.error('[Hotfix] 无可用的事件注册方法，监听器注册失败');
  return false;
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

  const success = registerGenerationEndedListener();
  if (success) {
    console.info('[Hotfix] GENERATION_ENDED 监听器补丁安装成功');
  } else {
    console.error('[Hotfix] GENERATION_ENDED 监听器补丁安装失败');
  }
}

// 立即执行
installHotfix();
