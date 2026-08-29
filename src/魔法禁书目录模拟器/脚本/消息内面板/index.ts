// 消息内状态面板脚本 - 魔法禁书目录模拟器轻量版
// 在每条 AI 消息内嵌入 4 个折叠卡片（玩家/能力/任务/关系），数据来自 stat_data。
// 去数据库依赖；[[MFrsStatus]] 标记渲染为对应折叠卡片。
import { registerMfrsRuntimeBuild } from '../_runtime_identity';
import { applyUpdateProtocolToStatData } from './raw-status-data';

registerMfrsRuntimeBuild('消息内面板');

/* eslint-disable */
// 酒馆助手运行时注入的全局 API（无 d.ts，按参考卡用法直接使用）
declare const getVariables: (opts: { type: string; message_id: number }) => Record<string, any> | undefined;
declare const getChatMessages: (id?: number) => any[] | undefined;
declare const tavern_events: Record<string, string> | undefined;
declare function eventOn(name: string, cb: (...a: any[]) => void): { stop: () => void };
declare const _: any;

type StatusData = Record<string, any>;
type EventSubscription = { stop: () => void };

type MessagePanelHostWindow = Window & {
  MagicIndexMessagePanel?: { refreshAll: () => void; refreshMessage: (id: number | string) => void };
  __mfrsMessagePanelCleanup__?: () => void;
  SillyTavern?: {
    getContext?: () => {
      characterId?: string | number;
      characters?: Array<{ name?: string; avatar?: string }> | Record<string, { name?: string; avatar?: string }>;
      chat?: Array<{ is_user?: boolean; mes?: string; message?: string; extra?: Record<string, unknown> }>;
    };
  };
};

const hostWindow = (window.parent ?? window) as MessagePanelHostWindow;
const doc: Document = hostWindow.document ?? document;

// 卡片身份检测：魔法禁书目录模拟器（含本地 DEV 卡）
const magicIndexCardNames = new Set(['魔法禁书目录模拟器']);
const magicIndexCardAvatars = new Set(['魔法禁书目录模拟器.png']);

function isMagicIndexCardIdentity(name?: string | null, avatar?: string | null): boolean {
  if (name) {
    if (magicIndexCardNames.has(name)) return true;
    if (/^魔法禁书目录模拟器(?:\s*[·•-]\s*|\s+)DEV\b/u.test(name)) return true;
  }
  if (avatar) {
    if (magicIndexCardAvatars.has(avatar)) return true;
    if (/^魔法禁书目录模拟器(?:\s*[·•-]\s*|\s+)DEV\b.*\.png$/iu.test(avatar)) return true;
  }
  return false;
}

function getSillyTavernContext() {
  for (const st of [hostWindow.SillyTavern, (window as MessagePanelHostWindow).SillyTavern]) {
    try {
      const context = st?.getContext?.();
      if (context) return context;
    } catch {
      // Context can be briefly incomplete while SillyTavern switches chats.
    }
  }
  return null;
}

function isMagicIndexCardActive(): boolean {
  const context = getSillyTavernContext();
  const characterId = context?.characterId;
  if (characterId === undefined || characterId === null) return false;
  const characters = context?.characters;
  const character = Array.isArray(characters)
    ? characters[Number(characterId)]
    : characters?.[String(characterId)];
  return Boolean(character && isMagicIndexCardIdentity(character.name, character.avatar));
}

/* ---------- 工具函数 ---------- */

function isElementNode(value: unknown): value is Element {
  return Boolean(value && typeof value === 'object' && (value as Node).nodeType === 1);
}

/** 从值中提取第一个数字，无数字返回 null */
function toNumber(value: unknown): number | null {
  const match = String(value ?? '').match(/-?\d+(?:\.\d+)?/);
  return match ? Number(match[0]) : null;
}

/** 百分比转 0-100 clamp（用于好感度等数值字段） */
function clampPercent(value: unknown): number {
  const n = toNumber(value);
  if (n === null) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}

/** 值转文本，空值返回 fallback */
function valueText(value: unknown, fallback = '未知'): string {
  const text = String(value ?? '').trim();
  return text || fallback;
}

