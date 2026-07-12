// 消息内状态面板脚本 - 在每条 AI 消息内嵌入完整状态面板（两个 tab）+ 叙事文本包装

type StatusData = Record<string, any>;
type MessagePanelApi = {
  refreshAll: () => void;
  refreshMessage: (messageId: number | string) => void;
};
type EventSubscription = { stop: () => void };
type MessagePanelHostWindow = Window & {
  MysteryMessagePanel?: MessagePanelApi;
  __mfrsMessagePanelCleanup__?: () => void;
  SillyTavern?: {
    getContext?: () => {
      characterId?: string | number;
      characters?: Array<{ name?: string; avatar?: string }> | Record<string, { name?: string; avatar?: string }>;
    };
  };
};

// iframe 运行环境，必须通过 parent.document 访问主窗口 DOM
const hostWindow = (window.parent ?? window) as MessagePanelHostWindow;
const doc: Document = hostWindow.document ?? document;
const mysteryCardNames = new Set(['神秘复苏模拟器', '神秘复苏模拟器发布版']);
const mysteryCardAvatars = new Set(['神秘复苏模拟器.png', '神秘复苏模拟器发布版.png']);
const ownedMessageUiSelector = '.mfrs-msg-panel, .mfrs-msg-narrative-wrapper, .mfrs-msg-brand';

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

function isMysteryRevivalCardActive() {
  const context = getSillyTavernContext();
  const characterId = context?.characterId;
  if (characterId === undefined || characterId === null) return false;
  const characters = context?.characters;
  const character = Array.isArray(characters) ? characters[Number(characterId)] : characters?.[String(characterId)];
  return Boolean(
    character &&
    ((character.name && mysteryCardNames.has(character.name)) ||
      (character.avatar && mysteryCardAvatars.has(character.avatar))),
  );
}

function isElementNode(value: unknown): value is Element {
  return Boolean(value && typeof value === 'object' && (value as Node).nodeType === 1);
}

/** 从值中提取第一个数字，无数字返回 null */
function toNumber(value: unknown): number | null {
  const match = String(value ?? '').match(/-?\d+(?:\.\d+)?/);
  return match ? Number(match[0]) : null;
}

/** 风险值转百分比（0-100 clamp） */
function clampPercent(value: unknown): number {
  const n = toNumber(value);
  if (n === null) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}

type RiskKind = 'death' | 'revive';

function riskPresentation(value: unknown, kind: RiskKind) {
  const numeric = toNumber(value) ?? 0;
  const percent = clampPercent(numeric);
  if (numeric >= 70) {
    return {
      numeric,
      percent,
      color: kind === 'death' ? '#6b2a26' : '#3d6b66',
      level: '高危',
      tone: 'is-critical',
      copy: kind === 'death' ? '生存窗口正在急剧收窄' : '厉鬼复苏已逼近失控线',
    };
  }
  if (numeric >= 40) {
    return {
      numeric,
      percent,
      color: '#9c784a',
      level: '警戒',
      tone: 'is-elevated',
      copy: kind === 'death' ? '继续行动需要预留退路' : '灵异躁动需要持续压制',
    };
  }
  return {
    numeric,
    percent,
    color: kind === 'death' ? '#6b2a26' : '#3d6b66',
    level: '可控',
    tone: 'is-calm',
    copy: kind === 'death' ? '当前仍有足够应对余地' : '复苏征兆暂处稳定区间',
  };
}

/** 值转文本，空值返回 fallback */
function valueText(value: unknown, fallback = '未知'): string {
  const text = String(value ?? '').trim();
  return text || fallback;
}

/** 从 .mes 容器读取对应楼层的 stat_data */
function readStatusForMessage(mesElement: Element): StatusData {
  try {
    const mesid = mesElement.getAttribute('mesid');
    if (!mesid) return {};
    const messageId = parseInt(mesid, 10);
    if (isNaN(messageId)) return {};
    return _.get(getVariables({ type: 'message', message_id: messageId }), 'stat_data', {}) ?? {};
  } catch {
    return {};
  }
}

/** 检查 mes 元素是否为用户消息（SillyTavern 用 is_user="true" 属性标记，不加 .user class） */
function isUserMessage(mesElement: Element): boolean {
  return mesElement.getAttribute('is_user') === 'true' || mesElement.classList.contains('user');
}

function buildGhostListHtml(data: StatusData): string {
  const rawGhostList = _.get(data, '驭鬼者状态.已驾驭厉鬼', []) || data.驾驭厉鬼 || [];
  const ghostList = Array.isArray(rawGhostList)
    ? rawGhostList.filter(
        (g: any, i: number, arr: any[]) =>
          i ===
          arr.findIndex((h: any) => valueText(h?.代号 || h?.厉鬼名称, '') === valueText(g?.代号 || g?.厉鬼名称, '')),
      )
    : [];
  return ghostList.length
    ? ghostList
        .map(
          (g: any) =>
            `<div class="mfrs-msg-ghost-item">${_.escape(valueText(g.代号 || g.厉鬼名称, '未命名厉鬼'))}</div>`,
        )
        .join('')
    : '<div class="mfrs-msg-empty">暂无驾驭厉鬼</div>';
}

type ActionSuggestion = {
  key: string;
  text: string;
  meta: string;
  fill: string;
  provisional?: boolean;
};

/** 仅收集 MVU/表中的真实行动建议；无数据返回空（不注入开局占位） */
function collectRealActionSuggestions(data: StatusData): ActionSuggestion[] {
  const fromStat = Array.isArray(data.行动建议) ? data.行动建议 : [];
  const list: ActionSuggestion[] = [];
  const pushItem = (s: any, i: number) => {
    const key = valueText(s.选项 ?? s.option ?? s.key ?? String.fromCharCode(65 + i), String.fromCharCode(65 + i));
    const text = valueText(s.思路 ?? s.text ?? s.label ?? s.行动, '');
    if (!text) return;
    const metaParts = [
      valueText(s.主要风险 ?? s.risk, '') && `风险：${valueText(s.主要风险 ?? s.risk, '')}`,
      valueText(s.预期收益 ?? s.gain, '') && `收益：${valueText(s.预期收益 ?? s.gain, '')}`,
      valueText(s.死亡风险, '') && `死亡：${valueText(s.死亡风险, '')}`,
      valueText(s.复苏风险, '') && `复苏：${valueText(s.复苏风险, '')}`,
    ].filter(Boolean);
    list.push({ key, text, meta: metaParts.join('｜'), fill: text });
  };
  fromStat.forEach((s, i) => pushItem(s, i));
  if (!list.length) {
    const table = findHudTable(readHudDatabaseTables(), '行动建议');
    if (table) {
      table.rows.slice(0, 4).forEach((row, i) => {
        const key = hudRowField(table.headers, row, '选项', 'option', 'key') || String.fromCharCode(65 + i);
        const text = hudRowField(table.headers, row, '思路', '行动', 'text', 'label');
        if (!text) return;
        const metaParts = [
          hudRowField(table.headers, row, '主要风险') && `风险：${hudRowField(table.headers, row, '主要风险')}`,
          hudRowField(table.headers, row, '预期收益') && `收益：${hudRowField(table.headers, row, '预期收益')}`,
          hudRowField(table.headers, row, '死亡风险') && `死亡：${hudRowField(table.headers, row, '死亡风险')}`,
          hudRowField(table.headers, row, '复苏风险') && `复苏：${hudRowField(table.headers, row, '复苏风险')}`,
        ].filter(Boolean);
        list.push({ key, text, meta: metaParts.join('｜'), fill: text });
      });
    }
  }
  return list;
}

function hasRealActionSuggestions(data: StatusData): boolean {
  return collectRealActionSuggestions(data).length > 0;
}

/** 固定 A/B/C/D 槽位；仅真实落库项，无数据返回空 */
function resolveActionSuggestions(data: StatusData): ActionSuggestion[] {
  const list = collectRealActionSuggestions(data);
  if (!list.length) return [];
  const byKey = new Map(list.map(item => [item.key.toUpperCase(), item]));
  return ['A', 'B', 'C', 'D']
    .map((key, i) => {
      const hit = byKey.get(key) || list[i];
      if (!hit?.text) return null;
      return {
        key,
        text: hit.text,
        meta: hit.meta,
        fill: hit.fill || hit.text,
        provisional: false,
      } satisfies ActionSuggestion;
    })
    .filter((item): item is ActionSuggestion => item != null);
}

function buildActionButtonsHtml(data: StatusData, opts?: { compact?: boolean }): string {
  const items = resolveActionSuggestions(data);
  if (!items.length) return '';
  const buttons = items
    .map(item => {
      const fill = item.key === 'D' && !item.fill ? '' : item.fill;
      const meta = item.meta ? `<span class="mfrs-msg-action-meta">${_.escape(item.meta)}</span>` : '';
      return `<button type="button" class="mfrs-msg-action-btn" data-action="${_.escape(fill)}" data-option-key="${_.escape(item.key)}"><span class="mfrs-msg-action-key">${_.escape(item.key)}</span><span class="mfrs-msg-action-body"><span class="mfrs-msg-action-label">${_.escape(item.text)}</span>${meta}</span></button>`;
    })
    .join('');
  return `<div class="mfrs-msg-actions${opts?.compact ? ' is-compact' : ''}">${buttons}</div>`;
}

function buildActionsHtml(data: StatusData): string {
  const buttons = buildActionButtonsHtml(data);
  if (!buttons) return '';
  return `${buttons}${buildCheckSuggestionsFoldHtml(data)}`;
}

/** 正文内不挂本轮选项：清掉 inline + 隐藏三栏拟办块，唯一入口在输入框上方 HUD */
function stripInlineChoicesFromMessage(mesElement: Element) {
  if (isUserMessage(mesElement)) return;
  const mesText = mesElement.querySelector('.mes_text');
  if (!mesText) return;
  mesText.querySelectorAll('.mfrs-msg-inline-choices').forEach(node => node.remove());
  mesText.querySelectorAll('.mfrs-msg-actions-block').forEach(node => {
    (node as HTMLElement).hidden = true;
    (node as HTMLElement).style.display = 'none';
  });
}

/** 组 D：检定建议暂挂拟办下，默认折叠 */
function buildCheckSuggestionsFoldHtml(data: StatusData): string {
  const fromStat = Array.isArray(data.检定建议) ? data.检定建议 : [];
  const rows: Array<{ text: string; type: string; basis: string; dice: string }> = [];
  if (fromStat.length) {
    fromStat.forEach((item: any) => {
      const text = valueText(item.展示文本 ?? item.display_text ?? item.内容 ?? item.text, '');
      if (!text) return;
      rows.push({
        text,
        type: valueText(item.检定类型 ?? item.check_type ?? item.类型, ''),
        basis: valueText(item.检定依据 ?? item.check_basis ?? item.依据, ''),
        dice: valueText(item.骰子命令 ?? item.dice_command ?? item.命令, ''),
      });
    });
  } else {
    const table = findHudTable(readHudDatabaseTables(), '检定建议');
    if (table) {
      table.rows.slice(0, 5).forEach(row => {
        const text = hudRowField(table.headers, row, '展示文本', 'display_text', '内容');
        if (!text) return;
        rows.push({
          text,
          type: hudRowField(table.headers, row, '检定类型', 'check_type', '类型'),
          basis: hudRowField(table.headers, row, '检定依据', 'check_basis', '依据'),
          dice: hudRowField(table.headers, row, '骰子命令', 'dice_command', '命令'),
        });
      });
    }
  }
  if (!rows.length) return '';
  const body = rows
    .map(row => {
      const meta = [row.type && `类型：${row.type}`, row.basis && `依据：${row.basis}`, row.dice && `命令：${row.dice}`]
        .filter(Boolean)
        .join('｜');
      const action = row.dice || row.text;
      return `<button type="button" class="mfrs-msg-action-btn mfrs-msg-check-btn" data-action="${_.escape(action)}"><span class="mfrs-msg-action-key">检</span><span class="mfrs-msg-action-body"><span class="mfrs-msg-action-label">${_.escape(row.text)}</span>${meta ? `<span class="mfrs-msg-action-meta">${_.escape(meta)}</span>` : ''}</span></button>`;
    })
    .join('');
  return `<details class="mfrs-msg-check-fold"><summary class="mfrs-msg-check-summary"><i class="fa-solid fa-dice" aria-hidden="true"></i><span>检定建议</span><span class="mfrs-msg-check-count">${rows.length}</span></summary><div class="mfrs-msg-check-body">${body}</div></details>`;
}

type HudTableBundle = { name: string; headers: string[]; rows: unknown[][] };

function readHudDatabaseTables(): Record<string, HudTableBundle> {
  try {
    const api = (hostWindow as any).AutoCardUpdaterAPI;
    if (!api || typeof api.exportTableAsJson !== 'function') return {};
    let raw = api.exportTableAsJson();
    if (typeof raw === 'string') {
      try {
        raw = JSON.parse(raw);
      } catch {
        return {};
      }
    }
    if (!raw || typeof raw !== 'object') return {};
    const tables: Record<string, HudTableBundle> = {};
    for (const sheetId of Object.keys(raw as Record<string, any>)) {
      const sheet = (raw as Record<string, any>)[sheetId];
      if (!sheet?.name || !Array.isArray(sheet.content)) continue;
      tables[String(sheet.name)] = {
        name: String(sheet.name),
        headers: (sheet.content[0] || []).map((h: unknown) => String(h ?? '')),
        rows: sheet.content.slice(1) || [],
      };
    }
    return tables;
  } catch {
    return {};
  }
}

function findHudTable(tables: Record<string, HudTableBundle>, ...names: string[]): HudTableBundle | null {
  for (const name of names) {
    if (tables[name]) return tables[name];
  }
  const keys = Object.keys(tables);
  for (const name of names) {
    const hit = keys.find(k => k.includes(name));
    if (hit) return tables[hit];
  }
  return null;
}

function hudRowField(headers: string[], row: unknown[], ...names: string[]): string {
  for (const name of names) {
    const idx = headers.findIndex(h => h === name || h.includes(name));
    if (idx >= 0) {
      const text = String(row[idx] ?? '').trim();
      if (text) return text;
    }
  }
  return '';
}

function clipHudLine(value: string, max = 42): string {
  const text = String(value ?? '')
    .replace(/\s+/g, ' ')
    .trim();
  if (text.length <= max) return text;
  return `${text.slice(0, Math.max(1, max - 1))}…`;
}

function buildHudTableSummaryListHtml(
  table: HudTableBundle | null,
  titleHeaders: string[],
  tagHeaders: string[],
  limit = 3,
): string {
  if (!table || !table.rows.length) return '<div class="mfrs-msg-empty">暂无记录</div>';
  return table.rows
    .slice(-limit)
    .reverse()
    .map(row => {
      const title =
        titleHeaders.map(h => hudRowField(table.headers, row, h)).find(Boolean) ||
        String(row[1] ?? row[0] ?? '未命名').trim() ||
        '未命名';
      const tags = tagHeaders
        .map(h => hudRowField(table.headers, row, h))
        .filter(Boolean)
        .slice(0, 3)
        .join(' · ');
      return `<div class="mfrs-hud-summary-item" title="${_.escape(title)}"><span class="mfrs-hud-summary-title">${_.escape(clipHudLine(title, 28))}</span>${tags ? `<span class="mfrs-hud-summary-tags">${_.escape(clipHudLine(tags, 36))}</span>` : ''}</div>`;
    })
    .join('');
}

function buildDossierSectionsHtml(data: StatusData): string {
  const name = valueText(data.姓名);
  const gender = valueText(data.性别);
  const identity = valueText(data.身份);
  const ability = valueText(data.特殊能力描述, '无');
  const cost = valueText(data.消耗代价, '无');
  const playerStatus = valueText(data.状态, '健康');
  const resources = valueText(data.灵异资源 ?? _.get(data, '资源') ?? _.get(data, '持有资源'), '');

  const deathRisk = riskPresentation(data.风险值, 'death');
  const reviveRisk = riskPresentation(
    toNumber(_.get(data, '驭鬼者状态.总复苏风险')) ?? toNumber(data.厉鬼复苏程度) ?? 0,
    'revive',
  );

  const event = data.当前灵异事件 ?? {};
  const eventCode = valueText(event.事件代号, '无');
  const eventLevel = valueText(event.危害等级, '未知');
  const eventPlace = valueText(event.发生地点, '未知');
  const eventDomain = valueText(event.鬼域状态, '未知');
  const eventHandle = valueText(event.处理状态, '未知');

  const resourceBlock = resources
    ? `<details class="mfrs-msg-fold" data-fold="resource" open>
  <summary class="mfrs-msg-fold-summary"><i class="fa-solid fa-box-archive" aria-hidden="true"></i><span>资源</span></summary>
  <div class="mfrs-msg-fold-body"><div class="mfrs-msg-info-text">${_.escape(resources)}</div></div>
</details>`
    : '';

  return `
<details class="mfrs-msg-fold" data-fold="identity" open>
  <summary class="mfrs-msg-fold-summary"><i class="fa-solid fa-id-card" aria-hidden="true"></i><span>身份</span></summary>
  <div class="mfrs-msg-fold-body">
    <div class="mfrs-msg-kv"><span>姓名</span><b>${_.escape(name)}</b></div>
    <div class="mfrs-msg-kv"><span>性别</span><b>${_.escape(gender)}</b></div>
    <div class="mfrs-msg-kv"><span>身份</span><b>${_.escape(identity)}</b></div>
    <div class="mfrs-msg-info-text"><strong>能力</strong>${_.escape(ability)}</div>
    <div class="mfrs-msg-info-text"><strong>代价</strong>${_.escape(cost)}</div>
  </div>
</details>
<details class="mfrs-msg-fold" data-fold="risk" open>
  <summary class="mfrs-msg-fold-summary"><i class="fa-solid fa-heart-pulse" aria-hidden="true"></i><span>风险</span></summary>
  <div class="mfrs-msg-fold-body">
    <div class="mfrs-msg-risk-item ${deathRisk.tone}" style="--mfrs-risk-color:${deathRisk.color};--mfrs-risk-pct:${deathRisk.percent}%">
      <div class="mfrs-msg-risk-label"><span>死亡风险</span><strong class="mfrs-msg-risk-level">${deathRisk.level}</strong><span class="mfrs-msg-risk-value">${deathRisk.numeric}%</span></div>
      <div class="mfrs-msg-risk-copy">${deathRisk.copy}</div>
      <div class="mfrs-msg-risk-bar" role="meter" aria-label="死亡风险" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${deathRisk.percent}"><div class="mfrs-msg-risk-fill"></div></div>
    </div>
    <div class="mfrs-msg-risk-item ${reviveRisk.tone}" style="--mfrs-risk-color:${reviveRisk.color};--mfrs-risk-pct:${reviveRisk.percent}%">
      <div class="mfrs-msg-risk-label"><span>复苏风险</span><strong class="mfrs-msg-risk-level">${reviveRisk.level}</strong><span class="mfrs-msg-risk-value">${reviveRisk.numeric}%</span></div>
      <div class="mfrs-msg-risk-copy">${reviveRisk.copy}</div>
      <div class="mfrs-msg-risk-bar" role="meter" aria-label="复苏风险" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${reviveRisk.percent}"><div class="mfrs-msg-risk-fill"></div></div>
    </div>
    <div class="mfrs-msg-kv"><span>状态</span><b>${_.escape(playerStatus)}</b></div>
  </div>
</details>
<details class="mfrs-msg-fold" data-fold="event" open>
  <summary class="mfrs-msg-fold-summary"><i class="fa-solid fa-folder-open" aria-hidden="true"></i><span>事件</span></summary>
  <div class="mfrs-msg-fold-body">
    <div class="mfrs-msg-kv"><span>事件代号</span><b>${_.escape(eventCode)}</b></div>
    <div class="mfrs-msg-kv"><span>危害等级</span><b>${_.escape(eventLevel)}</b></div>
    <div class="mfrs-msg-kv"><span>发生地点</span><b>${_.escape(eventPlace)}</b></div>
    <div class="mfrs-msg-kv"><span>鬼域状态</span><b>${_.escape(eventDomain)}</b></div>
    <div class="mfrs-msg-kv"><span>处理状态</span><b>${_.escape(eventHandle)}</b></div>
  </div>
</details>
<details class="mfrs-msg-fold" data-fold="ghost" open>
  <summary class="mfrs-msg-fold-summary"><i class="fa-solid fa-ghost" aria-hidden="true"></i><span>厉鬼</span></summary>
  <div class="mfrs-msg-fold-body"><div class="mfrs-msg-ghost-list">${buildGhostListHtml(data)}</div></div>
</details>
${resourceBlock}
`;
}

/** 构建「状态面板」tab 的 HTML（历史楼收束：顶栏 + 双列 + 拟办意见） */
function buildStatusTabHtml(data: StatusData): string {
  const location = valueText(data.所在位置);
  const phase = valueText(_.get(data, '主线进度.当前阶段'));
  const deathRisk = riskPresentation(data.风险值, 'death');

  return `
<div class="mfrs-msg-header">
  <div class="mfrs-msg-header-item"><i class="fa-solid fa-layer-group mfrs-msg-header-ico" aria-hidden="true"></i><span class="mfrs-msg-header-lbl">阶段</span><span class="mfrs-msg-header-val">${_.escape(phase)}</span></div>
  <div class="mfrs-msg-header-item"><i class="fa-solid fa-location-dot mfrs-msg-header-ico" aria-hidden="true"></i><span class="mfrs-msg-header-lbl">位置</span><span class="mfrs-msg-header-val">${_.escape(location)}</span></div>
  <div class="mfrs-msg-header-item"><i class="fa-solid fa-triangle-exclamation mfrs-msg-header-ico" aria-hidden="true"></i><span class="mfrs-msg-header-lbl">死亡风险</span><span class="mfrs-msg-header-val" style="color:${deathRisk.color}">${deathRisk.numeric}% · ${deathRisk.level}</span></div>
</div>
<div class="mfrs-msg-dossier-history">
  ${buildDossierSectionsHtml(data)}
</div>
<div class="mfrs-msg-section mfrs-msg-section-full">
  <div class="mfrs-msg-section-title"><i class="fa-solid fa-list-check" aria-hidden="true"></i><span>拟办意见</span></div>
  <div class="mfrs-msg-actions">${buildActionsHtml(data)}</div>
</div>
`;
}

function buildNavHtml(panelId: string): string {
  const items = [
    { id: 'story', label: '正文', icon: 'fa-align-left' },
    { id: 'dossier', label: '档案', icon: 'fa-folder-open' },
    { id: 'relation', label: '关系', icon: 'fa-users' },
    { id: 'memory', label: '记忆', icon: 'fa-clock-rotate-left' },
    { id: 'gacha', label: '抽卡', icon: 'fa-gift' },
    { id: 'system', label: '系统', icon: 'fa-screwdriver-wrench' },
    { id: 'settings', label: '设置', icon: 'fa-gear', disabled: true },
  ];
  return `
<nav class="mfrs-msg-nav" id="${panelId}-nav" aria-label="现场导航">
  ${items
    .map(
      item =>
        `<button type="button" class="mfrs-msg-nav-btn${item.disabled ? ' is-disabled' : ''}" data-nav="${item.id}" ${item.disabled ? 'disabled aria-disabled="true" title="二期"' : ''} id="${panelId}-nav-${item.id}"><i class="fa-solid ${item.icon}" aria-hidden="true"></i><span>${item.label}</span></button>`,
    )
    .join('')}
</nav>
`;
}

/** 构建「关系/环境」tab 的 HTML（在场人物名字着色 + 描述） */
function buildRelationTabHtml(data: StatusData): string {
  const location = valueText(data.所在位置);
  const phase = valueText(_.get(data, '主线进度.当前阶段'));
  const event = data.当前灵异事件 ?? {};
  const eventPlace = valueText(event.发生地点, '未知');

  const npcs = data.在场人物 || [];
  const npcsHtml = npcs.length
    ? npcs
        .map((npc: unknown) => {
          const raw = String(npc ?? '').trim();
          // 支持「名字-描述」「名字：描述」格式：名字着色，描述灰显
          const m = raw.match(/^([^-—－:：]+)[-—－:：]\s*(.+)$/);
          if (m) {
            return `<div class="mfrs-msg-npc-item"><span class="mfrs-msg-npc-name">${_.escape(m[1].trim())}</span><span class="mfrs-msg-npc-desc">${_.escape(m[2].trim())}</span></div>`;
          }
          return `<div class="mfrs-msg-npc-item"><span class="mfrs-msg-npc-name">${_.escape(raw)}</span></div>`;
        })
        .join('')
    : '<div class="mfrs-msg-empty">暂无在场人物</div>';

  return `
<div class="mfrs-msg-header">
  <div class="mfrs-msg-header-item"><i class="fa-solid fa-location-dot mfrs-msg-header-ico" aria-hidden="true"></i><span class="mfrs-msg-header-lbl">当前位置</span><span class="mfrs-msg-header-val">${_.escape(location)}</span></div>
  <div class="mfrs-msg-header-item"><i class="fa-solid fa-layer-group mfrs-msg-header-ico" aria-hidden="true"></i><span class="mfrs-msg-header-lbl">阶段</span><span class="mfrs-msg-header-val">${_.escape(phase)}</span></div>
</div>
<div class="mfrs-msg-section">
  <div class="mfrs-msg-section-title"><i class="fa-solid fa-compass" aria-hidden="true"></i><span>环境</span></div>
  <div class="mfrs-msg-info-text"><strong>所在</strong>${_.escape(location)}</div>
  <div class="mfrs-msg-info-text"><strong>事发地</strong>${_.escape(eventPlace)}</div>
</div>
<div class="mfrs-msg-section">
  <div class="mfrs-msg-section-title"><i class="fa-solid fa-users" aria-hidden="true"></i><span>在场人物</span></div>
  <div class="mfrs-msg-npc-list">${npcsHtml}</div>
</div>
`;
}

function getPanelId(mesid: string) {
  return `mfrs-panel-${mesid.replace(/[^a-zA-Z0-9_-]/g, '-')}`;
}

