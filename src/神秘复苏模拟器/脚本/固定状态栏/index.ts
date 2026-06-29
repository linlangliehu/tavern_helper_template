const statusContainerId = 'mfrs-fixed-status-host';
const statusSummaryId = 'mfrs-fixed-status-summary';

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

function riskText(value: unknown, suffix = '') {
  const text = valueText(value, '0');
  return text.includes('/') || text.includes('%') ? text : `${text}${suffix}`;
}

function arrayItems(value: unknown): Record<string, any>[] {
  return Array.isArray(value) ? value.filter(item => item && typeof item === 'object') : [];
}

function joinLimited(values: unknown[], fallback = '无', limit = 2) {
  const items = values.map(value => String(value ?? '').trim()).filter(Boolean).slice(0, limit);
  return items.length ? items.join('、') : fallback;
}

function controlledGhostSummary(data: StatusData) {
  const runtimeGhosts = arrayItems(data.驭鬼者状态?.已驾驭厉鬼);
  const openingGhosts = arrayItems(data.驾驭厉鬼);
  const source = runtimeGhosts.length ? runtimeGhosts : openingGhosts;
  return joinLimited(source.map(ghost => ghost.代号 ?? ghost.厉鬼名称), '无');
}

function buildSummaryText(data: StatusData) {
  const ghostState = data.驭鬼者状态 ?? {};
  return {
    death: riskText(data.风险值, '/100'),
    revive: riskText(ghostState.总复苏风险 ?? data.厉鬼复苏程度, '%'),
    state: valueText(data.状态, '健康'),
    ghosts: controlledGhostSummary(data),
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

function renderSummary(host: HTMLDivElement) {
  const summary = buildSummaryText(readLatestStatus());
  const summaryEl = host.querySelector(`#${statusSummaryId}`) as HTMLDivElement | null;
  if (!summaryEl) return;

  summaryEl.querySelector<HTMLElement>('[data-field="death"]')!.textContent = summary.death;
  summaryEl.querySelector<HTMLElement>('[data-field="revive"]')!.textContent = summary.revive;
  summaryEl.querySelector<HTMLElement>('[data-field="state"]')!.textContent = summary.state;
  summaryEl.querySelector<HTMLElement>('[data-field="ghosts"]')!.textContent = summary.ghosts;
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
    summaryEl.style.display = 'flex';
    summaryEl.style.flexWrap = 'wrap';
    summaryEl.style.gap = '6px';
    summaryEl.style.alignItems = 'center';
    summaryEl.style.padding = '7px 8px';
    summaryEl.style.color = '#d4c6bb';
    summaryEl.style.fontSize = '12px';
    summaryEl.style.lineHeight = '1.35';
   summaryEl.innerHTML = `
      <span title="死亡风险">死亡：<strong data-field="death"></strong></span>
      <span title="复苏风险">复苏：<strong data-field="revive"></strong></span>
      <span title="状态">状态：<strong data-field="state"></strong></span>
      <span title="当前驾驭厉鬼">驾驭：<strong data-field="ghosts"></strong></span>
      <button type="button" data-action="open-status" title="打开 v10.2 前端里的完整状态">完整状态</button>
    `;
    summaryEl.querySelectorAll('strong').forEach(el => {
      (el as HTMLElement).style.color = '#b23a32';
      (el as HTMLElement).style.fontWeight = '800';
    });
    summaryEl.querySelectorAll('span').forEach(item => {
      (item as HTMLElement).style.flex = '1 1 94px';
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
    summaryEl.querySelector('[data-action="open-status"]')?.addEventListener('click', openFullStatus);
    host.append(summaryEl);
  }

  renderSummary(host);
  return true;
}

function refreshFixedStatusBar() {
  const host = document.querySelector(`#${statusContainerId}`) as HTMLDivElement | null;
  if (host) renderSummary(host);
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
