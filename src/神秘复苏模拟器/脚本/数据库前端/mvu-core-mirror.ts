import type { TableChangePlan, TableChangeResult } from './table-change-adapter';

type Primitive = string | number | boolean | null;
type HostWindow = Window & {
  MysteryDatabaseFrontend?: {
    applyTableChangePlan?: (plan: TableChangePlan) => Promise<TableChangeResult>;
    exportCurrentData?: () => Promise<unknown>;
  };
  Mvu?: {
    getMvuData?: (option: { type: string; message_id: number | string }) => unknown;
  };
  getVariables?: (option: { type: string; message_id?: number | string }) => unknown;
  SillyTavern?: {
    getContext?: () => {
      chat?: Array<{ is_user?: boolean; message_id?: number }>;
      eventSource?: {
        on?: (event: unknown, listener: (...args: unknown[]) => void) => void;
        off?: (event: unknown, listener: (...args: unknown[]) => void) => void;
      };
      event_types?: Record<string, unknown> & {
        GENERATION_ENDED?: unknown;
        MESSAGE_RECEIVED?: unknown;
      };
    };
  };
  tavern_events?: Record<string, unknown>;
  eventOn?: (event: unknown, listener: (...args: unknown[]) => void) => void;
};

type StatData = Record<string, unknown>;

const ACTION_KEYS = ['A', 'B', 'C', 'D'] as const;

function asRecord(value: unknown): StatData {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as StatData) : {};
}

function textOrFallback(value: unknown, fallback = '无') {
  const text = String(value ?? '').trim();
  return text || fallback;
}

function truncateDbText(value: unknown, max = 80, fallback = '未知') {
  const text = String(value ?? '')
    .replace(/\s+/g, ' ')
    .trim() || fallback;
  return text.length > max ? text.slice(0, max) : text;
}

function clampPercent(value: unknown, fallback = 0) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(0, Math.min(100, Math.round(n)));
}

function listText(value: unknown, fallback = '无') {
  if (Array.isArray(value)) {
    const items = value.map(item => String(item ?? '').trim()).filter(Boolean);
    return items.length ? items.join('；') : fallback;
  }
  return textOrFallback(value, fallback);
}

function riskLevelFromDelta(value: unknown) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return '无';
  if (n <= 2) return '低';
  if (n <= 5) return '中';
  if (n <= 8) return '高';
  return '致命';
}

function normalizeRiskLevel(value: unknown, fallbackDelta: unknown = 0) {
  const text = String(value ?? '').trim();
  if (['无', '低', '中', '高', '致命', '未知'].includes(text)) return text;
  return riskLevelFromDelta(fallbackDelta);
}

function normalizeHandlingStatus(value: unknown) {
  const text = String(value ?? '').trim();
  if (['未处理', '调查中', '对抗中', '已压制', '已关押', '失控扩散', '结束'].includes(text)) return text;
  if (text === '未接触' || text === '待处理') return '未处理';
  if (/爆发|扩散|失控|蔓延/.test(text)) return '失控扩散';
  if (/压制|控制/.test(text)) return '已压制';
  if (/关押|收容/.test(text)) return '已关押';
  if (/结束|解决|完结/.test(text)) return '结束';
  if (/对抗|处理中|处置|交战|应对|调查/.test(text)) return '调查中';
  return '未处理';
}

function sheetHasEffectiveRows(sheet: unknown) {
  if (!sheet || typeof sheet !== 'object') return false;
  const content = (sheet as { content?: unknown }).content;
  if (!Array.isArray(content)) return false;
  return content.some(row => Array.isArray(row) && row.some(cell => String(cell ?? '').trim()));
}

function findSheetByTableName(dataSource: unknown, names: string[]) {
  if (!dataSource || typeof dataSource !== 'object') return null;
  const wanted = new Set(names.map(name => name.toLowerCase()));
  for (const value of Object.values(dataSource as Record<string, unknown>)) {
    if (!value || typeof value !== 'object') continue;
    const sheet = value as { name?: string; uid?: string };
    const name = String(sheet.name ?? '').toLowerCase();
    const uid = String(sheet.uid ?? '').toLowerCase();
    if (wanted.has(name) || wanted.has(uid) || names.some(item => name.includes(item.toLowerCase()))) {
      return value;
    }
  }
  return null;
}

