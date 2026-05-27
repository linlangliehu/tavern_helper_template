const statusContainerId = 'mfrs-fixed-status-host';
const statusFrameId = 'mfrs-fixed-status-frame';
const statusUrl = 'http://localhost:5500/dist/%E7%A5%9E%E7%A7%98%E5%A4%8D%E8%8B%8F%E6%A8%A1%E6%8B%9F%E5%99%A8/%E7%95%8C%E9%9D%A2/%E7%8A%B6%E6%80%81%E6%A0%8F/index.html';

function getSendForm() {
  return document.querySelector('#send_form') ?? document.querySelector('#form_sheld');
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
    host.style.maxHeight = '42vh';
    host.style.overflow = 'hidden auto';
    host.style.margin = '0 auto 8px';
    host.style.border = '1px solid rgba(90, 18, 18, 0.65)';
    host.style.borderRadius = '8px';
    host.style.background = 'rgba(5, 2, 2, 0.96)';
    host.style.boxShadow = '0 0 18px rgba(0, 0, 0, 0.65)';
    sendForm.parentElement?.insertBefore(host, sendForm);
  }

  let frame = document.querySelector(`#${statusFrameId}`) as HTMLIFrameElement | null;
  if (!frame) {
    frame = document.createElement('iframe');
    frame.id = statusFrameId;
    frame.title = '神秘复苏固定状态栏';
    frame.src = `${statusUrl}?t=${Date.now()}`;
    frame.style.display = 'block';
    frame.style.width = '100%';
    frame.style.height = '360px';
    frame.style.border = '0';
    frame.style.background = 'transparent';
    host.replaceChildren(frame);
  }

  return true;
}

function refreshFixedStatusBar() {
  const frame = document.querySelector(`#${statusFrameId}`) as HTMLIFrameElement | null;
  if (frame) frame.src = `${statusUrl}?t=${Date.now()}`;
  else ensureFixedStatusBar();
}

function retryMount(attempt = 1) {
  if (ensureFixedStatusBar()) return;
  if (attempt < 20) setTimeout(() => retryMount(attempt + 1), 1000);
}

$(() => {
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
});