/** 安全转义文本 */
function esc(value: unknown, fallback = ''): string {
  const text = String(value ?? '').trim();
  return _.escape(text || fallback);
}

function isUserMessage(mesElement: Element): boolean {
  return mesElement.getAttribute('is_user') === 'true' || mesElement.classList.contains('user');
}

/** 从 .mes 容器读取对应楼层的 stat_data（含协议兜底） */
function readStatusForMessage(mesElement: Element): StatusData {
  try {
    const mesid = mesElement.getAttribute('mesid');
    if (!mesid) return {};
    const messageId = parseInt(mesid, 10);
    if (isNaN(messageId)) return {};
    let data = _.get(getVariables({ type: 'message', message_id: messageId }), 'stat_data', {}) ?? {};
    if (!data || typeof data !== 'object' || Array.isArray(data)) data = {};
    // 协议兜底：把消息正文里的 JSONPatch 应用到 stat_data
    try {
      const raw = getMessageProtocolTextForElement(mesElement);
      if (raw && /<UpdateVariable|<JSONPatch/i.test(raw)) {
        data = applyUpdateProtocolToStatData(data, raw);
      }
    } catch {
      // 协议兜底失败时用原始 stat_data
    }
    return data;
  } catch {
    return {};
  }
}

const RAW_PROTOCOL_EXTRA_KEY = '_mfrs_raw_protocol_message';

function readMessageProtocolText(msg: any): string {
  const rawExtra = msg?.extra?.[RAW_PROTOCOL_EXTRA_KEY];
  if (typeof rawExtra === 'string' && rawExtra.trim()) {
    if (/<choices\b|<UpdateVariable\b|<JSONPatch\b/i.test(rawExtra)) return rawExtra.trim();
  }
  const mes = String(msg?.message ?? msg?.mes ?? '').trim();
  if (mes) return mes;
  if (typeof rawExtra === 'string' && rawExtra.trim()) return rawExtra.trim();
  return '';
}

function getMessageProtocolTextForElement(mesElement: Element): string {
  const mesid = mesElement.getAttribute('mesid');
  const messageId = mesid == null ? NaN : parseInt(mesid, 10);
  try {
    const chat = getSillyTavernContext()?.chat;
    if (Array.isArray(chat)) {
      const hit = chat.find(message => Number(message?.message_id) === messageId) ?? chat[messageId];
      const raw = readMessageProtocolText(hit);
      if (raw) return raw;
    }
  } catch {
    // fall through to DOM
  }
  return String(mesElement.querySelector('.mes_text')?.textContent ?? '').trim();
}

function getLatestAiMessageElement(): Element | null {
  const all = doc.querySelectorAll('.mes');
  for (let i = all.length - 1; i >= 0; i -= 1) {
    const el = all[i];
    if (!isUserMessage(el)) return el;
  }
  return null;
}

function getLatestAiMessageRawText(): string {
  const mes = getLatestAiMessageElement();
  const mesid = mes?.getAttribute('mesid');
  const messageId = mesid != null ? parseInt(mesid, 10) : NaN;
  try {
    const chat = getSillyTavernContext()?.chat;
    if (Array.isArray(chat) && chat.length > 0) {
      const hit = !Number.isNaN(messageId)
        ? chat[messageId]
        : [...chat].reverse().find(message => !message?.is_user);
      const raw = readMessageProtocolText(hit);
      if (raw) return raw;
    }
  } catch {
    // fall through
  }
  return String(mes?.querySelector('.mes_text')?.textContent ?? '').trim();
}

function getPanelId(mesid: string): string {
  return `mfrs-panel-${mesid.replace(/[^a-zA-Z0-9_-]/g, '-')}`;
}

/* ---------- 渲染防护 key ---------- */