function getPanelRenderKey(data: StatusData) {
  let source = '';
  try {
    source = JSON.stringify(data);
  } catch {
    source = String(data);
  }
  let hash = 2166136261;
  for (let index = 0; index < source.length; index += 1) {
    hash ^= source.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `${source.length}-${(hash >>> 0).toString(36)}`;
}

function getBrandId(mesid: string) {
  return `mfrs-brand-${mesid.replace(/[^a-zA-Z0-9_-]/g, '-')}`;
}

function getBrandViewModel(data: StatusData, mesid: string) {
  return {
    archive: mesid,
    phase: valueText(_.get(data, '主线进度.当前阶段')),
    location: valueText(data.所在位置),
    event: valueText(_.get(data, '当前灵异事件.事件代号'), '无'),
    domain: valueText(_.get(data, '当前灵异事件.鬼域状态'), '未知'),
    danger: valueText(_.get(data, '当前灵异事件.危害等级')),
  };
}

function buildBrandHtml(data: StatusData, mesid: string): string {
  const brand = getBrandViewModel(data, mesid);
  const accessibleName = `现场档案状态条，位置 ${brand.location}，阶段 ${brand.phase}，事件 ${brand.event}，鬼域 ${brand.domain}，危害 ${brand.danger}`;

  return `
<section class="mfrs-msg-brand" id="${getBrandId(mesid)}" role="region" aria-label="${_.escape(accessibleName)}">
  <span class="mfrs-msg-brand-corner mfrs-msg-brand-corner-tl" aria-hidden="true"></span>
  <span class="mfrs-msg-brand-corner mfrs-msg-brand-corner-tr" aria-hidden="true"></span>
  <span class="mfrs-msg-brand-corner mfrs-msg-brand-corner-bl" aria-hidden="true"></span>
  <span class="mfrs-msg-brand-corner mfrs-msg-brand-corner-br" aria-hidden="true"></span>
  <div class="mfrs-msg-brand-rail">
    <span class="mfrs-msg-brand-kicker">现场档案</span>
    <span class="mfrs-msg-brand-stamp">MFRS</span>
    <span class="mfrs-msg-brand-archive">#${_.escape(brand.archive)}</span>
  </div>
  <dl class="mfrs-msg-brand-meta">
    <div class="mfrs-msg-brand-location"><dt>位置</dt><dd>${_.escape(brand.location)}</dd></div>
    <div><dt>阶段</dt><dd>${_.escape(brand.phase)}</dd></div>
    <div><dt>事件</dt><dd>${_.escape(brand.event)}</dd></div>
    <div><dt>鬼域</dt><dd>${_.escape(brand.domain)}</dd></div>
    <div><dt>危害</dt><dd>${_.escape(brand.danger)}</dd></div>
  </dl>
</section>
`;
}

function injectBrandForMessage(mesElement: Element) {
  if (!mesElement.classList.contains('mes') || isUserMessage(mesElement)) return;
  const mesid = mesElement.getAttribute('mesid');
  if (mesid === null || mesid === '' || isNaN(parseInt(mesid, 10))) return;
  const mesText = mesElement.querySelector('.mes_text');
  if (!mesText) return;

  const data = readStatusForMessage(mesElement);
  const renderKey = getPanelRenderKey(getBrandViewModel(data, mesid));
  const host = mesText.querySelector('.mfrs-msg-center-host');
  const brands = Array.from(mesText.querySelectorAll<HTMLElement>('.mfrs-msg-brand')).filter(
    brand => brand.parentElement === mesText || brand.parentElement === host,
  );
  const existingBrand = brands.shift() ?? null;
  brands.forEach(brand => brand.remove());
  if (existingBrand?.dataset.mfrsRenderKey === renderKey) return;

  const container = doc.createElement('div');
  container.innerHTML = buildBrandHtml(data, mesid);
  const nextBrand = container.firstElementChild as HTMLElement | null;
  if (!nextBrand) return;
  nextBrand.dataset.mfrsRenderKey = renderKey;

  if (!existingBrand) {
    const host = mesText.querySelector('.mfrs-msg-center-host');
    if (host) {
      host.insertBefore(nextBrand, host.firstChild);
      return;
    }
    const wrapper = Array.from(mesText.children).find(child => child.classList.contains('mfrs-msg-narrative-wrapper'));
    mesText.insertBefore(nextBrand, wrapper ?? mesText.firstChild);
    return;
  }

  existingBrand.id = getBrandId(mesid);
  existingBrand.setAttribute('role', 'region');
  existingBrand.setAttribute('aria-label', nextBrand.getAttribute('aria-label') ?? '现场档案状态条');
  existingBrand.dataset.mfrsRenderKey = renderKey;
  existingBrand.replaceChildren(...Array.from(nextBrand.childNodes));
}

function getPanelRiskClass(data: StatusData): string {
  const deathRisk = riskPresentation(data.风险值, 'death');
  const reviveRisk = riskPresentation(
    toNumber(_.get(data, '驭鬼者状态.总复苏风险')) ?? toNumber(data.厉鬼复苏程度) ?? 0,
    'revive',
  );
  const highRisk = deathRisk.numeric >= 70 || reviveRisk.numeric >= 70;
  const midRisk = !highRisk && (deathRisk.numeric >= 40 || reviveRisk.numeric >= 40);
  return highRisk ? ' is-high-risk' : midRisk ? ' is-mid-risk' : '';
}

function getBloodLayerHtml(data: StatusData): string {
  const deathRisk = riskPresentation(data.风险值, 'death');
  const reviveRisk = riskPresentation(
    toNumber(_.get(data, '驭鬼者状态.总复苏风险')) ?? toNumber(data.厉鬼复苏程度) ?? 0,
    'revive',
  );
  const highRisk = deathRisk.numeric >= 70 || reviveRisk.numeric >= 70;
  return highRisk
    ? `<div class="mfrs-msg-blood-layer" aria-hidden="true"><span class="mfrs-msg-blood-drop d1"></span><span class="mfrs-msg-blood-drop d2"></span><span class="mfrs-msg-blood-drop d3"></span><span class="mfrs-msg-blood-drop d4"></span></div>`
    : '';
}

/** 最新楼三栏壳：左档案 | 中叙事槽+拟办 | 右导航 */
function buildTriPanelHtml(data: StatusData, panelId: string): string {
  const relationTab = buildRelationTabHtml(data);
  return `
<div class="mfrs-msg-panel mfrs-msg-tri${getPanelRiskClass(data)}" id="${panelId}" data-mfrs-layout="tri" data-mfrs-view="story">
  ${getBloodLayerHtml(data)}
  <aside class="mfrs-msg-tri-left" aria-label="现场档案">
    <div class="mfrs-msg-tri-left-title"><span class="mfrs-msg-tri-left-kicker">现场档案</span><span class="mfrs-msg-tri-left-sub">驭鬼者摘录</span></div>
    <div class="mfrs-msg-dossier">${buildDossierSectionsHtml(data)}</div>
  </aside>
  <div class="mfrs-msg-tri-center">
    <div class="mfrs-msg-tri-story" data-mfrs-center="story">
      <div class="mfrs-msg-center-host" data-mfrs-host="content"></div>
    </div>
    <div class="mfrs-msg-tri-relation" data-mfrs-center="relation" hidden>
      ${relationTab}
    </div>
  </div>
  <aside class="mfrs-msg-tri-right">
    ${buildNavHtml(panelId)}
  </aside>
  <div class="mfrs-msg-tabs mfrs-msg-tabs-a11y" role="tablist" aria-label="神秘复苏状态面板">
    <button class="mfrs-msg-tab mfrs-msg-tab-active" role="tab" data-tab="status" id="${panelId}-tab-status" aria-selected="true" aria-controls="${panelId}-panel-status" tabindex="0">生存状态</button>
    <button class="mfrs-msg-tab" role="tab" data-tab="relation" id="${panelId}-tab-relation" aria-selected="false" aria-controls="${panelId}-panel-relation" tabindex="-1">现场关系</button>
  </div>
  <div class="mfrs-msg-tab-content mfrs-msg-tab-content-active mfrs-msg-sr-only" data-tab-content="status" id="${panelId}-panel-status" role="tabpanel" aria-labelledby="${panelId}-tab-status"></div>
  <div class="mfrs-msg-tab-content mfrs-msg-sr-only" data-tab-content="relation" id="${panelId}-panel-relation" role="tabpanel" aria-labelledby="${panelId}-tab-relation" hidden></div>
</div>
`;
}

/** 历史楼收束面板（线性 tab，非全三栏） */
function buildPanelHtml(data: StatusData, panelId: string, options?: { tri?: boolean }): string {
  if (options?.tri) return buildTriPanelHtml(data, panelId);

  const statusTab = buildStatusTabHtml(data);
  const relationTab = buildRelationTabHtml(data);

  return `
<div class="mfrs-msg-panel${getPanelRiskClass(data)}" id="${panelId}" data-mfrs-layout="stack">
  ${getBloodLayerHtml(data)}
  <div class="mfrs-msg-tabs" role="tablist" aria-label="神秘复苏状态面板">
    <button class="mfrs-msg-tab mfrs-msg-tab-active" role="tab" data-tab="status" id="${panelId}-tab-status" aria-selected="true" aria-controls="${panelId}-panel-status" tabindex="0">生存状态</button>
    <button class="mfrs-msg-tab" role="tab" data-tab="relation" id="${panelId}-tab-relation" aria-selected="false" aria-controls="${panelId}-panel-relation" tabindex="-1">现场关系</button>
  </div>
  <div class="mfrs-msg-tab-content mfrs-msg-tab-content-active" data-tab-content="status" id="${panelId}-panel-status" role="tabpanel" aria-labelledby="${panelId}-tab-status">
    ${statusTab}
  </div>
  <div class="mfrs-msg-tab-content" data-tab-content="relation" id="${panelId}-panel-relation" role="tabpanel" aria-labelledby="${panelId}-tab-relation" hidden>
    ${relationTab}
  </div>
</div>
`;
}

function isLatestAiMessage(mesElement: Element): boolean {
  return mesElement.classList.contains('last_mes') && !isUserMessage(mesElement);
}

function dismantleTriPanel(panel: Element) {
  const host = panel.querySelector('.mfrs-msg-center-host');
  const mesText = panel.parentElement;
  if (!host || !mesText) return;
  Array.from(host.childNodes).forEach(node => {
    mesText.insertBefore(node, panel);
  });
}

function composeTriCenter(mesElement: Element) {
  if (!isLatestAiMessage(mesElement)) return;
  const mesText = mesElement.querySelector('.mes_text');
  if (!mesText) return;
  const panel = Array.from(mesText.children).find(child => child.classList.contains('mfrs-msg-panel')) as
    | HTMLElement
    | undefined;
  if (!panel?.classList.contains('mfrs-msg-tri')) return;
  const host = panel.querySelector('.mfrs-msg-center-host');
  if (!host) return;

  const brand = Array.from(mesText.children).find(child => child.classList.contains('mfrs-msg-brand'));
  const narrative = Array.from(mesText.children).find(child => child.classList.contains('mfrs-msg-narrative-wrapper'));
  if (brand && brand.parentElement === mesText) host.appendChild(brand);
  if (narrative && narrative.parentElement === mesText) host.appendChild(narrative);
}

function setTriView(panel: Element, view: 'story' | 'relation' | 'dossier') {
  panel.setAttribute('data-mfrs-view', view);
  const story = panel.querySelector<HTMLElement>('.mfrs-msg-tri-story');
  const relation = panel.querySelector<HTMLElement>('.mfrs-msg-tri-relation');
  const left = panel.querySelector<HTMLElement>('.mfrs-msg-tri-left');
  if (story) story.hidden = view === 'relation';
  if (relation) relation.hidden = view !== 'relation';
  if (left) left.classList.toggle('is-emphasis', view === 'dossier');
  panel.querySelectorAll('.mfrs-msg-nav-btn').forEach(btn => {
    const id = btn.getAttribute('data-nav');
    const active = (view === 'story' && id === 'story') || (view === 'relation' && id === 'relation') || (view === 'dossier' && id === 'dossier');
    btn.classList.toggle('is-active', active);
  });
  if (view === 'relation') setActivePanelTab(panel, 'relation');
  else setActivePanelTab(panel, 'status');
}

type PanelFocusSnapshot =
  | { kind: 'tab'; value: string }
  | { kind: 'action'; value: string; index: number }
  | { kind: 'id'; value: string }
  | null;

function capturePanelFocus(panel: Element): PanelFocusSnapshot {
  const activeElement = doc.activeElement as HTMLElement | null;
  if (!activeElement || !panel.contains(activeElement)) return null;
  const tab = activeElement.closest('.mfrs-msg-tab');
  const tabName = tab?.getAttribute('data-tab');
  if (tabName) return { kind: 'tab', value: tabName };
  const nav = activeElement.closest('.mfrs-msg-nav-btn');
  const navId = nav?.getAttribute('data-nav');
  if (navId) return { kind: 'id', value: activeElement.id || `${panel.id}-nav-${navId}` };
  const action = activeElement.closest('.mfrs-msg-action-btn');
  const actionText = action?.getAttribute('data-action');
  if (action && actionText) {
    const matchingActions = Array.from(panel.querySelectorAll('.mfrs-msg-action-btn')).filter(
      candidate => candidate.getAttribute('data-action') === actionText,
    );
    return { kind: 'action', value: actionText, index: Math.max(0, matchingActions.indexOf(action)) };
  }
  return activeElement.id ? { kind: 'id', value: activeElement.id } : null;
}

function restorePanelFocus(panel: Element, snapshot: PanelFocusSnapshot) {
  if (!snapshot) return;
  let target: HTMLElement | null = null;
  if (snapshot.kind === 'tab') {
    target =
      Array.from(panel.querySelectorAll<HTMLElement>('.mfrs-msg-tab')).find(
        candidate => candidate.getAttribute('data-tab') === snapshot.value,
      ) ?? null;
  } else if (snapshot.kind === 'action') {
    const matchingActions = Array.from(panel.querySelectorAll<HTMLElement>('.mfrs-msg-action-btn')).filter(
      candidate => candidate.getAttribute('data-action') === snapshot.value,
    );
    target = matchingActions[snapshot.index] ?? matchingActions[0] ?? null;
  } else {
    const candidate = doc.getElementById(snapshot.value);
    target = candidate && panel.contains(candidate) ? candidate : null;
  }
  target?.focus({ preventScroll: true });
}

function setActivePanelTab(panel: Element, tabName: string) {
  panel.querySelectorAll('.mfrs-msg-tab').forEach(tab => {
    const isActive = tab.getAttribute('data-tab') === tabName;
    tab.classList.toggle('mfrs-msg-tab-active', isActive);
    tab.setAttribute('aria-selected', String(isActive));
    tab.setAttribute('tabindex', isActive ? '0' : '-1');
  });
  panel.querySelectorAll('.mfrs-msg-tab-content').forEach(content => {
    const isActive = content.getAttribute('data-tab-content') === tabName;
    content.classList.toggle('mfrs-msg-tab-content-active', isActive);
    if (isActive) content.removeAttribute('hidden');
    else content.setAttribute('hidden', '');
  });
}

/** 为 AI 消息注入或幂等更新面板 */
function injectPanelForMessage(mesElement: Element) {
  // 只处理 AI 消息（含最新一条：刷新事件均在生成完成后触发，不会在流式中途注入）
  if (!mesElement.classList.contains('mes')) return;
  const isUser = isUserMessage(mesElement);
  if (isUser) return;

  // 跳过无有效 mesid 的元素（如 SillyTavern 挂在 #chat 外的隐藏 .mes 模板）
  const mesid = mesElement.getAttribute('mesid');
  if (mesid === null || mesid === '' || isNaN(parseInt(mesid, 10))) return;

  const mesText = mesElement.querySelector('.mes_text');
  if (!mesText) return;

  const data = readStatusForMessage(mesElement);
  const panelId = getPanelId(mesid);
  const useTri = isLatestAiMessage(mesElement);
  const renderKey = `${getPanelRenderKey(data)}:${useTri ? 'tri' : 'stack'}`;
  const panels = Array.from(mesText.querySelectorAll<HTMLElement>('.mfrs-msg-panel')).filter(
    panel => panel.parentElement === mesText || panel.closest('.mes_text') === mesText,
  );
  const existingPanel = panels.shift() ?? null;
  panels.forEach(panel => {
    if (panel.classList.contains('mfrs-msg-tri')) dismantleTriPanel(panel);
    panel.remove();
  });
  if (existingPanel?.dataset.mfrsRenderKey === renderKey) {
    if (useTri) composeTriCenter(mesElement);
    return;
  }

  const activeTab =
    existingPanel?.querySelector('.mfrs-msg-tab[aria-selected="true"]')?.getAttribute('data-tab') ?? 'status';
  const activeView = (existingPanel?.getAttribute('data-mfrs-view') as 'story' | 'relation' | 'dossier' | null) ?? 'story';
  const focusSnapshot = existingPanel ? capturePanelFocus(existingPanel) : null;
  if (existingPanel?.classList.contains('mfrs-msg-tri')) dismantleTriPanel(existingPanel);
  const panelHtml = buildPanelHtml(data, panelId, { tri: useTri });

  const panelContainer = doc.createElement('div');
  panelContainer.innerHTML = panelHtml;
  const nextPanel = panelContainer.firstElementChild as HTMLElement | null;
  if (!nextPanel) return;
  nextPanel.dataset.mfrsRenderKey = renderKey;

  if (!existingPanel) {
    mesText.appendChild(nextPanel);
    if (useTri) {
      composeTriCenter(mesElement);
      setTriView(nextPanel, activeView === 'relation' ? 'relation' : 'story');
    }
    return;
  }

  existingPanel.id = panelId;
  existingPanel.className = nextPanel.className;
  existingPanel.dataset.mfrsRenderKey = renderKey;
  if (useTri) existingPanel.setAttribute('data-mfrs-layout', 'tri');
  else existingPanel.setAttribute('data-mfrs-layout', 'stack');
  existingPanel.replaceChildren(...Array.from(nextPanel.childNodes));
  if (useTri) {
    composeTriCenter(mesElement);
    setTriView(existingPanel, activeTab === 'relation' || activeView === 'relation' ? 'relation' : 'story');
  } else {
    setActivePanelTab(existingPanel, activeTab);
  }
  restorePanelFocus(existingPanel, focusSnapshot);
}

/** 为叙事文本段落添加样式包装容器 */
function wrapNarrativeText(mesElement: Element) {
  if (isUserMessage(mesElement)) return;
  const mesText = mesElement.querySelector('.mes_text');
  if (!mesText) return;

  const host =
    mesText.querySelector(':scope > .mfrs-msg-panel .mfrs-msg-center-host') ??
    mesText.querySelector('.mfrs-msg-center-host');
  const brandParent = host && host.querySelector('.mfrs-msg-brand') ? host : mesText;

  const nestedBrands = Array.from(mesText.querySelectorAll<HTMLElement>('.mfrs-msg-brand')).filter(
    brand => brand.parentElement !== mesText && brand.parentElement !== host,
  );
  nestedBrands.forEach(brand => brandParent.insertBefore(brand, brandParent.firstChild));

  const existingWrappers = Array.from(mesText.querySelectorAll('.mfrs-msg-narrative-wrapper')).filter(
    wrapper => wrapper.parentElement === mesText || wrapper.parentElement === host,
  );
  if (existingWrappers.length > 0) {
    const primaryWrapper = existingWrappers.shift()!;
    existingWrappers.forEach(wrapper => {
      primaryWrapper.append(...Array.from(wrapper.childNodes));
      wrapper.remove();
    });
    return;
  }

  // 找到所有段落（排除面板与已挂入三栏中心的内容）
  const panel = Array.from(mesText.children).find(child => child.classList.contains('mfrs-msg-panel'));
  const allNodes = Array.from(mesText.childNodes);

  // 收集面板之前的所有节点作为叙事内容
  const narrativeNodes: Node[] = [];
  for (const node of allNodes) {
    if (node === panel || (isElementNode(node) && panel && node.contains(panel))) break;
    if (isElementNode(node) && node.matches('.mfrs-msg-brand')) continue;
    if (isElementNode(node) && node.matches('.mfrs-msg-panel')) continue;
    narrativeNodes.push(node);
  }

  if (narrativeNodes.length === 0) return;

  // 创建包装容器
  const wrapper = doc.createElement('div');
  wrapper.className = 'mfrs-msg-narrative-wrapper';

  // 将叙事节点移入包装器
  narrativeNodes.forEach(node => wrapper.appendChild(node));

  // 优先挂入三栏中心；否则在面板之前
  if (host) {
    host.appendChild(wrapper);
  } else if (panel) {
    mesText.insertBefore(wrapper, panel);
  } else {
    mesText.insertBefore(wrapper, mesText.firstChild);
  }
}

function unwrapNarrativeWrapper(wrapper: Element) {
  wrapper.replaceWith(...Array.from(wrapper.childNodes));
}

function cleanupOwnedMessageUi(root: ParentNode = doc) {
  root.querySelectorAll('.mfrs-msg-panel.mfrs-msg-tri').forEach(panel => dismantleTriPanel(panel));
  root.querySelectorAll('.mfrs-msg-panel, .mfrs-msg-brand, .mfrs-msg-inline-choices').forEach(element => element.remove());
  root.querySelectorAll('.mfrs-msg-narrative-wrapper').forEach(unwrapNarrativeWrapper);
}

/** 清理已注入用户消息的自有 UI，同时保留原始消息正文 */
function cleanupUserMessages() {
  const userMessages = Array.from(doc.querySelectorAll('.mes[is_user="true"]'));
  userMessages.forEach(cleanupOwnedMessageUi);
}

let messageObserver: MutationObserver | null = null;
let observedChatContainer: Node | null = null;
let observerEnabled = false;
let isProcessingMessages = false;
let historyCatchUpToken = 0;
let observerResumeTimer: number | undefined;

function resumeMessageObserver() {
  if (!observerEnabled || !messageObserver || !observedChatContainer) return;
  // E2：尽量只观察 #chat；沉浸态同样挂在 chat 节点上
  messageObserver.observe(observedChatContainer, {
    childList: true,
    subtree: true,
    characterData: false,
    attributes: false,
  });
}

function pauseMessageObserverTemporarily(ms = 120) {
  messageObserver?.disconnect();
  if (observerResumeTimer !== undefined) {
    hostWindow.clearTimeout(observerResumeTimer);
  }
  observerResumeTimer = hostWindow.setTimeout(() => {
    observerResumeTimer = undefined;
    resumeMessageObserver();
  }, ms);
}

function withMessageObserverPaused(callback: () => void) {
  if (isProcessingMessages) return;
  isProcessingMessages = true;
  messageObserver?.disconnect();
  try {
    callback();
  } finally {
    isProcessingMessages = false;
    resumeMessageObserver();
  }
}

function processMessageElement(mes: Element) {
  injectBrandForMessage(mes);
  wrapNarrativeText(mes);
  injectPanelForMessage(mes);
  composeTriCenter(mes);
  stripInlineChoicesFromMessage(mes);
}

function processLatestAiMessageOnly() {
  withMessageObserverPaused(() => {
    cleanupUserMessages();
    const last = getLatestAiMessageElement();
    if (last) processMessageElement(last);
  });
  refreshHudPanels();
}

/** 历史楼分片补齐，避免退出沉浸时一次扫完全部楼层卡死主线程 */
function processHistoricalMessagesInChunks(messages: Element[], startIndex: number, token: number, chunkSize = 3) {
  if (token !== historyCatchUpToken || isHudMounted()) return;
  if (startIndex >= messages.length) return;
  const end = Math.min(startIndex + chunkSize, messages.length);
  withMessageObserverPaused(() => {
    for (let i = startIndex; i < end; i += 1) {
      processMessageElement(messages[i]);
    }
  });
  if (end >= messages.length) return;
  const ric = (hostWindow as Window & {
    requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
  }).requestIdleCallback;
  if (typeof ric === 'function') {
    ric(() => processHistoricalMessagesInChunks(messages, end, token, chunkSize), { timeout: 240 });
  } else {
    hostWindow.setTimeout(() => processHistoricalMessagesInChunks(messages, end, token, chunkSize), 32);
  }
}

/** 退出沉浸 / 需要补历史时：先最新楼同步，再 idle 分片历史 */
function scheduleFullHistoryCatchUp() {
  historyCatchUpToken += 1;
  const token = historyCatchUpToken;
  processLatestAiMessageOnly();
  const timer = hostWindow.setTimeout(() => {
    refreshTimers.delete(timer);
    if (token !== historyCatchUpToken || isHudMounted()) return;
    const latest = getLatestAiMessageElement();
    // 从旧到新分片，避免一次处理大量历史
    const rest = Array.from(doc.querySelectorAll('.mes:not(.user)')).filter(mes => mes !== latest);
    if (rest.length === 0) return;
    processHistoricalMessagesInChunks(rest, 0, token, 3);
  }, 48);
  refreshTimers.add(timer);
}

/** 处理 AI 消息。默认 latest-only；全量仅显式 fullHistory 或分片 catch-up */
function processAllMessages(options: { fullHistory?: boolean } = {}) {
  if (options.fullHistory === true) {
    // 显式全量：仍走分片，避免 activate/unmount 同步卡死
    scheduleFullHistoryCatchUp();
    return;
  }
  processLatestAiMessageOnly();
}

function processOneMessage(messageId: number | string) {
  withMessageObserverPaused(() => {
    const target = Array.from(doc.querySelectorAll('.mes:not(.user)')).find(
      mes => mes.getAttribute('mesid') === String(messageId),
    );
    if (!target) return;
    processMessageElement(target);
  });
  refreshHudPanels();
}

const refreshTimers = new Set<number>();
let idleRefreshTimer: number | undefined;

function clearRefreshTimers() {
  refreshTimers.forEach(timer => hostWindow.clearTimeout(timer));
  refreshTimers.clear();
  historyCatchUpToken += 1;
  if (idleRefreshTimer !== undefined) {
    hostWindow.clearTimeout(idleRefreshTimer);
    idleRefreshTimer = undefined;
  }
  if (observerResumeTimer !== undefined) {
    hostWindow.clearTimeout(observerResumeTimer);
    observerResumeTimer = undefined;
  }
}

function scheduleProcessAllMessages(delay = 200, options: { fullHistory?: boolean } = {}) {
  const timer = hostWindow.setTimeout(() => {
    refreshTimers.delete(timer);
    processAllMessages(options);
  }, delay);
  refreshTimers.add(timer);
}

function scheduleBurstRefresh() {
  // 生成结束只刷最新楼（2 段）；全量改由分片 catch-up 按需触发
  const delays = isHudMounted() ? [250, 1200] : [200, 900];
  delays.forEach(delay => scheduleProcessAllMessages(delay));
}

function scheduleIdleRefresh(delay = 800) {
  if (idleRefreshTimer !== undefined) {
    hostWindow.clearTimeout(idleRefreshTimer);
  }
  // 沉浸态 Mutation 更密，加长 debounce；一律 latest-only
  const wait = isHudMounted() ? Math.max(delay, 1200) : Math.max(delay, 500);
  idleRefreshTimer = hostWindow.setTimeout(() => {
    idleRefreshTimer = undefined;
    processLatestAiMessageOnly();
  }, wait);
}

function isOwnedOrShellChrome(node: Element | null) {
  if (!node) return false;
  if (node.closest(ownedMessageUiSelector)) return true;
  // 壳内自建节点（菜单/拟办/档案槽）变更不触发消息刷新；#chat 内楼层除外
  const inShell = node.closest(`#${HUD_SHELL_ID}`);
  if (inShell && !node.closest('#chat')) return true;
  if (node.id === 'mfrs-hud-toast' || node.id === 'mfrs-hud-st-return') return true;
  return false;
}

function mutationTouchesChatMessage(mutation: MutationRecord) {
  const targetElement = isElementNode(mutation.target) ? mutation.target : mutation.target.parentElement;
  if (isOwnedOrShellChrome(targetElement)) return false;
  // 必须落在 #chat 内，避免观察误绑 body 时扫到全站
  if (targetElement && !targetElement.closest('#chat')) {
    const addedInChat = Array.from(mutation.addedNodes).some(node => {
      if (!isElementNode(node)) return false;
      return node.id === 'chat' || Boolean(node.closest?.('#chat')) || Boolean(node.querySelector?.('#chat'));
    });
    if (!addedInChat) return false;
  }
  if (targetElement?.closest('.mes')) return true;
  return Array.from(mutation.addedNodes).some(node => {
    if (!isElementNode(node) || isOwnedOrShellChrome(node)) return false;
    return node.matches('.mes,.mes_text') || Boolean(node.querySelector('.mes,.mes_text'));
  });
}

/** 处理 tab 切换点击事件 */
function handleTabClick(e: Event) {
  const target = e.target as HTMLElement;
  const tab = target.closest?.('.mfrs-msg-tab') as HTMLElement | null;
  if (!tab) return;

  const panel = tab.closest('.mfrs-msg-panel');
  if (!panel) return;

  const tabName = tab.getAttribute('data-tab');
  if (!tabName) return;
  if (panel.classList.contains('mfrs-msg-tri')) {
    setTriView(panel, tabName === 'relation' ? 'relation' : 'story');
    return;
  }
  setActivePanelTab(panel, tabName);
}

function openArchiveCabinet() {
  const host = doc.querySelector('#mfrs-fixed-status-host') as HTMLElement | null;
  const frontend = doc.querySelector('#mfrs-fixed-frontend-slot, .acu-wrapper') as HTMLElement | null;
  const target = frontend ?? host;
  if (!target) return;
  target.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  target.classList.add('mfrs-msg-cabinet-flash');
  hostWindow.setTimeout(() => target.classList.remove('mfrs-msg-cabinet-flash'), 1200);
  expandArchiveCabinetUi(host ?? target);
}

function handleNavClick(e: Event) {
  const target = e.target as HTMLElement;
  const btn = target.closest?.('.mfrs-msg-nav-btn') as HTMLElement | null;
  if (!btn || btn.hasAttribute('disabled')) return;
  const panel = btn.closest('.mfrs-msg-panel');
  if (!panel) return;
  const nav = btn.getAttribute('data-nav');
  if (!nav) return;

  if (nav === 'story') {
    setTriView(panel, 'story');
    const host = panel.querySelector('.mfrs-msg-center-host');
    host?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    return;
  }
  if (nav === 'dossier') {
    setTriView(panel, 'dossier');
    panel.querySelector('.mfrs-msg-tri-left')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    return;
  }
  if (nav === 'relation') {
    setTriView(panel, 'relation');
    return;
  }
  if (nav === 'memory' || nav === 'gacha' || nav === 'system' || nav === 'cabinet') {
    openArchiveCabinet();
  }
}

function handleTabKeydown(e: KeyboardEvent) {
  const target = e.target as HTMLElement;
  const tab = target.closest?.('.mfrs-msg-tab') as HTMLElement | null;
  if (!tab) return;

  const panel = tab.closest('.mfrs-msg-panel');
  if (!panel) return;

  const tabs = Array.from(panel.querySelectorAll<HTMLElement>('.mfrs-msg-tab'));
  const currentIndex = tabs.indexOf(tab);
  if (currentIndex < 0) return;

  let nextIndex: number | null = null;
  if (e.key === 'ArrowLeft') nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
  else if (e.key === 'ArrowRight') nextIndex = (currentIndex + 1) % tabs.length;
  else if (e.key === 'Home') nextIndex = 0;
  else if (e.key === 'End') nextIndex = tabs.length - 1;
  if (nextIndex === null) return;

  e.preventDefault();
  const nextTab = tabs[nextIndex];
  const tabName = nextTab.getAttribute('data-tab');
  if (!tabName) return;
  setActivePanelTab(panel, tabName);
  nextTab.focus({ preventScroll: true });
}

/** 处理行动建议按钮点击事件（含摘要下 4 键） */
function handleActionClick(e: Event) {
  const target = e.target as HTMLElement;
  const btn = target.closest?.('.mfrs-msg-action-btn') as HTMLElement | null;
  if (!btn) return;

  const key = btn.getAttribute('data-option-key') || '';
  let actionText = btn.getAttribute('data-action') || '';
  // D / 空 fill：聚焦输入框，不覆盖玩家正在写的内容
  if (!actionText) {
    const textareaEmpty = doc.querySelector('#send_textarea') as HTMLTextAreaElement | null;
    textareaEmpty?.focus();
    if (key === 'D') {
      // keep empty for free input
    }
    return;
  }

  // 找到聊天输入框并填充
  const textarea = doc.querySelector('#send_textarea') as HTMLTextAreaElement | null;
  if (!textarea) return;

  // 使用原生 setter 触发事件
  const HostTextArea = doc.defaultView?.HTMLTextAreaElement ?? HTMLTextAreaElement;
  const HostInputEvent = doc.defaultView?.InputEvent ?? InputEvent;
  const HostEvent = doc.defaultView?.Event ?? Event;
  const setter = Object.getOwnPropertyDescriptor(HostTextArea.prototype, 'value')?.set;
  setter?.call(textarea, actionText);
  textarea.dispatchEvent(new HostInputEvent('input', { bubbles: true, inputType: 'insertText', data: actionText }));
  textarea.dispatchEvent(new HostEvent('change', { bubbles: true }));
  textarea.focus();
}

// ─── 路径 β · 全屏卷宗 HUD（β1：壳 / reparent / 输入代理 / 生命周期）───

const HUD_SHELL_ID = 'mfrs-hud-shell';
const HUD_STYLE_ID = 'mfrs-hud-shell-style';
const HUD_BODY_CLASS = 'mfrs-hud-immersive';
const FIXED_HOST_ID = 'mfrs-fixed-status-host';
const HUD_Z_SHELL = 10000;
const HUD_Z_CABINET = 10020;
const HUD_Z_MENU = 10040;
const HUD_Z_ST_YIELD = 50;
const HUD_ST_UI_CLASS = 'mfrs-hud-st-ui-open';

type DomRestorePoint = {
  parent: Node;
  nextSibling: ChildNode | null;
};

let hudImmersivePreferred = true;
let hudMounted = false;
let hudChatRestore: DomRestorePoint | null = null;
let hudFormRestore: DomRestorePoint | null = null;
/** 沉浸开柜时把固定 host 暂挂进 shell，避免 #sheld(z=30) stacking 被壳层盖住 */
let hudFixedHostRestore: DomRestorePoint | null = null;
let hudBodyOverflowPrev = '';
let hudShellEventsBound = false;
let hudKeydownBound = false;
type HudView = 'story' | 'dossier' | 'relation' | 'memory' | 'gacha' | 'system' | 'settings' | 'cabinet';
const HUD_CENTER_VIEWS: HudView[] = ['relation', 'memory', 'gacha', 'system'];
const HUD_NAV_VIEWS: HudView[] = ['story', 'dossier', 'relation', 'memory', 'gacha', 'system', 'settings'];
let hudActiveView: HudView = 'story';
/** 全库关闭后回到的视图（系统/档案摘要入口） */
let hudCabinetReturnView: HudView = 'system';
let hudPanelsRenderKey = '';
let hudToastTimer: number | null = null;
let hudMenuOpenTimer: number | null = null;

function isHudMounted() {
  return hudMounted && Boolean(doc.getElementById(HUD_SHELL_ID)?.classList.contains('is-active'));
}

function getChatElement() {
  return doc.getElementById('chat') as HTMLElement | null;
}

function getSendTextarea() {
  return doc.querySelector('#send_textarea') as HTMLTextAreaElement | null;
}

function getSendButton() {
  return doc.querySelector('#send_but') as HTMLElement | null;
}

function getSendFormElement() {
  return (doc.querySelector('#send_form') ?? doc.querySelector('#form_sheld')) as HTMLElement | null;
}

function captureDomRestore(el: HTMLElement): DomRestorePoint {
  return {
    parent: el.parentNode as Node,
    nextSibling: el.nextSibling,
  };
}

function restoreDomNode(el: HTMLElement | null, restore: DomRestorePoint | null) {
  if (!el || !restore?.parent) return;
  const { parent, nextSibling } = restore;
  if (el.parentNode === parent && el.nextSibling === nextSibling) return;
  if (nextSibling && nextSibling.parentNode === parent) {
    parent.insertBefore(el, nextSibling);
  } else {
    parent.appendChild(el);
  }
}

function ensureHudStyle() {
  let style = doc.getElementById(HUD_STYLE_ID) as HTMLStyleElement | null;
  if (!style) {
    style = doc.createElement('style');
    style.id = HUD_STYLE_ID;
    doc.head.appendChild(style);
  }
  style.textContent = `
#${HUD_SHELL_ID} {
  --mfrs-corpse-cyan: #3d6b66;
  --mfrs-blood-red: #6b2a26;
  --mfrs-bone-white: #c8c0ae;
  --mfrs-ink: #0a0b0b;
  box-sizing: border-box;
  position: fixed;
  inset: 0;
  z-index: ${HUD_Z_SHELL};
  display: none;
  grid-template-rows: auto minmax(0, 1fr);
  grid-template-columns: minmax(240px, 280px) minmax(0, 1fr) minmax(180px, 220px);
  grid-template-areas:
    "top top top"
    "left center right";
  gap: 0;
  color: var(--mfrs-bone-white);
  background:
    linear-gradient(180deg, rgba(12, 14, 14, 0.98), rgba(8, 10, 10, 0.96)),
    var(--mfrs-ink);
  border: 0;
  font-family: inherit;
}
#${HUD_SHELL_ID}.is-active { display: grid; }
#${HUD_SHELL_ID} *, #${HUD_SHELL_ID} *::before, #${HUD_SHELL_ID} *::after { box-sizing: border-box; }
/* Phase C1：顶条密度 — 单行优先、过长截断、窄屏换行 */
#${HUD_SHELL_ID} .mfrs-hud-top {
  grid-area: top;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px 12px;
  min-height: 40px;
  padding: 6px 10px 6px 12px;
  border-bottom: 1px dashed color-mix(in srgb, var(--mfrs-corpse-cyan) 55%, transparent);
  background: rgba(6, 8, 8, 0.92);
}
#${HUD_SHELL_ID} .mfrs-hud-top-chips {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px 10px;
  min-width: 0;
  flex: 1 1 auto;
  max-height: 4.6em;
  overflow: hidden;
}
#${HUD_SHELL_ID} .mfrs-hud-chip {
  display: inline-flex;
  align-items: baseline;
  gap: 4px;
  min-height: 0;
  max-width: min(100%, 18em);
  font-size: 11px;
  letter-spacing: 0.03em;
  line-height: 1.35;
}
#${HUD_SHELL_ID} .mfrs-hud-chip span {
  flex: 0 0 auto;
  color: color-mix(in srgb, var(--mfrs-bone-white) 45%, #666);
}
#${HUD_SHELL_ID} .mfrs-hud-chip b {
  min-width: 0;
  color: var(--mfrs-bone-white);
  font-weight: 700;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
#${HUD_SHELL_ID} .mfrs-hud-exit {
  flex: 0 0 auto;
  min-width: 44px;
  min-height: 44px;
  padding: 0 12px;
  border: 1px solid color-mix(in srgb, var(--mfrs-corpse-cyan) 70%, transparent);
  border-radius: 0;
  background: rgba(61, 107, 102, 0.12);
  color: var(--mfrs-bone-white);
  cursor: pointer;
  font: inherit;
  font-size: 12px;
  letter-spacing: 0.06em;
}
#${HUD_SHELL_ID} .mfrs-hud-exit:hover {
  border-color: var(--mfrs-corpse-cyan);
  background: rgba(61, 107, 102, 0.22);
}
#${HUD_SHELL_ID} .mfrs-hud-left,
#${HUD_SHELL_ID} .mfrs-hud-right {
  min-height: 0;
  overflow: auto;
  padding: 12px;
  outline: 1px solid color-mix(in srgb, var(--mfrs-blood-red) 16%, transparent);
  outline-offset: -3px;
}
#${HUD_SHELL_ID} .mfrs-hud-left {
  grid-area: left;
  border-right: 1px solid color-mix(in srgb, var(--mfrs-corpse-cyan) 55%, transparent);
  background: rgba(8, 10, 10, 0.88);
}
#${HUD_SHELL_ID} .mfrs-hud-right {
  grid-area: right;
  border-left: 1px solid color-mix(in srgb, var(--mfrs-corpse-cyan) 55%, transparent);
  background: rgba(8, 10, 10, 0.88);
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-height: 0;
  overflow: hidden;
}
#${HUD_SHELL_ID} .mfrs-hud-right-nav {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1 1 auto;
  min-height: 0;
  overflow: auto;
}
/* 方案 A：酒馆原生 8 项放在右栏「设置」二级面板 */
#${HUD_SHELL_ID} .mfrs-hud-settings-panel {
  display: none;
  flex: 1 1 auto;
  min-height: 0;
  overflow: auto;
  margin-top: 2px;
  padding: 8px 4px 10px;
  border-top: 1px dashed color-mix(in srgb, var(--mfrs-corpse-cyan) 40%, transparent);
}
#${HUD_SHELL_ID}.is-settings-open .mfrs-hud-settings-panel {
  display: block;
}
#${HUD_SHELL_ID} .mfrs-hud-settings-panel .mfrs-hud-menu-section {
  margin: 0 0 10px;
  padding-bottom: 8px;
  border-bottom: 1px dashed color-mix(in srgb, var(--mfrs-corpse-cyan) 22%, transparent);
}
#${HUD_SHELL_ID} .mfrs-hud-settings-panel .mfrs-hud-menu-section:last-child {
  margin-bottom: 0;
  padding-bottom: 0;
  border-bottom: 0;
}
#${HUD_SHELL_ID} .mfrs-hud-settings-panel .mfrs-hud-menu-title {
  margin: 0 0 6px;
  padding: 0 2px;
  font-size: 10px;
  letter-spacing: 0.12em;
  color: color-mix(in srgb, var(--mfrs-bone-white) 55%, #888);
}
#${HUD_SHELL_ID} .mfrs-hud-settings-panel .mfrs-hud-menu-grid {
  display: flex;
  flex-direction: column;
  gap: 5px;
}
#${HUD_SHELL_ID} .mfrs-hud-settings-panel .mfrs-hud-menu-item {
  width: 100%;
  min-height: 40px;
  justify-content: flex-start;
  font-size: 12px;
}
#${HUD_SHELL_ID} .mfrs-hud-settings-panel .mfrs-hud-menu-item.is-wide {
  grid-column: auto;
}
#${HUD_SHELL_ID} .mfrs-hud-left-title,
#${HUD_SHELL_ID} .mfrs-hud-placeholder {
  margin: 0 0 10px;
  font-size: 12px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: color-mix(in srgb, var(--mfrs-bone-white) 70%, #888);
}
#${HUD_SHELL_ID} .mfrs-hud-placeholder-body {
  font-size: 13px;
  line-height: 1.55;
  color: color-mix(in srgb, var(--mfrs-bone-white) 55%, #777);
}
#${HUD_SHELL_ID} .mfrs-hud-center {
  grid-area: center;
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
  border-left: 1px solid color-mix(in srgb, var(--mfrs-corpse-cyan) 28%, transparent);
  border-right: 1px solid color-mix(in srgb, var(--mfrs-corpse-cyan) 28%, transparent);
}
#${HUD_SHELL_ID} .mfrs-hud-chat-host {
  flex: 1 1 auto;
  min-height: 0;
  overflow: auto;
  position: relative;
}
#${HUD_SHELL_ID} .mfrs-hud-chat-host > #chat {
  height: 100%;
  max-height: 100%;
  overflow: auto;
}
#${HUD_SHELL_ID} .mfrs-hud-relation-panel,
#${HUD_SHELL_ID} .mfrs-hud-center-panel {
  flex: 1 1 auto;
  min-height: 0;
  overflow: auto;
  padding: 10px 12px;
  background: rgba(8, 10, 10, 0.96);
}
#${HUD_SHELL_ID} .mfrs-hud-panel-title {
  margin: 0 0 10px;
  font-size: 13px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: color-mix(in srgb, var(--mfrs-bone-white) 78%, #888);
}
#${HUD_SHELL_ID} .mfrs-hud-panel-sub {
  margin: 0 0 12px;
  font-size: 12px;
  line-height: 1.5;
  color: color-mix(in srgb, var(--mfrs-bone-white) 52%, #777);
}
#${HUD_SHELL_ID} .mfrs-hud-panel-section {
  margin: 0 0 14px;
  padding-bottom: 10px;
  border-bottom: 1px solid color-mix(in srgb, var(--mfrs-corpse-cyan) 22%, transparent);
}
#${HUD_SHELL_ID} .mfrs-hud-panel-section:last-child {
  border-bottom: 0;
}
#${HUD_SHELL_ID} .mfrs-hud-panel-section-title {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0 0 8px;
  font-size: 12px;
  color: color-mix(in srgb, var(--mfrs-corpse-cyan) 80%, var(--mfrs-bone-white));
}
#${HUD_SHELL_ID} .mfrs-hud-summary-item,
#${HUD_SHELL_ID} .mfrs-hud-memory-item {
  display: grid;
  gap: 2px;
  padding: 7px 0 7px 8px;
  border-left: 2px solid color-mix(in srgb, var(--mfrs-corpse-cyan) 45%, transparent);
  margin-bottom: 6px;
}
#${HUD_SHELL_ID} .mfrs-hud-summary-title,
#${HUD_SHELL_ID} .mfrs-hud-memory-title {
  font-size: 12px;
  color: var(--mfrs-bone-white);
}
#${HUD_SHELL_ID} .mfrs-hud-summary-tags,
#${HUD_SHELL_ID} .mfrs-hud-memory-meta {
  font-size: 11px;
  color: color-mix(in srgb, var(--mfrs-bone-white) 48%, #777);
}
#${HUD_SHELL_ID} .mfrs-hud-system-actions {
  display: grid;
  gap: 8px;
  margin-top: 10px;
}
#${HUD_SHELL_ID} .mfrs-hud-system-btn {
  min-height: 44px;
  padding: 8px 12px;
  border: 1px solid color-mix(in srgb, var(--mfrs-corpse-cyan) 40%, transparent);
  background: transparent;
  color: var(--mfrs-bone-white);
  cursor: pointer;
  font: inherit;
  font-size: 13px;
  text-align: left;
}
#${HUD_SHELL_ID} .mfrs-hud-system-btn:hover {
  border-color: var(--mfrs-corpse-cyan);
  background: color-mix(in srgb, var(--mfrs-corpse-cyan) 22%, transparent);
}
#${HUD_SHELL_ID} .mfrs-hud-gacha-embed {
  min-height: 120px;
}
#${HUD_SHELL_ID} .mfrs-hud-gacha-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 12px;
}
#${HUD_SHELL_ID} .mfrs-msg-check-fold {
  margin-top: 8px;
  border-top: 1px dashed color-mix(in srgb, var(--mfrs-corpse-cyan) 28%, transparent);
  padding-top: 6px;
}
#${HUD_SHELL_ID} .mfrs-msg-check-summary {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  list-style: none;
  font-size: 12px;
  color: color-mix(in srgb, var(--mfrs-bone-white) 72%, #888);
  min-height: 32px;
}
#${HUD_SHELL_ID} .mfrs-msg-check-summary::-webkit-details-marker { display: none; }
#${HUD_SHELL_ID} .mfrs-msg-check-count {
  margin-left: auto;
  opacity: 0.7;
}
#${HUD_SHELL_ID} .mfrs-msg-check-body {
  display: grid;
  gap: 6px;
  margin-top: 6px;
}
#${HUD_SHELL_ID} .mfrs-hud-dossier-group-title {
  margin: 12px 0 6px;
  font-size: 11px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: color-mix(in srgb, var(--mfrs-corpse-cyan) 70%, #888);
}
#${HUD_SHELL_ID} .mfrs-hud-open-full {
  display: inline-flex;
  margin-top: 6px;
  padding: 4px 8px;
  border: 1px solid color-mix(in srgb, var(--mfrs-corpse-cyan) 35%, transparent);
  background: transparent;
  color: color-mix(in srgb, var(--mfrs-bone-white) 75%, #888);
  cursor: pointer;
  font: inherit;
  font-size: 11px;
}
/* Phase C3：关系卡扫读 — 名 + 一行描述 */
#${HUD_SHELL_ID} .mfrs-hud-relation-panel .mfrs-msg-header {
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 6px 12px;
  padding: 8px 0 10px;
}
#${HUD_SHELL_ID} .mfrs-hud-relation-panel .mfrs-msg-section {
  padding: 10px 0 12px;
}
#${HUD_SHELL_ID} .mfrs-hud-relation-panel .mfrs-msg-section-title {
  margin-bottom: 6px;
  font-size: 12px;
}
#${HUD_SHELL_ID} .mfrs-hud-relation-panel .mfrs-msg-npc-list {
  gap: 4px;
}
#${HUD_SHELL_ID} .mfrs-hud-relation-panel .mfrs-msg-npc-item {
  display: grid;
  grid-template-columns: minmax(4.5em, auto) minmax(0, 1fr);
  gap: 4px 10px;
  align-items: baseline;
  padding: 5px 0 5px 8px;
  border-left-width: 2px;
}
#${HUD_SHELL_ID} .mfrs-hud-relation-panel .mfrs-msg-npc-name {
  font-size: 12px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
#${HUD_SHELL_ID} .mfrs-hud-relation-panel .mfrs-msg-npc-desc {
  font-size: 12px;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 1;
  line-clamp: 1;
  overflow: hidden;
}
#${HUD_SHELL_ID} .mfrs-hud-relation-panel[hidden],
#${HUD_SHELL_ID} .mfrs-hud-center-panel[hidden],
#${HUD_SHELL_ID} .mfrs-hud-chat-host[hidden] {
  display: none !important;
}
#${HUD_SHELL_ID} .mfrs-hud-nav-btn span {
  white-space: nowrap;
}
/* 本轮选项唯一入口：输入框上方 HUD；正文 inline / 三栏拟办隐藏 */
#${HUD_SHELL_ID} .mfrs-hud-actions {
  display: block;
  flex: 0 0 auto;
  max-height: min(36vh, 280px);
  overflow: auto;
  border-top: 1px solid color-mix(in srgb, var(--mfrs-corpse-cyan) 34%, transparent);
  background: rgba(7, 9, 9, 0.96);
}
#${HUD_SHELL_ID} .mfrs-hud-actions[hidden] {
  display: none !important;
}
#${HUD_SHELL_ID} .mfrs-hud-actions:not([open]) {
  max-height: none;
  overflow: visible;
}
#${HUD_SHELL_ID} .mfrs-hud-actions-body .mfrs-msg-actions {
  gap: 6px;
}
#${HUD_SHELL_ID} .mfrs-hud-actions-body .mfrs-msg-action-btn {
  min-height: 40px;
  padding: 8px 10px;
}
#${HUD_SHELL_ID} .mfrs-hud-actions > summary {
  list-style: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 36px;
  padding: 6px 12px;
  font-size: 12px;
  letter-spacing: 0.1em;
  color: color-mix(in srgb, var(--mfrs-bone-white) 78%, #888);
  user-select: none;
}
#${HUD_SHELL_ID} .mfrs-hud-actions > summary::-webkit-details-marker { display: none; }
#${HUD_SHELL_ID} .mfrs-hud-actions > summary::after {
  content: '▸';
  margin-left: auto;
  color: #7f8e87;
  font-size: 11px;
  transition: transform 0.15s ease;
}
#${HUD_SHELL_ID} .mfrs-hud-actions[open] > summary::after { transform: rotate(90deg); }
#${HUD_SHELL_ID} .mfrs-hud-actions-body {
  padding: 0 10px 8px;
  max-height: min(22vh, 170px);
  overflow: auto;
}
#${HUD_SHELL_ID} .mfrs-hud-left.is-emphasis {
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--mfrs-corpse-cyan) 70%, transparent);
  background: rgba(12, 18, 17, 0.94);
}
/* Phase C4：左栏档案更紧凑，折叠块保留 */
#${HUD_SHELL_ID} .mfrs-hud-left {
  padding: 8px 8px 10px;
}
#${HUD_SHELL_ID} .mfrs-hud-left-title {
  margin: 0 0 6px;
  font-size: 11px;
}
#${HUD_SHELL_ID} .mfrs-hud-dossier .mfrs-msg-fold {
  margin: 0 0 6px;
  border: 1px solid color-mix(in srgb, var(--mfrs-corpse-cyan) 28%, transparent);
  background: rgba(10, 12, 12, 0.55);
}
#${HUD_SHELL_ID} .mfrs-hud-dossier .mfrs-msg-fold-summary {
  min-height: 32px;
  padding: 4px 8px;
  font-size: 12px;
}
#${HUD_SHELL_ID} .mfrs-hud-dossier .mfrs-msg-fold-body {
  padding: 2px 8px 8px;
}
#${HUD_SHELL_ID} .mfrs-hud-dossier .mfrs-msg-kv {
  font-size: 12px;
  line-height: 1.65;
  padding: 1px 0;
}
#${HUD_SHELL_ID} .mfrs-hud-dossier .mfrs-msg-risk-copy {
  display: none;
}
#${HUD_SHELL_ID} .mfrs-hud-dossier .mfrs-msg-risk-item {
  margin-bottom: 8px;
}
#${HUD_SHELL_ID} .mfrs-hud-actions .mfrs-msg-action-btn {
  width: 100%;
  margin: 0 0 4px;
  min-height: 40px;
  padding: 8px 10px;
}
#${HUD_SHELL_ID} .mfrs-hud-actions .mfrs-msg-action-meta {
  font-size: 11px;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 1;
  line-clamp: 1;
  overflow: hidden;
}
@media (max-width: 1100px) {
  #${HUD_SHELL_ID} .mfrs-hud-chip { max-width: min(100%, 14em); font-size: 10px; }
  #${HUD_SHELL_ID} .mfrs-hud-top { padding: 5px 8px; }
}
@media (max-width: 800px) {
  #${HUD_SHELL_ID} .mfrs-hud-top-chips { max-height: 5.8em; gap: 3px 8px; }
  #${HUD_SHELL_ID} .mfrs-hud-chip { max-width: calc(50% - 6px); }
  #${HUD_SHELL_ID} .mfrs-hud-relation-panel .mfrs-msg-npc-item {
    grid-template-columns: 1fr;
    gap: 2px;
  }
  #${HUD_SHELL_ID} .mfrs-hud-relation-panel .mfrs-msg-npc-desc {
    -webkit-line-clamp: 2;
    line-clamp: 2;
  }
}
/* Phase B：壳内原生输入只做卷宗皮，不拆控件 / 不假代理 */
#${HUD_SHELL_ID} .mfrs-hud-composer {
  flex: 0 0 auto;
  min-width: 0;
  max-height: min(34vh, 220px);
  border-top: 1px solid color-mix(in srgb, var(--mfrs-corpse-cyan) 48%, transparent);
  background:
    linear-gradient(180deg, rgba(10, 12, 12, 0.98), rgba(8, 10, 10, 0.96));
  box-shadow: inset 0 1px 0 color-mix(in srgb, var(--mfrs-corpse-cyan) 22%, transparent);
  padding: 6px 8px 8px;
}
#${HUD_SHELL_ID} .mfrs-hud-composer > #send_form,
#${HUD_SHELL_ID} .mfrs-hud-composer > #form_sheld {
  position: relative !important;
  left: auto !important;
  right: auto !important;
  bottom: auto !important;
  width: 100% !important;
  max-width: 100% !important;
  margin: 0 !important;
  z-index: auto !important;
  display: flex !important;
  align-items: flex-end !important;
  gap: 6px !important;
  padding: 6px 8px !important;
  border: 1px solid color-mix(in srgb, var(--mfrs-corpse-cyan) 38%, transparent) !important;
  border-radius: 0 !important;
  background:
    linear-gradient(180deg, rgba(12, 14, 14, 0.96), rgba(9, 11, 11, 0.94)) !important;
  box-shadow:
    inset 0 0 0 1px rgba(61, 107, 102, 0.08),
    0 -2px 12px rgba(0, 0, 0, 0.22) !important;
  transition: border-color 0.18s ease, box-shadow 0.18s ease !important;
}
#${HUD_SHELL_ID} .mfrs-hud-composer > #send_form:focus-within,
#${HUD_SHELL_ID} .mfrs-hud-composer > #form_sheld:focus-within {
  border-color: color-mix(in srgb, var(--mfrs-corpse-cyan) 78%, #fff 6%) !important;
  box-shadow:
    inset 0 0 0 1px color-mix(in srgb, var(--mfrs-corpse-cyan) 28%, transparent),
    0 0 0 1px color-mix(in srgb, var(--mfrs-corpse-cyan) 35%, transparent),
    0 0 14px rgba(61, 107, 102, 0.18) !important;
}
#${HUD_SHELL_ID} .mfrs-hud-composer #send_textarea {
  flex: 1 1 auto !important;
  width: 100% !important;
  max-width: 100% !important;
  min-height: 44px !important;
  max-height: min(22vh, 140px) !important;
  margin: 0 !important;
  padding: 10px 12px !important;
  border: 0 !important;
  border-radius: 0 !important;
  background: transparent !important;
  color: var(--mfrs-bone-white) !important;
  caret-color: var(--mfrs-corpse-cyan) !important;
  font: inherit !important;
  font-size: 14px !important;
  line-height: 1.55 !important;
  box-shadow: none !important;
  outline: none !important;
  resize: vertical !important;
}
#${HUD_SHELL_ID} .mfrs-hud-composer #send_textarea::placeholder {
  color: color-mix(in srgb, var(--mfrs-bone-white) 42%, #666) !important;
  font-style: italic !important;
}
#${HUD_SHELL_ID} .mfrs-hud-composer #send_textarea:focus {
  border: 0 !important;
  outline: none !important;
  box-shadow: none !important;
}
/* 发送钮强调；左右工具钮弱化但不隐藏（☰ / ✨ 等） */
#${HUD_SHELL_ID} .mfrs-hud-composer #send_but {
  flex: 0 0 auto !important;
  min-width: 44px !important;
  min-height: 44px !important;
  margin: 0 !important;
  color: color-mix(in srgb, var(--mfrs-corpse-cyan) 75%, #fff 10%) !important;
  background: color-mix(in srgb, var(--mfrs-corpse-cyan) 18%, transparent) !important;
  border: 1px solid color-mix(in srgb, var(--mfrs-corpse-cyan) 55%, transparent) !important;
  border-radius: 0 !important;
  text-shadow: none !important;
  transition: color 0.15s ease, background 0.15s ease, border-color 0.15s ease !important;
}
#${HUD_SHELL_ID} .mfrs-hud-composer #send_but:hover,
#${HUD_SHELL_ID} .mfrs-hud-composer #send_but:focus-visible {
  color: #e8e0d0 !important;
  background: color-mix(in srgb, var(--mfrs-blood-red) 28%, var(--mfrs-corpse-cyan) 18%) !important;
  border-color: color-mix(in srgb, var(--mfrs-blood-red) 55%, var(--mfrs-corpse-cyan)) !important;
}
#${HUD_SHELL_ID} .mfrs-hud-composer #leftSendForm,
#${HUD_SHELL_ID} .mfrs-hud-composer #rightSendForm {
  display: flex !important;
  align-items: center !important;
  gap: 2px !important;
  flex: 0 0 auto !important;
  opacity: 0.78;
}
#${HUD_SHELL_ID} .mfrs-hud-composer #options_button,
#${HUD_SHELL_ID} .mfrs-hud-composer #extensionsMenuButton,
#${HUD_SHELL_ID} .mfrs-hud-composer #mes_continue,
#${HUD_SHELL_ID} .mfrs-hud-composer #mes_impersonate,
#${HUD_SHELL_ID} .mfrs-hud-composer .menu_button,
#${HUD_SHELL_ID} .mfrs-hud-composer .fa-solid {
  color: color-mix(in srgb, var(--mfrs-bone-white) 58%, #6a6a6a) !important;
  text-shadow: none !important;
  background: transparent !important;
}
#${HUD_SHELL_ID} .mfrs-hud-composer #options_button:hover,
#${HUD_SHELL_ID} .mfrs-hud-composer #extensionsMenuButton:hover,
#${HUD_SHELL_ID} .mfrs-hud-composer #mes_continue:hover,
#${HUD_SHELL_ID} .mfrs-hud-composer #mes_impersonate:hover,
#${HUD_SHELL_ID} .mfrs-hud-composer .menu_button:hover {
  color: var(--mfrs-bone-white) !important;
  text-shadow: 0 0 8px rgba(61, 107, 102, 0.35) !important;
}
#${HUD_SHELL_ID} .mfrs-hud-composer #options_button,
#${HUD_SHELL_ID} .mfrs-hud-composer #extensionsMenuButton {
  min-width: 36px !important;
  min-height: 36px !important;
  opacity: 1 !important;
  visibility: visible !important;
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
}
#${HUD_SHELL_ID} .mfrs-hud-nav-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  min-height: 44px;
  padding: 7px 10px;
  border: 1px solid color-mix(in srgb, var(--mfrs-corpse-cyan) 40%, transparent);
  border-radius: 0;
  background: transparent;
  color: var(--mfrs-bone-white);
  cursor: pointer;
  font: inherit;
  font-size: 12px;
  text-align: left;
}
#${HUD_SHELL_ID} .mfrs-hud-nav-btn.is-active {
  border-color: var(--mfrs-corpse-cyan);
  background: color-mix(in srgb, var(--mfrs-corpse-cyan) 32%, transparent);
}
#${HUD_SHELL_ID} .mfrs-hud-nav-btn:disabled,
#${HUD_SHELL_ID} .mfrs-hud-nav-btn.is-disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
#${HUD_SHELL_ID} .mfrs-hud-corner {
  position: absolute;
  width: 10px;
  height: 10px;
  pointer-events: none;
  border-color: color-mix(in srgb, var(--mfrs-corpse-cyan) 70%, transparent);
  border-style: solid;
  opacity: 0.55;
}
#${HUD_SHELL_ID} .mfrs-hud-corner-tl { top: 6px; left: 6px; border-width: 1px 0 0 1px; }
#${HUD_SHELL_ID} .mfrs-hud-corner-tr { top: 6px; right: 6px; border-width: 1px 1px 0 0; }
#${HUD_SHELL_ID} .mfrs-hud-corner-bl { bottom: 6px; left: 6px; border-width: 0 0 1px 1px; }
#${HUD_SHELL_ID} .mfrs-hud-corner-br { bottom: 6px; right: 6px; border-width: 0 1px 1px 0; }
#${HUD_SHELL_ID} .mfrs-hud-top-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 0 0 auto;
  position: relative;
}
/* Phase D：菜单分组 / 窄屏全宽 */
#${HUD_SHELL_ID} .mfrs-hud-tavern-menu {
  display: none;
  position: absolute;
  top: calc(100% + 6px);
  right: 0;
  z-index: ${HUD_Z_MENU};
  width: min(380px, 92vw);
  max-height: min(70vh, 640px);
  overflow: auto;
  padding: 10px;
  border: 1px solid color-mix(in srgb, var(--mfrs-corpse-cyan) 65%, transparent);
  background: rgba(8, 10, 10, 0.98);
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.5);
}
#${HUD_SHELL_ID}.is-tavern-menu-open .mfrs-hud-tavern-menu { display: block; }
#${HUD_SHELL_ID} .mfrs-hud-menu-section {
  margin: 0 0 12px;
  padding-bottom: 10px;
  border-bottom: 1px dashed color-mix(in srgb, var(--mfrs-corpse-cyan) 28%, transparent);
}
#${HUD_SHELL_ID} .mfrs-hud-menu-section:last-child {
  margin-bottom: 0;
  padding-bottom: 0;
  border-bottom: 0;
}
#${HUD_SHELL_ID} .mfrs-hud-menu-title {
  margin: 0 0 6px;
  padding: 0 2px;
  font-size: 11px;
  letter-spacing: 0.12em;
  color: color-mix(in srgb, var(--mfrs-bone-white) 55%, #888);
}
#${HUD_SHELL_ID} .mfrs-hud-menu-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
}
#${HUD_SHELL_ID} .mfrs-hud-menu-item {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 40px;
  padding: 6px 8px;
  border: 1px solid color-mix(in srgb, var(--mfrs-corpse-cyan) 35%, transparent);
  border-radius: 0;
  background: rgba(12, 14, 14, 0.9);
  color: var(--mfrs-bone-white);
  cursor: pointer;
  font: inherit;
  font-size: 12px;
  text-align: left;
}
@media (max-width: 800px) {
  #${HUD_SHELL_ID} .mfrs-hud-tavern-menu {
    position: fixed;
    top: auto;
    right: 8px;
    left: 8px;
    bottom: max(12px, env(safe-area-inset-bottom, 0px));
    width: auto;
    max-height: min(62vh, 520px);
    padding: 12px 10px;
  }
  #${HUD_SHELL_ID} .mfrs-hud-menu-grid {
    grid-template-columns: 1fr;
    gap: 8px;
  }
  #${HUD_SHELL_ID} .mfrs-hud-menu-item {
    min-height: 44px;
    font-size: 13px;
  }
  #${HUD_SHELL_ID} .mfrs-hud-menu-item.is-wide {
    grid-column: auto;
  }
}
#${HUD_SHELL_ID} .mfrs-hud-menu-item:hover {
  border-color: var(--mfrs-corpse-cyan);
  background: color-mix(in srgb, var(--mfrs-corpse-cyan) 22%, #0a0b0b);
}
#${HUD_SHELL_ID} .mfrs-hud-menu-item:disabled,
#${HUD_SHELL_ID} .mfrs-hud-menu-item.is-disabled {
  opacity: 0.4;
  cursor: not-allowed;
  border-color: color-mix(in srgb, #666 50%, transparent);
  background: rgba(20, 20, 20, 0.75);
  color: color-mix(in srgb, var(--mfrs-bone-white) 45%, #666);
}
#${HUD_SHELL_ID} .mfrs-hud-menu-item.is-wide {
  grid-column: 1 / -1;
}
#${HUD_SHELL_ID} .mfrs-hud-menu-item.is-fail-flash {
  border-color: color-mix(in srgb, var(--mfrs-blood-red) 70%, #888);
  background: color-mix(in srgb, var(--mfrs-blood-red) 28%, #0a0b0b);
}
#mfrs-hud-toast {
  display: none;
  position: fixed;
  left: 50%;
  bottom: 88px;
  z-index: 2147483600;
  max-width: min(420px, calc(100vw - 32px));
  padding: 10px 14px;
  border: 1px solid color-mix(in srgb, var(--mfrs-corpse-cyan, #3d6b66) 55%, transparent);
  border-radius: 0;
  background: rgba(8, 10, 10, 0.96);
  color: #c8c0ae;
  font: inherit;
  font-size: 12px;
  letter-spacing: 0.04em;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5);
  transform: translateX(-50%);
  pointer-events: none;
}
#mfrs-hud-toast.is-visible { display: block; }
#mfrs-hud-st-return {
  display: none;
  position: fixed;
  top: 12px;
  right: 12px;
  z-index: 2147483000;
  min-width: 44px;
  min-height: 44px;
  padding: 0 14px;
  border: 1px solid #3d6b66;
  border-radius: 0;
  background: rgba(8, 10, 10, 0.95);
  color: #c8c0ae;
  cursor: pointer;
  font: inherit;
  font-size: 12px;
  letter-spacing: 0.06em;
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.45);
}
body.${HUD_ST_UI_CLASS} #mfrs-hud-st-return { display: inline-flex; align-items: center; justify-content: center; }
/* 沉浸内叠 ST 配置：抽屉挂在 #top-settings-holder(z≈3005) 下，必须抬高整棵祖先堆叠上下文，否则会被壳 z=10000 挡住（看起来像“没反应”） */
body.${HUD_ST_UI_CLASS} #${HUD_SHELL_ID}.is-active {
  opacity: 1;
  pointer-events: auto;
  z-index: ${HUD_Z_SHELL} !important;
}
body.${HUD_ST_UI_CLASS} #top-settings-holder,
body.${HUD_ST_UI_CLASS} #top-bar {
  z-index: ${HUD_Z_SHELL + 70} !important;
  pointer-events: auto !important;
}
body.${HUD_ST_UI_CLASS} #top-settings-holder {
  position: relative !important;
}
body.${HUD_ST_UI_CLASS} .drawer-content.openDrawer,
body.${HUD_ST_UI_CLASS} #left-nav-panel.openDrawer,
body.${HUD_ST_UI_CLASS} #right-nav-panel.openDrawer,
body.${HUD_ST_UI_CLASS} #WorldInfo.openDrawer,
body.${HUD_ST_UI_CLASS} #rm_api_block.openDrawer,
body.${HUD_ST_UI_CLASS} #AdvancedFormatting.openDrawer,
body.${HUD_ST_UI_CLASS} #user-settings-block.openDrawer,
body.${HUD_ST_UI_CLASS} #rm_extensions_block.openDrawer,
body.${HUD_ST_UI_CLASS} #PersonaManagement.openDrawer,
body.${HUD_ST_UI_CLASS} #Backgrounds.openDrawer,
body.${HUD_ST_UI_CLASS} #floatingPrompt,
body.${HUD_ST_UI_CLASS} #cfgConfig,
body.${HUD_ST_UI_CLASS} #logprobsViewer,
body.${HUD_ST_UI_CLASS} #completion_prompt_manager_popup,
body.${HUD_ST_UI_CLASS} .popup,
body.${HUD_ST_UI_CLASS} .dialogue_popup,
body.${HUD_ST_UI_CLASS} .acu-v2-app__shell,
body.${HUD_ST_UI_CLASS} .acu-v2-app,
body.${HUD_ST_UI_CLASS} #acu-v2-root,
body.${HUD_ST_UI_CLASS} [class*="acu-v2-app"] {
  z-index: ${HUD_Z_SHELL + 80} !important;
  pointer-events: auto !important;
  max-height: 100vh;
  overflow: auto;
}
/* SP·数据库 III 自挂 body 的 fixed 壳默认 z≈9000，必须抬到沉浸壳之上 */
body.${HUD_ST_UI_CLASS} .acu-v2-app__shell {
  position: fixed !important;
  inset: 0 !important;
}
/* 兜底扫描标记的外置大面板：强制抬到壳上 */
body.${HUD_ST_UI_CLASS} [data-mfrs-hud-overlay-lift="1"] {
  z-index: ${HUD_Z_SHELL + 80} !important;
  pointer-events: auto !important;
}
body.${HUD_ST_UI_CLASS} .drawer-content.openDrawer,
body.${HUD_ST_UI_CLASS} #left-nav-panel.openDrawer,
body.${HUD_ST_UI_CLASS} #right-nav-panel.openDrawer {
  position: fixed !important;
}
#${HUD_SHELL_ID} .mfrs-hud-mobile-only { display: none; }
#${HUD_SHELL_ID} .mfrs-hud-tool-btn {
  min-width: 44px;
  min-height: 44px;
  padding: 0 10px;
  border: 1px solid color-mix(in srgb, var(--mfrs-corpse-cyan) 55%, transparent);
  border-radius: 0;
  background: rgba(61, 107, 102, 0.1);
  color: var(--mfrs-bone-white);
  cursor: pointer;
  font: inherit;
  font-size: 12px;
}
#${HUD_SHELL_ID} .mfrs-hud-tool-btn.is-active {
  border-color: var(--mfrs-corpse-cyan);
  background: color-mix(in srgb, var(--mfrs-corpse-cyan) 28%, transparent);
}
#${HUD_SHELL_ID} .mfrs-hud-drawer-mask,
#${HUD_SHELL_ID} .mfrs-hud-cabinet-mask {
  display: none;
  position: fixed;
  inset: 0;
  z-index: ${HUD_Z_CABINET - 5};
  background: rgba(0, 0, 0, 0.55);
  border: 0;
  padding: 0;
  margin: 0;
  cursor: pointer;
}
#${HUD_SHELL_ID}.is-left-open .mfrs-hud-drawer-mask,
#${HUD_SHELL_ID}.is-right-open .mfrs-hud-drawer-mask,
#${HUD_SHELL_ID}.is-cabinet-open .mfrs-hud-cabinet-mask {
  display: block;
}
#${HUD_SHELL_ID} .mfrs-hud-cabinet-chrome {
  display: none;
  position: fixed;
  left: 6%;
  right: 6%;
  bottom: calc(6% + min(58vh, 640px));
  z-index: ${HUD_Z_CABINET + 1};
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  min-height: 44px;
  padding: 8px 12px;
  border: 1px solid color-mix(in srgb, var(--mfrs-corpse-cyan) 70%, transparent);
  border-bottom: 0;
  background: rgba(8, 10, 10, 0.98);
  color: var(--mfrs-bone-white);
  font-size: 12px;
  letter-spacing: 0.08em;
}
#${HUD_SHELL_ID}.is-cabinet-open .mfrs-hud-cabinet-chrome {
  display: flex;
}
#${HUD_SHELL_ID} .mfrs-hud-cabinet-close {
  min-width: 44px;
  min-height: 40px;
  padding: 0 12px;
  border: 1px solid color-mix(in srgb, var(--mfrs-corpse-cyan) 60%, transparent);
  border-radius: 0;
  background: rgba(61, 107, 102, 0.16);
  color: var(--mfrs-bone-white);
  cursor: pointer;
  font: inherit;
}
body.${HUD_BODY_CLASS} {
  overflow: hidden !important;
}
/* 沉浸态性能：关掉 α 楼层高成本动画，历史楼 content-visibility */
body.${HUD_BODY_CLASS} .mes.last_mes .mfrs-msg-panel,
body.${HUD_BODY_CLASS} .mes.last_mes .mfrs-msg-panel::before,
body.${HUD_BODY_CLASS} .mes.last_mes .mfrs-msg-panel::after,
body.${HUD_BODY_CLASS} .mes.last_mes .mfrs-msg-blood-drop,
body.${HUD_BODY_CLASS} .mes.last_mes .mfrs-msg-risk-item .mfrs-msg-risk-fill,
body.${HUD_BODY_CLASS} .mes.last_mes .mfrs-msg-section-title,
body.${HUD_BODY_CLASS} .mes.last_mes .mfrs-msg-action-btn,
body.${HUD_BODY_CLASS} .mes.last_mes .mfrs-msg-brand,
body.${HUD_BODY_CLASS} .mes.last_mes .mfrs-msg-brand::after {
  animation: none !important;
}
body.${HUD_BODY_CLASS} .mes.last_mes .mfrs-msg-panel::after,
body.${HUD_BODY_CLASS} .mes.last_mes .mfrs-msg-blood-layer {
  display: none !important;
}
body.${HUD_BODY_CLASS} #chat {
  contain: layout style;
}
body.${HUD_BODY_CLASS} #chat > .mes {
  content-visibility: auto;
  contain-intrinsic-size: auto 280px;
}
body.${HUD_BODY_CLASS} #chat > .mes.last_mes {
  content-visibility: visible;
  contain-intrinsic-size: auto;
}
#${HUD_SHELL_ID} .mfrs-hud-chat-host,
#${HUD_SHELL_ID} .mfrs-hud-left,
#${HUD_SHELL_ID} .mfrs-hud-right,
#${HUD_SHELL_ID} .mfrs-hud-actions {
  contain: layout style;
}
body.${HUD_BODY_CLASS} #${FIXED_HOST_ID}:not(.mfrs-hud-cabinet-open) {
  display: none !important;
}
body.${HUD_BODY_CLASS} #${FIXED_HOST_ID}.mfrs-hud-cabinet-open {
  display: flex !important;
  flex-direction: column !important;
  position: fixed !important;
  left: 6%;
  right: 6%;
  bottom: 6%;
  top: auto;
  width: auto !important;
  max-height: min(58vh, 640px);
  margin: 0 !important;
  z-index: ${HUD_Z_CABINET};
  overflow: auto;
  gap: 8px !important;
  background: rgba(8, 10, 10, 0.98);
  border: 1px solid color-mix(in srgb, #3d6b66 70%, transparent);
  box-shadow: 0 -8px 28px rgba(0, 0, 0, 0.45);
}
/* 沉浸柜：多列卡片墙 → 全宽竖向列表（不改 ACU 数据 DOM / 非沉浸布局） */
body.${HUD_BODY_CLASS} #${FIXED_HOST_ID}.mfrs-hud-cabinet-open #mfrs-fixed-dashboard-slot,
body.${HUD_BODY_CLASS} #${FIXED_HOST_ID}.mfrs-hud-cabinet-open #mfrs-fixed-frontend-slot {
  min-width: 0;
  width: 100%;
}
body.${HUD_BODY_CLASS} #${FIXED_HOST_ID}.mfrs-hud-cabinet-open .acu-wrapper {
  width: 100%;
  margin: 0 !important;
  gap: 8px;
}
body.${HUD_BODY_CLASS} #${FIXED_HOST_ID}.mfrs-hud-cabinet-open #acu-data-area.acu-data-display,
body.${HUD_BODY_CLASS} #${FIXED_HOST_ID}.mfrs-hud-cabinet-open .acu-data-display {
  position: relative !important;
  left: auto !important;
  right: auto !important;
  bottom: auto !important;
  top: auto !important;
  width: 100% !important;
  max-height: none !important;
  height: auto !important;
  border-radius: 0 !important;
  box-shadow: none !important;
  backdrop-filter: none !important;
  animation: none !important;
  z-index: auto !important;
  overflow: visible !important;
}
body.${HUD_BODY_CLASS} #${FIXED_HOST_ID}.mfrs-hud-cabinet-open .acu-data-display.visible {
  display: flex !important;
  flex-direction: column !important;
}
body.${HUD_BODY_CLASS} #${FIXED_HOST_ID}.mfrs-hud-cabinet-open .acu-panel-content {
  overflow: visible !important;
  max-height: none !important;
  height: auto !important;
  white-space: normal !important;
}
body.${HUD_BODY_CLASS} #${FIXED_HOST_ID}.mfrs-hud-cabinet-open .acu-layout-vertical .acu-card-grid,
body.${HUD_BODY_CLASS} #${FIXED_HOST_ID}.mfrs-hud-cabinet-open .acu-layout-horizontal .acu-card-grid,
body.${HUD_BODY_CLASS} #${FIXED_HOST_ID}.mfrs-hud-cabinet-open .acu-card-grid {
  display: flex !important;
  flex-direction: column !important;
  flex-wrap: nowrap !important;
  align-items: stretch !important;
  justify-content: flex-start !important;
  gap: 8px !important;
  width: 100% !important;
  min-width: 0 !important;
  height: auto !important;
}
body.${HUD_BODY_CLASS} #${FIXED_HOST_ID}.mfrs-hud-cabinet-open .acu-layout-vertical .acu-data-card,
body.${HUD_BODY_CLASS} #${FIXED_HOST_ID}.mfrs-hud-cabinet-open .acu-layout-horizontal .acu-data-card,
body.${HUD_BODY_CLASS} #${FIXED_HOST_ID}.mfrs-hud-cabinet-open .acu-data-card {
  flex: 0 0 auto !important;
  width: 100% !important;
  max-width: 100% !important;
  max-height: none !important;
  border-radius: 0 !important;
  white-space: normal !important;
}
body.${HUD_BODY_CLASS} #${FIXED_HOST_ID}.mfrs-hud-cabinet-open .acu-layout-vertical .acu-data-card:hover {
  transform: none !important;
}
body.${HUD_BODY_CLASS} #${FIXED_HOST_ID}.mfrs-hud-cabinet-open .acu-card-header {
  border-radius: 0 !important;
  justify-content: flex-start !important;
  padding-left: 36px !important;
}
body.${HUD_BODY_CLASS} #${FIXED_HOST_ID}.mfrs-hud-cabinet-open .acu-editable-title {
  text-align: left !important;
}
body.${HUD_BODY_CLASS} #${FIXED_HOST_ID}.mfrs-hud-cabinet-open .acu-card-main-grid {
  display: flex !important;
  flex-direction: column !important;
  gap: 0 !important;
}
body.${HUD_BODY_CLASS} #${FIXED_HOST_ID}.mfrs-hud-cabinet-open .acu-grid-item,
body.${HUD_BODY_CLASS} #${FIXED_HOST_ID}.mfrs-hud-cabinet-open .acu-full-item,
body.${HUD_BODY_CLASS} #${FIXED_HOST_ID}.mfrs-hud-cabinet-open .acu-inline-item {
  width: 100% !important;
  max-width: 100% !important;
  box-sizing: border-box;
}
body.${HUD_BODY_CLASS} #${FIXED_HOST_ID}.mfrs-hud-cabinet-open .acu-nav-tabs-area {
  grid-template-columns: repeat(auto-fill, minmax(92px, 1fr)) !important;
  gap: 6px !important;
}
body.${HUD_BODY_CLASS} #${FIXED_HOST_ID}.mfrs-hud-cabinet-open .acu-nav-container:not(.collapsed) {
  flex-direction: column !important;
  align-items: stretch !important;
  height: auto !important;
  gap: 8px !important;
}
body.${HUD_BODY_CLASS} #${FIXED_HOST_ID}.mfrs-hud-cabinet-open .acu-nav-actions-area {
  display: flex !important;
  flex-wrap: wrap !important;
  gap: 6px !important;
  justify-content: flex-start !important;
}
body.${HUD_BODY_CLASS} #${FIXED_HOST_ID}.mfrs-hud-cabinet-open .acu-embedded-dashboard-container .acu-dash-container {
  display: flex !important;
  flex-direction: column !important;
  grid-template-columns: none !important;
  height: auto !important;
  overflow: visible !important;
  gap: 0 !important;
}
body.${HUD_BODY_CLASS} #${FIXED_HOST_ID}.mfrs-hud-cabinet-open .acu-embedded-dashboard-container .acu-dash-col {
  height: auto !important;
  flex: 0 0 auto !important;
  overflow: visible !important;
  min-height: 0 !important;
}
body.${HUD_BODY_CLASS} #${FIXED_HOST_ID}.mfrs-hud-cabinet-open .acu-embedded-dashboard-container .acu-dash-card {
  flex: 0 0 auto !important;
  min-height: 0 !important;
  overflow: visible !important;
  border-bottom: 1px solid color-mix(in srgb, #3d6b66 28%, transparent) !important;
}
body.${HUD_BODY_CLASS} .mfrs-msg-panel.mfrs-msg-tri {
  display: block !important;
  grid-template-columns: none !important;
  grid-template-areas: none !important;
}
body.${HUD_BODY_CLASS} .mfrs-msg-tri-left,
body.${HUD_BODY_CLASS} .mfrs-msg-tri-right,
body.${HUD_BODY_CLASS} .mfrs-msg-tabs,
body.${HUD_BODY_CLASS} .mfrs-msg-brand,
body.${HUD_BODY_CLASS} .mfrs-msg-actions-block,
body.${HUD_BODY_CLASS} .mfrs-msg-section.mfrs-msg-actions-block,
body.${HUD_BODY_CLASS} .mfrs-msg-tri-story > .mfrs-msg-actions-block,
body.${HUD_BODY_CLASS} .mfrs-msg-inline-choices {
  display: none !important;
}
body.${HUD_BODY_CLASS} .mfrs-msg-tri-center {
  display: block !important;
  min-height: 0;
}
@media (max-width: 1100px) {
  #${HUD_SHELL_ID}.is-active {
    grid-template-columns: minmax(200px, 220px) minmax(0, 1fr) minmax(140px, 160px);
  }
}
@media (max-width: 800px) {
  #${HUD_SHELL_ID}.is-active {
    grid-template-columns: minmax(0, 1fr);
    grid-template-areas:
      "top"
      "center";
  }
  #${HUD_SHELL_ID} .mfrs-hud-mobile-only { display: inline-flex; align-items: center; justify-content: center; }
  #${HUD_SHELL_ID} .mfrs-hud-left,
  #${HUD_SHELL_ID} .mfrs-hud-right {
    display: none;
    position: fixed;
    top: 0;
    bottom: 0;
    width: min(86vw, 320px);
    z-index: ${HUD_Z_CABINET - 2};
    max-height: none;
    box-shadow: 0 0 24px rgba(0, 0, 0, 0.45);
  }
  #${HUD_SHELL_ID} .mfrs-hud-left {
    left: 0;
    border-right: 1px solid color-mix(in srgb, var(--mfrs-corpse-cyan) 55%, transparent);
  }
  #${HUD_SHELL_ID} .mfrs-hud-right {
    right: 0;
    border-left: 1px solid color-mix(in srgb, var(--mfrs-corpse-cyan) 55%, transparent);
  }
  #${HUD_SHELL_ID}.is-left-open .mfrs-hud-left,
  #${HUD_SHELL_ID}.is-right-open .mfrs-hud-right {
    display: block;
  }
  body.${HUD_BODY_CLASS} #${FIXED_HOST_ID}.mfrs-hud-cabinet-open {
    left: 3%;
    right: 3%;
    bottom: 3%;
    max-height: 70vh;
  }
  #${HUD_SHELL_ID} .mfrs-hud-cabinet-chrome {
    left: 3%;
    right: 3%;
    bottom: calc(3% + min(70vh, 720px));
  }
}
/* E3：系统低动效 + 可选 body 标记 */
@media (prefers-reduced-motion: reduce) {
  #${HUD_SHELL_ID} *,
  #${HUD_SHELL_ID} *::before,
  #${HUD_SHELL_ID} *::after { transition: none !important; animation: none !important; }
}
body.mfrs-hud-reduced-motion #${HUD_SHELL_ID} *,
body.mfrs-hud-reduced-motion #${HUD_SHELL_ID} *::before,
body.mfrs-hud-reduced-motion #${HUD_SHELL_ID} *::after {
  transition: none !important;
  animation: none !important;
}
body.mfrs-hud-reduced-motion #${HUD_SHELL_ID} .mfrs-hud-chat-host > #chat {
  scroll-behavior: auto !important;
}
`;
}

function syncHudMotionPreference() {
  let reduce = false;
  try {
    reduce = Boolean(hostWindow.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches);
  } catch {
    reduce = false;
  }
  // 可选：localStorage.mfrs_hud_low_motion = '1' 强制低动效
  try {
    if (hostWindow.localStorage?.getItem?.('mfrs_hud_low_motion') === '1') reduce = true;
  } catch {
    // ignore storage access errors
  }
  doc.body.classList.toggle('mfrs-hud-reduced-motion', reduce);
}

function migrateHudShellDom(shell: HTMLElement) {
  const center = shell.querySelector('.mfrs-hud-center');
  if (center) {
    const ensureSlot = (attr: string, className: string, after: string) => {
      if (shell.querySelector(`[data-mfrs-hud="${attr}"]`)) return;
      const el = doc.createElement('div');
      el.className = className;
      el.setAttribute('data-mfrs-hud', attr);
      el.hidden = true;
      const anchor = center.querySelector(`[data-mfrs-hud="${after}"]`);
      if (anchor?.nextSibling) center.insertBefore(el, anchor.nextSibling);
      else if (anchor) anchor.after(el);
      else center.insertBefore(el, center.firstChild);
    };
    ensureSlot('memory-slot', 'mfrs-hud-center-panel', 'relation-slot');
    ensureSlot('gacha-slot', 'mfrs-hud-center-panel', 'memory-slot');
    ensureSlot('system-slot', 'mfrs-hud-center-panel', 'gacha-slot');
    shell.querySelector('[data-mfrs-hud="relation-slot"]')?.classList.add('mfrs-hud-center-panel');
  }
  const nav = shell.querySelector('.mfrs-hud-right-nav');
  if (nav) {
    const order: Array<{ id: string; label: string; icon: string; title?: string }> = [
      { id: 'story', label: '正文', icon: 'fa-align-left' },
      { id: 'dossier', label: '档案', icon: 'fa-folder-open' },
      { id: 'relation', label: '关系', icon: 'fa-users' },
      { id: 'memory', label: '记忆', icon: 'fa-clock-rotate-left' },
      { id: 'gacha', label: '抽卡', icon: 'fa-gift' },
      { id: 'system', label: '系统', icon: 'fa-screwdriver-wrench' },
      { id: 'settings', label: '设置', icon: 'fa-gear', title: '酒馆原生设置' },
    ];
    const needRebuild =
      Boolean(nav.querySelector('[data-mfrs-hud-nav="cabinet"]')) ||
      !nav.querySelector('[data-mfrs-hud-nav="memory"]') ||
      !nav.querySelector('[data-mfrs-hud-nav="gacha"]') ||
      !nav.querySelector('[data-mfrs-hud-nav="system"]');
    if (needRebuild) {
      nav.innerHTML = order
        .map(
          item =>
            `<button type="button" class="mfrs-hud-nav-btn${item.id === 'story' ? ' is-active' : ''}" data-mfrs-hud-nav="${item.id}"${item.title ? ` title="${item.title}"` : ''}><i class="fa-solid ${item.icon}" aria-hidden="true"></i><span>${item.label}</span></button>`,
        )
        .join('');
    }
  }
  const chrome = shell.querySelector('[data-mfrs-hud="cabinet-chrome"] span');
  if (chrome && chrome.textContent?.includes('档案柜')) {
    chrome.textContent = '全库编辑 · 系统入口';
  }
}

function ensureHudShell(): HTMLElement {
  ensureHudStyle();
  let shell = doc.getElementById(HUD_SHELL_ID) as HTMLElement | null;
  if (shell) {
    migrateHudShellDom(shell);
    return shell;
  }

  shell = doc.createElement('div');
  shell.id = HUD_SHELL_ID;
  shell.setAttribute('role', 'application');
  shell.setAttribute('aria-label', '神秘复苏全屏卷宗');
  shell.innerHTML = `
<span class="mfrs-hud-corner mfrs-hud-corner-tl" aria-hidden="true"></span>
<span class="mfrs-hud-corner mfrs-hud-corner-tr" aria-hidden="true"></span>
<span class="mfrs-hud-corner mfrs-hud-corner-bl" aria-hidden="true"></span>
<span class="mfrs-hud-corner mfrs-hud-corner-br" aria-hidden="true"></span>
<header class="mfrs-hud-top">
  <div class="mfrs-hud-top-chips" data-mfrs-hud="chips">
    <div class="mfrs-hud-chip"><span>位置</span><b data-mfrs-hud-chip="location">—</b></div>
    <div class="mfrs-hud-chip"><span>阶段</span><b data-mfrs-hud-chip="phase">—</b></div>
    <div class="mfrs-hud-chip"><span>事件</span><b data-mfrs-hud-chip="event">—</b></div>
    <div class="mfrs-hud-chip"><span>鬼域</span><b data-mfrs-hud-chip="domain">—</b></div>
    <div class="mfrs-hud-chip"><span>危害</span><b data-mfrs-hud-chip="danger">—</b></div>
  </div>
  <div class="mfrs-hud-top-actions">
    <button type="button" class="mfrs-hud-tool-btn mfrs-hud-mobile-only" data-mfrs-hud="toggle-left" aria-label="打开现场档案" title="档案">档案</button>
    <button type="button" class="mfrs-hud-tool-btn mfrs-hud-mobile-only" data-mfrs-hud="toggle-right" aria-label="打开导航" title="导航">导航</button>
    <button type="button" class="mfrs-hud-exit" data-mfrs-hud="exit" title="退出沉浸 (Ctrl+Shift+G)">退出沉浸</button>
  </div>
</header>
<aside class="mfrs-hud-left" data-mfrs-hud="left" aria-label="现场档案">
  <p class="mfrs-hud-left-title">现场档案</p>
  <div class="mfrs-hud-dossier" data-mfrs-hud="dossier-slot"></div>
</aside>
<section class="mfrs-hud-center">
  <div class="mfrs-hud-chat-host" data-mfrs-hud="chat-host"></div>
  <div class="mfrs-hud-relation-panel mfrs-hud-center-panel" data-mfrs-hud="relation-slot" hidden></div>
  <div class="mfrs-hud-center-panel" data-mfrs-hud="memory-slot" hidden></div>
  <div class="mfrs-hud-center-panel" data-mfrs-hud="gacha-slot" hidden></div>
  <div class="mfrs-hud-center-panel" data-mfrs-hud="system-slot" hidden></div>
  <details class="mfrs-hud-actions" data-mfrs-hud="actions" open>
    <summary><i class="fa-solid fa-list-check" aria-hidden="true"></i><span>本轮选项 · A/B/C/D</span></summary>
    <div class="mfrs-hud-actions-body" data-mfrs-hud="actions-slot"></div>
  </details>
  <div class="mfrs-hud-composer" data-mfrs-hud="composer" aria-label="酒馆原生输入区"></div>
</section>
<aside class="mfrs-hud-right" data-mfrs-hud="right" aria-label="现场导航与设置">
  <div class="mfrs-hud-right-nav">
    <button type="button" class="mfrs-hud-nav-btn is-active" data-mfrs-hud-nav="story"><i class="fa-solid fa-align-left" aria-hidden="true"></i><span>正文</span></button>
    <button type="button" class="mfrs-hud-nav-btn" data-mfrs-hud-nav="dossier"><i class="fa-solid fa-folder-open" aria-hidden="true"></i><span>档案</span></button>
    <button type="button" class="mfrs-hud-nav-btn" data-mfrs-hud-nav="relation"><i class="fa-solid fa-users" aria-hidden="true"></i><span>关系</span></button>
    <button type="button" class="mfrs-hud-nav-btn" data-mfrs-hud-nav="memory"><i class="fa-solid fa-clock-rotate-left" aria-hidden="true"></i><span>记忆</span></button>
    <button type="button" class="mfrs-hud-nav-btn" data-mfrs-hud-nav="gacha"><i class="fa-solid fa-gift" aria-hidden="true"></i><span>抽卡</span></button>
    <button type="button" class="mfrs-hud-nav-btn" data-mfrs-hud-nav="system"><i class="fa-solid fa-screwdriver-wrench" aria-hidden="true"></i><span>系统</span></button>
    <button type="button" class="mfrs-hud-nav-btn" data-mfrs-hud-nav="settings" title="酒馆原生设置"><i class="fa-solid fa-gear" aria-hidden="true"></i><span>设置</span></button>
  </div>
  <div class="mfrs-hud-settings-panel" data-mfrs-hud="settings-panel" role="navigation" aria-label="酒馆原生设置"></div>
</aside>
<button type="button" class="mfrs-hud-drawer-mask" data-mfrs-hud="drawer-mask" aria-label="关闭侧栏"></button>
<button type="button" class="mfrs-hud-cabinet-mask" data-mfrs-hud="cabinet-mask" aria-label="关闭全库"></button>
<div class="mfrs-hud-cabinet-chrome" data-mfrs-hud="cabinet-chrome">
  <span>全库编辑 · 系统入口</span>
  <button type="button" class="mfrs-hud-cabinet-close" data-mfrs-hud="cabinet-close">关闭</button>
</div>
`;
  doc.body.appendChild(shell);
  return shell;
}

type HudTavernAction =
  | { kind: 'click'; selectors: string[]; label: string; yieldUi?: boolean; matchText?: string }
  | { kind: 'continue' | 'regenerate' | 'stop' | 'cabinet' | 'exit'; label: string };

type HudTavernMenuSection = { title: string; items: Array<{ label: string; action: HudTavernAction; wide?: boolean }> };

/** 仅代理 ST 顶栏 8 抽屉；☰选项 / ✨扩展工具在原生输入条，不重复 */
function getHudTavernMenuSections(): HudTavernMenuSection[] {
  return [
    {
      title: '连接与格式',
      items: [
        {
          label: 'AI 响应配置',
          action: {
            kind: 'click',
            selectors: ['#leftNavDrawerIcon', '[title="AI 响应配置"]', '.drawer-icon.fa-sliders'],
            label: 'AI 响应配置',
            yieldUi: true,
          },
        },
        {
          label: 'API 连接',
          action: {
            kind: 'click',
            selectors: ['#API-status-top', '#api_button', '[title="API 连接"]', '.drawer-icon.fa-plug'],
            label: 'API 连接',
            yieldUi: true,
          },
        },
        {
          label: 'AI 回复格式化',
          action: {
            kind: 'click',
            selectors: ['[title="AI 回复格式化"]', '.drawer-icon.fa-font', '#sys-settings-button'],
            label: 'AI 回复格式化',
            yieldUi: true,
          },
          wide: true,
        },
        {
          label: '用户设置',
          action: {
            kind: 'click',
            selectors: ['[title="用户设置"]', '.drawer-icon.fa-user-cog', '#user-settings-button'],
            label: '用户设置',
            yieldUi: true,
          },
        },
      ],
    },
    {
      title: '世界与角色',
      items: [
        {
          label: '世界书',
          action: {
            kind: 'click',
            selectors: ['#WIDrawerIcon', '[title="世界书"]', '.drawer-icon.fa-book-atlas', '.drawer-icon.fa-globe'],
            label: '世界书',
            yieldUi: true,
          },
        },
        {
          label: '角色管理',
          action: {
            kind: 'click',
            selectors: ['#rightNavDrawerIcon', '[title="角色管理"]', '.drawer-icon.fa-address-card'],
            label: '角色管理',
            yieldUi: true,
          },
        },
        {
          label: '用户设定',
          action: {
            kind: 'click',
            selectors: ['[title="用户设定管理"]', '.drawer-icon.fa-face-smile', '#persona-management-button'],
            label: '用户设定',
            yieldUi: true,
          },
        },
        {
          // D1：与输入条 ✨「扩展工具」区分 —— 此处是扩展设置面板
          label: '扩展设置',
          action: {
            kind: 'click',
            selectors: ['[title="扩展程序"].drawer-icon', '#extensions-settings-button', '.drawer-icon.fa-cubes'],
            label: '扩展设置',
            yieldUi: true,
          },
        },
      ],
    },
  ];
}

function findHudActionTarget(selectors: string[], matchText?: string): HTMLElement | null {
  for (const selector of selectors) {
    try {
      const nodes = Array.from(doc.querySelectorAll(selector)) as HTMLElement[];
      const filtered = matchText
        ? nodes.filter(node => (node.textContent || '').replace(/\s+/g, ' ').includes(matchText))
        : nodes;
      const visible = filtered.find(node => {
        if (!node || node.hasAttribute('disabled')) return false;
        if (node.classList.contains('displayNone')) return false;
        try {
          const style = (hostWindow as Window).getComputedStyle?.(node);
          if (style && (style.display === 'none' || style.visibility === 'hidden')) return false;
        } catch {
          // ignore
        }
        return true;
      });
      if (visible) return visible;
      if (filtered[0]) return filtered[0];
    } catch {
      // ignore invalid selectors
    }
  }
  return null;
}

function ensureHudStReturnButton() {
  let btn = doc.getElementById('mfrs-hud-st-return') as HTMLButtonElement | null;
  if (btn) return btn;
  btn = doc.createElement('button');
  btn.type = 'button';
  btn.id = 'mfrs-hud-st-return';
  btn.textContent = '关闭面板';
  btn.title = '关闭酒馆配置面板（保持沉浸）';
  btn.addEventListener('click', e => {
    e.preventDefault();
    e.stopPropagation();
    restoreHudFromStUi();
  });
  doc.body.appendChild(btn);
  return btn;
}

/** 在沉浸壳上叠加 ST 抽屉/弹窗 / 扩展面板，不退出全屏 */
function yieldHudToStUi() {
  if (!isHudMounted()) return;
  ensureHudStReturnButton();
  doc.body.classList.add(HUD_ST_UI_CLASS);
  scheduleHudOverlayWatch();
}

const SP_DB_UI_SELECTOR = '.acu-v2-app__shell, .acu-v2-app, #acu-v2-root, [data-acu-v2-root]';
const HUD_OVERLAY_LIFT_ATTR = 'data-mfrs-hud-overlay-lift';
const ST_OPEN_DRAWER_SELECTOR =
  '.drawer-content.openDrawer, #left-nav-panel.openDrawer, #right-nav-panel.openDrawer';
/** 扩展菜单与常见入口：点了几乎总会弹出 z&lt;10000 的面板 */
const HUD_EXTENSION_ENTRY_SELECTOR = [
  '#extensionsMenu',
  '#extensionsMenuButton',
  '#options_button',
  '#options',
  '.options-content',
  '#acu-v2-menu-item',
  '[title*="SP·数据库"]',
  '[aria-label*="SP·数据库"]',
  '[title*="打开数据库"]',
  '[aria-label*="打开数据库"]',
].join(', ');

let hudOverlayObserver: MutationObserver | null = null;
let hudOverlayWatchTimer: number | null = null;
let hudOverlayScanTimer: number | null = null;
let hudOverlayLastToastAt = 0;

function isElementVisiblyLarge(el: HTMLElement, minW = 120, minH = 80) {
  if (!el.isConnected) return false;
  const cs = hostWindow.getComputedStyle?.(el);
  if (!cs) return el.offsetWidth >= minW && el.offsetHeight >= minH;
  if (cs.display === 'none' || cs.visibility === 'hidden' || Number(cs.opacity) === 0) return false;
  const r = el.getBoundingClientRect();
  return r.width >= minW && r.height >= minH;
}

function isSpDatabaseUiOpen() {
  return Array.from(doc.querySelectorAll(SP_DB_UI_SELECTOR)).some(el =>
    isElementVisiblyLarge(el as HTMLElement, 40, 40),
  );
}

function parseCssZIndex(value: string | null | undefined): number | null {
  if (!value || value === 'auto') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

/** ST 常驻布局：绝不能当「外置弹层」抬层，否则会与壳 z 打架闪烁 */
const HUD_ST_CORE_LAYOUT_IDS = new Set([
  'bg1',
  'bg2',
  'bg3',
  'sheld',
  'chat',
  'form_sheld',
  'send_form',
  'top-bar',
  'top-settings-holder',
  'character-name',
  'avatar',
  'main',
  'page-wrapper',
  'shadow_popup',
  'dialogue_popup_ok',
]);

function isHudStCoreLayoutElement(el: HTMLElement | null): boolean {
  if (!el) return false;
  if (HUD_ST_CORE_LAYOUT_IDS.has(el.id)) return true;
  // 聊天/输入常驻祖先
  if (el.id === 'chat' || el.closest?.('#chat, #sheld, #form_sheld, #send_form, #top-bar, #top-settings-holder, #bg1')) {
    // 但抽屉 open 内容允许
    if (el.classList?.contains('drawer-content') && el.classList.contains('openDrawer')) return false;
    if (el.matches?.(SP_DB_UI_SELECTOR) || el.closest?.(SP_DB_UI_SELECTOR)) return false;
    if (el.classList?.contains('popup') || el.classList?.contains('dialogue_popup')) return false;
    // 在 sheld/bg1 树内的普通节点一律视为核心布局
    if (el.closest?.('#sheld, #bg1, #chat, #form_sheld') && !el.matches?.(ST_OPEN_DRAWER_SELECTOR)) return true;
  }
  return false;
}

/** 是否为应抬到壳上的外置大面板（排除 HUD 自身、ST 核心布局、已极高 z 的 ACU 弹层） */
function isHudCoverableExternalOverlay(el: HTMLElement): boolean {
  if (!el?.isConnected || el.id === HUD_SHELL_ID || el.closest?.(`#${HUD_SHELL_ID}`)) return false;
  if (el.id === 'mfrs-hud-st-return' || el.id === 'mfrs-hud-toast' || el.id === FIXED_HOST_ID) return false;
  if (el.classList?.contains('mfrs-hud-cabinet-mask') || el.classList?.contains('mfrs-hud-cabinet-chrome')) return false;
  if (isHudStCoreLayoutElement(el)) return false;
  // 已在极高层的确认框/toast 不需要再抬
  if (el.classList?.contains('acu-edit-overlay') || el.classList?.contains('mfrs-confirm-overlay')) return false;
  if (el.classList?.contains('mfrs-toast-container') || el.classList?.contains('acu-quick-view-overlay')) return false;
  // 扩展菜单本身很高 z，不抬菜单壳，只抬其子面板
  if (el.id === 'extensionsMenu' || el.classList?.contains('options-content')) return false;
  const cs = hostWindow.getComputedStyle?.(el);
  if (!cs) return false;
  if (cs.position !== 'fixed' && cs.position !== 'absolute') return false;
  if (cs.pointerEvents === 'none') return false;
  const z = parseCssZIndex(cs.zIndex);
  // 无 z 或低于壳(10000) 才可能被盖；>=10080 视为已抬/已安全（不再重复 yield）
  if (z !== null && z >= HUD_Z_SHELL + 80) return false;
  if (z !== null && z > 0 && z < 20) return false; // 忽略底层装饰
  if (!isElementVisiblyLarge(el, 160, 100)) return false;
  // 白名单：已知外置面板（不靠面积误伤 #sheld/#bg1）
  if (el.matches?.(SP_DB_UI_SELECTOR) || el.closest?.(SP_DB_UI_SELECTOR)) return true;
  if (el.classList?.contains('drawer-content') && el.classList.contains('openDrawer')) return true;
  if (el.classList?.contains('popup') || el.classList?.contains('dialogue_popup')) return true;
  if (el.id === 'floatingPrompt' || el.id === 'cfgConfig' || el.id === 'logprobsViewer') return true;
  if (el.id === 'completion_prompt_manager_popup') return true;
  if (el.getAttribute?.('role') === 'dialog' || el.getAttribute?.('aria-modal') === 'true') {
    // 排除 ST 核心树内的伪 dialog
    if (isHudStCoreLayoutElement(el)) return false;
    return true;
  }
  // 兜底：仅 body 直接子级、且不是核心布局的大半屏面板
  if (el.parentElement === doc.body && !isHudStCoreLayoutElement(el)) {
    const r = el.getBoundingClientRect();
    const vw = hostWindow.innerWidth || doc.documentElement.clientWidth || 1;
    const vh = hostWindow.innerHeight || doc.documentElement.clientHeight || 1;
    const areaRatio = (r.width * r.height) / (vw * vh);
    if (areaRatio >= 0.22 && (z === null || z < HUD_Z_SHELL)) return true;
  }
  return false;
}

function collectHudCoverableOverlays(): HTMLElement[] {
  const out: HTMLElement[] = [];
  const seen = new Set<Element>();
  const push = (el: Element | null) => {
    if (!el || seen.has(el)) return;
    const node = el as HTMLElement;
    if (!isHudCoverableExternalOverlay(node)) return;
    seen.add(el);
    out.push(node);
  };
  // 已知名单（不扫 body 全部子级误伤 #bg1/#sheld）
  doc.querySelectorAll(
    [
      SP_DB_UI_SELECTOR,
      ST_OPEN_DRAWER_SELECTOR,
      '.popup',
      '.dialogue_popup',
      '#floatingPrompt',
      '#cfgConfig',
      '#logprobsViewer',
      '#completion_prompt_manager_popup',
      '[role="dialog"]',
      '[aria-modal="true"]',
    ].join(', '),
  ).forEach(push);
  // 仅扫描已标记抬层的节点（保持跟踪）+ body 直接子级白名单外的可疑面板
  doc.querySelectorAll(`[${HUD_OVERLAY_LIFT_ATTR}="1"]`).forEach(el => {
    // 已抬的：若仍可见且非核心布局，算作活跃叠层（用于阻止误 restore）
    if (isHudStCoreLayoutElement(el as HTMLElement)) {
      el.removeAttribute(HUD_OVERLAY_LIFT_ATTR);
      return;
    }
    if (isElementVisiblyLarge(el as HTMLElement, 80, 60)) {
      seen.add(el);
      out.push(el as HTMLElement);
    }
  });
  Array.from(doc.body?.children || []).forEach(child => {
    if (!(child instanceof hostWindow.HTMLElement || child instanceof HTMLElement)) return;
    const node = child as HTMLElement;
    if (isHudStCoreLayoutElement(node)) return;
    if (node.id === HUD_SHELL_ID) return;
    push(node);
  });
  return out;
}

function hasHudCoverableOverlays() {
  return collectHudCoverableOverlays().length > 0;
}

function liftHudCoverableOverlays() {
  const overlays = collectHudCoverableOverlays();
  overlays.forEach(el => {
    el.setAttribute(HUD_OVERLAY_LIFT_ATTR, '1');
  });
  // 清理已关闭节点上的标记
  doc.querySelectorAll(`[${HUD_OVERLAY_LIFT_ATTR}="1"]`).forEach(el => {
    if (!overlays.includes(el as HTMLElement) && !isElementVisiblyLarge(el as HTMLElement, 40, 40)) {
      el.removeAttribute(HUD_OVERLAY_LIFT_ATTR);
    }
  });
  return overlays.length;
}

function clearHudOverlayLifts() {
  doc.querySelectorAll(`[${HUD_OVERLAY_LIFT_ATTR}]`).forEach(el => el.removeAttribute(HUD_OVERLAY_LIFT_ATTR));
}

function scanAndYieldHudOverlays(opts?: { toast?: string }) {
  if (!isHudMounted()) return 0;
  const count = liftHudCoverableOverlays();
  if (count > 0 || hasOpenStDrawers() || isSpDatabaseUiOpen()) {
    yieldHudToStUi();
    if (opts?.toast) {
      const now = Date.now();
      if (now - hudOverlayLastToastAt > 1600) {
        hudOverlayLastToastAt = now;
        showHudToast(opts.toast, 1200);
      }
    }
  }
  return count;
}

function scheduleHudOverlayWatch() {
  if (!isHudMounted()) return;
  if (hudOverlayWatchTimer !== null) {
    hostWindow.clearTimeout(hudOverlayWatchTimer);
    hudOverlayWatchTimer = null;
  }
  // 仅在「可能刚打开外置面板」时短扫描，避免常驻误伤 #sheld/#bg1 导致 st-ui 闪烁
  const delays = [0, 80, 200, 450, 900];
  delays.forEach((ms, i) => {
    hostWindow.setTimeout(() => {
      if (!isHudMounted()) return;
      scanAndYieldHudOverlays();
      if (i === delays.length - 1) maybeRestoreHudAfterOverlayClose();
    }, ms);
  });
  ensureHudOverlayObserver();
  if (hudOverlayScanTimer === null) {
    hudOverlayScanTimer = hostWindow.setInterval(() => {
      if (!isHudMounted()) {
        stopHudOverlayWatch();
        return;
      }
      // 仅在已让层或确实有外置叠层时巡检；无则不碰 st-ui
      if (doc.body.classList.contains(HUD_ST_UI_CLASS) || hasActiveHudExternalOverlay()) {
        scanAndYieldHudOverlays();
        maybeRestoreHudAfterOverlayClose();
      }
    }, 1200);
  }
}

function ensureHudOverlayObserver() {
  if (hudOverlayObserver || !doc.body) return;
  hudOverlayObserver = new MutationObserver(mutations => {
    if (!isHudMounted()) return;
    // 忽略仅 core 布局 class/style 抖动，减少无意义扫描
    const interesting = mutations.some(m => {
      const t = m.target as Element;
      if (!t || t === doc.body) return m.type === 'childList';
      if (t.id === HUD_SHELL_ID || t.closest?.(`#${HUD_SHELL_ID}`)) return false;
      if (isHudStCoreLayoutElement(t as HTMLElement)) return m.type === 'childList' && m.addedNodes.length > 0;
      return true;
    });
    if (!interesting) return;
    if (hudOverlayWatchTimer !== null) hostWindow.clearTimeout(hudOverlayWatchTimer);
    hudOverlayWatchTimer = hostWindow.setTimeout(() => {
      hudOverlayWatchTimer = null;
      scanAndYieldHudOverlays();
      maybeRestoreHudAfterOverlayClose();
    }, 100);
  });
  // 不监听 style 全树，避免 #sheld 动画触发死循环
  hudOverlayObserver.observe(doc.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['class', 'open', 'aria-hidden'],
  });
}

function stopHudOverlayWatch() {
  if (hudOverlayObserver) {
    hudOverlayObserver.disconnect();
    hudOverlayObserver = null;
  }
  if (hudOverlayWatchTimer !== null) {
    hostWindow.clearTimeout(hudOverlayWatchTimer);
    hudOverlayWatchTimer = null;
  }
  if (hudOverlayScanTimer !== null) {
    hostWindow.clearInterval(hudOverlayScanTimer);
    hudOverlayScanTimer = null;
  }
  clearHudOverlayLifts();
}

function isHudExtensionEntryClick(el: Element | null): boolean {
  if (!el?.closest) return false;
  if (el.closest(HUD_EXTENSION_ENTRY_SELECTOR)) return true;
  // 扩展菜单内任意可点项
  if (el.closest('#extensionsMenu .list-group-item, #extensionsMenu .interactable, #extensionsMenu button, #extensionsMenu a')) {
    return true;
  }
  // 顶栏抽屉图标（非壳内）
  if (el.closest('#top-bar .drawer-icon, #top-settings-holder .drawer-icon, #top-bar [data-toggle="drawer"]')) {
    return true;
  }
  const label = `${el.getAttribute?.('title') || ''} ${el.getAttribute?.('aria-label') || ''} ${el.textContent || ''}`.trim();
  if (/SP·数据库|打开数据库|扩展程序|变量管理|世界书|API 连接|用户设置/.test(label) && el.closest('button, a, .list-group-item, .interactable, .drawer-icon')) {
    return true;
  }
  return false;
}

function maybeYieldHudForExternalOverlay(target: EventTarget | null) {
  if (!isHudMounted() || !target || !(target as Node).nodeType) return;
  const el = (target as Node).nodeType === 1 ? (target as Element) : (target as Node).parentElement;
  if (!el) return;
  if (!isHudExtensionEntryClick(el)) {
    // 已有被盖面板时，任意点击也再抬一次
    if (hasHudCoverableOverlays() && !doc.body.classList.contains(HUD_ST_UI_CLASS)) {
      scanAndYieldHudOverlays();
    }
    return;
  }
  const label = `${el.getAttribute?.('title') || ''} ${el.textContent || ''}`.replace(/\s+/g, ' ').trim().slice(0, 24);
  yieldHudToStUi();
  scheduleHudOverlayWatch();
  hostWindow.setTimeout(() => {
    const n = scanAndYieldHudOverlays();
    if (n > 0 || isSpDatabaseUiOpen() || hasOpenStDrawers()) {
      const tip = label.includes('SP') || label.includes('数据库') ? '已打开外部面板（已抬到沉浸之上）' : '已让层：外部面板可交互';
      scanAndYieldHudOverlays({ toast: tip });
    }
  }, 100);
}

function hasActiveHudExternalOverlay() {
  // 活跃叠层：ST 抽屉 / SP / 仍挂着 lift 标记的可见面板 / 扫描命中的待抬面板
  if (hasOpenStDrawers() || isSpDatabaseUiOpen()) return true;
  const lifted = Array.from(doc.querySelectorAll(`[${HUD_OVERLAY_LIFT_ATTR}="1"]`)) as HTMLElement[];
  if (lifted.some(el => !isHudStCoreLayoutElement(el) && isElementVisiblyLarge(el, 80, 60))) return true;
  return hasHudCoverableOverlays();
}

function maybeRestoreHudAfterOverlayClose() {
  if (!isHudMounted()) return;
  if (!doc.body.classList.contains(HUD_ST_UI_CLASS)) return;
  // 先清掉误标在核心布局上的 lift，避免死循环
  doc.querySelectorAll(`[${HUD_OVERLAY_LIFT_ATTR}="1"]`).forEach(el => {
    if (isHudStCoreLayoutElement(el as HTMLElement)) el.removeAttribute(HUD_OVERLAY_LIFT_ATTR);
  });
  if (hasActiveHudExternalOverlay()) {
    liftHudCoverableOverlays();
    return;
  }
  // 无抽屉、无外置大面板时收回叠层（保留沉浸）
  restoreHudFromStUi();
}

function maybeHandleSpDatabaseCloseClick(target: EventTarget | null) {
  if (!isHudMounted() || !target) return;
  const el = (target as Node).nodeType === 1 ? (target as Element) : (target as Node).parentElement;
  if (!el) return;
  const label = (el.textContent || el.getAttribute?.('title') || el.getAttribute?.('aria-label') || '').trim();
  const inSp = Boolean(el.closest?.('.acu-v2-app__shell, .acu-v2-app, #acu-v2-root'));
  const isClose =
    (inSp && /关闭新 UI|关闭面板|关闭/.test(label) && Boolean(el.closest?.('button, [role="button"], .interactable'))) ||
    Boolean(el.closest?.('[title*="关闭新 UI"], [aria-label*="关闭新 UI"]'));
  if (!isClose) return;
  hostWindow.setTimeout(() => maybeRestoreHudAfterOverlayClose(), 80);
  hostWindow.setTimeout(() => maybeRestoreHudAfterOverlayClose(), 240);
}

function hasOpenStDrawers() {
  return Boolean(doc.querySelector(ST_OPEN_DRAWER_SELECTOR));
}

/** 强制收起 ST 抽屉 class（不依赖 click 时序） */
function forceCloseStDrawerClasses() {
  Array.from(doc.querySelectorAll(ST_OPEN_DRAWER_SELECTOR)).forEach(panel => {
    panel.classList.remove('openDrawer');
    panel.classList.add('closedDrawer');
    const drawer = panel.closest('.drawer') as HTMLElement | null;
    drawer?.querySelectorAll('.drawer-icon.openIcon').forEach(icon => {
      icon.classList.remove('openIcon');
      icon.classList.add('closedIcon');
    });
  });
}

/** 关闭所有已打开的 ST 顶栏抽屉（A1/A4） */
function closeOpenStDrawers() {
  const openPanels = Array.from(doc.querySelectorAll(ST_OPEN_DRAWER_SELECTOR)) as HTMLElement[];
  openPanels.forEach(panel => {
    const drawer = panel.closest('.drawer') as HTMLElement | null;
    const icon =
      (drawer?.querySelector('.drawer-icon.openIcon') as HTMLElement | null) ||
      (drawer?.querySelector('.drawer-icon') as HTMLElement | null) ||
      (drawer?.querySelector('[data-toggle="drawer"]') as HTMLElement | null) ||
      (panel.previousElementSibling as HTMLElement | null);
    try {
      // 仅点已打开的 icon，避免与强制 class 清理形成 toggle 竞态
      if (icon?.classList.contains('openIcon') && typeof icon.click === 'function') {
        icon.click();
      }
    } catch {
      // ignore and force below
    }
  });
  forceCloseStDrawerClasses();
  return openPanels.length;
}

function showHudToast(message: string, ms = 2200) {
  let toast = doc.getElementById('mfrs-hud-toast') as HTMLElement | null;
  if (!toast) {
    toast = doc.createElement('div');
    toast.id = 'mfrs-hud-toast';
    toast.setAttribute('role', 'status');
    toast.setAttribute('aria-live', 'polite');
    doc.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.classList.add('is-visible');
  if (hudToastTimer !== null) {
    hostWindow.clearTimeout(hudToastTimer);
    hudToastTimer = null;
  }
  hudToastTimer = hostWindow.setTimeout(() => {
    toast?.classList.remove('is-visible');
    hudToastTimer = null;
  }, ms);
}

function clearHudToast() {
  if (hudToastTimer !== null) {
    hostWindow.clearTimeout(hudToastTimer);
    hudToastTimer = null;
  }
  doc.getElementById('mfrs-hud-toast')?.classList.remove('is-visible');
}

function markHudMenuItemFailed(btn: HTMLElement | null, label: string, detail: string) {
  const tip = `${label}：${detail}`;
  console.warn(`[消息内面板] ${tip}`);
  showHudToast(tip);
  if (!btn) return;
  btn.classList.add('is-disabled', 'is-fail-flash');
  btn.setAttribute('aria-disabled', 'true');
  btn.setAttribute('title', tip);
  btn.setAttribute('disabled', 'true');
  hostWindow.setTimeout(() => {
    btn.classList.remove('is-fail-flash');
  }, 900);
}

/** 关闭 ST 配置叠层 + 全部 open 抽屉（A4） */
function restoreHudFromStUi() {
  if (hudMenuOpenTimer !== null) {
    hostWindow.clearTimeout(hudMenuOpenTimer);
    hudMenuOpenTimer = null;
  }
  closeOpenStDrawers();
  forceCloseStDrawerClasses();
  // ST 抽屉 click 可能异步回写 openDrawer，延迟再清两次
  hostWindow.setTimeout(() => forceCloseStDrawerClasses(), 50);
  hostWindow.setTimeout(() => forceCloseStDrawerClasses(), 160);
  clearHudOverlayLifts();
  doc.body.classList.remove(HUD_ST_UI_CLASS);
  const shell = doc.getElementById(HUD_SHELL_ID);
  if (shell?.classList.contains('is-active')) {
    shell.style.removeProperty('z-index');
    shell.style.removeProperty('opacity');
    shell.style.removeProperty('pointer-events');
  }
}

function closeHudSettingsPanel() {
  const shell = doc.getElementById(HUD_SHELL_ID);
  if (!shell) return;
  shell.classList.remove('is-settings-open');
  if (hudActiveView === 'settings') {
    hudActiveView = 'story';
    setHudNavActive('story');
  }
}

function renderHudSettingsPanel(shell: Element) {
  const panel = shell.querySelector('[data-mfrs-hud="settings-panel"]');
  if (!panel) return;
  const sections = getHudTavernMenuSections();
  panel.innerHTML = sections
    .map(section => {
      const items = section.items
        .map(item => {
          const wide = item.wide ? ' is-wide' : '';
          const payload = encodeURIComponent(JSON.stringify(item.action));
          let unavailable = false;
          let title = item.label;
          if (item.action.kind === 'click') {
            const target = findHudActionTarget(item.action.selectors, item.action.matchText);
            if (!target) {
              unavailable = true;
              title = `${item.label}：当前界面未找到入口`;
            }
          }
          const disabledClass = unavailable ? ' is-disabled' : '';
          const disabledAttr = unavailable ? ' disabled aria-disabled="true"' : '';
          return `<button type="button" class="mfrs-hud-menu-item${wide}${disabledClass}" data-mfrs-hud-menu-action="${payload}" title="${_.escape(title)}"${disabledAttr}>${_.escape(item.label)}</button>`;
        })
        .join('');
      return `<section class="mfrs-hud-menu-section"><p class="mfrs-hud-menu-title">${_.escape(section.title)}</p><div class="mfrs-hud-menu-grid">${items}</div></section>`;
    })
    .join('');
}

function openHudSettingsPanel() {
  const shell = doc.getElementById(HUD_SHELL_ID);
  if (!shell) return;
  closeHudCabinetLayer();
  closeHudSideDrawers();
  renderHudSettingsPanel(shell);
  shell.classList.add('is-settings-open');
  hudActiveView = 'settings';
  setHudNavActive('settings');
  applyHudCenterView(shell, 'story');
  if (hostWindow.matchMedia?.('(max-width: 800px)')?.matches) {
    openHudSideDrawer('right');
  }
}

function toggleHudSettingsPanel() {
  const shell = doc.getElementById(HUD_SHELL_ID);
  if (!shell) return;
  if (shell.classList.contains('is-settings-open') && hudActiveView === 'settings') {
    closeHudSettingsPanel();
    setHudView('story');
    return;
  }
  openHudSettingsPanel();
}

function runHudTavernAction(action: HudTavernAction, sourceBtn?: HTMLElement | null) {
  if (hudMenuOpenTimer !== null) {
    hostWindow.clearTimeout(hudMenuOpenTimer);
    hudMenuOpenTimer = null;
  }
  if (action.kind === 'exit') {
    exitHudImmersive();
    return;
  }
  if (action.kind === 'cabinet') {
    openHudFullLibrary(undefined, 'system');
    return;
  }
  if (action.kind === 'continue') {
    const target = findHudActionTarget(['#option_continue', '#mes_continue']);
    if (!target) {
      markHudMenuItemFailed(sourceBtn ?? null, action.label || '继续', '未找到入口');
      return;
    }
    target.click();
    return;
  }
  if (action.kind === 'regenerate') {
    const target = findHudActionTarget(['#option_regenerate']);
    if (!target) {
      markHudMenuItemFailed(sourceBtn ?? null, action.label || '重新生成', '未找到入口');
      return;
    }
    target.click();
    return;
  }
  if (action.kind === 'stop') {
    const target = findHudActionTarget(['#mes_stop', '#stscript_stop']);
    if (!target) {
      markHudMenuItemFailed(sourceBtn ?? null, action.label || '停止', '未找到入口');
      return;
    }
    target.click();
    return;
  }
  if (action.kind === 'click') {
    const target = findHudActionTarget(action.selectors, action.matchText);
    if (!target) {
      markHudMenuItemFailed(sourceBtn ?? null, action.label, '当前界面未找到入口');
      return;
    }
    // A1：先关已打开的 ST 抽屉，再叠层并打开目标，避免双抽屉叠在一起
    const closedCount = closeOpenStDrawers();
    if (action.yieldUi) yieldHudToStUi();
    const openDelay = closedCount > 0 || hasOpenStDrawers() ? 80 : 0;
    const fire = () => {
      hudMenuOpenTimer = null;
      const live = findHudActionTarget(action.selectors, action.matchText) || target;
      try {
        live.click();
        if (action.yieldUi) {
          hostWindow.setTimeout(() => {
            if (doc.body.classList.contains(HUD_ST_UI_CLASS) || hasOpenStDrawers()) {
              showHudToast(`已打开：${action.label}`, 1400);
            }
          }, 120);
        }
      } catch (error) {
        markHudMenuItemFailed(sourceBtn ?? null, action.label, '点击入口失败');
        console.warn(`[消息内面板] 设置项点击失败: ${action.label}`, error);
      }
    };
    if (typeof hostWindow.requestAnimationFrame === 'function') {
      hostWindow.requestAnimationFrame(() => {
        hudMenuOpenTimer = hostWindow.setTimeout(fire, openDelay);
      });
    } else {
      hudMenuOpenTimer = hostWindow.setTimeout(fire, openDelay);
    }
  }
}

function reparentSendFormIntoHud(shell: HTMLElement) {
  const form = getSendFormElement();
  const composer = shell.querySelector('[data-mfrs-hud="composer"]') as HTMLElement | null;
  if (!form || !composer) return;
  if (form.parentElement === composer) return;
  if (!hudFormRestore || form.parentElement !== composer) {
    hudFormRestore = captureDomRestore(form);
  }
  composer.appendChild(form);
}

function restoreSendFormFromHud() {
  const form = getSendFormElement();
  restoreDomNode(form, hudFormRestore);
  hudFormRestore = null;
}

function setHudNavActive(nav: string) {
  const shell = doc.getElementById(HUD_SHELL_ID);
  if (!shell) return;
  shell.querySelectorAll('[data-mfrs-hud-nav]').forEach(btn => {
    btn.classList.toggle('is-active', btn.getAttribute('data-mfrs-hud-nav') === nav);
  });
}

function getLatestAiMessageElement(): Element | null {
  const last = doc.querySelector('.mes.last_mes:not([is_user="true"])');
  if (last && !isUserMessage(last)) return last;
  const all = Array.from(doc.querySelectorAll('.mes:not([is_user="true"])'));
  for (let i = all.length - 1; i >= 0; i -= 1) {
    const mes = all[i];
    if (!isUserMessage(mes) && mes.getAttribute('mesid')) return mes;
  }
  return null;
}

function readLatestHudStatusData(): StatusData {
  const mes = getLatestAiMessageElement();
  if (!mes) return {};
  return readStatusForMessage(mes);
}

function formatResourceField(value: unknown): string {
  if (value === null || value === undefined || value === '') return '';
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value).trim();
  }
  if (Array.isArray(value)) {
    return value
      .map(item => {
        if (item === null || item === undefined) return '';
        if (typeof item === 'string' || typeof item === 'number') return String(item);
        if (typeof item === 'object') {
          const record = item as Record<string, unknown>;
          return valueText(record.名称 ?? record.name ?? record.代号 ?? record.物品名 ?? JSON.stringify(item), '');
        }
        return String(item);
      })
      .filter(Boolean)
      .join('、');
  }
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }
  return String(value);
}

