const statusContainerId = 'mfrs-fixed-status-host';
const statusSummaryId = 'mfrs-fixed-status-summary';
const statusDetailId = 'mfrs-fixed-status-detail';
const expandedStorageKey = 'mfrs_fixed_status_expanded';

type StatusData = Record<string, any>;
type HostWindow = Window & {
  MysteryDatabaseFrontend?: {
    openStatus?: () => unknown | Promise<unknown>;
    openDashboard?: () => unknown | Promise<unknown>;
    openPanel?: () => unknown | Promise<unknown>;
  };
};

function getSendForm() {
  return document.querySelector('#send_form') ?? document.querySelector('#form_sheld');
}

function readLatestStatus(): StatusData {
  try {
    return _.get(getVariables({ type: 'message', message_id: 'latest' }), 'stat_data', {}) ?? {};
  } catch {
    return {};
  }
}

function valueText(value: unknown, fallback = '未知') {
  const text = String(value ?? '').trim();
  return text || fallback;
}

// 从任意值里抽出第一个数字（如 "72/100" -> 72、"40%" -> 40）；无数字返回 null
function toNumber(value: unknown): number | null {
  const match = String(value ?? '').match(/-?\d+(?:\.\d+)?/);
  return match ? Number(match[0]) : null;
}

function riskText(value: unknown, suffix = '') {
  const text = valueText(value, '0');
  return text.includes('/') || text.includes('%') ? text : `${text}${suffix}`;
}

// 风险数值 → 颜色（高红 / 中橙 / 低绿）；非数字回退为中性色
function riskColor(value: unknown): string {
  const n = toNumber(value);
  if (n === null) return '#9aa7c0';
  if (n >= 70) return '#b23a32';
  if (n >= 40) return '#e0a040';
  return '#46c0a0';
}

function clampPercent(value: unknown): number {
  const n = toNumber(value);
  if (n === null) return 0;
  return Math.max(0, Math.min(100, n));
}

function arrayItems(value: unknown): Record<string, any>[] {
  return Array.isArray(value) ? value.filter(item => item && typeof item === 'object') : [];
}

function controlledGhostList(data: StatusData): string[] {
  const runtimeGhosts = arrayItems(data.驭鬼者状态?.已驾驭厉鬼);
  const openingGhosts = arrayItems(data.驾驭厉鬼);
  const source = runtimeGhosts.length ? runtimeGhosts : openingGhosts;
  return source.map(ghost => String(ghost.代号 ?? ghost.厉鬼名称 ?? '').trim()).filter(Boolean);
}

interface StatusView {
  death: string;
  deathPct: number;
  deathColor: string;
  revive: string;
  revivePct: number;
  reviveColor: string;
  state: string;
  location: string;
  phase: string;
  ghostList: string[];
  ghostSummary: string;
  ghostCount: number;
  eventCode: string;
  eventLevel: string;
  eventPlace: string;
  eventGhostZone: string;
  eventHandle: string;
}

function buildStatusView(data: StatusData): StatusView {
  const ghostState = data.驭鬼者状态 ?? {};
  const event = data.当前灵异事件 ?? {};
  const reviveRaw = ghostState.总复苏风险 ?? data.厉鬼复苏程度;
  const ghostList = controlledGhostList(data);
  return {
    death: riskText(data.风险值, '/100'),
    deathPct: clampPercent(data.风险值),
    deathColor: riskColor(data.风险值),
    revive: riskText(reviveRaw, '%'),
    revivePct: clampPercent(reviveRaw),
    reviveColor: riskColor(reviveRaw),
    state: valueText(data.状态, '健康'),
    location: valueText(data.所在位置, '未知'),
    phase: valueText(data.主线进度?.当前阶段, '开局接入'),
    ghostList,
    ghostSummary: ghostList.length ? ghostList.slice(0, 2).join('、') : '无',
    ghostCount: ghostList.length,
    eventCode: valueText(event.事件代号, '未立案灵异事件'),
    eventLevel: valueText(event.危害等级, '未知'),
    eventPlace: valueText(event.发生地点, '未知'),
    eventGhostZone: valueText(event.鬼域状态, '未知'),
    eventHandle: valueText(event.处理状态, '未知'),
  };
}

