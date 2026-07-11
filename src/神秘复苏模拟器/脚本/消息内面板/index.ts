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
      color: '#a63832',
      level: '高危',
      copy: kind === 'death' ? '生存窗口正在急剧收窄' : '厉鬼复苏已逼近失控线',
    };
  }
  if (numeric >= 40) {
    return {
      numeric,
      percent,
      color: '#a77b42',
      level: '警戒',
      copy: kind === 'death' ? '继续行动需要预留退路' : '灵异躁动需要持续压制',
    };
  }
  return {
    numeric,
    percent,
    color: '#56847c',
    level: '可控',
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

/** 构建「状态面板」tab 的 HTML（顶部浓缩信息栏 + 左右两列 + 通栏行动建议） */
function buildStatusTabHtml(data: StatusData): string {
  const name = valueText(data.姓名);
  const gender = valueText(data.性别);
  const identity = valueText(data.身份);
  const ability = valueText(data.特殊能力描述, '无');
  const cost = valueText(data.消耗代价, '无');
  const playerStatus = valueText(data.状态, '健康');
  const location = valueText(data.所在位置);
  const phase = valueText(_.get(data, '主线进度.当前阶段'));

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

  const rawGhostList = _.get(data, '驭鬼者状态.已驾驭厉鬼', []) || data.驾驭厉鬼 || [];
  const ghostList = Array.isArray(rawGhostList)
    ? rawGhostList.filter(
        (g: any, i: number, arr: any[]) =>
          i ===
          arr.findIndex((h: any) => valueText(h?.代号 || h?.厉鬼名称, '') === valueText(g?.代号 || g?.厉鬼名称, '')),
      )
    : [];
  const ghostsHtml = ghostList.length
    ? ghostList
        .map(
          (g: any) =>
            `<div class="mfrs-msg-ghost-item">${_.escape(valueText(g.代号 || g.厉鬼名称, '未命名厉鬼'))}</div>`,
        )
        .join('')
    : '<div class="mfrs-msg-empty">暂无驾驭厉鬼</div>';

  const suggestions = Array.isArray(data.行动建议) ? data.行动建议 : [];
  const suggestionsHtml = suggestions.length
    ? suggestions
        .map((s: any, i: number) => {
          const optionKey = valueText(s.选项 ?? s.option ?? String.fromCharCode(65 + i), String.fromCharCode(65 + i));
          const actionText = valueText(s.思路 ?? s.text ?? s.label ?? s.行动, '未知行动');
          const metaParts = [
            valueText(s.主要风险 ?? s.risk, '') && `风险：${valueText(s.主要风险 ?? s.risk, '')}`,
            valueText(s.预期收益 ?? s.gain, '') && `收益：${valueText(s.预期收益 ?? s.gain, '')}`,
            valueText(s.死亡风险, '') && `死亡：${valueText(s.死亡风险, '')}`,
            valueText(s.复苏风险, '') && `复苏：${valueText(s.复苏风险, '')}`,
          ].filter(Boolean);
          const actionValue = actionText === '未知行动' ? '' : actionText;
          return `<button class="mfrs-msg-action-btn" data-action="${_.escape(actionValue)}"><span class="mfrs-msg-action-key">${_.escape(optionKey)}</span><span class="mfrs-msg-action-body"><span class="mfrs-msg-action-label">${_.escape(actionText)}</span>${metaParts.length ? `<span class="mfrs-msg-action-meta">${_.escape(metaParts.join('｜'))}</span>` : ''}</span></button>`;
        })
        .join('')
    : '<div class="mfrs-msg-empty">暂无行动建议</div>';

  return `
<div class="mfrs-msg-header">
  <div class="mfrs-msg-header-item"><i class="fa-solid fa-layer-group mfrs-msg-header-ico" aria-hidden="true"></i><span class="mfrs-msg-header-lbl">阶段</span><span class="mfrs-msg-header-val">${_.escape(phase)}</span></div>
  <div class="mfrs-msg-header-item"><i class="fa-solid fa-location-dot mfrs-msg-header-ico" aria-hidden="true"></i><span class="mfrs-msg-header-lbl">位置</span><span class="mfrs-msg-header-val">${_.escape(location)}</span></div>
  <div class="mfrs-msg-header-item"><i class="fa-solid fa-triangle-exclamation mfrs-msg-header-ico" aria-hidden="true"></i><span class="mfrs-msg-header-lbl">死亡风险</span><span class="mfrs-msg-header-val" style="color:${deathRisk.color}">${deathRisk.numeric}% · ${deathRisk.level}</span></div>
</div>
<div class="mfrs-msg-columns">
  <div class="mfrs-msg-col">
    <div class="mfrs-msg-section">
      <div class="mfrs-msg-section-title"><i class="fa-solid fa-id-card" aria-hidden="true"></i><span>身份信息</span></div>
      <div class="mfrs-msg-kv"><span>姓名</span><b>${_.escape(name)}</b></div>
      <div class="mfrs-msg-kv"><span>性别</span><b>${_.escape(gender)}</b></div>
      <div class="mfrs-msg-kv"><span>身份</span><b>${_.escape(identity)}</b></div>
    </div>
    <div class="mfrs-msg-section">
      <div class="mfrs-msg-section-title"><i class="fa-solid fa-eye" aria-hidden="true"></i><span>特殊能力</span></div>
      <div class="mfrs-msg-info-text"><strong>能力</strong>${_.escape(ability)}</div>
      <div class="mfrs-msg-info-text"><strong>代价</strong>${_.escape(cost)}</div>
    </div>
    <div class="mfrs-msg-section">
      <div class="mfrs-msg-section-title"><i class="fa-solid fa-heart-pulse" aria-hidden="true"></i><span>生存状态</span></div>
      <div class="mfrs-msg-risk-item" style="--mfrs-risk-color:${deathRisk.color};--mfrs-risk-pct:${deathRisk.percent}%">
        <div class="mfrs-msg-risk-label"><span>死亡风险</span><strong class="mfrs-msg-risk-level">${deathRisk.level}</strong><span class="mfrs-msg-risk-value">${deathRisk.numeric}%</span></div>
        <div class="mfrs-msg-risk-copy">${deathRisk.copy}</div>
        <div class="mfrs-msg-risk-bar" role="meter" aria-label="死亡风险" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${deathRisk.percent}"><div class="mfrs-msg-risk-fill"></div></div>
      </div>
      <div class="mfrs-msg-risk-item" style="--mfrs-risk-color:${reviveRisk.color};--mfrs-risk-pct:${reviveRisk.percent}%">
        <div class="mfrs-msg-risk-label"><span>复苏风险</span><strong class="mfrs-msg-risk-level">${reviveRisk.level}</strong><span class="mfrs-msg-risk-value">${reviveRisk.numeric}%</span></div>
        <div class="mfrs-msg-risk-copy">${reviveRisk.copy}</div>
        <div class="mfrs-msg-risk-bar" role="meter" aria-label="复苏风险" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${reviveRisk.percent}"><div class="mfrs-msg-risk-fill"></div></div>
      </div>
      <div class="mfrs-msg-kv"><span>状态</span><b>${_.escape(playerStatus)}</b></div>
    </div>
  </div>
  <div class="mfrs-msg-col">
    <div class="mfrs-msg-section">
      <div class="mfrs-msg-section-title"><i class="fa-solid fa-folder-open" aria-hidden="true"></i><span>当前灵异事件</span></div>
      <div class="mfrs-msg-kv"><span>事件代号</span><b>${_.escape(eventCode)}</b></div>
      <div class="mfrs-msg-kv"><span>危害等级</span><b>${_.escape(eventLevel)}</b></div>
      <div class="mfrs-msg-kv"><span>发生地点</span><b>${_.escape(eventPlace)}</b></div>
      <div class="mfrs-msg-kv"><span>鬼域状态</span><b>${_.escape(eventDomain)}</b></div>
      <div class="mfrs-msg-kv"><span>处理状态</span><b>${_.escape(eventHandle)}</b></div>
    </div>
    <div class="mfrs-msg-section">
      <div class="mfrs-msg-section-title"><i class="fa-solid fa-ghost" aria-hidden="true"></i><span>驾驭厉鬼</span></div>
      <div class="mfrs-msg-ghost-list">${ghostsHtml}</div>
    </div>
  </div>
</div>
<div class="mfrs-msg-section mfrs-msg-section-full">
  <div class="mfrs-msg-section-title"><i class="fa-solid fa-list-check" aria-hidden="true"></i><span>行动建议</span></div>
  <div class="mfrs-msg-actions">${suggestionsHtml}</div>
</div>
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
    danger: valueText(_.get(data, '当前灵异事件.危害等级')),
  };
}

function buildBrandHtml(data: StatusData, mesid: string): string {
  const brand = getBrandViewModel(data, mesid);
  const accessibleName = `鬼眼封案档案标识，档案 ${brand.archive}，阶段 ${brand.phase}，位置 ${brand.location}，危害等级 ${brand.danger}`;

  return `
<section class="mfrs-msg-brand" id="${getBrandId(mesid)}" role="img" aria-label="${_.escape(accessibleName)}">
  <div class="mfrs-msg-brand-eye" aria-hidden="true">
    <svg viewBox="0 0 64 64" focusable="false" aria-hidden="true">
      <g class="mfrs-msg-brand-eye-orbit" fill="none" stroke="currentColor" stroke-width="1.4">
        <ellipse cx="32" cy="32" rx="25" ry="11"/>
        <ellipse cx="32" cy="32" rx="25" ry="11" transform="rotate(60 32 32)"/>
        <ellipse cx="32" cy="32" rx="25" ry="11" transform="rotate(120 32 32)"/>
      </g>
      <path class="mfrs-msg-brand-eye-lid" d="M12 32c6-10 13-15 20-15s14 5 20 15c-6 10-13 15-20 15S18 42 12 32Z"/>
      <circle class="mfrs-msg-brand-eye-iris" cx="32" cy="32" r="9"/>
      <circle class="mfrs-msg-brand-eye-pupil" cx="32" cy="32" r="3.5"/>
      <circle class="mfrs-msg-brand-eye-glint" cx="29" cy="29" r="1.4"/>
    </svg>
  </div>
  <div class="mfrs-msg-brand-center">
    <div class="mfrs-msg-brand-wordmark">
      <span class="mfrs-msg-brand-kicker">鬼眼封案</span>
      <strong>神秘复苏</strong>
      <span class="mfrs-msg-brand-subtitle">SUPERNATURAL ARCHIVE</span>
    </div>
    <dl class="mfrs-msg-brand-meta">
      <div><dt>档案</dt><dd>#${_.escape(brand.archive)}</dd></div>
      <div><dt>阶段</dt><dd>${_.escape(brand.phase)}</dd></div>
      <div class="mfrs-msg-brand-location"><dt>位置</dt><dd>${_.escape(brand.location)}</dd></div>
      <div><dt>危害</dt><dd>${_.escape(brand.danger)}</dd></div>
    </dl>
  </div>
  <div class="mfrs-msg-brand-seal" aria-hidden="true">
    <svg viewBox="0 0 64 64" focusable="false" aria-hidden="true">
      <g class="mfrs-msg-brand-seal-rotor" fill="none" stroke="currentColor">
        <circle cx="32" cy="32" r="27" stroke-width="1.2" stroke-dasharray="3 3"/>
        <path d="M32 5 40 12 51 13 52 24 59 32 52 40 51 51 40 52 32 59 24 52 13 51 12 40 5 32 12 24 13 13 24 12Z" stroke-width="1.5"/>
        <path d="M32 11 39 22 53 25 43 35 45 50 32 43 19 50 21 35 11 25 25 22Z" stroke-width="1"/>
      </g>
      <circle class="mfrs-msg-brand-seal-core" cx="32" cy="32" r="14"/>
      <path class="mfrs-msg-brand-seal-mark" d="M25 23h14M23 29h18M27 35h10M24 41h16M32 21v23"/>
    </svg>
  </div>
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
  const brands = Array.from(mesText.querySelectorAll<HTMLElement>('.mfrs-msg-brand')).filter(
    brand => brand.parentElement === mesText,
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
    const wrapper = Array.from(mesText.children).find(child => child.classList.contains('mfrs-msg-narrative-wrapper'));
    mesText.insertBefore(nextBrand, wrapper ?? mesText.firstChild);
    return;
  }

  existingBrand.id = getBrandId(mesid);
  existingBrand.setAttribute('role', 'img');
  existingBrand.setAttribute('aria-label', nextBrand.getAttribute('aria-label') ?? '鬼眼封案档案标识');
  existingBrand.dataset.mfrsRenderKey = renderKey;
  existingBrand.replaceChildren(...Array.from(nextBrand.childNodes));
}

/** 构建完整面板 HTML（包含 tab 切换） */
function buildPanelHtml(data: StatusData, panelId: string): string {
  const statusTab = buildStatusTabHtml(data);
  const relationTab = buildRelationTabHtml(data);

  return `
<div class="mfrs-msg-panel" id="${panelId}">
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
  const renderKey = getPanelRenderKey(data);
  const panels = Array.from(mesText.querySelectorAll<HTMLElement>('.mfrs-msg-panel')).filter(
    panel => panel.parentElement === mesText,
  );
  const existingPanel = panels.shift() ?? null;
  panels.forEach(panel => panel.remove());
  if (existingPanel?.dataset.mfrsRenderKey === renderKey) return;

  const activeTab =
    existingPanel?.querySelector('.mfrs-msg-tab[aria-selected="true"]')?.getAttribute('data-tab') ?? 'status';
  const focusSnapshot = existingPanel ? capturePanelFocus(existingPanel) : null;
  const panelHtml = buildPanelHtml(data, panelId);

  const panelContainer = doc.createElement('div');
  panelContainer.innerHTML = panelHtml;
  const nextPanel = panelContainer.firstElementChild as HTMLElement | null;
  if (!nextPanel) return;
  nextPanel.dataset.mfrsRenderKey = renderKey;

  if (!existingPanel) {
    mesText.appendChild(nextPanel);
    return;
  }

  existingPanel.id = panelId;
  existingPanel.dataset.mfrsRenderKey = renderKey;
  existingPanel.replaceChildren(...Array.from(nextPanel.childNodes));
  setActivePanelTab(existingPanel, activeTab);
  restorePanelFocus(existingPanel, focusSnapshot);
}

/** 为叙事文本段落添加样式包装容器 */
function wrapNarrativeText(mesElement: Element) {
  if (isUserMessage(mesElement)) return;
  const mesText = mesElement.querySelector('.mes_text');
  if (!mesText) return;

  const nestedBrands = Array.from(mesText.querySelectorAll<HTMLElement>('.mfrs-msg-brand')).filter(
    brand => brand.parentElement !== mesText,
  );
  nestedBrands.forEach(brand => mesText.insertBefore(brand, mesText.firstChild));

  const existingWrappers = Array.from(mesText.querySelectorAll('.mfrs-msg-narrative-wrapper')).filter(
    wrapper => wrapper.parentElement === mesText,
  );
  if (existingWrappers.length > 0) {
    const primaryWrapper = existingWrappers.shift()!;
    existingWrappers.forEach(wrapper => {
      primaryWrapper.append(...Array.from(wrapper.childNodes));
      wrapper.remove();
    });
    return;
  }

  // 找到所有段落（排除面板）
  const panel = mesText.querySelector('.mfrs-msg-panel');
  const allNodes = Array.from(mesText.childNodes);

  // 收集面板之前的所有节点作为叙事内容
  const narrativeNodes: Node[] = [];
  for (const node of allNodes) {
    if (node === panel || (isElementNode(node) && panel && node.contains(panel))) break;
    if (isElementNode(node) && node.matches('.mfrs-msg-brand')) continue;
    narrativeNodes.push(node);
  }

  if (narrativeNodes.length === 0) return;

  // 创建包装容器
  const wrapper = doc.createElement('div');
  wrapper.className = 'mfrs-msg-narrative-wrapper';

  // 将叙事节点移入包装器
  narrativeNodes.forEach(node => wrapper.appendChild(node));

  // 在面板之前插入包装器
  if (panel) {
    mesText.insertBefore(wrapper, panel);
  } else {
    mesText.insertBefore(wrapper, mesText.firstChild);
  }
}

function unwrapNarrativeWrapper(wrapper: Element) {
  wrapper.replaceWith(...Array.from(wrapper.childNodes));
}

function cleanupOwnedMessageUi(root: ParentNode = doc) {
  root.querySelectorAll('.mfrs-msg-panel, .mfrs-msg-brand').forEach(element => element.remove());
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

function resumeMessageObserver() {
  if (!observerEnabled || !messageObserver || !observedChatContainer) return;
  messageObserver.observe(observedChatContainer, { childList: true, subtree: true });
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

/** 处理所有 AI 消息（注入面板 + 包装叙事） */
function processAllMessages() {
  withMessageObserverPaused(() => {
    cleanupUserMessages();
    const messages = doc.querySelectorAll('.mes:not(.user)');
    messages.forEach(mes => {
      injectPanelForMessage(mes);
      wrapNarrativeText(mes);
      injectBrandForMessage(mes);
    });
  });
}

function processOneMessage(messageId: number | string) {
  withMessageObserverPaused(() => {
    const target = Array.from(doc.querySelectorAll('.mes:not(.user)')).find(
      mes => mes.getAttribute('mesid') === String(messageId),
    );
    if (!target) return;
    injectPanelForMessage(target);
    wrapNarrativeText(target);
    injectBrandForMessage(target);
  });
}

const refreshTimers = new Set<number>();
let idleRefreshTimer: number | undefined;

function clearRefreshTimers() {
  refreshTimers.forEach(timer => hostWindow.clearTimeout(timer));
  refreshTimers.clear();
  if (idleRefreshTimer !== undefined) {
    hostWindow.clearTimeout(idleRefreshTimer);
    idleRefreshTimer = undefined;
  }
}

function scheduleProcessAllMessages(delay = 200) {
  const timer = hostWindow.setTimeout(() => {
    refreshTimers.delete(timer);
    processAllMessages();
  }, delay);
  refreshTimers.add(timer);
}

function scheduleBurstRefresh() {
  [200, 800, 2000, 4000].forEach(scheduleProcessAllMessages);
}

function scheduleIdleRefresh(delay = 800) {
  if (idleRefreshTimer !== undefined) {
    hostWindow.clearTimeout(idleRefreshTimer);
  }
  idleRefreshTimer = hostWindow.setTimeout(() => {
    idleRefreshTimer = undefined;
    processAllMessages();
  }, delay);
}

function mutationTouchesChatMessage(mutation: MutationRecord) {
  const targetElement = isElementNode(mutation.target) ? mutation.target : mutation.target.parentElement;
  if (targetElement?.closest(ownedMessageUiSelector)) return false;
  if (targetElement?.closest('.mes')) return true;
  return Array.from(mutation.addedNodes).some(node => {
    if (!isElementNode(node) || node.closest(ownedMessageUiSelector)) return false;
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
  setActivePanelTab(panel, tabName);
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

/** 处理行动建议按钮点击事件 */
function handleActionClick(e: Event) {
  const target = e.target as HTMLElement;
  const btn = target.closest?.('.mfrs-msg-action-btn') as HTMLElement | null;
  if (!btn) return;

  const actionText = btn.getAttribute('data-action');
  if (!actionText) return;

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

$(() => {
  hostWindow.__mfrsMessagePanelCleanup__?.();
  // 注入 CSS 样式
  const style = doc.createElement('style');
  style.id = 'mfrs-msg-panel-style';
  style.textContent = `
/* 三段式实体品牌：鬼眼轨道 / 双层字标 / 八方封尸法阵 */
.mfrs-msg-brand {
  box-sizing: border-box;
  display: grid;
  grid-template-columns: 64px minmax(0, 1fr) 64px;
  align-items: center;
  gap: 16px;
  width: 100%;
  min-height: 96px;
  margin: 0 0 14px;
  padding: 12px 16px;
  color: #d5b9a8;
  background:
    linear-gradient(90deg, rgba(8, 12, 12, 0.96), rgba(22, 14, 13, 0.94) 48%, rgba(8, 12, 12, 0.96)),
    #080c0c;
  border-block: 1px solid rgba(151, 117, 76, 0.48);
  border-inline: 2px solid rgba(42, 91, 87, 0.72);
  box-shadow:
    inset 0 1px rgba(228, 211, 177, 0.08),
    inset 0 -1px rgba(115, 26, 24, 0.22),
    0 6px 18px rgba(0, 0, 0, 0.28);
  overflow: hidden;
  position: relative;
  isolation: isolate;
  animation: mfrs-msg-brand-reveal 360ms ease-out 1 both;
}

.mfrs-msg-brand::before,
.mfrs-msg-brand::after {
  content: '';
  position: absolute;
  z-index: -1;
  pointer-events: none;
}

.mfrs-msg-brand::before {
  inset: 0;
  background:
    linear-gradient(90deg, transparent 0 31%, rgba(151, 117, 76, 0.12) 31% 31.2%, transparent 31.2% 68.8%, rgba(151, 117, 76, 0.12) 68.8% 69%, transparent 69%),
    repeating-linear-gradient(90deg, transparent 0 31px, rgba(54, 95, 90, 0.055) 31px 32px);
}

.mfrs-msg-brand::after {
  inset: 6px;
  border: 1px solid rgba(105, 30, 27, 0.32);
}

.mfrs-msg-brand-eye,
.mfrs-msg-brand-seal {
  display: grid;
  place-items: center;
  width: 64px;
  height: 64px;
  color: #9f433a;
}

.mfrs-msg-brand-eye svg,
.mfrs-msg-brand-seal svg {
  display: block;
  width: 58px;
  height: 58px;
  overflow: visible;
}

.mfrs-msg-brand-eye-orbit,
.mfrs-msg-brand-seal-rotor {
  transform-box: fill-box;
  transform-origin: center;
  animation-play-state: paused;
}

.mfrs-msg-brand-eye-orbit {
  animation: mfrs-msg-brand-eye-spin 9s linear infinite;
  animation-play-state: paused;
}

.mfrs-msg-brand-eye-lid {
  fill: rgba(47, 15, 14, 0.92);
  stroke: #9f433a;
  stroke-width: 1.4;
}

.mfrs-msg-brand-eye-iris {
  fill: #711f1b;
  stroke: #c27855;
  stroke-width: 1.2;
}

.mfrs-msg-brand-eye-pupil { fill: #050303; }
.mfrs-msg-brand-eye-glint { fill: #d8c4a6; }

.mfrs-msg-brand-seal-rotor {
  animation: mfrs-msg-brand-seal-spin 18s linear infinite reverse;
  animation-play-state: paused;
}

.mfrs-msg-brand-seal-core {
  fill: rgba(46, 13, 12, 0.92);
  stroke: #a8463c;
  stroke-width: 1.4;
}

.mfrs-msg-brand-seal-mark {
  fill: none;
  stroke: #c59a68;
  stroke-width: 1.3;
  stroke-linecap: square;
}

.mfrs-msg-brand-center {
  min-width: 0;
  display: grid;
  grid-template-columns: minmax(132px, 0.72fr) minmax(0, 1.28fr);
  align-items: center;
  gap: 16px;
}

.mfrs-msg-brand-wordmark {
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  color: #d9c8ad;
}

.mfrs-msg-brand-kicker {
  margin-bottom: 2px;
  color: #6d9b91;
  font-size: 11px;
  line-height: 1.2;
}

.mfrs-msg-brand-wordmark strong {
  color: #e0d4bd;
  font-family: 'Noto Serif SC', 'SimSun', serif;
  font-size: 22px;
  line-height: 1.1;
  font-weight: 800;
  text-shadow: 0 0 12px rgba(143, 52, 45, 0.34);
}

.mfrs-msg-brand-subtitle {
  margin-top: 3px;
  color: #8c7562;
  font-size: 9px;
  line-height: 1.2;
}

.mfrs-msg-brand-meta {
  min-width: 0;
  margin: 0;
  display: grid;
  grid-template-columns: minmax(78px, 0.7fr) minmax(110px, 1.3fr);
  gap: 6px 12px;
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
  color: #6f918a;
  font-size: 10px;
}

.mfrs-msg-brand-meta dd {
  min-width: 0;
  color: #cdbdad;
  font-size: 11px;
  line-height: 1.35;
  overflow-wrap: anywhere;
}

.mfrs-msg-brand-location { grid-column: 1 / -1; }

.mes[is_user="false"]:not(.last_mes) .mfrs-msg-brand .mfrs-msg-brand-eye-orbit,
.mes[is_user="false"]:not(.last_mes) .mfrs-msg-brand .mfrs-msg-brand-seal-rotor {
  animation-play-state: paused;
}

.mes.last_mes[is_user="false"] .mfrs-msg-brand .mfrs-msg-brand-eye-orbit,
.mes.last_mes[is_user="false"] .mfrs-msg-brand .mfrs-msg-brand-seal-rotor {
  animation-play-state: running;
}

@keyframes mfrs-msg-brand-reveal {
  from { opacity: 0; filter: contrast(0.72) brightness(0.72); }
  to { opacity: 1; filter: contrast(1) brightness(1); }
}

@keyframes mfrs-msg-brand-eye-spin {
  to { transform: rotate(360deg); }
}

@keyframes mfrs-msg-brand-seal-spin {
  to { transform: rotate(360deg); }
}

@media (prefers-reduced-motion: reduce) {
  .mfrs-msg-brand,
  .mfrs-msg-brand-eye-orbit,
  .mfrs-msg-brand-seal-rotor {
    animation: none !important;
  }
}

@media (max-width: 520px) {
  .mfrs-msg-brand {
    grid-template-columns: 48px minmax(0, 1fr) 48px;
    gap: 8px;
    min-height: 104px;
    padding: 10px 8px;
  }

  .mfrs-msg-brand-eye,
  .mfrs-msg-brand-seal {
    width: 48px;
    height: 48px;
  }

  .mfrs-msg-brand-eye svg,
  .mfrs-msg-brand-seal svg {
    width: 44px;
    height: 44px;
  }

  .mfrs-msg-brand-center {
    grid-template-columns: 1fr;
    gap: 6px;
  }

  .mfrs-msg-brand-wordmark strong { font-size: 18px; }
  .mfrs-msg-brand-subtitle { display: none; }
  .mfrs-msg-brand-meta { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 3px 8px; }
  .mfrs-msg-brand-meta > div { display: block; }
  .mfrs-msg-brand-meta dt { display: inline; margin-right: 4px; }
  .mfrs-msg-brand-meta dd { display: inline; font-size: 10px; }
}

/* 连续档案面板：单一外框，内部只用分隔线组织信息 */
.mfrs-msg-panel {
  --mfrs-panel-corpse: var(--mfrs-corpse-cyan, #5f8f86);
  --mfrs-panel-brass: var(--mfrs-aged-brass, #9c784a);
  --mfrs-panel-bone: var(--mfrs-bone-white, #ded4bd);
  --mfrs-panel-blood: var(--mfrs-blood-red, #9f342f);
  color: var(--mfrs-panel-bone);
  background:
    repeating-linear-gradient(0deg, rgba(222, 212, 189, 0.018) 0 1px, transparent 1px 4px),
    linear-gradient(100deg, rgba(95, 143, 134, 0.055), transparent 32%),
    #0b0d0c;
  margin-top: 16px;
  padding: 0;
  border: 1px solid color-mix(in srgb, var(--mfrs-panel-brass) 72%, #111 28%);
  box-shadow:
    0 8px 22px rgba(0, 0, 0, 0.34),
    inset 3px 0 0 rgba(95, 143, 134, 0.22);
  overflow: hidden;
  position: relative;
}

.mfrs-msg-panel::before {
  content: '';
  position: absolute;
  inset: 0 auto 0 13px;
  width: 1px;
  background:
    repeating-linear-gradient(180deg, var(--mfrs-panel-blood) 0 5px, transparent 5px 10px);
  pointer-events: none;
  opacity: 0.58;
}

.mfrs-msg-panel > * {
  position: relative;
  z-index: 1;
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
  border-bottom: 1px solid rgba(156, 120, 74, 0.38);
  background: rgba(5, 7, 7, 0.54);
}

.mfrs-msg-tab {
  min-width: 0;
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
  border-bottom: 1px solid rgba(156, 120, 74, 0.34);
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
  border-left: 1px solid rgba(156, 120, 74, 0.22);
  padding-left: 22px;
}

/* 连续档案分区 */
.mfrs-msg-section {
  margin: 0;
  padding: 15px 0 17px;
  border-top: 1px solid rgba(156, 120, 74, 0.22);
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
  color: #c8c0ad;
  border-bottom: 1px dotted rgba(156, 120, 74, 0.18);
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
  background: rgba(222, 212, 189, 0.08);
  overflow: hidden;
  border: 1px solid rgba(156, 120, 74, 0.18);
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

/* 行动建议：档案选项条，只填充输入框 */
.mfrs-msg-actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.mfrs-msg-action-btn {
  display: flex;
  align-items: center;
  background: rgba(222, 212, 189, 0.035);
  color: var(--mfrs-panel-bone);
  border: 1px solid rgba(156, 120, 74, 0.28);
  border-left: 3px solid var(--mfrs-panel-brass);
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
    border-top: 1px solid rgba(156, 120, 74, 0.22);
  }
  .mfrs-msg-header { grid-template-columns: 1fr; gap: 8px; }
  .mfrs-msg-npc-item { align-items: flex-start; flex-direction: column; gap: 2px; }
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
    cleanupOwnedMessageUi();
    style.remove();
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
    observedChatContainer = doc.querySelector('#chat') || doc.body;
    observerEnabled = true;
    resumeMessageObserver();
    processAllMessages();
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

  const cleanup = () => {
    if (disposed) return;
    disposed = true;
    clearChatChangedTimers();
    deactivateMessagePanelRuntime();
    chatChangedSubscription?.stop();
    chatChangedSubscription = null;
    doc.removeEventListener('click', handleTabClick, true);
    doc.removeEventListener('keydown', handleTabKeydown, true);
    doc.removeEventListener('click', handleActionClick, true);
    window.removeEventListener('pagehide', cleanup);
    messageObserver = null;
    observedChatContainer = null;
    if (hostWindow.__mfrsMessagePanelCleanup__ === cleanup) {
      delete hostWindow.__mfrsMessagePanelCleanup__;
    }
  };

  hostWindow.__mfrsMessagePanelCleanup__ = cleanup;
  window.addEventListener('pagehide', cleanup, { once: true });
  chatChangedSubscription = eventOn(tavern_events.CHAT_CHANGED, handleChatChanged);
  activateMessagePanelRuntime();
  if (!runtimeActive) handleChatChanged();

  console.info('[消息内面板] 已注入消息内状态面板系统');
});