function buildHudResourceSectionsHtml(data: StatusData): string {
  const resourceRoot = data.灵异资源;
  const puzzle = formatResourceField(
    _.get(data, '灵异资源.鬼拼图') ?? _.get(data, '灵异资源.拼图') ?? _.get(data, '鬼拼图'),
  );
  const items = formatResourceField(
    _.get(data, '灵异资源.灵异物品') ?? data.灵异物品 ?? _.get(data, '持有物品'),
  );
  const gold = formatResourceField(
    _.get(data, '灵异资源.黄金') ?? _.get(data, '灵异资源.鬼钱') ?? _.get(data, '黄金'),
  );
  const rows = [
    puzzle && `<div class="mfrs-msg-kv"><span>拼图</span><b>${_.escape(puzzle)}</b></div>`,
    items && `<div class="mfrs-msg-kv"><span>物品</span><b>${_.escape(items)}</b></div>`,
    gold && `<div class="mfrs-msg-kv"><span>黄金</span><b>${_.escape(gold)}</b></div>`,
  ].filter(Boolean);

  if (rows.length) {
    return `<details class="mfrs-msg-fold" data-fold="resource" open>
  <summary class="mfrs-msg-fold-summary"><i class="fa-solid fa-box-archive" aria-hidden="true"></i><span>资源</span></summary>
  <div class="mfrs-msg-fold-body">${rows.join('')}</div>
</details>`;
  }

  if (resourceRoot !== null && resourceRoot !== undefined && typeof resourceRoot !== 'object') {
    const text = formatResourceField(resourceRoot);
    if (!text) return '';
    return `<details class="mfrs-msg-fold" data-fold="resource" open>
  <summary class="mfrs-msg-fold-summary"><i class="fa-solid fa-box-archive" aria-hidden="true"></i><span>资源</span></summary>
  <div class="mfrs-msg-fold-body"><div class="mfrs-msg-info-text">${_.escape(text)}</div></div>
</details>`;
  }

  const fallback = formatResourceField(data.灵异资源 ?? _.get(data, '资源') ?? _.get(data, '持有资源'));
  if (!fallback || fallback.startsWith('{') || fallback.startsWith('[')) return '';
  return `<details class="mfrs-msg-fold" data-fold="resource" open>
  <summary class="mfrs-msg-fold-summary"><i class="fa-solid fa-box-archive" aria-hidden="true"></i><span>资源</span></summary>
  <div class="mfrs-msg-fold-body"><div class="mfrs-msg-info-text">${_.escape(fallback)}</div></div>
</details>`;
}