function openFullStatus() {
  const hostWindow = (window.parent ?? window) as HostWindow;
  const frontend = hostWindow.MysteryDatabaseFrontend ?? (window as HostWindow).MysteryDatabaseFrontend;
  const open = frontend?.openStatus ?? frontend?.openDashboard ?? frontend?.openPanel;
  if (open) {
    void open.call(frontend);
    return;
  }
  console.warn('[MFRS Fixed Status] 数据库前端入口尚未加载，无法打开完整状态。');
}

function isExpanded(): boolean {
  try {
    return localStorage.getItem(expandedStorageKey) === '1';
  } catch {
    return false;
  }
}

function setExpanded(value: boolean) {
  try {
    localStorage.setItem(expandedStorageKey, value ? '1' : '0');
  } catch {
    /* localStorage 不可用时忽略，状态仍随当轮 DOM 生效 */
  }
}

// 收起态紧凑摘要行的内联 HTML（值由 renderStatus 命令式填入，不使用任何宏）
function summaryInnerHtml() {
  return `
    <span title="死亡风险">🩸<strong data-field="death" data-risk="death"></strong></span>
    <span title="复苏风险">☠️<strong data-field="revive" data-risk="revive"></strong></span>
    <span title="状态">❤️<strong data-field="state"></strong></span>
    <span title="当前驾驭厉鬼">👻<strong data-field="ghostCount"></strong></span>
    <button type="button" data-action="toggle" title="展开/收起详细状态">▾</button>
    <button type="button" data-action="open-status" title="打开 v10.2 前端里的完整状态">完整状态</button>
  `;
}

// 展开态分区折叠详情的内联 HTML（命令式填值）
function detailInnerHtml() {
  return `
    <section data-section="survival">
      <div class="mfrs-st-head">🩸 生存状态</div>
      <div class="mfrs-st-row">死亡风险 <strong data-field="d-death"></strong>
        <div class="mfrs-st-bar"><i data-bar="death"></i></div>
      </div>
      <div class="mfrs-st-row">复苏程度 <strong data-field="d-revive"></strong>
        <div class="mfrs-st-bar"><i data-bar="revive"></i></div>
      </div>
      <div class="mfrs-st-grid">
        <span>状态 <strong data-field="d-state"></strong></span>
        <span>位置 <strong data-field="d-location"></strong></span>
        <span>阶段 <strong data-field="d-phase"></strong></span>
      </div>
    </section>
    <section data-section="event">
      <div class="mfrs-st-head">👻 当前灵异事件</div>
      <div class="mfrs-st-grid">
        <span>事件 <strong data-field="e-code"></strong></span>
        <span>危害 <strong data-field="e-level"></strong></span>
        <span>地点 <strong data-field="e-place"></strong></span>
        <span>鬼域 <strong data-field="e-zone"></strong></span>
        <span>处理 <strong data-field="e-handle"></strong></span>
      </div>
    </section>
    <section data-section="ghosts">
      <div class="mfrs-st-head">🔮 驾驭厉鬼</div>
      <div class="mfrs-st-row"><strong data-field="g-list"></strong></div>
    </section>
  `;
}

function styleSummary(summaryEl: HTMLDivElement) {
  summaryEl.style.display = 'flex';
  summaryEl.style.flexWrap = 'wrap';
  summaryEl.style.gap = '6px';
  summaryEl.style.alignItems = 'center';
  summaryEl.style.padding = '7px 8px';
  summaryEl.style.color = '#d4c6bb';
  summaryEl.style.fontSize = '12px';
  summaryEl.style.lineHeight = '1.35';
  summaryEl.querySelectorAll('strong').forEach(el => {
    (el as HTMLElement).style.color = '#b23a32';
    (el as HTMLElement).style.fontWeight = '800';
    (el as HTMLElement).style.marginLeft = '3px';
  });
  summaryEl.querySelectorAll('span').forEach(item => {
    (item as HTMLElement).style.flex = '1 1 64px';
    (item as HTMLElement).style.minWidth = '0';
    (item as HTMLElement).style.overflow = 'hidden';
    (item as HTMLElement).style.textOverflow = 'ellipsis';
    (item as HTMLElement).style.whiteSpace = 'nowrap';
  });
  summaryEl.querySelectorAll('button').forEach(button => {
    button.style.border = '1px solid rgba(142, 42, 36, 0.72)';
    button.style.borderRadius = '4px';
    button.style.background = 'rgba(45, 24, 20, 0.78)';
    button.style.color = '#e1d0c4';
    button.style.padding = '4px 8px';
    button.style.cursor = 'pointer';
    button.style.whiteSpace = 'nowrap';
    button.style.fontSize = '12px';
  });
}

