const statusContainerId = 'mfrs-fixed-status-host';
const dashboardSlotId = 'mfrs-fixed-dashboard-slot';
const frontendSlotId = 'mfrs-fixed-frontend-slot';
const statusSlotId = 'mfrs-fixed-status-slot';
const statusSummaryId = 'mfrs-fixed-status-summary';
const statusDetailId = 'mfrs-fixed-status-detail';

// 酒馆助手「脚本」运行在 JS-Slash-Runner 的 TH-script iframe 中，该 iframe 的 document
// 不含主窗口的 #send_form；必须用父窗口(主文档)挂载数据库前端槽位。
const doc: Document = window.parent && window.parent.document ? window.parent.document : document;

function getSendForm() {
  return doc.querySelector('#send_form') ?? doc.querySelector('#form_sheld');
}

function styleFixedHost(host: HTMLDivElement) {
  host.style.width = '100%';
  host.style.margin = '0 auto 6px';
  host.style.border = '0';
  host.style.borderRadius = '0';
  host.style.background = 'transparent';
  host.style.boxShadow = 'none';
  host.style.overflow = 'visible';
  host.style.maxHeight = 'none';
  host.style.clear = 'both';
  host.style.display = 'flex';
  host.style.flexDirection = 'column';
  host.style.gap = '6px';
}

function styleFixedSlot(slot: HTMLDivElement, order: string) {
  slot.style.width = '100%';
  slot.style.minWidth = '0';
  slot.style.order = order;
}

function ensureFixedSlot(host: HTMLDivElement, id: string, order: string) {
  let slot = host.querySelector(`#${id}`) as HTMLDivElement | null;
  if (!slot) {
    slot = doc.createElement('div');
    slot.id = id;
  }
  styleFixedSlot(slot, order);
  return slot;
}

function removeStatusUi(host: HTMLDivElement) {
  host.querySelector(`#${statusSummaryId}`)?.remove();
  host.querySelector(`#${statusDetailId}`)?.remove();
  host.querySelector(`#${statusSlotId}`)?.remove();
}

function ensureFixedStatusLayout(host: HTMLDivElement) {
  styleFixedHost(host);

  const dashboardSlot = ensureFixedSlot(host, dashboardSlotId, '10');
  const frontendSlot = ensureFixedSlot(host, frontendSlotId, '20');

  Array.from(host.children).forEach(child => {
    if (child === dashboardSlot || child === frontendSlot) return;
    if (child.classList.contains('acu-embedded-dashboard-container')) dashboardSlot.append(child);
    else if (child.classList.contains('acu-wrapper')) frontendSlot.append(child);
  });

  host.append(dashboardSlot, frontendSlot);
  removeStatusUi(host);
  return { dashboardSlot, frontendSlot };
}

function ensureFixedStatusBar() {
  const sendForm = getSendForm();
  if (!sendForm) {
    console.warn('[MFRS Fixed Status] 找不到输入区容器，稍后重试');
    return false;
  }

  let host = doc.querySelector(`#${statusContainerId}`) as HTMLDivElement | null;
  if (!host) {
    host = doc.createElement('div');
    host.id = statusContainerId;
    sendForm.parentElement?.insertBefore(host, sendForm);
  }

  ensureFixedStatusLayout(host);
  return true;
}

function retryMount(attempt = 1) {
  if (ensureFixedStatusBar()) return;
  if (attempt < 20) setTimeout(() => retryMount(attempt + 1), 1000);
}

retryMount();