function buildHudInvestigationSectionsHtml(): string {
  const tables = readHudDatabaseTables();
  const sections: Array<{ key: string; title: string; icon: string; tableNames: string[]; titleHeaders: string[]; tagHeaders: string[] }> = [
    {
      key: 'clue',
      title: '线索',
      icon: 'fa-magnifying-glass',
      tableNames: ['线索'],
      titleHeaders: ['线索编号', '内容', '关联事件'],
      tagHeaders: ['可信度', '验证状态', '来源'],
    },
    {
      key: 'ghost-archive',
      title: '厉鬼档案',
      icon: 'fa-book-skull',
      tableNames: ['厉鬼档案'],
      titleHeaders: ['档案编号', '厉鬼称呼'],
      tagHeaders: ['关押状态', '关联事件', '拼图关系'],
    },
    {
      key: 'people',
      title: '人物',
      icon: 'fa-address-book',
      tableNames: ['人物'],
      titleHeaders: ['姓名', '身份'],
      tagHeaders: ['在场状态', '阵营', '所在地点'],
    },
    {
      key: 'place',
      title: '地点',
      icon: 'fa-map-location-dot',
      tableNames: ['地点'],
      titleHeaders: ['地点名', '城市'],
      tagHeaders: ['灵异状态', '封锁状态', '地点类型'],
    },
  ];
  const body = sections
    .map(section => {
      const table = findHudTable(tables, ...section.tableNames);
      const list = buildHudTableSummaryListHtml(table, section.titleHeaders, section.tagHeaders, 3);
      const openTable = section.tableNames[0];
      return `<details class="mfrs-msg-fold" data-fold="invest-${section.key}">
  <summary class="mfrs-msg-fold-summary"><i class="fa-solid ${section.icon}" aria-hidden="true"></i><span>${section.title}</span></summary>
  <div class="mfrs-msg-fold-body">
    ${list}
    <button type="button" class="mfrs-hud-open-full" data-mfrs-hud-open-table="${_.escape(openTable)}">打开全库 · ${_.escape(openTable)}</button>
  </div>
</details>`;
    })
    .join('');
  return `<p class="mfrs-hud-dossier-group-title">调查档案</p>${body}`;
}