function styleDetail(detailEl: HTMLDivElement) {
  detailEl.style.padding = '2px 10px 8px';
  detailEl.style.borderTop = '1px solid rgba(115, 24, 24, 0.4)';
  detailEl.style.color = '#d4c6bb';
  detailEl.style.fontSize = '12px';
  detailEl.style.lineHeight = '1.6';
  detailEl.querySelectorAll<HTMLElement>('.mfrs-st-head').forEach(el => {
    el.style.fontWeight = '800';
    el.style.color = '#b23a32';
    el.style.margin = '8px 0 3px';
  });
  detailEl.querySelectorAll<HTMLElement>('.mfrs-st-row').forEach(el => {
    el.style.display = 'flex';
    el.style.alignItems = 'center';
    el.style.gap = '6px';
    el.style.margin = '2px 0';
  });
  detailEl.querySelectorAll<HTMLElement>('.mfrs-st-grid').forEach(el => {
    el.style.display = 'flex';
    el.style.flexWrap = 'wrap';
    el.style.gap = '4px 12px';
  });
  detailEl.querySelectorAll<HTMLElement>('.mfrs-st-grid span').forEach(el => {
    el.style.flex = '1 1 120px';
    el.style.minWidth = '0';
  });
  detailEl.querySelectorAll<HTMLElement>('strong').forEach(el => {
    el.style.color = '#e1d0c4';
    el.style.fontWeight = '700';
  });
  detailEl.querySelectorAll<HTMLElement>('.mfrs-st-bar').forEach(el => {
    el.style.flex = '1 1 auto';
    el.style.height = '6px';
    el.style.borderRadius = '4px';
    el.style.background = 'rgba(255, 255, 255, 0.08)';
    el.style.overflow = 'hidden';
  });
  detailEl.querySelectorAll<HTMLElement>('.mfrs-st-bar > i').forEach(el => {
    el.style.display = 'block';
    el.style.height = '100%';
    el.style.width = '0%';
    el.style.transition = 'width 0.3s ease';
  });
}

function setField(root: ParentNode, field: string, text: string) {
  const el = root.querySelector<HTMLElement>(`[data-field="${field}"]`);
  if (el) el.textContent = text;
}

function renderStatus(host: HTMLDivElement) {
  const view = buildStatusView(readLatestStatus());

  const summaryEl = host.querySelector(`#${statusSummaryId}`) as HTMLDivElement | null;
  if (summaryEl) {
    setField(summaryEl, 'death', view.death);
    setField(summaryEl, 'revive', view.revive);
    setField(summaryEl, 'state', view.state);
    setField(summaryEl, 'ghostCount', String(view.ghostCount));
    const deathField = summaryEl.querySelector<HTMLElement>('[data-risk="death"]');
    if (deathField) deathField.style.color = view.deathColor;
    const reviveField = summaryEl.querySelector<HTMLElement>('[data-risk="revive"]');
    if (reviveField) reviveField.style.color = view.reviveColor;
  }

  const detailEl = host.querySelector(`#${statusDetailId}`) as HTMLDivElement | null;
  if (detailEl) {
    setField(detailEl, 'd-death', view.death);
    setField(detailEl, 'd-revive', view.revive);
    setField(detailEl, 'd-state', view.state);
    setField(detailEl, 'd-location', view.location);
    setField(detailEl, 'd-phase', view.phase);
    setField(detailEl, 'e-code', view.eventCode);
    setField(detailEl, 'e-level', view.eventLevel);
    setField(detailEl, 'e-place', view.eventPlace);
    setField(detailEl, 'e-zone', view.eventGhostZone);
    setField(detailEl, 'e-handle', view.eventHandle);
    setField(detailEl, 'g-list', view.ghostList.length ? view.ghostList.slice(0, 5).join('、') : '无');

    const deathBar = detailEl.querySelector<HTMLElement>('[data-bar="death"]');
    if (deathBar) {
      deathBar.style.width = `${view.deathPct}%`;
      deathBar.style.background = view.deathColor;
    }
    const reviveBar = detailEl.querySelector<HTMLElement>('[data-bar="revive"]');
    if (reviveBar) {
      reviveBar.style.width = `${view.revivePct}%`;
      reviveBar.style.background = view.reviveColor;
    }
  }
}

