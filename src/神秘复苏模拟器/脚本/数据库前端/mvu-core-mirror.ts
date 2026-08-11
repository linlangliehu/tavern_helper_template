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
  const text =
    String(value ?? '')
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

/**
 * 判断快照里是否已存在某个业务键的行。
 *
 * 用于灵异事件 / 线索的 upsert 决策：列名在导出快照里可能是物理列名（event_code）
 * 也可能是中文表头（事件代号），两种都要认。
 *
 * 注意：这只是"能否用 update 命中"的乐观判断。快照本身可能滞后于物理表
 * （sqlite provider 未就绪时导出会回退到内存视图），此时会误判为不存在而走 insert，
 * 由适配器层的 UNIQUE 校验兜底拒绝，下一轮快照就绪后自然转为 update。
 */
function sheetHasRowMatching(sheet: unknown, physicalColumn: string, headerAliases: string[], value: string) {
  if (!sheet || typeof sheet !== 'object') return false;
  const content = (sheet as { content?: unknown }).content;
  if (!Array.isArray(content) || content.length < 2) return false;
  const header = content[0];
  if (!Array.isArray(header)) return false;

  const wanted = new Set([physicalColumn, ...headerAliases].map(name => name.toLowerCase()));
  const columnIndex = header.findIndex(cell => wanted.has(String(cell ?? '').trim().toLowerCase()));
  if (columnIndex < 0) return false;

  const expected = String(value ?? '').trim();
  if (!expected) return false;
  return content
    .slice(1)
    .some(row => Array.isArray(row) && String(row[columnIndex] ?? '').trim() === expected);
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

  // 全局状态/玩家状态是固定单行表（row_id CHECK = 1），模板已预置该行。
  // 这里每轮无条件 updateCell：镜像的价值在于让数据库跟上剧情，
  // 早期只在"表为空"时补种会让数据库永远停在开局快照。
  // 不走 insertRow —— 固定行表的 update→insert 提升已在 table-change-adapter
  // 里被禁止（快照可能陈旧而物理表已有该行，INSERT 会撞 UNIQUE）。
  plans.push({
    action: 'updateCell',
    table: '全局状态',
    match: { row_id: 1 },
    set: {
      row_id: 1,
      game_time: textOrFallback(stat.当前时间 ?? stat.游戏时间, '2004-07-01 08:00'),
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

  // 灵异事件按 event_code 业务键 upsert：同一事件每轮刷新（死亡人数、处理状态、已知规律都会变），
  // 换事件代号才追加新行。event_code 在 DDL 里是 UNIQUE，所以只能靠 match 命中既有行来更新，
  // 不能无脑 insert。找不到该代号时才 insert 新行。
  const eventsSheet = findSheetByTableName(currentData, ['supernatural_events', '灵异事件']);
  const eventFields = {
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
  };
  plans.push(
    sheetHasRowMatching(eventsSheet, 'event_code', ['事件代号'], eventCode)
      ? {
          action: 'updateCell',
          table: '灵异事件',
          match: { event_code: eventCode },
          set: eventFields,
          reason: '数据库前端 MVU 核心表镜像',
          confidence: 1,
          skipChatSave: true,
          silent: true,
        }
      : {
          action: 'insertRow',
          table: '灵异事件',
          data: eventFields,
          reason: '数据库前端 MVU 核心表镜像',
          confidence: 1,
          skipChatSave: true,
          silent: true,
        },
  );

  // 线索按 clue_code upsert。clue_code 由 messageId 派生，同一楼层重复镜像（重roll/重渲染）
  // 必须落到同一行而不是每次追加，否则线索表会被同一条线索刷屏。
  const clueCode = `C${messageId % 10000}`;
  const cluesSheet = findSheetByTableName(currentData, ['clues', '线索']);
  const clueFields = {
    clue_code: clueCode,
    event_code: eventCode,
    source_text: '当前剧情/MVU',
    clue_text: truncateDbText(visibleSummary, 120),
    reliability: '中',
    inference_text: truncateDbText(suspectedLaws === '无' ? '需要继续验证异常与事件规律的关系。' : suspectedLaws, 160),
    verification_status: '未验证',
    visibility: '玩家可见',
  };
  plans.push(
    sheetHasRowMatching(cluesSheet, 'clue_code', ['线索代号', '线索编号'], clueCode)
      ? {
          action: 'updateCell',
          table: '线索',
          match: { clue_code: clueCode },
          set: clueFields,
          reason: '数据库前端 MVU 核心表镜像',
          confidence: 1,
          skipChatSave: true,
          silent: true,
        }
      : {
          action: 'insertRow',
          table: '线索',
          data: clueFields,
          reason: '数据库前端 MVU 核心表镜像',
          confidence: 1,
          skipChatSave: true,
          silent: true,
        },
  );

  plans.push(...buildCharacterPlans(stat, currentData, location));
  plans.push(...buildLocationPlans(stat, currentData, eventCode));

  return plans;
}

// 人物/地点只补新行：镜像只能从 stat_data 推出姓名、身份、所在地点这类骨架字段，
// 阵营/生死/能力/关系/情报都得填「未知」占位。ACU 填表拿到的是完整 AI 情报，
// 因此已存在的行一律不碰，避免占位值把 ACU 写好的内容冲掉。
function buildCharacterPlans(stat: StatData, currentData: unknown, location: string): TableChangePlan[] {
  const roster = Array.isArray(stat.在场人物) ? stat.在场人物 : [];
  if (roster.length === 0) return [];
  const sheet = findSheetByTableName(currentData, ['characters', '人物']);
  const plans: TableChangePlan[] = [];
  const seen = new Set<string>();

  for (const entry of roster) {
    // 「周正-讲台上的刑警」→ 姓名 + 身份；没有分隔符时整串当姓名。
    const raw = String(entry ?? '').trim();
    if (!raw) continue;
    const separator = raw.search(/[-–—]/);
    const name = (separator >= 0 ? raw.slice(0, separator) : raw).trim();
    const identity = separator >= 0 ? raw.slice(separator + 1).trim() : '';
    if (!name || seen.has(name)) continue;
    seen.add(name);
    if (sheetHasRowMatching(sheet, 'name', ['姓名'], name)) continue;

    plans.push({
      action: 'insertRow',
      table: '人物',
      data: {
        name,
        identity_text: textOrFallback(identity, '未知'),
        faction_text: '未知',
        location_name: location,
        presence_status: '在场',
        life_status: '未知',
        supernatural_ability: '未知',
        relations_text: '未知',
        known_info: truncateDbText(raw, 400, '未知'),
      },
      reason: '数据库前端 MVU 核心表镜像',
      confidence: 1,
      skipChatSave: true,
      silent: true,
    });
  }

  return plans;
}

function buildLocationPlans(stat: StatData, currentData: unknown, eventCode: string): TableChangePlan[] {
  const event = asRecord(stat.当前灵异事件);
  const sheet = findSheetByTableName(currentData, ['locations', '地点']);
  const city = textOrFallback(asRecord(stat.势力关系).所属城市, '未知');
  const domainStatus = String(event.鬼域状态 ?? '').trim();
  const plans: TableChangePlan[] = [];
  const seen = new Set<string>();

  // 事件发生地在前：它带得动灵异状态，当前位置通常是它内部的一个房间。
  for (const candidate of [event.发生地点, stat.所在位置, stat.开局地点]) {
    const name = String(candidate ?? '').trim();
    if (!name || seen.has(name)) continue;
    seen.add(name);
    if (sheetHasRowMatching(sheet, 'location_name', ['地点名'], name)) continue;

    plans.push({
      action: 'insertRow',
      table: '地点',
      data: {
        location_name: name,
        city_name: city,
        location_type: '未知',
        supernatural_status: domainStatus === '已确认' ? '鬼域影响' : '疑似灵异',
        lockdown_status: '未封锁',
        related_event: eventCode,
        description: truncateDbText(`${name}（${city}）`, 120, '未知'),
        interaction_options: '未知',
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
      expected_gain: truncateDbText(
        row.预期收益 ?? (key === 'D' ? '取决于自定义行动' : '推进当前调查或降低不确定性'),
        80,
        '未知',
      ),
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
  // AutoCardUpdaterAPI 是底层依赖；数据库脚本可能晚于本模块加载，
  // 未就绪时静默跳过本次，等下次 schedule 重试。
  if (!(hostWindow as any).AutoCardUpdaterAPI) return;

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

// 仅供门禁/单元测试导出的纯函数（生产打包无副作用，不暴露到全局）。
export { buildCharacterPlans, buildLocationPlans };