function buildHudDossierHtml(data: StatusData): string {
  // C4：身份/风险默认展开；事件/厉鬼默认折叠；资源用结构化只读块；下挂调查 4 表摘要
  let base = buildDossierSectionsHtml(data).replace(
    /<details class="mfrs-msg-fold" data-fold="resource"[\s\S]*?<\/details>/,
    '',
  );
  base = base
    .replace(
      /<details class="mfrs-msg-fold" data-fold="event" open>/,
      '<details class="mfrs-msg-fold" data-fold="event">',
    )
    .replace(
      /<details class="mfrs-msg-fold" data-fold="ghost" open>/,
      '<details class="mfrs-msg-fold" data-fold="ghost">',
    );
  let resource = buildHudResourceSectionsHtml(data);
  resource = resource.replace(
    /<details class="mfrs-msg-fold" data-fold="resource" open>/g,
    '<details class="mfrs-msg-fold" data-fold="resource">',
  );
  const sceneTitle = `<p class="mfrs-hud-dossier-group-title">现场摘要</p>`;
  const openPlayer = `<button type="button" class="mfrs-hud-open-full" data-mfrs-hud-open-table="玩家状态">打开全库 · 玩家状态</button>`;
  return `${sceneTitle}${base}${resource}${openPlayer}${buildHudInvestigationSectionsHtml()}`;
}