function unwrapStatData(raw: unknown): StatData {
  const root = asRecord(raw);
  if (root.stat_data && typeof root.stat_data === 'object' && !Array.isArray(root.stat_data)) {
    return asRecord(root.stat_data);
  }
  return root;
}

function readMvuStat(hostWindow: HostWindow): StatData {
  const option = { type: 'message', message_id: 'latest' as const };
  try {
    const fromMvu = hostWindow.Mvu?.getMvuData?.(option);
    if (fromMvu) return unwrapStatData(fromMvu);
  } catch {
    // fall through
  }
  try {
    const fromVars = hostWindow.getVariables?.(option);
    if (fromVars) return unwrapStatData(fromVars);
  } catch {
    // fall through
  }
  try {
    const chatVars = hostWindow.getVariables?.({ type: 'chat' });
    if (chatVars) return unwrapStatData(chatVars);
  } catch {
    // fall through
  }
  return {};
}

function getLatestMessageId(hostWindow: HostWindow) {
  try {
    const chat = hostWindow.SillyTavern?.getContext?.()?.chat;
    if (!Array.isArray(chat) || chat.length === 0) return Date.now() % 10000;
    for (let index = chat.length - 1; index >= 0; index -= 1) {
      const message = chat[index];
      if (message && !message.is_user) {
        return Number(message.message_id ?? index);
      }
    }
  } catch {
    // ignore
  }
  return Date.now() % 10000;
}