function applyExpanded(host: HTMLDivElement) {
  const expanded = isExpanded();
  const detailEl = host.querySelector(`#${statusDetailId}`) as HTMLDivElement | null;
  if (detailEl) detailEl.style.display = expanded ? 'block' : 'none';
  const toggleBtn = host.querySelector<HTMLElement>('[data-action="toggle"]');
  if (toggleBtn) toggleBtn.textContent = expanded ? '▴' : '▾';
}

function ensureFixedStatusBar() {
  const sendForm = getSendForm();
  if (!sendForm) {
    console.warn('[MFRS Fixed Status] 找不到输入区容器，稍后重试');
    return false;
  }

  let host = document.querySelector(`#${statusContainerId}`) as HTMLDivElement | null;
  if (!host) {
    host = document.createElement('div');
    host.id = statusContainerId;
    host.style.width = '100%';
    host.style.margin = '0 auto 6px';
    host.style.border = '1px solid rgba(115, 24, 24, 0.68)';
    host.style.borderRadius = '6px';
    host.style.background = 'linear-gradient(180deg, rgba(18, 14, 13, 0.96), rgba(6, 5, 5, 0.98))';
    host.style.boxShadow = '0 0 12px rgba(0, 0, 0, 0.55)';
    host.style.overflow = 'hidden';
    sendForm.parentElement?.insertBefore(host, sendForm);
  }

  let summaryEl = host.querySelector(`#${statusSummaryId}`) as HTMLDivElement | null;
  if (!summaryEl) {
    summaryEl = document.createElement('div');
    summaryEl.id = statusSummaryId;
    summaryEl.innerHTML = summaryInnerHtml();
    styleSummary(summaryEl);
    summaryEl.querySelector('[data-action="open-status"]')?.addEventListener('click', openFullStatus);
    summaryEl.querySelector('[data-action="toggle"]')?.addEventListener('click', () => {
      setExpanded(!isExpanded());
      applyExpanded(host!);
    });
    host.append(summaryEl);
  }

  let detailEl = host.querySelector(`#${statusDetailId}`) as HTMLDivElement | null;
  if (!detailEl) {
    detailEl = document.createElement('div');
    detailEl.id = statusDetailId;
    detailEl.innerHTML = detailInnerHtml();
    styleDetail(detailEl);
    host.append(detailEl);
  }

  renderStatus(host);
  applyExpanded(host);
  return true;
}

function refreshFixedStatusBar() {
  const host = document.querySelector(`#${statusContainerId}`) as HTMLDivElement | null;
  if (host) renderStatus(host);
  else ensureFixedStatusBar();
}

function retryMount(attempt = 1) {
  if (ensureFixedStatusBar()) return;
  if (attempt < 20) setTimeout(() => retryMount(attempt + 1), 1000);
}

// 立即执行初始化，不依赖 jQuery ready（动态加载的脚本可能在页面 ready 后才加载）
retryMount();

const refreshEvents = [
  tavern_events.CHAT_CHANGED,
  tavern_events.MESSAGE_RECEIVED,
  tavern_events.MESSAGE_UPDATED,
  tavern_events.MESSAGE_SWIPED,
  tavern_events.GENERATION_ENDED,
];

for (const eventName of refreshEvents) {
  eventOn(eventName, () => setTimeout(refreshFixedStatusBar, 250));
}

$(window).on('pagehide', () => {
  document.querySelector(`#${statusContainerId}`)?.remove();
});