function buildHudMemoryPanelHtml(): string {
  const tables = readHudDatabaseTables();
  const chronicle = findHudTable(tables, '事件纪要', '纪要');
  const archives = findHudTable(tables, '收录档案');
  const rules = findHudTable(tables, '收录规律');
  const section = (title: string, icon: string, table: HudTableBundle | null, titleHeaders: string[], tagHeaders: string[], openName: string) => `
<section class="mfrs-hud-panel-section">
  <div class="mfrs-hud-panel-section-title"><i class="fa-solid ${icon}" aria-hidden="true"></i><span>${title}</span></div>
  ${buildHudTableSummaryListHtml(table, titleHeaders, tagHeaders, 6)}
  <button type="button" class="mfrs-hud-open-full" data-mfrs-hud-open-table="${_.escape(openName)}">在全库中编辑</button>
</section>`;
  return `
<p class="mfrs-hud-panel-title">记忆与收录</p>
<p class="mfrs-hud-panel-sub">事件纪要 · 收录档案 · 收录规律（只读摘要，编辑走全库）</p>
${section('事件纪要', 'fa-clock-rotate-left', chronicle, ['纪要编号', '概览', '关联事件'], ['时间跨度', '关联事件'], '事件纪要')}
${section('收录档案', 'fa-folder-open', archives, ['档案厉鬼名称', '收录状态'], ['收录进度', '档案完整度', '可调用范围'], '收录档案')}
${section('收录规律', 'fa-book-open', rules, ['来源厉鬼', '规律类型'], ['获取方式', '完整度', '风险备注'], '收录规律')}
`;
}

function buildHudGachaPanelHtml(): string {
  const mfrs = (hostWindow as any).MFRS;
  let currency = '—';
  let pity = '—';
  let fragments = '—';
  let historyCount = '—';
  try {
    if (typeof mfrs?.getCurrency === 'function') currency = String(mfrs.getCurrency());
    if (typeof mfrs?.getPity === 'function') {
      const p = mfrs.getPity();
      pity = typeof p === 'object' ? JSON.stringify(p) : String(p);
      if (typeof p === 'object' && p) {
        const soft = p.soft ?? p.count ?? p.current;
        const hard = p.hard ?? p.guarantee;
        pity = [soft != null && `软保底 ${soft}`, hard != null && `硬保底 ${hard}`].filter(Boolean).join(' · ') || pity;
      }
    }
    if (typeof mfrs?.getFragments === 'function') fragments = String(mfrs.getFragments());
    if (typeof mfrs?.getHistory === 'function') {
      const h = mfrs.getHistory();
      historyCount = Array.isArray(h) ? String(h.length) : '—';
    }
  } catch {
    // ignore gacha api errors
  }
  const ready = typeof mfrs?.showPanel === 'function';
  return `
<p class="mfrs-hud-panel-title">抽卡</p>
<p class="mfrs-hud-panel-sub">中栏摘要；完整抽卡 UI 在下方打开（正文已隐藏）</p>
<div class="mfrs-hud-gacha-embed">
  <div class="mfrs-msg-kv"><span>调查点</span><b>${_.escape(currency)}</b></div>
  <div class="mfrs-msg-kv"><span>保底</span><b>${_.escape(clipHudLine(String(pity), 40))}</b></div>
  <div class="mfrs-msg-kv"><span>残屑</span><b>${_.escape(fragments)}</b></div>
  <div class="mfrs-msg-kv"><span>历史</span><b>${_.escape(historyCount)}</b></div>
</div>
<div class="mfrs-hud-gacha-actions">
  <button type="button" class="mfrs-hud-system-btn" data-mfrs-hud="open-gacha" ${ready ? '' : 'disabled'}>${ready ? '打开抽卡面板' : '抽卡 API 未就绪'}</button>
</div>
`;
}

function buildHudSystemPanelHtml(data: StatusData): string {
  const tables = readHudDatabaseTables();
  const tableNames = Object.keys(tables);
  const name = valueText(data.姓名, '—');
  const location = valueText(data.所在位置, '—');
  const phase = valueText(_.get(data, '主线进度.当前阶段'), '—');
  const eventCode = valueText(_.get(data, '当前灵异事件.事件代号'), '无');
  const consistency = [
    { label: '玩家', ok: Boolean(valueText(data.姓名, '')) },
    { label: '事件', ok: eventCode !== '无' },
    { label: '表数量', ok: tableNames.length > 0 },
    { label: '线索表', ok: Boolean(findHudTable(tables, '线索')) },
    { label: '纪要表', ok: Boolean(findHudTable(tables, '事件纪要', '纪要')) },
  ];
  const consHtml = consistency
    .map(
      item =>
        `<div class="mfrs-msg-kv"><span>${_.escape(item.label)}</span><b>${item.ok ? '对齐' : '待核'}</b></div>`,
    )
    .join('');
  const recallPreview = tableNames.length
    ? tableNames
        .slice(0, 8)
        .map(n => {
          const t = tables[n];
          return `<div class="mfrs-hud-summary-item"><span class="mfrs-hud-summary-title">${_.escape(n)}</span><span class="mfrs-hud-summary-tags">${t.rows.length} 行</span></div>`;
        })
        .join('')
    : '<div class="mfrs-msg-empty">数据库表未导出</div>';
  return `
<p class="mfrs-hud-panel-title">系统</p>
<p class="mfrs-hud-panel-sub">总览 · 召回索引 · 一致性快检 · 全库编辑入口</p>
<section class="mfrs-hud-panel-section">
  <div class="mfrs-hud-panel-section-title"><i class="fa-solid fa-gauge-high" aria-hidden="true"></i><span>总览</span></div>
  <div class="mfrs-msg-kv"><span>姓名</span><b>${_.escape(name)}</b></div>
  <div class="mfrs-msg-kv"><span>位置</span><b>${_.escape(location)}</b></div>
  <div class="mfrs-msg-kv"><span>阶段</span><b>${_.escape(phase)}</b></div>
  <div class="mfrs-msg-kv"><span>事件</span><b>${_.escape(eventCode)}</b></div>
  <div class="mfrs-msg-kv"><span>数据表</span><b>${tableNames.length}</b></div>
</section>
<section class="mfrs-hud-panel-section">
  <div class="mfrs-hud-panel-section-title"><i class="fa-solid fa-magnifying-glass" aria-hidden="true"></i><span>召回索引</span></div>
  ${recallPreview}
</section>
<section class="mfrs-hud-panel-section">
  <div class="mfrs-hud-panel-section-title"><i class="fa-solid fa-scale-balanced" aria-hidden="true"></i><span>一致性</span></div>
  ${consHtml}
</section>
<div class="mfrs-hud-system-actions">
  <button type="button" class="mfrs-hud-system-btn" data-mfrs-hud="open-full-library">打开全库编辑</button>
  <button type="button" class="mfrs-hud-system-btn" data-mfrs-hud-open-table="acu_tab_mfrs_global_search">全库 · 总览页</button>
  <button type="button" class="mfrs-hud-system-btn" data-mfrs-hud-open-table="acu_tab_mfrs_recall">全库 · 召回页</button>
  <button type="button" class="mfrs-hud-system-btn" data-mfrs-hud-open-table="acu_tab_mfrs_consistency">全库 · 一致性</button>
</div>
`;
}

function clipHudChipText(value: string, max = 22): string {
  const text = String(value ?? '').replace(/\s+/g, ' ').trim();
  if (text.length <= max) return text;
  return `${text.slice(0, Math.max(1, max - 1))}…`;
}

function applyHudTopChips(shell: Element, data: StatusData) {
  const brand = getBrandViewModel(data, 'hud');
  const map: Record<string, string> = {
    location: brand.location || '未知',
    phase: brand.phase || '开局接入',
    event: brand.event === '无' ? '未立案灵异事件' : brand.event,
    domain: brand.domain || '未确认',
    danger: brand.danger || '未知',
  };
  Object.entries(map).forEach(([key, value]) => {
    const node = shell.querySelector(`[data-mfrs-hud-chip="${key}"]`) as HTMLElement | null;
    if (!node) return;
    const full = value;
    const shown = clipHudChipText(full, key === 'event' || key === 'location' ? 18 : 14);
    node.textContent = shown;
    node.title = full;
  });
}

/** C3：关系视图扫读版（名 + 一句描述） */
function buildHudRelationHtml(data: StatusData): string {
  const location = valueText(data.所在位置);
  const phase = valueText(_.get(data, '主线进度.当前阶段'));
  const npcs = data.在场人物 || [];
  const npcsHtml = npcs.length
    ? npcs
        .map((npc: unknown) => {
          const raw = String(npc ?? '').trim();
          const m = raw.match(/^([^-—－:：]+)[-—－:：]\s*(.+)$/);
          if (m) {
            const name = m[1].trim();
            const desc = m[2].trim().replace(/\s+/g, ' ');
            const short = desc.length > 48 ? `${desc.slice(0, 47)}…` : desc;
            return `<div class="mfrs-msg-npc-item" title="${_.escape(raw)}"><span class="mfrs-msg-npc-name">${_.escape(name)}</span><span class="mfrs-msg-npc-desc">${_.escape(short)}</span></div>`;
          }
          return `<div class="mfrs-msg-npc-item" title="${_.escape(raw)}"><span class="mfrs-msg-npc-name">${_.escape(raw)}</span></div>`;
        })
        .join('')
    : '<div class="mfrs-msg-empty">暂无在场人物</div>';

  return `
<div class="mfrs-msg-header">
  <div class="mfrs-msg-header-item"><i class="fa-solid fa-location-dot mfrs-msg-header-ico" aria-hidden="true"></i><span class="mfrs-msg-header-lbl">位置</span><span class="mfrs-msg-header-val" title="${_.escape(location)}">${_.escape(clipHudChipText(location, 20))}</span></div>
  <div class="mfrs-msg-header-item"><i class="fa-solid fa-layer-group mfrs-msg-header-ico" aria-hidden="true"></i><span class="mfrs-msg-header-lbl">阶段</span><span class="mfrs-msg-header-val" title="${_.escape(phase)}">${_.escape(clipHudChipText(phase, 16))}</span></div>
</div>
<div class="mfrs-msg-section">
  <div class="mfrs-msg-section-title"><i class="fa-solid fa-users" aria-hidden="true"></i><span>在场人物</span></div>
  <div class="mfrs-msg-npc-list">${npcsHtml}</div>
</div>
`;
}

function isHudCenterBusinessView(view: HudView) {
  return HUD_CENTER_VIEWS.includes(view);
}

function applyHudCenterView(shell: Element, view: HudView) {
  const chatHost = shell.querySelector('[data-mfrs-hud="chat-host"]') as HTMLElement | null;
  const relation = shell.querySelector('[data-mfrs-hud="relation-slot"]') as HTMLElement | null;
  const memory = shell.querySelector('[data-mfrs-hud="memory-slot"]') as HTMLElement | null;
  const gacha = shell.querySelector('[data-mfrs-hud="gacha-slot"]') as HTMLElement | null;
  const system = shell.querySelector('[data-mfrs-hud="system-slot"]') as HTMLElement | null;
  const left = shell.querySelector('[data-mfrs-hud="left"]') as HTMLElement | null;
  const showBusiness = isHudCenterBusinessView(view);
  if (chatHost) chatHost.hidden = showBusiness;
  if (relation) relation.hidden = view !== 'relation';
  if (memory) memory.hidden = view !== 'memory';
  if (gacha) gacha.hidden = view !== 'gacha';
  if (system) system.hidden = view !== 'system';
  left?.classList.toggle('is-emphasis', view === 'dossier');
}

function closeHudSideDrawers() {
  const shell = doc.getElementById(HUD_SHELL_ID);
  if (!shell) return;
  shell.classList.remove('is-left-open', 'is-right-open');
  shell.querySelector('[data-mfrs-hud="toggle-left"]')?.classList.remove('is-active');
  shell.querySelector('[data-mfrs-hud="toggle-right"]')?.classList.remove('is-active');
}

function openHudSideDrawer(side: 'left' | 'right') {
  const shell = doc.getElementById(HUD_SHELL_ID);
  if (!shell) return;
  closeHudCabinetLayer();
  shell.classList.toggle('is-left-open', side === 'left');
  shell.classList.toggle('is-right-open', side === 'right');
  shell.querySelector('[data-mfrs-hud="toggle-left"]')?.classList.toggle('is-active', side === 'left');
  shell.querySelector('[data-mfrs-hud="toggle-right"]')?.classList.toggle('is-active', side === 'right');
}

function isHudCabinetOpen() {
  return Boolean(
    doc.getElementById(FIXED_HOST_ID)?.classList.contains('mfrs-hud-cabinet-open') ||
      doc.getElementById(HUD_SHELL_ID)?.classList.contains('is-cabinet-open'),
  );
}