function buildCorePlans(stat: StatData, currentData: unknown, messageId: number): TableChangePlan[] {
  const event = asRecord(stat.当前灵异事件);
  const mainline = asRecord(stat.主线进度);
  const worldPressure = asRecord(mainline.世界压力);
  const faction = asRecord(stat.势力关系);
  const resources = asRecord(stat.灵异资源);
  const rider = asRecord(stat.驭鬼者状态);
  const judgement = asRecord(stat.最近行动判定);
  const controlled = Array.isArray(rider.已驾驭厉鬼) ? rider.已驾驭厉鬼 : [];
  const location = textOrFallback(stat.所在位置 ?? event.发生地点, '未知');
  const eventCode = textOrFallback(event.事件代号, '开局灵异征兆');
  const knownLaws = listText(event.已知杀人规律);
  const suspectedLaws = listText(event.猜测杀人规律);
  const visibleSummary = truncateDbText(
    event.可见摘要 ?? suspectedLaws ?? knownLaws,
    160,
    '当前剧情出现可见异常，等待进一步验证。',
  );
  const plans: TableChangePlan[] = [];

  if (!sheetHasEffectiveRows(findSheetByTableName(currentData, ['global_state', '全局状态']))) {
    plans.push({
      action: 'updateCell',
      table: '全局状态',
      match: { row_id: 1 },
      set: {
        row_id: 1,
        game_time: '2004-07-01 08:00',
        current_location: location,
        current_city: textOrFallback(faction.所属城市, '大昌市'),
        canon_stage: textOrFallback(stat.原著阶段, '开局接入'),
        canon_anchor: textOrFallback(stat.剧情锚点, '玩家开局'),
        main_phase: textOrFallback(mainline.当前阶段, '开局接入'),
        world_pressure: clampPercent(worldPressure.灵异复苏强度, 10),
        hq_attention: clampPercent(worldPressure.总部关注度, 0),
        public_exposure: clampPercent(worldPressure.社会公开度, 0),
      },
      reason: '数据库前端 MVU 核心表镜像',
      confidence: 1,
      skipChatSave: true,
      silent: true,
    });
  }

  if (!sheetHasEffectiveRows(findSheetByTableName(currentData, ['player_state', '玩家状态']))) {
    const ghostNames = controlled
      .map(item => textOrFallback(asRecord(item).代号 ?? asRecord(item).厉鬼名称, ''))
      .filter(Boolean);
    const itemNames = Array.isArray(resources.灵异物品)
      ? resources.灵异物品.map(item => textOrFallback(asRecord(item).名称, '')).filter(Boolean)
      : [];
    plans.push({
      action: 'updateCell',
      table: '玩家状态',
      match: { row_id: 1 },
      set: {
        row_id: 1,
        name: textOrFallback(stat.姓名, '{{user}}'),
        identity_text: textOrFallback(stat.身份, '普通人'),
        location_name: location,
        status_text: textOrFallback(stat.状态, '健康'),
        death_risk: clampPercent(stat.风险值, 0),
        revival_risk: clampPercent(rider.总复苏风险, 0),
        controlled_ghosts: ghostNames.length ? ghostNames.join('；') : '无',
        ghost_pieces: textOrFallback(stat.持有拼图, '无'),
        resources_text: `拼图：${textOrFallback(stat.持有拼图, '无')}；物品：${itemNames.length ? itemNames.join('、') : '无'}；黄金：${textOrFallback(resources.黄金储备, '未准备')}`,
        last_action: textOrFallback(judgement.行动, '开局接入'),
      },
      reason: '数据库前端 MVU 核心表镜像',
      confidence: 1,
      skipChatSave: true,
      silent: true,
    });
  }

  if (!sheetHasEffectiveRows(findSheetByTableName(currentData, ['supernatural_events', '灵异事件']))) {
    plans.push({
      action: 'insertRow',
      table: '灵异事件',
      data: {
        event_code: eventCode,
        danger_level: textOrFallback(event.危害等级, '未知'),
        location_name: location,
        ghost_domain_status: textOrFallback(event.鬼域状态, '未确认'),
        known_laws: knownLaws,
        suspected_laws: suspectedLaws,
        wrong_inferences: listText(event.错误推断),
        death_count: clampPercent(event.已死亡人数, 0),
        spread_trend: textOrFallback(event.扩散趋势, '局部'),
        handling_status: normalizeHandlingStatus(event.处理状态),
        public_summary: visibleSummary,
      },
      reason: '数据库前端 MVU 核心表镜像',
      confidence: 1,
      skipChatSave: true,
      silent: true,
    });
  }

  if (!sheetHasEffectiveRows(findSheetByTableName(currentData, ['clues', '线索']))) {
    plans.push({
      action: 'insertRow',
      table: '线索',
      data: {
        clue_code: `C${messageId % 10000}`,
        event_code: eventCode,
        source_text: '当前剧情/MVU',
        clue_text: truncateDbText(visibleSummary, 120),
        reliability: '中',
        inference_text: truncateDbText(suspectedLaws === '无' ? '需要继续验证异常与事件规律的关系。' : suspectedLaws, 160),
        verification_status: '未验证',
        visibility: '玩家可见',
      },
      reason: '数据库前端 MVU 核心表镜像',
      confidence: 1,
      skipChatSave: true,
      silent: true,
    });
  }

  return plans;
}

function buildActionSuggestionPlans(stat: StatData): TableChangePlan[] {
  const suggestions = Array.isArray(stat.行动建议) ? stat.行动建议 : [];
  if (suggestions.length === 0) return [];
  const byKey = new Map<string, StatData>();
  for (const item of suggestions) {
    const row = asRecord(item);
    const key = String(row.选项 ?? '')
      .trim()
      .toUpperCase();
    if (ACTION_KEYS.includes(key as (typeof ACTION_KEYS)[number])) byKey.set(key, row);
  }
  if (!ACTION_KEYS.every(key => byKey.has(key))) return [];

  return ACTION_KEYS.map((key, index) => {
    const row = byKey.get(key) ?? {};
    const set: Record<string, Primitive> = {
      option_key: key,
      idea_text: truncateDbText(row.思路 ?? (key === 'D' ? '自定义行动' : '推进当前调查'), 80, '未知'),
      main_risk: truncateDbText(row.主要风险, 80, '未知'),
      expected_gain: truncateDbText(row.预期收益 ?? (key === 'D' ? '取决于自定义行动' : '推进当前调查或降低不确定性'), 80, '未知'),
      death_risk_level: normalizeRiskLevel(row.死亡风险, 0),
      revival_risk_level: normalizeRiskLevel(row.复苏风险, 0),
    };
    return {
      action: 'updateCell' as const,
      table: '行动建议',
      match: { row_id: index + 1 },
      set: { row_id: index + 1, ...set },
      reason: '数据库前端 MVU 行动建议镜像',
      confidence: 1,
      skipChatSave: true,
      silent: true,
    };
  });
}