function getPanelRenderKey(data: StatusData): string {
  let source = '';
  try {
    const raw = getLatestAiMessageRawText();
    source = JSON.stringify({ data, rawProtocol: raw ? applyUpdateProtocolToStatData(data, raw) : null });
  } catch {
    source = String(data);
  }
  let hash = 2166136261;
  for (let i = 0; i < source.length; i += 1) {
    hash ^= source.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return `${source.length}-${(hash >>> 0).toString(36)}`;
}

/* ---------- 4 折叠卡片构建 ---------- */

/** 玩家卡：按 *** 分 3 段 */
function buildPlayerCardHtml(data: StatusData): string {
  const 姓名 = valueText(data.姓名, '未设定');
  const 性别 = valueText(data.性别);
  const 年龄 = valueText(data.年龄);
  const 性格 = valueText(data.性格);
  const 外貌 = valueText(data.外貌, '未描述');
  const 阵营 = valueText(data.阵营, '未选定');
  const 身份 = valueText(data.身份, '');
  const 状态 = valueText(data.状态, '健康');
  const 身体 = valueText(data.身体, '良好');
  const 情绪 = valueText(data.情绪, '平静');
  const 所在位置 = valueText(data.所在位置, '未知');
  const 剧情阶段 = valueText(_.get(data, '主线进度.当前阶段'), '开局接入');
  const 能力档案 = Array.isArray(data.能力档案) ? data.能力档案 : [];
  const 能力摘要 =
    能力档案.length > 0
      ? 能力档案
          .map((a: any) => {
            const 名 = valueText(a?.能力名称, '未觉醒');
            const 等 = valueText(a?.等级或位阶, '');
            const 类 = valueText(a?.阵营类型, '');
            return `${esc(名)}${等 ? `（${esc(等)}）` : ''}${类 && 类 !== '无能力' ? ` · ${esc(类)}` : ''}`;
          })
          .join('、')
      : '未觉醒';

  // 三段：基础信息 / 能力身份 / 当前状态
  const seg1 = `
<div class="mfrs-mp-seg">
  <div class="mfrs-mp-seg-title">基础信息</div>
  <div class="mfrs-mp-kv"><span class="mfrs-mp-k">姓名</span><span class="mfrs-mp-v">${esc(姓名)}</span></div>
  <div class="mfrs-mp-kv"><span class="mfrs-mp-k">性别 / 年龄</span><span class="mfrs-mp-v">${esc(性别)} · ${esc(年龄)}</span></div>
  <div class="mfrs-mp-kv"><span class="mfrs-mp-k">性格</span><span class="mfrs-mp-v">${esc(性格)}</span></div>
  <div class="mfrs-mp-kv"><span class="mfrs-mp-k">外貌</span><span class="mfrs-mp-v">${esc(外貌)}</span></div>
</div>`;

  const seg2 = `
<div class="mfrs-mp-seg">
  <div class="mfrs-mp-seg-title">阵营与能力</div>
  <div class="mfrs-mp-kv"><span class="mfrs-mp-k">阵营</span><span class="mfrs-mp-v">${esc(阵营)}</span></div>
  ${身份 ? `<div class="mfrs-mp-kv"><span class="mfrs-mp-k">身份</span><span class="mfrs-mp-v">${esc(身份)}</span></div>` : ''}
  <div class="mfrs-mp-kv"><span class="mfrs-mp-k">能力</span><span class="mfrs-mp-v">${能力摘要}</span></div>
</div>`;

  const seg3 = `
<div class="mfrs-mp-seg">
  <div class="mfrs-mp-seg-title">当前状态</div>
  <div class="mfrs-mp-kv"><span class="mfrs-mp-k">状态 / 身体</span><span class="mfrs-mp-v">${esc(状态)} · ${esc(身体)}</span></div>
  <div class="mfrs-mp-kv"><span class="mfrs-mp-k">情绪</span><span class="mfrs-mp-v">${esc(情绪)}</span></div>
  <div class="mfrs-mp-kv"><span class="mfrs-mp-k">位置</span><span class="mfrs-mp-v">${esc(所在位置)}</span></div>
  <div class="mfrs-mp-kv"><span class="mfrs-mp-k">阶段</span><span class="mfrs-mp-v">${esc(剧情阶段)}</span></div>
</div>`;

  return `<details class="mfrs-mp-card mfrs-mp-card-player" data-mfrs-card="player">
  <summary><i class="fa-solid fa-user" aria-hidden="true"></i><span>玩家</span><span class="mfrs-mp-summary-name">${esc(姓名)} · ${esc(阵营)}</span></summary>
  ${seg1}${seg2}${seg3}
</details>`;
}

/** 能力卡：能力档案数组 */
function buildAbilityCardHtml(data: StatusData): string {
  const 能力档案 = Array.isArray(data.能力档案) ? data.能力档案 : [];
  if (!能力档案.length) {
    return `<details class="mfrs-mp-card mfrs-mp-card-ability" data-mfrs-card="ability">
  <summary><i class="fa-solid fa-bolt" aria-hidden="true"></i><span>能力</span><span class="mfrs-mp-summary-name">无</span></summary>
  <div class="mfrs-mp-empty">无</div>
</details>`;
  }
  const items = 能力档案
    .map((a: any, i: number) => {
      const 名 = valueText(a?.能力名称, '未觉醒');
      const 类 = valueText(a?.阵营类型, '无能力');
      const 等 = valueText(a?.等级或位阶, 'Level 0');
      const 效果 = valueText(a?.能力效果, '');
      const 稳 = a?.是否稳定 === false ? '不稳定' : '稳定';
      const 运用 = valueText(a?.实战运用, '');
      return `<details class="mfrs-mp-subcard" data-mfrs-ability="${i}">
  <summary><i class="fa-solid fa-bolt-lightning" aria-hidden="true"></i><span>${esc(名)}</span><span class="mfrs-mp-summary-name">${esc(等)} · ${esc(类)}</span></summary>
  <div class="mfrs-mp-kv"><span class="mfrs-mp-k">类型</span><span class="mfrs-mp-v">${esc(类)}</span></div>
  <div class="mfrs-mp-kv"><span class="mfrs-mp-k">等级 / 位阶</span><span class="mfrs-mp-v">${esc(等)}</span></div>
  ${效果 ? `<div class="mfrs-mp-kv"><span class="mfrs-mp-k">效果</span><span class="mfrs-mp-v">${esc(效果)}</span></div>` : ''}
  ${运用 ? `<div class="mfrs-mp-kv"><span class="mfrs-mp-k">实战运用</span><span class="mfrs-mp-v">${esc(运用)}</span></div>` : ''}
  <div class="mfrs-mp-kv"><span class="mfrs-mp-k">稳定性</span><span class="mfrs-mp-v">${esc(稳)}</span></div>
</details>`;
    })
    .join('');
  return `<details class="mfrs-mp-card mfrs-mp-card-ability" data-mfrs-card="ability">
  <summary><i class="fa-solid fa-bolt" aria-hidden="true"></i><span>能力</span><span class="mfrs-mp-summary-name">${能力档案.length} 项</span></summary>
  ${items}
</details>`;
}

/** 任务卡：任务追踪数组（8 字段树状） */
function buildTaskCardHtml(data: StatusData): string {
  const 任务追踪 = Array.isArray(data.任务追踪) ? data.任务追踪 : [];
  if (!任务追踪.length) {
    return `<details class="mfrs-mp-card mfrs-mp-card-task" data-mfrs-card="task">
  <summary><i class="fa-solid fa-list-check" aria-hidden="true"></i><span>任务</span><span class="mfrs-mp-summary-name">无</span></summary>
  <div class="mfrs-mp-empty">无</div>
</details>`;
  }
  const items = 任务追踪
    .map((t: any, i: number) => {
      const 发布者 = valueText(t?.发布者, '');
      const 任务名称 = valueText(t?.任务名称, '未命名任务');
      const 任务类型 = valueText(t?.任务类型, '');
      const 任务描述 = valueText(t?.任务描述, '');
      const 任务目标 = valueText(t?.任务目标, '');
      const 任务奖励 = valueText(t?.任务奖励, '');
      const 截止时间 = valueText(t?.截止时间, '');
      const 当前进度 = valueText(t?.当前进度, '');
      return `<details class="mfrs-mp-subcard" data-mfrs-task="${i}">
  <summary><i class="fa-solid fa-clipboard-list" aria-hidden="true"></i><span>${esc(任务名称)}</span><span class="mfrs-mp-summary-name">${esc(当前进度) || '待推进'}</span></summary>
  <div class="mfrs-mp-kv"><span class="mfrs-mp-k">发布者</span><span class="mfrs-mp-v">${esc(发布者) || '无'}</span></div>
  <div class="mfrs-mp-kv"><span class="mfrs-mp-k">任务类型</span><span class="mfrs-mp-v">${esc(任务类型) || '无'}</span></div>
  <div class="mfrs-mp-kv"><span class="mfrs-mp-k">任务描述</span><span class="mfrs-mp-v">${esc(任务描述) || '无'}</span></div>
  <div class="mfrs-mp-kv"><span class="mfrs-mp-k">任务目标</span><span class="mfrs-mp-v">${esc(任务目标) || '无'}</span></div>
  <div class="mfrs-mp-kv"><span class="mfrs-mp-k">任务奖励</span><span class="mfrs-mp-v">${esc(任务奖励) || '无'}</span></div>
  <div class="mfrs-mp-kv"><span class="mfrs-mp-k">截止时间</span><span class="mfrs-mp-v">${esc(截止时间) || '无'}</span></div>
  <div class="mfrs-mp-kv"><span class="mfrs-mp-k">当前进度</span><span class="mfrs-mp-v">${esc(当前进度) || '待推进'}</span></div>
</details>`;
    })
    .join('');
  return `<details class="mfrs-mp-card mfrs-mp-card-task" data-mfrs-card="task">
  <summary><i class="fa-solid fa-list-check" aria-hidden="true"></i><span>任务</span><span class="mfrs-mp-summary-name">${任务追踪.length} 项</span></summary>
  ${items}
</details>`;
}

/** 关系卡：NPC关系数组（二级折叠 + 好感度从高到低排序） */
function buildRelationCardHtml(data: StatusData): string {
  let npcs = Array.isArray(data.NPC关系) ? data.NPC关系 : [];
  // 好感度从高到低排序
  npcs = [...npcs].sort((a: any, b: any) => {
    const av = clampPercent(a?.好感度);
    const bv = clampPercent(b?.好感度);
    return bv - av;
  });
  if (!npcs.length) {
    return `<details class="mfrs-mp-card mfrs-mp-card-relation" data-mfrs-card="relation">
  <summary><i class="fa-solid fa-users" aria-hidden="true"></i><span>关系</span><span class="mfrs-mp-summary-name">无</span></summary>
  <div class="mfrs-mp-empty">无</div>
</details>`;
  }
  const items = npcs
    .map((n: any, i: number) => {
      const 角色名 = valueText(n?.角色名, '未命名');
      const 关系类型 = valueText(n?.关系类型, '');
      const 关系状态描述 = valueText(n?.关系状态描述, '');
      const 姓名 = valueText(n?.姓名, '');
      const 性别 = valueText(n?.性别, '');
      const 年龄 = valueText(n?.年龄, '');
      const 性格 = valueText(n?.性格, '');
      const 外貌 = valueText(n?.外貌, '');
      const 能力名称 = valueText(n?.能力名称, '');
      const 能力效果 = valueText(n?.能力效果, '');
      const 能力行 = [能力名称, 能力效果].filter(Boolean).join(' · ');
      const 好感度 = clampPercent(n?.好感度);
      const 认知 = valueText(n?.认知, '陌生');
      return `<details class="mfrs-mp-subcard mfrs-mp-subcard-npc" data-mfrs-npc="${i}">
  <summary><i class="fa-solid fa-user-group" aria-hidden="true"></i><span>${esc(角色名)}</span><span class="mfrs-mp-summary-name">${好感度}% · ${esc(认知)}</span></summary>
  <div class="mfrs-mp-kv"><span class="mfrs-mp-k">关系类型</span><span class="mfrs-mp-v">${esc(关系类型) || '无'}</span></div>
  <div class="mfrs-mp-kv"><span class="mfrs-mp-k">关系状态</span><span class="mfrs-mp-v">${esc(关系状态描述) || '无'}</span></div>
  ${姓名 ? `<div class="mfrs-mp-kv"><span class="mfrs-mp-k">姓名</span><span class="mfrs-mp-v">${esc(姓名)}</span></div>` : ''}
  ${性别 ? `<div class="mfrs-mp-kv"><span class="mfrs-mp-k">性别 / 年龄</span><span class="mfrs-mp-v">${esc(性别)} · ${esc(年龄)}</span></div>` : ''}
  ${性格 ? `<div class="mfrs-mp-kv"><span class="mfrs-mp-k">性格</span><span class="mfrs-mp-v">${esc(性格)}</span></div>` : ''}
  ${外貌 ? `<div class="mfrs-mp-kv"><span class="mfrs-mp-k">外貌</span><span class="mfrs-mp-v">${esc(外貌)}</span></div>` : ''}
  ${能力行 ? `<div class="mfrs-mp-kv"><span class="mfrs-mp-k">能力</span><span class="mfrs-mp-v">${esc(能力行)}</span></div>` : ''}
  <div class="mfrs-mp-kv"><span class="mfrs-mp-k">好感度</span><span class="mfrs-mp-v mfrs-mp-aff" data-aff="${好感度}">${好感度}%</span></div>
  <div class="mfrs-mp-kv"><span class="mfrs-mp-k">认知</span><span class="mfrs-mp-v">${esc(认知)}</span></div>
</details>`;
    })
    .join('');
  return `<details class="mfrs-mp-card mfrs-mp-card-relation" data-mfrs-card="relation">
  <summary><i class="fa-solid fa-users" aria-hidden="true"></i><span>关系</span><span class="mfrs-mp-summary-name">${npcs.length} 人</span></summary>
  ${items}
</details>`;
}

/** 根据 card 名构建对应卡片 HTML */
function buildCardByName(data: StatusData, name: string): string {
  switch (name) {
    case '玩家':
      return buildPlayerCardHtml(data);
    case '能力':
      return buildAbilityCardHtml(data);
    case '任务':
      return buildTaskCardHtml(data);
    case '关系':
      return buildRelationCardHtml(data);
    default:
      return '';
  }
}

/* ---------- 占位符渲染：[[MFrsStatus]]xxx[[/MFrsStatus]] ---------- */

const PLACEHOLDER_RE = /\[\[MFrsStatus\]\](玩家|能力|任务|关系)\[\[\/MFrsStatus\]\]/g;

/** 把 .mes_text 里的 [[MFrsStatus]] 占位符替换为折叠卡片 */
function renderPlaceholders(mesElement: Element, data: StatusData): void {
  const mesText = mesElement.querySelector('.mes_text');
  if (!mesText) return;
  // 只处理文本节点和占位符，避免破坏已有 DOM
  const html = mesText.innerHTML;
  if (!/\[\[MFrsStatus\]\]/.test(html)) return;
  const panelId = getPanelId(mesElement.getAttribute('mesid') || '');
  const replaced = html.replace(PLACEHOLDER_RE, (_m, name: string) => {
    return buildCardByName(data, name);
  });
  if (replaced !== html) {
    mesText.innerHTML = replaced;
    // 给卡片容器打渲染标记
    mesText.querySelectorAll('.mfrs-mp-card').forEach(card => {
      card.setAttribute('data-mfrs-render-key', getPanelRenderKey(data));
    });
  }
}

/** 若消息里没有占位符（旧消息/未透出），在末尾挂一个默认全卡片堆栈 */
function renderDefaultStack(mesElement: Element, data: StatusData): void {
  const mesText = mesElement.querySelector('.mes_text');
  if (!mesText) return;
  if (mesText.querySelector('.mfrs-mp-card')) return; // 已有卡片
  const panelId = getPanelId(mesElement.getAttribute('mesid') || '');
  const renderKey = getPanelRenderKey(data);
  // 已渲染过相同 key 则跳过
  const existing = mesElement.querySelector(`.mfrs-mp-stack`);
  if (existing && existing.getAttribute('data-mfrs-render-key') === renderKey) return;
  existing?.remove();
  const stack = doc.createElement('div');
  stack.className = 'mfrs-mp-stack';
  stack.setAttribute('data-mfrs-render-key', renderKey);
  stack.innerHTML = [
    buildPlayerCardHtml(data),
    buildAbilityCardHtml(data),
    buildTaskCardHtml(data),
    buildRelationCardHtml(data),
  ].join('');
  mesText.appendChild(stack);
}

/* ---------- 单条消息处理 ---------- */

function processOneMessage(messageId: number | string): void {
  if (!isMagicIndexCardActive()) return;
  const mes = doc.querySelector(`.mes[mesid="${messageId}"]`);
  if (!mes || isUserMessage(mes)) return;
  const data = readStatusForMessage(mes);
  renderPlaceholders(mes, data);
  // 最新消息补默认堆栈（仅在无占位符时）
  if (mes.classList.contains('last_mes')) renderDefaultStack(mes, data);
}

function processAllMessages(): void {
  if (!isMagicIndexCardActive()) return;
  doc.querySelectorAll('.mes').forEach(mes => {
    if (isUserMessage(mes)) return;
    const data = readStatusForMessage(mes);
    renderPlaceholders(mes, data);
    if (mes.classList.contains('last_mes')) renderDefaultStack(mes, data);
  });
}

/* ---------- 事件去抖 ---------- */

let refreshTimer: number | undefined;
function scheduleBurstRefresh(): void {
  if (refreshTimer !== undefined) hostWindow.clearTimeout(refreshTimer);
  refreshTimer = hostWindow.setTimeout(() => {
    refreshTimer = undefined;
    processAllMessages();
  }, 120);
}

function mutationTouchesChatMessage(mutation: MutationRecord): boolean {
  return mutation.addedNodes.length > 0 || mutation.removedNodes.length > 0;
}

function scheduleIdleRefresh(): void {
  if (refreshTimer !== undefined) hostWindow.clearTimeout(refreshTimer);
  refreshTimer = hostWindow.setTimeout(() => {
    refreshTimer = undefined;
    processAllMessages();
  }, 200);
}

/* ---------- 主入口 ---------- */

let observer: MutationObserver | null = null;
let observedChat: Element | null = null;
let runtimeActive = false;
let disposed = false;
const subscriptions: EventSubscription[] = [];
let chatChangedSub: EventSubscription | null = null;

const style = doc.createElement('style');
style.id = 'mfrs-mp-style';
style.textContent = `
/* 魔法禁书目录模拟器 · 消息内面板轻量版 · 深蓝科幻青蓝霓虹 */
.mfrs-mp-card, .mfrs-mp-subcard {
  border: 1px solid rgba(102, 204, 255, 0.25);
  border-radius: 10px;
  margin: 8px 0;
  background: linear-gradient(135deg, rgba(10, 18, 40, 0.7), rgba(18, 30, 60, 0.5));
  overflow: hidden;
  transition: border-color .2s, box-shadow .2s;
}
.mfrs-mp-card[open], .mfrs-mp-subcard[open] {
  border-color: rgba(102, 204, 255, 0.55);
  box-shadow: 0 0 12px rgba(102, 204, 255, 0.18);
}
.mfrs-mp-card > summary, .mfrs-mp-subcard > summary {
  list-style: none;
  cursor: pointer;
  padding: 10px 14px;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: #66ccff;
  user-select: none;
}
.mfrs-mp-card > summary::-webkit-details-marker, .mfrs-mp-subcard > summary::-webkit-details-marker { display: none; }
.mfrs-mp-card > summary::before, .mfrs-mp-subcard > summary::before {
  content: '▸';
  color: #66ccff;
  transition: transform .2s;
  font-size: 12px;
}
.mfrs-mp-card[open] > summary::before, .mfrs-mp-subcard[open] > summary::before { transform: rotate(90deg); }
.mfrs-mp-card .mfrs-mp-summary-name, .mfrs-mp-subcard .mfrs-mp-summary-name {
  margin-left: auto;
  font-size: 12px;
  color: rgba(102, 204, 255, 0.6);
  font-weight: normal;
}
.mfrs-mp-card i, .mfrs-mp-subcard i { color: #66ccff; opacity: .85; }
.mfrs-mp-seg { padding: 8px 14px; border-top: 1px solid rgba(102, 204, 255, 0.12); }
.mfrs-mp-seg:first-of-type { border-top: none; }
.mfrs-mp-seg-title {
  font-size: 12px;
  color: #00ffaa;
  letter-spacing: 1px;
  margin-bottom: 6px;
  opacity: .85;
}
.mfrs-mp-kv {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 3px 0;
  font-size: 13px;
  line-height: 1.6;
}
.mfrs-mp-k { flex: 0 0 88px; color: rgba(180, 220, 255, 0.55); font-size: 12px; }
.mfrs-mp-v { flex: 1; color: #d4eaff; word-break: break-word; }
.mfrs-mp-empty { padding: 10px 14px; color: rgba(180, 220, 255, 0.4); font-size: 13px; }
.mfrs-mp-risk[data-risk] { color: #00ffaa; }
.mfrs-mp-risk[data-risk]:is([data-risk="0"], [data-risk="1"], [data-risk="2"], [data-risk="3"], [data-risk="4"]) { color: #00ffaa; }
.mfrs-mp-risk[data-risk]::after { content: attr(data-risk); display: none; }
.mfrs-mp-risk { font-weight: 600; }
.mfrs-mp-aff[data-aff] { font-weight: 600; }
.mfrs-mp-stack { margin-top: 12px; }
.mfrs-mp-card .mfrs-mp-subcard { background: rgba(10, 18, 40, 0.5); }
`;

function mountStyle(): void {
  if (style.isConnected) return;
  doc.getElementById(style.id)?.remove();
  doc.head.appendChild(style);
}

function activateRuntime(): void {
  if (disposed || !isMagicIndexCardActive()) {
    deactivateRuntime();
    return;
  }
  mountStyle();
  subscribeEvents();
  observedChat = doc.querySelector('#chat') || doc.body;
  if (!observer) {
    const MO = doc.defaultView?.MutationObserver ?? MutationObserver;
    observer = new MO(mutations => {
      if (mutations.some(mutationTouchesChatMessage)) scheduleIdleRefresh();
    });
  }
  observer.observe(observedChat, { childList: true, subtree: true });
  processAllMessages();
  runtimeActive = true;
}

function deactivateRuntime(): void {
  runtimeActive = false;
  observer?.disconnect();
  unsubscribeEvents();
  style.remove();
  if (hostWindow.MagicIndexMessagePanel) delete hostWindow.MagicIndexMessagePanel;
}

function subscribeEvents(): void {
  if (subscriptions.length > 0) return;
  const events = [
    tavern_events?.MESSAGE_RECEIVED,
    tavern_events?.MESSAGE_UPDATED,
    tavern_events?.MESSAGE_SWIPED,
    tavern_events?.CHARACTER_MESSAGE_RENDERED,
    tavern_events?.GENERATION_ENDED,
    tavern_events?.GENERATION_STOPPED,
  ].filter(Boolean) as string[];
  events.forEach(name => {
    subscriptions.push(eventOn(name, scheduleBurstRefresh));
  });
}

function unsubscribeEvents(): void {
  subscriptions.splice(0).forEach(s => s.stop());
}

function handleChatChanged(): void {
  [0, 250, 1000].forEach(delay => {
    hostWindow.setTimeout(() => {
      if (isMagicIndexCardActive()) activateRuntime();
      else deactivateRuntime();
    }, delay);
  });
}

/* ---------- 导出 API + 清理 ---------- */

hostWindow.MagicIndexMessagePanel = {
  refreshAll: processAllMessages,
  refreshMessage: processOneMessage,
};

const cleanup = () => {
  if (disposed) return;
  disposed = true;
  deactivateRuntime();
  chatChangedSub?.stop();
  chatChangedSub = null;
  if (hostWindow.__mfrsMessagePanelCleanup__ === cleanup) delete hostWindow.__mfrsMessagePanelCleanup__;
};

hostWindow.__mfrsMessagePanelCleanup__ = cleanup;
window.addEventListener('pagehide', cleanup, { once: true });
chatChangedSub = tavern_events?.CHAT_CHANGED ? eventOn(tavern_events.CHAT_CHANGED, handleChatChanged) : null;
activateRuntime();
if (!runtimeActive) handleChatChanged();

console.info('[消息内面板] 魔法禁书目录模拟器轻量版已注入');