function setHudView(view: HudView) {
  const shell = doc.getElementById(HUD_SHELL_ID);
  if (!shell) return;
  if (view === 'settings') {
    openHudSettingsPanel();
    return;
  }
  if (view === 'cabinet') {
    openHudFullLibrary();
    return;
  }
  hudActiveView = view;
  shell.classList.remove('is-settings-open');
  setHudNavActive(view);
  applyHudCenterView(shell, view);
  if (view === 'story') {
    closeHudCabinetLayer();
    closeHudSideDrawers();
    const chat = getChatElement();
    if (chat) {
      const top = chat.scrollHeight;
      try {
        chat.scrollTo({ top, behavior: 'smooth' });
      } catch {
        chat.scrollTop = top;
      }
    }
    return;
  }
  if (view === 'dossier') {
    closeHudCabinetLayer();
    if (hostWindow.matchMedia?.('(max-width: 800px)')?.matches) {
      openHudSideDrawer('left');
    } else {
      closeHudSideDrawers();
    }
    shell.querySelector('.mfrs-hud-left')?.scrollTo?.({ top: 0, behavior: 'smooth' });
    return;
  }
  if (isHudCenterBusinessView(view)) {
    closeHudCabinetLayer();
    closeHudSideDrawers();
    if (view === 'memory' || view === 'gacha' || view === 'system') {
      refreshHudBusinessPanels(shell, readLatestHudStatusData());
    }
  }
}

function refreshHudBusinessPanels(shell: Element, data: StatusData) {
  const memorySlot = shell.querySelector('[data-mfrs-hud="memory-slot"]');
  if (memorySlot) memorySlot.innerHTML = buildHudMemoryPanelHtml();
  const gachaSlot = shell.querySelector('[data-mfrs-hud="gacha-slot"]');
  if (gachaSlot) gachaSlot.innerHTML = buildHudGachaPanelHtml();
  const systemSlot = shell.querySelector('[data-mfrs-hud="system-slot"]');
  if (systemSlot) systemSlot.innerHTML = buildHudSystemPanelHtml(data);
}

function activateAcuNavTarget(tableOrTab: string) {
  const host = doc.getElementById(FIXED_HOST_ID);
  if (!host || !tableOrTab) return;
  const exact = host.querySelector(`.acu-nav-btn[data-table="${tableOrTab}"]`) as HTMLElement | null;
  if (exact) {
    exact.click();
    return;
  }
  const buttons = Array.from(host.querySelectorAll('.acu-nav-btn[data-table]')) as HTMLElement[];
  const fuzzy = buttons.find(btn => {
    const key = btn.getAttribute('data-table') || '';
    const label = (btn.textContent || '').trim();
    return key.includes(tableOrTab) || label.includes(tableOrTab);
  });
  fuzzy?.click();
}

/** 全库编辑（原柜能力）；无右栏主键，由系统/摘要唤起 */
function openHudFullLibrary(tableOrTab?: string, returnView?: HudView) {
  hudCabinetReturnView =
    returnView && returnView !== 'cabinet' && returnView !== 'settings' ? returnView : hudActiveView === 'cabinet' ? 'system' : hudActiveView;
  if (hudCabinetReturnView === 'settings') hudCabinetReturnView = 'system';
  closeHudSideDrawers();
  const shell = doc.getElementById(HUD_SHELL_ID);
  shell?.classList.remove('is-settings-open');
  openHudCabinetLayer();
  hudActiveView = 'cabinet';
  setHudNavActive(hudCabinetReturnView === 'story' ? 'system' : hudCabinetReturnView);
  if (tableOrTab) {
    hostWindow.setTimeout(() => activateAcuNavTarget(tableOrTab), 80);
    hostWindow.setTimeout(() => activateAcuNavTarget(tableOrTab), 240);
  }
}

function openHudGachaUi() {
  try {
    const show = (hostWindow as any).MFRS?.showPanel;
    if (typeof show === 'function') {
      show();
      return;
    }
  } catch {
    // fall through
  }
  showHudToast('抽卡面板未就绪：请确认数据库前端已加载');
}

function refreshHudPanels(force = false) {
  if (!isHudMounted()) return;
  const shell = doc.getElementById(HUD_SHELL_ID);
  if (!shell) return;
  const data = readLatestHudStatusData();
  const renderKey = getPanelRenderKey(data);
  const centerView: HudView =
    hudActiveView === 'cabinet' || hudActiveView === 'settings' ? 'story' : hudActiveView;
  if (!force && renderKey === hudPanelsRenderKey) {
    applyHudCenterView(shell, centerView);
    return;
  }
  hudPanelsRenderKey = renderKey;
  applyHudTopChips(shell, data);

  const dossierSlot = shell.querySelector('[data-mfrs-hud="dossier-slot"]');
  if (dossierSlot) dossierSlot.innerHTML = buildHudDossierHtml(data);

  // 本轮选项唯一入口：输入框上方 HUD；无真实行动建议时整栏隐藏
  const actionsHost = shell.querySelector('[data-mfrs-hud="actions"]') as HTMLElement | null;
  const actionsSlot = shell.querySelector('[data-mfrs-hud="actions-slot"]');
  if (actionsHost && actionsSlot) {
    if (hasRealActionSuggestions(data)) {
      actionsHost.hidden = false;
      actionsHost.setAttribute('open', '');
      actionsSlot.innerHTML = buildActionsHtml(data);
    } else {
      actionsHost.hidden = true;
      actionsHost.removeAttribute('open');
      actionsSlot.innerHTML = '';
    }
  }

  const relationSlot = shell.querySelector('[data-mfrs-hud="relation-slot"]');
  if (relationSlot) relationSlot.innerHTML = buildHudRelationHtml(data);

  refreshHudBusinessPanels(shell, data);

  applyHudCenterView(shell, centerView);
  if (hudActiveView === 'cabinet') {
    setHudNavActive(hudCabinetReturnView === 'story' ? 'system' : hudCabinetReturnView);
  } else {
    setHudNavActive(hudActiveView);
  }
  if (hudActiveView === 'settings') {
    shell.classList.add('is-settings-open');
    renderHudSettingsPanel(shell);
  }
}

function restoreFixedHostFromHudCabinet() {
  const host = doc.getElementById(FIXED_HOST_ID) as HTMLElement | null;
  host?.classList.remove('mfrs-hud-cabinet-open');
  if (hudFixedHostRestore) {
    restoreDomNode(host, hudFixedHostRestore);
    hudFixedHostRestore = null;
  }
}

/** 沉浸态：固定 host 常落在 #send_form 原父级 stacking 内，会被 z=10000 全屏壳盖住；开柜时挂进壳内 */
function parkFixedHostForHudCabinet(host: HTMLElement) {
  if (!isHudMounted()) return;
  const shell = doc.getElementById(HUD_SHELL_ID);
  if (!shell) return;
  if (host.parentElement === shell) return;
  if (!hudFixedHostRestore) {
    hudFixedHostRestore = captureDomRestore(host);
  }
  // 挂在壳内末尾：与 mask/chrome 同 stacking，z-index 10020 才能压在中栏之上且低于 chrome
  shell.appendChild(host);
}

function expandArchiveCabinetUi(root: ParentNode) {
  const collapsedNav = root.querySelector('.acu-nav-container.collapsed') as HTMLElement | null;
  if (collapsedNav) {
    const trigger = collapsedNav.querySelector(
      '.acu-collapsed-trigger, #acu-btn-toggle',
    ) as HTMLElement | null;
    (trigger ?? collapsedNav).click();
  } else {
    const toggle = root.querySelector('#acu-btn-toggle[aria-expanded="false"]') as HTMLElement | null;
    toggle?.click();
  }
  const dashBar = root.querySelector(
    '.acu-dash-ctrl-bar[aria-expanded="false"]',
  ) as HTMLElement | null;
  dashBar?.click();
}

function closeHudCabinetLayer() {
  const shell = doc.getElementById(HUD_SHELL_ID);
  restoreFixedHostFromHudCabinet();
  shell?.classList.remove('is-cabinet-open');
  if (hudActiveView === 'cabinet') {
    const back: HudView =
      hudCabinetReturnView && hudCabinetReturnView !== 'cabinet' && hudCabinetReturnView !== 'settings'
        ? hudCabinetReturnView
        : 'system';
    hudActiveView = back;
    if (shell) {
      setHudNavActive(back);
      applyHudCenterView(shell, isHudCenterBusinessView(back) ? back : 'story');
      if (back === 'memory' || back === 'gacha' || back === 'system') {
        refreshHudBusinessPanels(shell, readLatestHudStatusData());
      }
    }
  }
}

function openHudCabinetLayer() {
  const shell = doc.getElementById(HUD_SHELL_ID);
  const host = doc.getElementById(FIXED_HOST_ID) as HTMLElement | null;
  closeHudSideDrawers();
  shell?.classList.remove('is-settings-open');
  // 即使固定 host 未就绪也标记壳层开启，保证 Esc 分层可关
  shell?.classList.add('is-cabinet-open');
  if (!host) {
    openArchiveCabinet();
    showHudToast('档案柜未就绪：请确认固定状态栏脚本已加载');
    return;
  }
  parkFixedHostForHudCabinet(host);
  host.classList.add('mfrs-hud-cabinet-open');
  expandArchiveCabinetUi(host);
  // 无表导航 / 无仪表盘时给明确反馈（避免只剩空壳）
  const hasCabinetUi = Boolean(
    host.querySelector('.acu-wrapper, .acu-nav-container, .acu-embedded-dashboard-container'),
  );
  if (!hasCabinetUi) {
    showHudToast('档案柜内容未挂载：请退出沉浸后确认输入框上方档案柜已显示');
  }
  try {
    host.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  } catch {
    // ignore
  }
}

function handleHudShellClick(e: Event) {
  const target = e.target as HTMLElement | null;
  if (!target) return;

  // 扩展菜单 / 顶栏入口：统一让层；关闭 SP 时收回；兜底扫描已开面板
  maybeYieldHudForExternalOverlay(target);
  maybeHandleSpDatabaseCloseClick(target);
  if (hasHudCoverableOverlays() || isSpDatabaseUiOpen() || hasOpenStDrawers()) {
    scanAndYieldHudOverlays();
  }

  const shell = target.closest?.(`#${HUD_SHELL_ID}`);
  if (!shell) return;

  if (target.closest('[data-mfrs-hud="exit"]')) {
    e.preventDefault();
    exitHudImmersive();
    return;
  }
  const menuActionBtn = target.closest('[data-mfrs-hud-menu-action]') as HTMLElement | null;
  if (menuActionBtn) {
    e.preventDefault();
    e.stopPropagation();
    if (menuActionBtn.hasAttribute('disabled') || menuActionBtn.classList.contains('is-disabled')) {
      const tip = menuActionBtn.getAttribute('title') || '该项当前不可用';
      showHudToast(tip);
      return;
    }
    const raw = menuActionBtn.getAttribute('data-mfrs-hud-menu-action');
    if (!raw) return;
    try {
      const action = JSON.parse(decodeURIComponent(raw)) as HudTavernAction;
      runHudTavernAction(action, menuActionBtn);
    } catch (error) {
      markHudMenuItemFailed(menuActionBtn, '设置', '动作解析失败');
      console.warn('[消息内面板] 设置动作解析失败', error);
    }
    return;
  }
  if (target.closest('[data-mfrs-hud="cabinet-close"], [data-mfrs-hud="cabinet-mask"]')) {
    e.preventDefault();
    closeHudCabinetLayer();
    return;
  }
  const openFullBtn = target.closest('[data-mfrs-hud="open-full-library"]') as HTMLElement | null;
  if (openFullBtn) {
    e.preventDefault();
    openHudFullLibrary(undefined, 'system');
    return;
  }
  const openGachaBtn = target.closest('[data-mfrs-hud="open-gacha"]') as HTMLElement | null;
  if (openGachaBtn) {
    e.preventDefault();
    openHudGachaUi();
    return;
  }
  const openTableBtn = target.closest('[data-mfrs-hud-open-table]') as HTMLElement | null;
  if (openTableBtn) {
    e.preventDefault();
    const table = openTableBtn.getAttribute('data-mfrs-hud-open-table') || '';
    const returnView: HudView =
      hudActiveView === 'memory' || hudActiveView === 'system' || hudActiveView === 'dossier'
        ? hudActiveView
        : 'system';
    openHudFullLibrary(table, returnView);
    return;
  }
  if (target.closest('[data-mfrs-hud="drawer-mask"]')) {
    e.preventDefault();
    closeHudSideDrawers();
    return;
  }
  if (target.closest('[data-mfrs-hud="toggle-left"]')) {
    e.preventDefault();
    if (shell.classList.contains('is-left-open')) closeHudSideDrawers();
    else {
      setHudView('dossier');
    }
    return;
  }
  if (target.closest('[data-mfrs-hud="toggle-right"]')) {
    e.preventDefault();
    if (shell.classList.contains('is-right-open')) closeHudSideDrawers();
    else openHudSideDrawer('right');
    return;
  }
  const navBtn = target.closest('[data-mfrs-hud-nav]') as HTMLElement | null;
  if (!navBtn || navBtn.hasAttribute('disabled')) return;
  const nav = navBtn.getAttribute('data-mfrs-hud-nav') as HudView | null;
  if (!nav) return;
  e.preventDefault();
  if (nav === 'settings') {
    toggleHudSettingsPanel();
    return;
  }
  if (HUD_NAV_VIEWS.includes(nav) || nav === 'cabinet') {
    setHudView(nav);
    if (nav !== 'dossier' && hostWindow.matchMedia?.('(max-width: 800px)')?.matches) {
      if (nav === 'story' || isHudCenterBusinessView(nav)) closeHudSideDrawers();
    }
  }
}

function handleHudKeydown(e: KeyboardEvent) {
  // Esc：设置 → ST 抽屉 → 全库 → 中栏业务面板 → 侧抽屉；默认不退出沉浸
  if (e.key === 'Escape' && isHudMounted()) {
    const shell = doc.getElementById(HUD_SHELL_ID);
    if (shell?.classList.contains('is-settings-open')) {
      e.preventDefault();
      closeHudSettingsPanel();
      setHudView('story');
      return;
    }
    if (
      doc.body.classList.contains(HUD_ST_UI_CLASS) ||
      hasOpenStDrawers() ||
      isSpDatabaseUiOpen() ||
      hasHudCoverableOverlays()
    ) {
      e.preventDefault();
      // SP 自带关闭；叠层类先收回，避免 Esc 卡在让层状态
      if (isSpDatabaseUiOpen()) {
        const closeBtn = doc.querySelector(
          '.acu-v2-app__shell button[title*="关闭"], .acu-v2-app__shell button[aria-label*="关闭"], .acu-v2-app button[title*="关闭新 UI"]',
        ) as HTMLElement | null;
        closeBtn?.click();
      }
      restoreHudFromStUi();
      return;
    }
    if (isHudCabinetOpen()) {
      e.preventDefault();
      closeHudCabinetLayer();
      return;
    }
    if (isHudCenterBusinessView(hudActiveView)) {
      e.preventDefault();
      setHudView('story');
      return;
    }
    if (shell?.classList.contains('is-left-open') || shell?.classList.contains('is-right-open')) {
      e.preventDefault();
      closeHudSideDrawers();
      return;
    }
  }
  if (!(e.ctrlKey && e.shiftKey && (e.key === 'G' || e.key === 'g'))) return;
  if (!isMysteryRevivalCardActive()) return;
  e.preventDefault();
  toggleHudImmersive();
}

function bindHudShellEvents() {
  if (!hudShellEventsBound) {
    doc.addEventListener('click', handleHudShellClick, true);
    hudShellEventsBound = true;
  }
  if (!hudKeydownBound) {
    doc.addEventListener('keydown', handleHudKeydown, true);
    hudKeydownBound = true;
  }
  // 只挂观察者；不在 mount 时主动 yield，避免误把 #sheld/#bg1 当弹层
  ensureHudOverlayObserver();
  // 清理历史误标
  doc.querySelectorAll(`[${HUD_OVERLAY_LIFT_ATTR}="1"]`).forEach(el => {
    if (isHudStCoreLayoutElement(el as HTMLElement)) el.removeAttribute(HUD_OVERLAY_LIFT_ATTR);
  });
}

function unbindHudShellEvents() {
  if (hudShellEventsBound) {
    doc.removeEventListener('click', handleHudShellClick, true);
    hudShellEventsBound = false;
  }
  if (hudKeydownBound) {
    doc.removeEventListener('keydown', handleHudKeydown, true);
    hudKeydownBound = false;
  }
  stopHudOverlayWatch();
}

function rebindMessageObserverToChat() {
  const chat = getChatElement();
  if (!chat) return;
  observedChatContainer = chat;
  if (observerEnabled && messageObserver) {
    messageObserver.disconnect();
    resumeMessageObserver();
  }
}

function mountHudImmersive() {
  if (!isMysteryRevivalCardActive()) {
    unmountHudImmersive();
    return;
  }
  const chat = getChatElement();
  if (!chat) return;

  const shell = ensureHudShell();
  const chatHost = shell.querySelector('[data-mfrs-hud="chat-host"]') as HTMLElement | null;
  if (!chatHost) return;

  if (!hudChatRestore || chat.parentElement !== chatHost) {
    if (chat.parentElement !== chatHost) {
      hudChatRestore = captureDomRestore(chat);
      chatHost.appendChild(chat);
    }
  }
  reparentSendFormIntoHud(shell);

  if (!doc.body.classList.contains(HUD_BODY_CLASS)) {
    hudBodyOverflowPrev = doc.body.style.overflow;
  }
  doc.body.classList.add(HUD_BODY_CLASS);
  shell.classList.add('is-active');
  shell.setAttribute('aria-hidden', 'false');
  hudMounted = true;
  syncHudMotionPreference();
  closeHudCabinetLayer();
  closeHudSideDrawers();
  bindHudShellEvents();
  rebindMessageObserverToChat();
  if (hudActiveView === 'cabinet') hudActiveView = 'story';
  refreshHudPanels(true);
  setHudView(
    hudActiveView === 'relation' ||
      hudActiveView === 'dossier' ||
      isHudCenterBusinessView(hudActiveView)
      ? hudActiveView
      : 'story',
  );
}

function unmountHudImmersive() {
  const shell = doc.getElementById(HUD_SHELL_ID);
  const chat = getChatElement();
  // 退出路径：先停观察者，避免 reparent 触发 mutation → 全量刷新风暴
  messageObserver?.disconnect();
  historyCatchUpToken += 1;
  closeHudCabinetLayer();
  closeHudSettingsPanel();
  restoreHudFromStUi();
  clearHudToast();

  restoreDomNode(chat, hudChatRestore);
  hudChatRestore = null;
  restoreSendFormFromHud();

  if (shell) {
    shell.classList.remove('is-active');
    shell.setAttribute('aria-hidden', 'true');
  }
  doc.body.classList.remove(HUD_BODY_CLASS);
  if (hudBodyOverflowPrev !== undefined) {
    doc.body.style.overflow = hudBodyOverflowPrev;
  }
  hudMounted = false;
  hudPanelsRenderKey = '';
  shell?.classList.remove('is-left-open', 'is-right-open', 'is-cabinet-open', 'is-settings-open', 'is-tavern-menu-open');
  doc.getElementById('mfrs-hud-st-return')?.remove();
  doc.getElementById('mfrs-hud-toast')?.remove();
  rebindMessageObserverToChat();
  pauseMessageObserverTemporarily(180);
  // 退出：先同步最新楼，历史楼分片补齐（不再同步全量扫 DOM）
  scheduleFullHistoryCatchUp();
}

function exitHudImmersive() {
  hudImmersivePreferred = false;
  unmountHudImmersive();
}

function toggleHudImmersive() {
  if (isHudMounted()) {
    exitHudImmersive();
    return;
  }
  hudImmersivePreferred = true;
  mountHudImmersive();
}

function syncHudImmersiveWithCard() {
  if (!isMysteryRevivalCardActive()) {
    hudImmersivePreferred = true;
    unmountHudImmersive();
    return;
  }
  if (hudImmersivePreferred) mountHudImmersive();
  else unmountHudImmersive();
}

function destroyHudImmersive() {
  unmountHudImmersive();
  unbindHudShellEvents();
  clearHudToast();
  doc.getElementById(HUD_SHELL_ID)?.remove();
  doc.getElementById(HUD_STYLE_ID)?.remove();
  doc.getElementById('mfrs-hud-toast')?.remove();
  doc.getElementById('mfrs-hud-st-return')?.remove();
  hudImmersivePreferred = true;
  hudActiveView = 'story';
  hudPanelsRenderKey = '';
}