async function runMirrorOnce(hostWindow: HostWindow) {
  const api = hostWindow.MysteryDatabaseFrontend;
  if (!api?.applyTableChangePlan || !api.exportCurrentData) return;

  const stat = readMvuStat(hostWindow);
  if (!Object.keys(stat).length) return;

  const currentData = await api.exportCurrentData();
  const messageId = getLatestMessageId(hostWindow);
  const plans = [...buildCorePlans(stat, currentData, messageId), ...buildActionSuggestionPlans(stat)];
  if (!plans.length) return;

  for (const plan of plans) {
    try {
      const result = await api.applyTableChangePlan(plan);
      if (!result?.ok) {
        console.warn('[MFRS CoreMirror] 计划失败', { plan, result });
      }
    } catch (error) {
      console.warn('[MFRS CoreMirror] 计划异常', { plan, error });
    }
  }
}

function getEventName(hostWindow: HostWindow, key: 'GENERATION_ENDED' | 'MESSAGE_RECEIVED', fallback: string) {
  const fromContext = hostWindow.SillyTavern?.getContext?.()?.event_types?.[key];
  if (typeof fromContext === 'string' && fromContext) return fromContext;
  const fromTavern = hostWindow.tavern_events?.[key];
  if (typeof fromTavern === 'string' && fromTavern) return fromTavern;
  return fallback;
}

export function installMvuCoreMirror(hostWindow: HostWindow) {
  const marker = '__mfrsCoreMirrorInstalled__';
  if ((hostWindow as HostWindow & Record<string, unknown>)[marker]) return () => {};
  (hostWindow as HostWindow & Record<string, unknown>)[marker] = true;

  let queue: Promise<void> = Promise.resolve();
  let timer: number | null = null;
  const schedule = (delay = 0) => {
    if (timer != null) window.clearTimeout(timer);
    timer = window.setTimeout(() => {
      timer = null;
      queue = queue
        .then(() => runMirrorOnce(hostWindow))
        .catch(error => console.warn('[MFRS CoreMirror] 运行失败', error));
    }, delay);
  };

  const generationEnded = getEventName(hostWindow, 'GENERATION_ENDED', 'generation_ended');
  const messageReceived = getEventName(hostWindow, 'MESSAGE_RECEIVED', 'message_received');
  const listeners: Array<{ off?: () => void }> = [];

  const bind = (eventName: string) => {
    const context = hostWindow.SillyTavern?.getContext?.();
    const eventSource = context?.eventSource;
    if (eventSource && typeof eventSource.on === 'function') {
      const listener = () => schedule(300);
      eventSource.on(eventName, listener);
      listeners.push({
        off: () => eventSource.off?.(eventName, listener),
      });
      return true;
    }
    if (typeof hostWindow.eventOn === 'function') {
      hostWindow.eventOn(eventName, () => schedule(300));
      return true;
    }
    return false;
  };

  const boundEnded = bind(generationEnded);
  const boundReceived = bind(messageReceived);
  if (!boundEnded && !boundReceived) {
    console.warn('[MFRS CoreMirror] 未找到事件通道，仅在安装时尝试一次镜像');
  }

  schedule(800);
  console.info('[MFRS CoreMirror] 已安装 MVU→DB 核心表镜像（接管原 App.vue 孤儿逻辑）');

  return () => {
    if (timer != null) window.clearTimeout(timer);
    for (const item of listeners) item.off?.();
    delete (hostWindow as HostWindow & Record<string, unknown>)[marker];
  };
}
