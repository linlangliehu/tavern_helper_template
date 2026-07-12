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

function buildActionsHtml(data: StatusData): string {
  const suggestions = Array.isArray(data.行动建议) ? data.行动建议 : [];
  if (!suggestions.length) return '<div class="mfrs-msg-empty">暂无拟办意见</div>';
  return suggestions
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
      return `<button type="button" class="mfrs-msg-action-btn" data-action="${_.escape(actionValue)}"><span class="mfrs-msg-action-key">${_.escape(optionKey)}</span><span class="mfrs-msg-action-body"><span class="mfrs-msg-action-label">${_.escape(actionText)}</span>${metaParts.length ? `<span class="mfrs-msg-action-meta">${_.escape(metaParts.join('｜'))}</span>` : ''}</span></button>`;
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
    { id: 'cabinet', label: '柜', icon: 'fa-box-archive' },
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
      <div class="mfrs-msg-section mfrs-msg-section-full mfrs-msg-actions-block">
        <div class="mfrs-msg-section-title"><i class="fa-solid fa-list-check" aria-hidden="true"></i><span>拟办意见</span></div>
        <div class="mfrs-msg-actions">${buildActionsHtml(data)}</div>
      </div>
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

/** 处理 AI 消息（注入面板 + 包装叙事）。沉浸态只维护最新楼，避免长聊天全量 DOM 重建卡顿 */
function processAllMessages(options: { fullHistory?: boolean } = {}) {
  const fullHistory = options.fullHistory === true || !isHudMounted();
  withMessageObserverPaused(() => {
    cleanupUserMessages();
    if (fullHistory) {
      const messages = doc.querySelectorAll('.mes:not(.user)');
      messages.forEach(mes => {
        injectBrandForMessage(mes);
        wrapNarrativeText(mes);
        injectPanelForMessage(mes);
        composeTriCenter(mes);
      });
    } else {
      const last = getLatestAiMessageElement();
      if (last) {
        injectBrandForMessage(last);
        wrapNarrativeText(last);
        injectPanelForMessage(last);
        composeTriCenter(last);
      }
    }
  });
  refreshHudPanels();
}

function processOneMessage(messageId: number | string) {
  withMessageObserverPaused(() => {
    const target = Array.from(doc.querySelectorAll('.mes:not(.user)')).find(
      mes => mes.getAttribute('mesid') === String(messageId),
    );
    if (!target) return;
    injectBrandForMessage(target);
    wrapNarrativeText(target);
    injectPanelForMessage(target);
    composeTriCenter(target);
  });
  refreshHudPanels();
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
  // 沉浸态少打几轮全量刷新，降低生成结束时的主线程尖峰
  const delays = isHudMounted() ? [250, 1200] : [200, 800, 2000, 4000];
  delays.forEach(scheduleProcessAllMessages);
}

function scheduleIdleRefresh(delay = 800) {
  if (idleRefreshTimer !== undefined) {
    hostWindow.clearTimeout(idleRefreshTimer);
  }
  // 沉浸态 Mutation 更密，加长 debounce
  const wait = isHudMounted() ? Math.max(delay, 1200) : delay;
  idleRefreshTimer = hostWindow.setTimeout(() => {
    idleRefreshTimer = undefined;
    processAllMessages();
  }, wait);
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
  const expandBtn = doc.querySelector(
    '#mfrs-fixed-frontend-slot button[aria-expanded="false"], .acu-wrapper button[aria-expanded="false"]',
  ) as HTMLElement | null;
  expandBtn?.click();
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
  if (nav === 'cabinet') {
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
let hudBodyOverflowPrev = '';
let hudShellEventsBound = false;
let hudKeydownBound = false;
let hudActiveView: 'story' | 'dossier' | 'relation' | 'cabinet' = 'story';
let hudPanelsRenderKey = '';

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
#${HUD_SHELL_ID} .mfrs-hud-top {
  grid-area: top;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  min-height: 44px;
  padding: 8px 14px;
  border-bottom: 1px dashed color-mix(in srgb, var(--mfrs-corpse-cyan) 55%, transparent);
  background: rgba(6, 8, 8, 0.92);
}
#${HUD_SHELL_ID} .mfrs-hud-top-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 14px;
  min-width: 0;
  flex: 1;
}
#${HUD_SHELL_ID} .mfrs-hud-chip {
  display: inline-flex;
  align-items: baseline;
  gap: 6px;
  min-height: 28px;
  font-size: 12px;
  letter-spacing: 0.04em;
}
#${HUD_SHELL_ID} .mfrs-hud-chip span { color: color-mix(in srgb, var(--mfrs-bone-white) 45%, #666); }
#${HUD_SHELL_ID} .mfrs-hud-chip b { color: var(--mfrs-bone-white); font-weight: 700; }
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
  gap: 8px;
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
#${HUD_SHELL_ID} .mfrs-hud-relation-panel {
  flex: 1 1 auto;
  min-height: 0;
  overflow: auto;
  padding: 12px 14px;
  background: rgba(8, 10, 10, 0.96);
}
#${HUD_SHELL_ID} .mfrs-hud-relation-panel[hidden],
#${HUD_SHELL_ID} .mfrs-hud-chat-host[hidden] {
  display: none !important;
}
#${HUD_SHELL_ID} .mfrs-hud-actions {
  flex: 0 0 auto;
  max-height: 38vh;
  overflow: auto;
  border-top: 1px solid color-mix(in srgb, var(--mfrs-corpse-cyan) 34%, transparent);
  background: rgba(7, 9, 9, 0.96);
}
#${HUD_SHELL_ID} .mfrs-hud-actions > summary {
  list-style: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 40px;
  padding: 8px 12px;
  font-size: 12px;
  letter-spacing: 0.1em;
  color: color-mix(in srgb, var(--mfrs-bone-white) 78%, #888);
  user-select: none;
}
#${HUD_SHELL_ID} .mfrs-hud-actions > summary::-webkit-details-marker { display: none; }
#${HUD_SHELL_ID} .mfrs-hud-actions-body {
  padding: 0 10px 10px;
}
#${HUD_SHELL_ID} .mfrs-hud-left.is-emphasis {
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--mfrs-corpse-cyan) 70%, transparent);
  background: rgba(12, 18, 17, 0.94);
}
#${HUD_SHELL_ID} .mfrs-hud-dossier .mfrs-msg-fold {
  margin: 0 0 8px;
  border: 1px solid color-mix(in srgb, var(--mfrs-corpse-cyan) 28%, transparent);
  background: rgba(10, 12, 12, 0.55);
}
#${HUD_SHELL_ID} .mfrs-hud-dossier .mfrs-msg-fold-summary {
  min-height: 36px;
  padding: 6px 8px;
}
#${HUD_SHELL_ID} .mfrs-hud-dossier .mfrs-msg-fold-body {
  padding: 6px 8px 8px;
}
#${HUD_SHELL_ID} .mfrs-hud-actions .mfrs-msg-action-btn {
  width: 100%;
  margin: 0 0 6px;
}
#${HUD_SHELL_ID} .mfrs-hud-composer {
  flex: 0 0 auto;
  min-width: 0;
  border-top: 1px solid color-mix(in srgb, var(--mfrs-corpse-cyan) 40%, transparent);
  background: transparent;
}
/* 原生 #send_form 嵌进中栏底部，保留酒馆原控件/样式 */
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
}
#${HUD_SHELL_ID} .mfrs-hud-composer #send_textarea {
  width: 100%;
  max-width: 100%;
}
#${HUD_SHELL_ID} .mfrs-hud-nav-btn {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  min-height: 44px;
  padding: 8px 12px;
  border: 1px solid color-mix(in srgb, var(--mfrs-corpse-cyan) 40%, transparent);
  border-radius: 0;
  background: transparent;
  color: var(--mfrs-bone-white);
  cursor: pointer;
  font: inherit;
  font-size: 13px;
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
#${HUD_SHELL_ID} .mfrs-hud-tavern-menu {
  display: none;
  position: absolute;
  top: calc(100% + 6px);
  right: 0;
  z-index: ${HUD_Z_MENU};
  width: min(360px, 92vw);
  max-height: min(70vh, 640px);
  overflow: auto;
  padding: 10px;
  border: 1px solid color-mix(in srgb, var(--mfrs-corpse-cyan) 65%, transparent);
  background: rgba(8, 10, 10, 0.98);
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.5);
}
#${HUD_SHELL_ID}.is-tavern-menu-open .mfrs-hud-tavern-menu { display: block; }
#${HUD_SHELL_ID} .mfrs-hud-menu-section {
  margin: 0 0 10px;
}
#${HUD_SHELL_ID} .mfrs-hud-menu-section:last-child { margin-bottom: 0; }
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
#${HUD_SHELL_ID} .mfrs-hud-menu-item:hover {
  border-color: var(--mfrs-corpse-cyan);
  background: color-mix(in srgb, var(--mfrs-corpse-cyan) 22%, #0a0b0b);
}
#${HUD_SHELL_ID} .mfrs-hud-menu-item:disabled,
#${HUD_SHELL_ID} .mfrs-hud-menu-item.is-disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
#${HUD_SHELL_ID} .mfrs-hud-menu-item.is-wide {
  grid-column: 1 / -1;
}
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
/* 沉浸内叠 ST 配置：不退出壳，只抬高打开的抽屉/弹窗 */
body.${HUD_ST_UI_CLASS} #${HUD_SHELL_ID}.is-active {
  opacity: 1;
  pointer-events: auto;
}
body.${HUD_ST_UI_CLASS} #top-bar {
  z-index: ${HUD_Z_SHELL + 55} !important;
  pointer-events: auto !important;
}
body.${HUD_ST_UI_CLASS} .drawer-content.openDrawer,
body.${HUD_ST_UI_CLASS} #left-nav-panel.openDrawer,
body.${HUD_ST_UI_CLASS} #right-nav-panel.openDrawer,
body.${HUD_ST_UI_CLASS} #floatingPrompt,
body.${HUD_ST_UI_CLASS} #cfgConfig,
body.${HUD_ST_UI_CLASS} #logprobsViewer,
body.${HUD_ST_UI_CLASS} #completion_prompt_manager_popup,
body.${HUD_ST_UI_CLASS} .popup,
body.${HUD_ST_UI_CLASS} .dialogue_popup {
  position: fixed !important;
  z-index: ${HUD_Z_SHELL + 60} !important;
  pointer-events: auto !important;
  max-height: 100vh;
  overflow: auto;
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
  background: rgba(8, 10, 10, 0.98);
  border: 1px solid color-mix(in srgb, #3d6b66 70%, transparent);
  box-shadow: 0 -8px 28px rgba(0, 0, 0, 0.45);
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
body.${HUD_BODY_CLASS} .mfrs-msg-actions-block {
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
@media (prefers-reduced-motion: reduce) {
  #${HUD_SHELL_ID} *,
  #${HUD_SHELL_ID} *::before,
  #${HUD_SHELL_ID} *::after { transition: none !important; animation: none !important; }
}
`;
}

function ensureHudShell(): HTMLElement {
  ensureHudStyle();
  let shell = doc.getElementById(HUD_SHELL_ID) as HTMLElement | null;
  if (shell) return shell;

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
    <button type="button" class="mfrs-hud-tool-btn" data-mfrs-hud="tavern-menu" aria-haspopup="menu" aria-expanded="false" title="酒馆菜单">酒馆菜单</button>
    <button type="button" class="mfrs-hud-exit" data-mfrs-hud="exit" title="退出沉浸 (Ctrl+Shift+G)">退出沉浸</button>
    <div class="mfrs-hud-tavern-menu" data-mfrs-hud="tavern-menu-panel" role="menu" aria-label="酒馆功能菜单"></div>
  </div>
</header>
<aside class="mfrs-hud-left" data-mfrs-hud="left" aria-label="现场档案">
  <p class="mfrs-hud-left-title">现场档案</p>
  <div class="mfrs-hud-dossier" data-mfrs-hud="dossier-slot"></div>
</aside>
<section class="mfrs-hud-center">
  <div class="mfrs-hud-chat-host" data-mfrs-hud="chat-host"></div>
  <div class="mfrs-hud-relation-panel" data-mfrs-hud="relation-slot" hidden></div>
  <details class="mfrs-hud-actions" data-mfrs-hud="actions" open>
    <summary><i class="fa-solid fa-list-check" aria-hidden="true"></i><span>拟办意见</span></summary>
    <div class="mfrs-hud-actions-body" data-mfrs-hud="actions-slot"></div>
  </details>
  <div class="mfrs-hud-composer" data-mfrs-hud="composer" aria-label="酒馆原生输入区"></div>
</section>
<aside class="mfrs-hud-right" data-mfrs-hud="right" aria-label="现场导航">
  <button type="button" class="mfrs-hud-nav-btn is-active" data-mfrs-hud-nav="story"><i class="fa-solid fa-align-left" aria-hidden="true"></i><span>正文</span></button>
  <button type="button" class="mfrs-hud-nav-btn" data-mfrs-hud-nav="dossier"><i class="fa-solid fa-folder-open" aria-hidden="true"></i><span>档案</span></button>
  <button type="button" class="mfrs-hud-nav-btn" data-mfrs-hud-nav="relation"><i class="fa-solid fa-users" aria-hidden="true"></i><span>关系</span></button>
  <button type="button" class="mfrs-hud-nav-btn" data-mfrs-hud-nav="cabinet"><i class="fa-solid fa-box-archive" aria-hidden="true"></i><span>柜</span></button>
  <button type="button" class="mfrs-hud-nav-btn is-disabled" data-mfrs-hud-nav="settings" disabled aria-disabled="true" title="二期"><i class="fa-solid fa-gear" aria-hidden="true"></i><span>设置</span></button>
</aside>
<button type="button" class="mfrs-hud-drawer-mask" data-mfrs-hud="drawer-mask" aria-label="关闭侧栏"></button>
<button type="button" class="mfrs-hud-cabinet-mask" data-mfrs-hud="cabinet-mask" aria-label="关闭档案柜"></button>
<div class="mfrs-hud-cabinet-chrome" data-mfrs-hud="cabinet-chrome">
  <span>档案柜 · 仅沉浸内展开</span>
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

/** 仅代理 ST 顶栏抽屉（截图 141154）；☰选项 / ✨扩展 已在原生输入条，不重复 */
function getHudTavernMenuSections(): HudTavernMenuSection[] {
  return [
    {
      title: '酒馆顶栏',
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
        },
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
          label: '用户设置',
          action: {
            kind: 'click',
            selectors: ['[title="用户设置"]', '.drawer-icon.fa-user-cog', '#user-settings-button'],
            label: '用户设置',
            yieldUi: true,
          },
        },
        {
          label: '扩展程序',
          action: {
            kind: 'click',
            selectors: ['[title="扩展程序"].drawer-icon', '#extensions-settings-button', '.drawer-icon.fa-cubes'],
            label: '扩展程序',
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
          label: '角色管理',
          action: {
            kind: 'click',
            selectors: ['#rightNavDrawerIcon', '[title="角色管理"]', '.drawer-icon.fa-address-card'],
            label: '角色管理',
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

/** 在沉浸壳上叠加 ST 抽屉/弹窗，不退出全屏 */
function yieldHudToStUi() {
  if (!isHudMounted()) return;
  closeHudTavernMenu();
  ensureHudStReturnButton();
  doc.body.classList.add(HUD_ST_UI_CLASS);
}

function closeOpenStDrawers() {
  const openPanels = Array.from(
    doc.querySelectorAll(
      '.drawer-content.openDrawer, #left-nav-panel.openDrawer, #right-nav-panel.openDrawer',
    ),
  ) as HTMLElement[];
  openPanels.forEach(panel => {
    const drawer = panel.closest('.drawer') as HTMLElement | null;
    const icon =
      (drawer?.querySelector('.drawer-icon') as HTMLElement | null) ||
      (drawer?.querySelector('[data-toggle="drawer"]') as HTMLElement | null);
    try {
      icon?.click();
    } catch {
      panel.classList.remove('openDrawer');
      panel.classList.add('closedDrawer');
    }
  });
}

function restoreHudFromStUi() {
  closeOpenStDrawers();
  doc.body.classList.remove(HUD_ST_UI_CLASS);
  const shell = doc.getElementById(HUD_SHELL_ID);
  if (shell?.classList.contains('is-active')) {
    shell.style.removeProperty('z-index');
    shell.style.removeProperty('opacity');
    shell.style.removeProperty('pointer-events');
  }
}

function closeHudTavernMenu() {
  const shell = doc.getElementById(HUD_SHELL_ID);
  if (!shell) return;
  shell.classList.remove('is-tavern-menu-open');
  const toggle = shell.querySelector('[data-mfrs-hud="tavern-menu"]') as HTMLElement | null;
  toggle?.setAttribute('aria-expanded', 'false');
}

function renderHudTavernMenu(shell: Element) {
  const panel = shell.querySelector('[data-mfrs-hud="tavern-menu-panel"]');
  if (!panel) return;
  const sections = getHudTavernMenuSections();
  panel.innerHTML = sections
    .map(section => {
      const items = section.items
        .map(item => {
          const wide = item.wide ? ' is-wide' : '';
          const payload = encodeURIComponent(JSON.stringify(item.action));
          return `<button type="button" class="mfrs-hud-menu-item${wide}" data-mfrs-hud-menu-action="${payload}" role="menuitem">${_.escape(item.label)}</button>`;
        })
        .join('');
      return `<section class="mfrs-hud-menu-section"><p class="mfrs-hud-menu-title">${_.escape(section.title)}</p><div class="mfrs-hud-menu-grid">${items}</div></section>`;
    })
    .join('');
}

function openHudTavernMenu() {
  const shell = doc.getElementById(HUD_SHELL_ID);
  if (!shell) return;
  renderHudTavernMenu(shell);
  shell.classList.add('is-tavern-menu-open');
  shell.querySelector('[data-mfrs-hud="tavern-menu"]')?.setAttribute('aria-expanded', 'true');
}

function toggleHudTavernMenu() {
  const shell = doc.getElementById(HUD_SHELL_ID);
  if (!shell) return;
  if (shell.classList.contains('is-tavern-menu-open')) closeHudTavernMenu();
  else openHudTavernMenu();
}

function runHudTavernAction(action: HudTavernAction) {
  if (action.kind === 'exit') {
    closeHudTavernMenu();
    exitHudImmersive();
    return;
  }
  if (action.kind === 'cabinet') {
    closeHudTavernMenu();
    setHudView('cabinet');
    return;
  }
  if (action.kind === 'continue') {
    closeHudTavernMenu();
    const target = findHudActionTarget(['#option_continue', '#mes_continue']);
    target?.click();
    return;
  }
  if (action.kind === 'regenerate') {
    closeHudTavernMenu();
    const target = findHudActionTarget(['#option_regenerate']);
    target?.click();
    return;
  }
  if (action.kind === 'stop') {
    closeHudTavernMenu();
    const target = findHudActionTarget(['#mes_stop', '#stscript_stop']);
    target?.click();
    return;
  }
  if (action.kind === 'click') {
    const target = findHudActionTarget(action.selectors, action.matchText);
    if (!target) {
      console.warn(`[消息内面板] 酒馆菜单未找到入口: ${action.label}`);
      return;
    }
    closeHudTavernMenu();
    if (action.yieldUi) yieldHudToStUi();
    hostWindow.setTimeout(() => {
      try {
        target.click();
      } catch (error) {
        console.warn(`[消息内面板] 酒馆菜单点击失败: ${action.label}`, error);
      }
    }, 0);
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

function buildHudDossierHtml(data: StatusData): string {
  const base = buildDossierSectionsHtml(data).replace(
    /<details class="mfrs-msg-fold" data-fold="resource"[\s\S]*?<\/details>/,
    '',
  );
  return `${base}${buildHudResourceSectionsHtml(data)}`;
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
    const node = shell.querySelector(`[data-mfrs-hud-chip="${key}"]`);
    if (node) node.textContent = value;
  });
}

function applyHudCenterView(shell: Element, view: typeof hudActiveView) {
  const chatHost = shell.querySelector('[data-mfrs-hud="chat-host"]') as HTMLElement | null;
  const relation = shell.querySelector('[data-mfrs-hud="relation-slot"]') as HTMLElement | null;
  const left = shell.querySelector('[data-mfrs-hud="left"]') as HTMLElement | null;
  const showRelation = view === 'relation';
  if (chatHost) chatHost.hidden = showRelation;
  if (relation) relation.hidden = !showRelation;
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
  return Boolean(doc.getElementById(FIXED_HOST_ID)?.classList.contains('mfrs-hud-cabinet-open'));
}

function setHudView(view: typeof hudActiveView) {
  hudActiveView = view;
  const shell = doc.getElementById(HUD_SHELL_ID);
  if (!shell) return;
  setHudNavActive(view === 'cabinet' ? 'cabinet' : view);
  applyHudCenterView(shell, view === 'cabinet' ? 'story' : view);
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
  if (view === 'relation') {
    closeHudCabinetLayer();
    closeHudSideDrawers();
    return;
  }
  if (view === 'cabinet') {
    closeHudSideDrawers();
    openHudCabinetLayer();
  }
}

function refreshHudPanels(force = false) {
  if (!isHudMounted()) return;
  const shell = doc.getElementById(HUD_SHELL_ID);
  if (!shell) return;
  const data = readLatestHudStatusData();
  const renderKey = getPanelRenderKey(data);
  if (!force && renderKey === hudPanelsRenderKey) {
    applyHudCenterView(shell, hudActiveView === 'cabinet' ? 'story' : hudActiveView);
    return;
  }
  hudPanelsRenderKey = renderKey;
  applyHudTopChips(shell, data);

  const dossierSlot = shell.querySelector('[data-mfrs-hud="dossier-slot"]');
  if (dossierSlot) dossierSlot.innerHTML = buildHudDossierHtml(data);

  const actionsSlot = shell.querySelector('[data-mfrs-hud="actions-slot"]');
  if (actionsSlot) actionsSlot.innerHTML = buildActionsHtml(data);

  const relationSlot = shell.querySelector('[data-mfrs-hud="relation-slot"]');
  if (relationSlot) relationSlot.innerHTML = buildRelationTabHtml(data);

  applyHudCenterView(shell, hudActiveView === 'cabinet' ? 'story' : hudActiveView);
  setHudNavActive(hudActiveView === 'cabinet' ? 'cabinet' : hudActiveView);
}

function closeHudCabinetLayer() {
  const shell = doc.getElementById(HUD_SHELL_ID);
  const host = doc.getElementById(FIXED_HOST_ID);
  host?.classList.remove('mfrs-hud-cabinet-open');
  shell?.classList.remove('is-cabinet-open');
  if (hudActiveView === 'cabinet') {
    hudActiveView = 'story';
    if (shell) {
      setHudNavActive('story');
      applyHudCenterView(shell, 'story');
    }
  }
}

function openHudCabinetLayer() {
  const shell = doc.getElementById(HUD_SHELL_ID);
  const host = doc.getElementById(FIXED_HOST_ID);
  if (!host) {
    openArchiveCabinet();
    return;
  }
  closeHudSideDrawers();
  host.classList.add('mfrs-hud-cabinet-open');
  shell?.classList.add('is-cabinet-open');
  const expandBtn = host.querySelector(
    'button[aria-expanded="false"]',
  ) as HTMLElement | null;
  expandBtn?.click();
  try {
    host.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  } catch {
    // ignore
  }
}

function handleHudShellClick(e: Event) {
  const target = e.target as HTMLElement | null;
  if (!target) return;

  const shell = target.closest?.(`#${HUD_SHELL_ID}`);
  if (
    isHudMounted() &&
    !target.closest?.('[data-mfrs-hud="tavern-menu"], [data-mfrs-hud="tavern-menu-panel"]')
  ) {
    closeHudTavernMenu();
  }
  if (!shell) return;

  if (target.closest('[data-mfrs-hud="exit"]')) {
    e.preventDefault();
    exitHudImmersive();
    return;
  }
  if (target.closest('[data-mfrs-hud="tavern-menu"]')) {
    e.preventDefault();
    e.stopPropagation();
    toggleHudTavernMenu();
    return;
  }
  const menuActionBtn = target.closest('[data-mfrs-hud-menu-action]') as HTMLElement | null;
  if (menuActionBtn) {
    e.preventDefault();
    e.stopPropagation();
    const raw = menuActionBtn.getAttribute('data-mfrs-hud-menu-action');
    if (!raw) return;
    try {
      const action = JSON.parse(decodeURIComponent(raw)) as HudTavernAction;
      runHudTavernAction(action);
    } catch (error) {
      console.warn('[消息内面板] 酒馆菜单动作解析失败', error);
    }
    return;
  }
  if (target.closest('[data-mfrs-hud="cabinet-close"], [data-mfrs-hud="cabinet-mask"]')) {
    e.preventDefault();
    closeHudCabinetLayer();
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
  const nav = navBtn.getAttribute('data-mfrs-hud-nav');
  if (!nav) return;
  e.preventDefault();
  closeHudTavernMenu();
  if (nav === 'story' || nav === 'dossier' || nav === 'relation' || nav === 'cabinet') {
    setHudView(nav);
    if (nav !== 'dossier' && hostWindow.matchMedia?.('(max-width: 800px)')?.matches) {
      if (nav === 'story' || nav === 'relation') closeHudSideDrawers();
      if (nav === 'cabinet') closeHudSideDrawers();
    }
  }
}

function handleHudKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape' && isHudMounted()) {
    if (doc.body.classList.contains(HUD_ST_UI_CLASS)) {
      e.preventDefault();
      restoreHudFromStUi();
      return;
    }
    const shell = doc.getElementById(HUD_SHELL_ID);
    if (shell?.classList.contains('is-tavern-menu-open')) {
      e.preventDefault();
      closeHudTavernMenu();
      return;
    }
    if (isHudCabinetOpen()) {
      e.preventDefault();
      closeHudCabinetLayer();
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
  closeHudCabinetLayer();
  closeHudSideDrawers();
  bindHudShellEvents();
  rebindMessageObserverToChat();
  if (hudActiveView === 'cabinet') hudActiveView = 'story';
  refreshHudPanels(true);
  setHudView(hudActiveView === 'relation' || hudActiveView === 'dossier' ? hudActiveView : 'story');
}

function unmountHudImmersive() {
  const shell = doc.getElementById(HUD_SHELL_ID);
  const chat = getChatElement();
  closeHudCabinetLayer();
  closeHudTavernMenu();
  restoreHudFromStUi();

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
  shell?.classList.remove('is-left-open', 'is-right-open', 'is-cabinet-open', 'is-tavern-menu-open');
  doc.getElementById('mfrs-hud-st-return')?.remove();
  rebindMessageObserverToChat();
  // 退出沉浸后补一次全历史 α 面板（沉浸态只维护最新楼）
  scheduleProcessAllMessages(0);
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
  doc.getElementById(HUD_SHELL_ID)?.remove();
  doc.getElementById(HUD_STYLE_ID)?.remove();
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

/* 行动建议：档案选项条，只填充输入框 */
.mfrs-msg-actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
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
    unmountHudImmersive();
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