$(() => {
  hostWindow.__mfrsMessagePanelCleanup__?.();
  // 注入 CSS 样式
  const style = doc.createElement('style');
  style.id = 'mfrs-msg-panel-style';
  style.textContent = `
/* 公文顶状态条：无眼/阵，直角尸青线框 + L 角标 */
.mfrs-msg-brand {
  --mfrs-brand-line: #3d6b66;
  --mfrs-brand-blood: #6b2a26;
  --mfrs-brand-paper: #c8c0ae;
  --mfrs-brand-brass: #9c784a;
  box-sizing: border-box;
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  align-items: stretch;
  gap: 12px 16px;
  width: 100%;
  min-height: 56px;
  margin: 0 0 12px;
  padding: 10px 14px 10px 12px;
  color: var(--mfrs-brand-paper);
  background:
    linear-gradient(180deg, rgba(12, 14, 14, 0.96), rgba(8, 10, 10, 0.94)),
    #0a0b0b;
  border: 1px solid color-mix(in srgb, var(--mfrs-brand-line) 78%, #111 22%);
  border-radius: 0;
  box-shadow:
    inset 0 0 0 1px rgba(61, 107, 102, 0.12),
    0 4px 14px rgba(0, 0, 0, 0.28);
  overflow: hidden;
  position: relative;
  isolation: isolate;
  animation: mfrs-msg-brand-reveal 360ms ease-out 1 both;
}

.mfrs-msg-brand::before {
  content: '';
  position: absolute;
  inset: 0;
  z-index: -1;
  pointer-events: none;
  background:
    linear-gradient(90deg, color-mix(in srgb, var(--mfrs-brand-blood) 18%, transparent), transparent 18%),
    repeating-linear-gradient(90deg, transparent 0 27px, rgba(61, 107, 102, 0.04) 27px 28px);
}

.mfrs-msg-brand::after {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  top: 0;
  height: 1px;
  z-index: 1;
  pointer-events: none;
  background: linear-gradient(90deg, transparent, color-mix(in srgb, var(--mfrs-brand-line) 70%, transparent) 40%, transparent);
  opacity: 0.35;
  animation-play-state: paused;
}

.mfrs-msg-brand-corner {
  position: absolute;
  width: 10px;
  height: 10px;
  pointer-events: none;
  z-index: 2;
}
.mfrs-msg-brand-corner-tl { top: 4px; left: 4px; border-top: 1px solid var(--mfrs-brand-line); border-left: 1px solid var(--mfrs-brand-line); }
.mfrs-msg-brand-corner-tr { top: 4px; right: 4px; border-top: 1px solid var(--mfrs-brand-line); border-right: 1px solid var(--mfrs-brand-line); }
.mfrs-msg-brand-corner-bl { bottom: 4px; left: 4px; border-bottom: 1px solid var(--mfrs-brand-line); border-left: 1px solid var(--mfrs-brand-line); }
.mfrs-msg-brand-corner-br { bottom: 4px; right: 4px; border-bottom: 1px solid var(--mfrs-brand-line); border-right: 1px solid var(--mfrs-brand-line); }

.mfrs-msg-brand-rail {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 2px;
  min-width: 72px;
  padding-right: 12px;
  border-right: 1px solid color-mix(in srgb, var(--mfrs-brand-line) 45%, transparent);
}

.mfrs-msg-brand-kicker {
  color: var(--mfrs-brand-line);
  font-family: 'Noto Serif SC', 'SimSun', serif;
  font-size: 13px;
  font-weight: 700;
  line-height: 1.2;
  letter-spacing: 0.08em;
}

.mfrs-msg-brand-stamp {
  color: color-mix(in srgb, var(--mfrs-brand-brass) 80%, #fff 8%);
  font-size: 10px;
  letter-spacing: 0.18em;
  line-height: 1.2;
}

.mfrs-msg-brand-archive {
  color: #8a8376;
  font-size: 10px;
  line-height: 1.2;
  font-variant-numeric: tabular-nums;
}

.mfrs-msg-brand-meta {
  min-width: 0;
  margin: 0;
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 4px 12px;
  align-content: center;
}

.mfrs-msg-brand-meta > div {
  min-width: 0;
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 6px;
  align-items: baseline;
}

.mfrs-msg-brand-meta dt,
.mfrs-msg-brand-meta dd { margin: 0; }

.mfrs-msg-brand-meta dt {
  color: color-mix(in srgb, var(--mfrs-brand-line) 85%, #fff 8%);
  font-size: 10px;
}

.mfrs-msg-brand-meta dd {
  min-width: 0;
  color: var(--mfrs-brand-paper);
  font-size: 11px;
  line-height: 1.35;
  overflow-wrap: anywhere;
}

.mfrs-msg-brand-location { grid-column: 1 / -1; }

.mes[is_user="false"]:not(.last_mes) .mfrs-msg-brand {
  animation: none;
}
.mes[is_user="false"]:not(.last_mes) .mfrs-msg-brand::after {
  animation: none;
  animation-play-state: paused;
  opacity: 0.2;
}

.mes.last_mes[is_user="false"] .mfrs-msg-brand::after {
  animation: mfrs-msg-brand-lamp 2.5s ease-in-out infinite;
  animation-play-state: running;
}

@keyframes mfrs-msg-brand-reveal {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes mfrs-msg-brand-lamp {
  0%, 100% { opacity: 0.22; }
  50% { opacity: 0.55; }
}

@media (prefers-reduced-motion: reduce) {
  .mfrs-msg-brand,
  .mfrs-msg-brand::after,
  .mfrs-msg-panel,
  .mfrs-msg-panel::before,
  .mfrs-msg-panel::after,
  .mes.last_mes .mfrs-msg-panel,
  .mes.last_mes .mfrs-msg-panel::before,
  .mes.last_mes .mfrs-msg-panel::after,
  .mes.last_mes .mfrs-msg-panel.is-high-risk,
  .mes.last_mes .mfrs-msg-blood-drop,
  .mes.last_mes .mfrs-msg-risk-item.is-calm .mfrs-msg-risk-fill,
  .mes.last_mes .mfrs-msg-risk-item.is-elevated .mfrs-msg-risk-fill,
  .mes.last_mes .mfrs-msg-risk-item.is-critical .mfrs-msg-risk-fill,
  .mes.last_mes .mfrs-msg-section-title,
  .mes.last_mes .mfrs-msg-panel.is-high-risk .mfrs-msg-action-btn {
    animation: none !important;
  }
  .mfrs-msg-panel::after,
  .mfrs-msg-brand::after { opacity: 0 !important; }
  .mfrs-msg-tab:active,
  .mfrs-msg-action-btn:active { transform: none; }
}

@media (max-width: 520px) {
  .mfrs-msg-brand {
    grid-template-columns: 1fr;
    gap: 8px;
    min-height: 0;
    padding: 10px 12px;
  }

  .mfrs-msg-brand-rail {
    flex-direction: row;
    align-items: baseline;
    gap: 8px;
    min-width: 0;
    padding-right: 0;
    padding-bottom: 6px;
    border-right: 0;
    border-bottom: 1px solid color-mix(in srgb, var(--mfrs-brand-line) 40%, transparent);
  }

  .mfrs-msg-brand-meta {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 3px 8px;
  }

  .mfrs-msg-brand-meta > div { display: block; }
  .mfrs-msg-brand-meta dt { display: inline; margin-right: 4px; }
  .mfrs-msg-brand-meta dd { display: inline; font-size: 10px; }
  .mfrs-msg-brand-location { grid-column: 1 / -1; }
}

/* 连续档案面板：单一外框，内部只用分隔线组织信息 */
.mfrs-msg-panel {
  --mfrs-panel-corpse: var(--mfrs-corpse-cyan, #3d6b66);
  --mfrs-panel-brass: var(--mfrs-aged-brass, #9c784a);
  --mfrs-panel-bone: var(--mfrs-bone-white, #c8c0ae);
  --mfrs-panel-blood: var(--mfrs-blood-red, #6b2a26);
  color: var(--mfrs-panel-bone);
  background:
    repeating-linear-gradient(0deg, rgba(200, 192, 174, 0.016) 0 1px, transparent 1px 4px),
    linear-gradient(100deg, rgba(61, 107, 102, 0.06), transparent 32%),
    rgba(8, 10, 10, 0.96);
  margin-top: 16px;
  padding: 0;
  border: 1px solid color-mix(in srgb, var(--mfrs-panel-corpse) 72%, #111 28%);
  border-radius: 0;
  box-shadow:
    0 8px 22px rgba(0, 0, 0, 0.34),
    inset 0 0 0 1px rgba(61, 107, 102, 0.1);
  overflow: hidden;
  position: relative;
}

.mfrs-msg-panel::before {
  content: '';
  position: absolute;
  inset: 0 auto 0 13px;
  width: 1px;
  background:
    repeating-linear-gradient(180deg, var(--mfrs-panel-corpse) 0 5px, transparent 5px 10px);
  pointer-events: none;
  opacity: 0.42;
}

.mfrs-msg-panel::after {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  top: -14%;
  height: 16%;
  pointer-events: none;
  z-index: 2;
  opacity: 0;
  background: linear-gradient(
    180deg,
    transparent 0%,
    color-mix(in srgb, var(--mfrs-panel-blood) 30%, transparent) 45%,
    color-mix(in srgb, var(--mfrs-panel-brass) 35%, transparent) 50%,
    color-mix(in srgb, var(--mfrs-panel-blood) 30%, transparent) 55%,
    transparent 100%
  );
}

.mfrs-msg-panel > * {
  position: relative;
  z-index: 1;
}

.mfrs-msg-blood-layer {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 3;
  overflow: hidden;
}

.mfrs-msg-blood-drop {
  position: absolute;
  top: -8px;
  width: 3px;
  height: 0;
  opacity: 0;
  background: linear-gradient(180deg, rgba(159, 52, 47, 0.9), rgba(80, 16, 14, 0.2));
}

.mfrs-msg-blood-drop.d1 { left: 12%; }
.mfrs-msg-blood-drop.d2 { left: 38%; }
.mfrs-msg-blood-drop.d3 { left: 64%; }
.mfrs-msg-blood-drop.d4 { left: 86%; }

.mes.last_mes .mfrs-msg-panel {
  animation: mfrs-panel-edge-pulse 4.2s ease-in-out infinite;
}

.mes.last_mes .mfrs-msg-panel::before {
  animation: mfrs-panel-breathe 3.6s ease-in-out infinite;
}

.mes.last_mes .mfrs-msg-panel::after {
  opacity: 0.55;
  animation: mfrs-panel-scan 9s linear infinite;
}

.mes.last_mes .mfrs-msg-panel.is-high-risk {
  animation:
    mfrs-panel-edge-pulse 2.2s ease-in-out infinite,
    mfrs-panel-danger-flash 2.8s ease-in-out infinite;
}

.mes.last_mes .mfrs-msg-blood-drop.d1 { animation: mfrs-blood-drop 3.2s ease-in infinite; }
.mes.last_mes .mfrs-msg-blood-drop.d2 { animation: mfrs-blood-drop 3.8s ease-in 0.7s infinite; }
.mes.last_mes .mfrs-msg-blood-drop.d3 { animation: mfrs-blood-drop 2.9s ease-in 1.2s infinite; }
.mes.last_mes .mfrs-msg-blood-drop.d4 { animation: mfrs-blood-drop 3.5s ease-in 0.35s infinite; }

.mes.last_mes .mfrs-msg-risk-item.is-calm .mfrs-msg-risk-fill {
  animation: mfrs-risk-idle 4.5s ease-in-out infinite;
}

.mes.last_mes .mfrs-msg-risk-item.is-elevated .mfrs-msg-risk-fill {
  animation: mfrs-risk-seep 2.2s ease-in-out infinite;
}

.mes.last_mes .mfrs-msg-risk-item.is-critical .mfrs-msg-risk-fill {
  animation: mfrs-risk-pulse 1.1s ease-in-out infinite;
}

.mes.last_mes .mfrs-msg-section-title {
  animation: mfrs-title-flicker 5.5s ease-in-out infinite;
}

.mes.last_mes .mfrs-msg-col:nth-child(1) .mfrs-msg-section:nth-child(1) .mfrs-msg-section-title { animation-delay: 0.45s; }
.mes.last_mes .mfrs-msg-col:nth-child(1) .mfrs-msg-section:nth-child(2) .mfrs-msg-section-title { animation-delay: 0.9s; }
.mes.last_mes .mfrs-msg-col:nth-child(2) .mfrs-msg-section:nth-child(1) .mfrs-msg-section-title { animation-delay: 1.3s; }
.mes.last_mes .mfrs-msg-col:nth-child(2) .mfrs-msg-section:nth-child(2) .mfrs-msg-section-title { animation-delay: 1.7s; }

.mes.last_mes .mfrs-msg-panel.is-high-risk .mfrs-msg-action-btn {
  animation: mfrs-action-edge-glow 2.8s ease-in-out infinite;
}

@keyframes mfrs-panel-edge-pulse {
  0%, 100% {
    box-shadow:
      0 8px 22px rgba(0, 0, 0, 0.34),
      inset 0 0 0 1px rgba(61, 107, 102, 0.1),
      0 0 0 0 rgba(107, 42, 38, 0);
  }
  50% {
    box-shadow:
      0 9px 24px rgba(0, 0, 0, 0.38),
      inset 0 0 0 1px rgba(61, 107, 102, 0.2),
      0 0 10px rgba(107, 42, 38, 0.08);
  }
}

@keyframes mfrs-panel-breathe {
  0%, 100% { opacity: 0.34; }
  50% { opacity: 0.62; }
}

@keyframes mfrs-panel-scan {
  0% { top: -14%; }
  100% { top: 110%; }
}

@keyframes mfrs-panel-danger-flash {
  0%, 100% { border-color: color-mix(in srgb, var(--mfrs-panel-corpse) 72%, #111 28%); }
  45% { border-color: color-mix(in srgb, var(--mfrs-panel-blood) 78%, #111 22%); }
  55% { border-color: color-mix(in srgb, var(--mfrs-panel-blood) 55%, #111 45%); }
}

@keyframes mfrs-blood-drop {
  0% { height: 0; opacity: 0; transform: translateY(0); }
  18% { height: 16px; opacity: 0.55; }
  100% { height: 6px; opacity: 0; transform: translateY(72px); }
}

@keyframes mfrs-risk-idle {
  0%, 100% { filter: brightness(1); }
  50% { filter: brightness(1.08); }
}

@keyframes mfrs-risk-seep {
  0%, 100% { filter: brightness(1) saturate(1); }
  50% { filter: brightness(1.12) saturate(1.15); }
}

@keyframes mfrs-risk-pulse {
  0%, 100% { filter: brightness(1); box-shadow: none; }
  50% { filter: brightness(1.2); box-shadow: 0 0 8px color-mix(in srgb, var(--mfrs-risk-color) 55%, transparent); }
}

@keyframes mfrs-title-flicker {
  0%, 90%, 100% { opacity: 1; text-shadow: none; }
  93% { opacity: 0.55; text-shadow: 0 0 8px rgba(159, 52, 47, 0.55); }
  96% { opacity: 1; text-shadow: 0 0 4px rgba(156, 120, 74, 0.4); }
}

@keyframes mfrs-action-edge-glow {
  0%, 100% { border-color: color-mix(in srgb, var(--mfrs-panel-brass) 55%, transparent); }
  50% { border-color: color-mix(in srgb, var(--mfrs-panel-blood) 75%, transparent); }
}

.mfrs-msg-panel .fa-solid {
  font-family: "Font Awesome 6 Free" !important;
  font-style: normal;
  font-weight: 900;
}

/* 档案索引 */
.mfrs-msg-tabs {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  padding: 0 14px;
  border-bottom: 1px solid rgba(61, 107, 102, 0.38);
  background: rgba(5, 7, 7, 0.54);
}

.mfrs-msg-tab {
  min-width: 44px;
  min-height: 44px;
  box-sizing: border-box;
  background: transparent;
  color: #8f9d96;
  border: 0;
  border-bottom: 2px solid transparent;
  padding: 11px 12px 9px;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  transition: color 0.18s ease, border-color 0.18s ease, background 0.18s ease;
  font-family: "Noto Sans SC", sans-serif;
}

.mfrs-msg-tab:hover {
  background: rgba(95, 143, 134, 0.08);
  color: var(--mfrs-panel-bone);
}

.mfrs-msg-tab-active {
  color: var(--mfrs-panel-bone) !important;
  border-bottom-color: var(--mfrs-panel-blood);
  background: linear-gradient(180deg, transparent, rgba(159, 52, 47, 0.1));
}

.mfrs-msg-tab:focus-visible,
.mfrs-msg-action-btn:focus-visible {
  outline: 2px solid var(--mfrs-panel-corpse);
  outline-offset: -3px;
}

/* Tab 内容区 */
.mfrs-msg-tab-content {
  display: none;
  padding: 0 22px 20px 28px;
}

.mfrs-msg-tab-content-active {
  display: block;
}

.mfrs-msg-tab-content[hidden] {
  display: none !important;
}

/* 顶部档案摘要 */
.mfrs-msg-header {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(142px, 1fr));
  gap: 10px 18px;
  align-items: start;
  padding: 15px 0 13px;
  border-bottom: 1px solid rgba(61, 107, 102, 0.34);
}

.mfrs-msg-header-item {
  min-width: 0;
  display: grid;
  grid-template-columns: 16px minmax(0, 1fr);
  gap: 2px 7px;
  align-items: center;
  font-size: 12px;
}

.mfrs-msg-header-ico {
  grid-row: 1 / span 2;
  color: var(--mfrs-panel-corpse);
  font-size: 12px;
}
.mfrs-msg-header-lbl { color: #73827c; }
.mfrs-msg-header-val {
  min-width: 0;
  color: var(--mfrs-panel-bone);
  font-weight: 600;
  overflow-wrap: anywhere;
}

/* 左右两列 */
.mfrs-msg-columns {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0 22px;
}

.mfrs-msg-col { min-width: 0; }
.mfrs-msg-col + .mfrs-msg-col {
  border-left: 1px solid rgba(61, 107, 102, 0.22);
  padding-left: 22px;
}

/* 连续档案分区 */
.mfrs-msg-section {
  margin: 0;
  padding: 15px 0 17px;
  border-top: 1px solid rgba(61, 107, 102, 0.22);
}

.mfrs-msg-col .mfrs-msg-section:first-child { border-top: 0; }
.mfrs-msg-section-full { padding-bottom: 0; }

.mfrs-msg-section-title {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0 0 10px;
  color: var(--mfrs-panel-corpse);
  font-size: 13px;
  font-weight: 700;
  font-family: "Noto Serif SC", serif;
}

.mfrs-msg-section-title i {
  width: 14px;
  color: var(--mfrs-panel-brass);
  font-size: 11px;
  text-align: center;
}

/* 键值对行 */
.mfrs-msg-kv {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 12px;
  font-size: 13px;
  line-height: 1.9;
  color: #c8c0ae;
  border-bottom: 1px dotted rgba(61, 107, 102, 0.18);
  padding: 2px 0;
}

.mfrs-msg-kv:last-child { border-bottom: none; }
.mfrs-msg-kv span { color: #7f8e87; flex: 0 0 auto; }
.mfrs-msg-kv b {
  color: var(--mfrs-panel-bone);
  font-weight: 600;
  text-align: right;
  overflow-wrap: anywhere;
}

.mfrs-msg-info-text {
  font-size: 13px;
  line-height: 1.7;
  color: #c8c0ad;
  margin-bottom: 6px;
}

.mfrs-msg-info-text strong {
  color: var(--mfrs-panel-brass);
  display: inline-block;
  margin-right: 6px;
}

/* 风险计：等级、数值、文字、颜色同时表达 */
.mfrs-msg-risk-item { margin-bottom: 14px; }

.mfrs-msg-risk-label {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto auto;
  gap: 8px;
  align-items: baseline;
  font-size: 13px;
  margin-bottom: 2px;
  color: #c8c0ad;
  font-weight: 600;
}

.mfrs-msg-risk-level,
.mfrs-msg-risk-value { color: var(--mfrs-risk-color); }

.mfrs-msg-risk-level {
  font-size: 11px;
  letter-spacing: 0;
}

.mfrs-msg-risk-value {
  min-width: 3.4em;
  text-align: right;
  font-variant-numeric: tabular-nums;
}

.mfrs-msg-risk-copy {
  margin-bottom: 7px;
  color: #87938d;
  font-size: 11px;
  line-height: 1.45;
}

.mfrs-msg-risk-bar {
  width: 100%;
  height: 7px;
  background: rgba(200, 192, 174, 0.08);
  overflow: hidden;
  border: 1px solid rgba(61, 107, 102, 0.22);
  border-radius: 0;
}

.mfrs-msg-risk-fill {
  height: 100%;
  width: var(--mfrs-risk-pct);
  background: var(--mfrs-risk-color);
  transition: width 0.4s ease, background 0.3s ease;
}

/* 厉鬼列表 */
.mfrs-msg-ghost-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.mfrs-msg-ghost-item {
  background: rgba(159, 52, 47, 0.11);
  color: #cf8e83;
  padding: 5px 10px;
  font-size: 13px;
  border-left: 2px solid var(--mfrs-panel-blood);
}

/* NPC 列表（名字着色 + 描述） */
.mfrs-msg-npc-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.mfrs-msg-npc-item {
  padding: 7px 0 7px 10px;
  border-left: 2px solid rgba(95, 143, 134, 0.52);
  font-size: 13px;
  display: flex;
  gap: 10px;
  align-items: baseline;
}

.mfrs-msg-npc-name {
  color: #c29a62;
  font-weight: 700;
  flex: 0 0 auto;
}
.mfrs-msg-npc-desc { color: #9ba59f; line-height: 1.6; }

/* 摘要下 / 拟办区：固定 A–D 四键，只填充输入框 */
.mfrs-msg-inline-choices {
  margin: 10px 0 4px;
  padding: 10px 12px 12px;
  border: 1px solid color-mix(in srgb, var(--mfrs-panel-corpse, #3d6b66) 42%, transparent);
  background:
    linear-gradient(180deg, rgba(61, 107, 102, 0.08), transparent 48%),
    rgba(8, 10, 10, 0.92);
}
.mfrs-msg-inline-choices-title {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0 0 8px;
  color: var(--mfrs-panel-corpse, #3d6b66);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.08em;
  font-family: "Noto Serif SC", serif;
}
.mfrs-msg-actions-hint {
  margin: 0 0 8px;
  color: #8f9b95;
  font-size: 11px;
  line-height: 1.45;
}
.mfrs-msg-actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.mfrs-msg-actions.is-compact {
  gap: 6px;
}
.mfrs-msg-action-btn.is-provisional {
  border-left-color: color-mix(in srgb, var(--mfrs-panel-brass, #9c784a) 70%, transparent);
  opacity: 0.96;
}

.mfrs-msg-action-btn {
  display: flex;
  align-items: center;
  min-width: 44px;
  min-height: 44px;
  box-sizing: border-box;
  background: rgba(200, 192, 174, 0.035);
  color: var(--mfrs-panel-bone);
  border: 1px solid rgba(61, 107, 102, 0.28);
  border-left: 3px solid var(--mfrs-panel-corpse);
  border-radius: 0;
  padding: 10px 14px;
  font-size: 13px;
  text-align: left;
  cursor: pointer;
  transition: border-color 0.18s ease, color 0.18s ease, background 0.18s ease;
  font-family: "Noto Sans SC", sans-serif;
}

.mfrs-msg-action-btn:hover {
  background: rgba(95, 143, 134, 0.08);
  border-color: rgba(95, 143, 134, 0.58);
  border-left-color: var(--mfrs-panel-corpse);
  color: #eee6d3;
}

.mfrs-msg-action-btn:active {
  background: rgba(159, 52, 47, 0.16);
  border-left-color: var(--mfrs-panel-blood);
  transform: translateY(1px);
}

.mfrs-msg-action-key {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  background: rgba(156, 120, 74, 0.16);
  color: #d8bc8f;
  border: 1px solid rgba(156, 120, 74, 0.42);
  font-weight: 700;
  font-size: 12px;
  margin-right: 10px;
  flex: 0 0 auto;
}

.mfrs-msg-action-body {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1 1 auto;
  min-width: 0;
}

.mfrs-msg-action-label {
  color: var(--mfrs-panel-bone);
  line-height: 1.45;
}

.mfrs-msg-action-meta {
  color: #8f9b95;
  font-size: 12px;
  line-height: 1.45;
}

/* 面板内滚动条独立样式 */
.mfrs-msg-panel ::-webkit-scrollbar {
  width: 8px;
}
.mfrs-msg-panel ::-webkit-scrollbar-track {
  background: rgba(11, 13, 12, 0.72);
}
.mfrs-msg-panel ::-webkit-scrollbar-thumb {
  background: rgba(95, 143, 134, 0.48);
  border-radius: 2px;
}
.mfrs-msg-panel ::-webkit-scrollbar-thumb:hover {
  background: rgba(156, 120, 74, 0.7);
}

/* 空状态 */
.mfrs-msg-empty {
  color: #75817b;
  font-size: 13px;
  font-style: italic;
}

@media (max-width: 640px) {
  .mfrs-msg-tab-content { padding: 0 14px 16px 20px; }
  .mfrs-msg-columns { grid-template-columns: 1fr; }
  .mfrs-msg-col + .mfrs-msg-col {
    border-left: 0;
    padding-left: 0;
  }
  .mfrs-msg-col + .mfrs-msg-col .mfrs-msg-section:first-child {
    border-top: 1px solid rgba(61, 107, 102, 0.22);
  }
  .mfrs-msg-header { grid-template-columns: 1fr; gap: 8px; }
  .mfrs-msg-npc-item { align-items: flex-start; flex-direction: column; gap: 2px; }
}

/* ===== Phase2 三栏壳（仅 last_mes） ===== */
.mfrs-msg-panel.mfrs-msg-tri {
  display: grid;
  grid-template-columns: minmax(196px, 0.3fr) minmax(0, 1fr) 52px;
  grid-template-rows: auto;
  gap: 0;
  align-items: stretch;
  padding: 0;
  overflow: visible;
}

.mfrs-msg-tri-left {
  min-width: 0;
  border-right: 1px solid rgba(61, 107, 102, 0.34);
  background: linear-gradient(180deg, rgba(10, 12, 12, 0.96), rgba(8, 10, 10, 0.92));
  padding: 12px 10px 14px;
  max-height: min(78vh, 920px);
  overflow: auto;
  transition: box-shadow 0.2s ease, border-color 0.2s ease;
}

.mfrs-msg-tri-left.is-emphasis {
  box-shadow: inset 0 0 0 1px rgba(61, 107, 102, 0.45);
}

.mfrs-msg-tri-left-title {
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin-bottom: 10px;
  padding-bottom: 8px;
  border-bottom: 1px solid rgba(61, 107, 102, 0.28);
}

.mfrs-msg-tri-left-kicker {
  color: var(--mfrs-panel-corpse);
  font-family: "Noto Serif SC", serif;
  font-size: 14px;
  font-weight: 700;
  letter-spacing: 0.08em;
}

.mfrs-msg-tri-left-sub {
  color: #8a8376;
  font-size: 10px;
  letter-spacing: 0.12em;
}

.mfrs-msg-fold {
  margin: 0;
  border-top: 1px solid rgba(61, 107, 102, 0.18);
  padding: 0;
}

.mfrs-msg-fold:first-child { border-top: 0; }

.mfrs-msg-fold-summary {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 40px;
  cursor: pointer;
  list-style: none;
  color: var(--mfrs-panel-corpse);
  font-size: 12px;
  font-weight: 700;
  font-family: "Noto Serif SC", serif;
  user-select: none;
}

.mfrs-msg-fold-summary::-webkit-details-marker { display: none; }
.mfrs-msg-fold-summary::after {
  content: '▸';
  margin-left: auto;
  color: #7f8e87;
  font-size: 11px;
  transition: transform 0.15s ease;
}
.mfrs-msg-fold[open] > .mfrs-msg-fold-summary::after { transform: rotate(90deg); }
.mfrs-msg-fold-summary i { width: 14px; color: var(--mfrs-panel-brass); text-align: center; }
.mfrs-msg-fold-body { padding: 0 0 12px 2px; }

.mfrs-msg-tri-center {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0;
  padding: 0;
  background: transparent;
}

.mfrs-msg-center-host {
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-width: 0;
  padding: 10px 12px 0;
}

.mfrs-msg-center-host > .mfrs-msg-brand,
.mfrs-msg-center-host > .mfrs-msg-narrative-wrapper {
  margin-bottom: 0;
}

.mfrs-msg-actions-block {
  padding: 8px 12px 14px;
  border-top: 1px solid rgba(61, 107, 102, 0.22);
}

.mfrs-msg-tri-relation {
  padding: 10px 14px 14px;
}

.mfrs-msg-tri-right {
  border-left: 1px solid rgba(61, 107, 102, 0.34);
  background: rgba(6, 8, 8, 0.94);
  padding: 8px 4px;
}

.mfrs-msg-nav {
  display: flex;
  flex-direction: column;
  gap: 6px;
  align-items: stretch;
  position: sticky;
  top: 8px;
}

.mfrs-msg-nav-btn {
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 3px;
  min-width: 44px;
  min-height: 44px;
  margin: 0;
  padding: 6px 2px;
  border: 1px solid rgba(61, 107, 102, 0.28);
  border-radius: 0;
  background: rgba(200, 192, 174, 0.03);
  color: #a8b0aa;
  font-size: 10px;
  line-height: 1.15;
  cursor: pointer;
  transition: border-color 0.15s ease, color 0.15s ease, background 0.15s ease;
}

.mfrs-msg-nav-btn i { font-size: 12px; color: var(--mfrs-panel-corpse); }
.mfrs-msg-nav-btn:hover {
  color: var(--mfrs-panel-bone);
  border-color: rgba(61, 107, 102, 0.55);
  background: rgba(61, 107, 102, 0.1);
}
.mfrs-msg-nav-btn.is-active {
  color: var(--mfrs-panel-bone);
  border-color: color-mix(in srgb, var(--mfrs-panel-blood) 55%, var(--mfrs-panel-corpse));
  background: linear-gradient(180deg, rgba(107, 42, 38, 0.16), rgba(61, 107, 102, 0.08));
}
.mfrs-msg-nav-btn.is-disabled,
.mfrs-msg-nav-btn:disabled {
  opacity: 0.38;
  cursor: not-allowed;
}
.mfrs-msg-nav-btn:focus-visible {
  outline: 2px solid var(--mfrs-panel-corpse);
  outline-offset: -2px;
}

.mfrs-msg-tabs-a11y,
.mfrs-msg-sr-only {
  position: absolute !important;
  width: 1px !important;
  height: 1px !important;
  padding: 0 !important;
  margin: -1px !important;
  overflow: hidden !important;
  clip: rect(0, 0, 0, 0) !important;
  white-space: nowrap !important;
  border: 0 !important;
}

.mfrs-msg-cabinet-flash {
  outline: 1px solid color-mix(in srgb, var(--mfrs-panel-corpse, #3d6b66) 70%, transparent);
  box-shadow: 0 0 0 1px rgba(61, 107, 102, 0.35), 0 0 18px rgba(61, 107, 102, 0.2);
}

.mes[is_user="false"]:not(.last_mes) .mfrs-msg-panel.mfrs-msg-tri {
  display: block;
}

@media (max-width: 900px) {
  .mfrs-msg-panel.mfrs-msg-tri {
    grid-template-columns: minmax(0, 1fr) 52px;
    grid-template-areas:
      "center right"
      "left right";
  }
  .mfrs-msg-tri-left { grid-area: left; max-height: none; border-right: 0; border-top: 1px solid rgba(61, 107, 102, 0.28); }
  .mfrs-msg-tri-center { grid-area: center; }
  .mfrs-msg-tri-right { grid-area: right; }
}

@media (max-width: 640px) {
  .mfrs-msg-panel.mfrs-msg-tri {
    grid-template-columns: 1fr;
    grid-template-areas:
      "right"
      "center"
      "left";
  }
  .mfrs-msg-tri-right {
    border-left: 0;
    border-bottom: 1px solid rgba(61, 107, 102, 0.28);
    padding: 6px;
  }
  .mfrs-msg-nav {
    flex-direction: row;
    flex-wrap: wrap;
    position: static;
    justify-content: space-between;
  }
  .mfrs-msg-nav-btn {
    flex: 1 1 18%;
    min-width: 44px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .mfrs-msg-cabinet-flash { transition: none; }
  .mfrs-msg-fold-summary::after { transition: none; }
}
`;

  const messagePanelApi: MessagePanelApi = {
    refreshAll: processAllMessages,
    refreshMessage: processOneMessage,
  };
  const refreshEvents = [
    tavern_events.MESSAGE_RECEIVED,
    tavern_events.MESSAGE_UPDATED,
    tavern_events.MESSAGE_SWIPED,
    tavern_events.CHARACTER_MESSAGE_RENDERED,
    tavern_events.GENERATION_ENDED,
    tavern_events.GENERATION_STOPPED,
  ].filter(Boolean);
  const refreshSubscriptions: EventSubscription[] = [];
  const chatChangedTimers = new Set<number>();
  let chatChangedSubscription: EventSubscription | null = null;
  let runtimeActive = false;
  let disposed = false;

  const HostMutationObserver = doc.defaultView?.MutationObserver ?? MutationObserver;
  const observer = new HostMutationObserver(mutations => {
    if (mutations.some(mutationTouchesChatMessage)) {
      scheduleIdleRefresh();
    }
  });
  messageObserver = observer;

  function mountStyle() {
    if (style.isConnected) return;
    doc.getElementById(style.id)?.remove();
    doc.head.appendChild(style);
  }

  function mountApi() {
    hostWindow.MysteryMessagePanel = messagePanelApi;
  }

  function subscribeRefreshEvents() {
    if (refreshSubscriptions.length > 0) return;
    refreshEvents.forEach(eventName => {
      refreshSubscriptions.push(eventOn(eventName, scheduleBurstRefresh));
    });
  }

  function unsubscribeRefreshEvents() {
    refreshSubscriptions.splice(0).forEach(subscription => subscription.stop());
  }

  function deactivateMessagePanelRuntime() {
    runtimeActive = false;
    observerEnabled = false;
    observer.disconnect();
    unsubscribeRefreshEvents();
    clearRefreshTimers();
    // E4：切非神秘复苏卡销毁壳，避免孤儿 #mfrs-hud-shell / toast / st-return
    destroyHudImmersive();
    cleanupOwnedMessageUi();
    style.remove();
    doc.body.classList.remove('mfrs-hud-reduced-motion');
    if (hostWindow.MysteryMessagePanel === messagePanelApi) {
      delete hostWindow.MysteryMessagePanel;
    }
  }

  function activateMessagePanelRuntime() {
    if (disposed || !isMysteryRevivalCardActive()) {
      deactivateMessagePanelRuntime();
      return;
    }
    mountStyle();
    mountApi();
    subscribeRefreshEvents();
    // E2：优先绑 #chat，禁止默认挂 body 扫全站
    observedChatContainer = doc.querySelector('#chat') || doc.body;
    observerEnabled = true;
    resumeMessageObserver();
    syncHudMotionPreference();
    // 激活：先最新楼，再分片补历史（避免切卡瞬间全量卡顿）
    scheduleFullHistoryCatchUp();
    syncHudImmersiveWithCard();
    if (!runtimeActive) scheduleBurstRefresh();
    runtimeActive = true;
  }

  function clearChatChangedTimers() {
    chatChangedTimers.forEach(timer => hostWindow.clearTimeout(timer));
    chatChangedTimers.clear();
  }

  function handleChatChanged() {
    clearChatChangedTimers();
    [0, 250, 1000].forEach(delay => {
      const timer = hostWindow.setTimeout(() => {
        chatChangedTimers.delete(timer);
        if (isMysteryRevivalCardActive()) activateMessagePanelRuntime();
        else deactivateMessagePanelRuntime();
      }, delay);
      chatChangedTimers.add(timer);
    });
  }

  // 事件委托：tab 切换
  doc.addEventListener('click', handleTabClick, true);
  doc.addEventListener('keydown', handleTabKeydown, true);

  // 事件委托：行动建议点击
  doc.addEventListener('click', handleActionClick, true);
  doc.addEventListener('click', handleNavClick, true);

  const cleanup = () => {
    if (disposed) return;
    disposed = true;
    clearChatChangedTimers();
    deactivateMessagePanelRuntime();
    // destroy 已在 deactivate 内调用；再清一次防竞态残留
    destroyHudImmersive();
    chatChangedSubscription?.stop();
    chatChangedSubscription = null;
    doc.removeEventListener('click', handleTabClick, true);
    doc.removeEventListener('keydown', handleTabKeydown, true);
    doc.removeEventListener('click', handleActionClick, true);
    doc.removeEventListener('click', handleNavClick, true);
    window.removeEventListener('pagehide', cleanup);
    messageObserver = null;
    observedChatContainer = null;
    doc.body.classList.remove(HUD_BODY_CLASS, 'mfrs-hud-reduced-motion');
    if (hostWindow.MysteryMessagePanel === messagePanelApi) {
      delete hostWindow.MysteryMessagePanel;
    }
    if (hostWindow.__mfrsMessagePanelCleanup__ === cleanup) {
      delete hostWindow.__mfrsMessagePanelCleanup__;
    }
  };

  hostWindow.__mfrsMessagePanelCleanup__ = cleanup;
  window.addEventListener('pagehide', cleanup, { once: true });
  chatChangedSubscription = eventOn(tavern_events.CHAT_CHANGED, handleChatChanged);
  bindHudShellEvents();
  activateMessagePanelRuntime();
  if (!runtimeActive) handleChatChanged();

  console.info('[消息内面板] 已注入消息内状态面板系统（含 β 全屏壳）');
});
