import { registerMfrsRuntimeBuild } from '../_runtime_identity';

registerMfrsRuntimeBuild('固定状态栏');

const statusContainerId = 'mfrs-fixed-status-host';
const dashboardSlotId = 'mfrs-fixed-dashboard-slot';
const frontendSlotId = 'mfrs-fixed-frontend-slot';
const statusSlotId = 'mfrs-fixed-status-slot';
const statusSummaryId = 'mfrs-fixed-status-summary';
const statusDetailId = 'mfrs-fixed-status-detail';
const mysteryCardNames = new Set(['神秘复苏模拟器', '神秘复苏模拟器发布版']);
const mysteryCardAvatars = new Set(['神秘复苏模拟器.png', '神秘复苏模拟器发布版.png']);

type HostWindow = Window & {
  __mfrsFixedStatusCleanup__?: () => void;
  SillyTavern?: {
    getContext?: () => {
      characterId?: string | number;
      characters?: Array<{ name?: string; avatar?: string }> | Record<string, { name?: string; avatar?: string }>;
      eventSource?: {
        on?: (event: unknown, listener: (...args: unknown[]) => void) => void;
        off?: (event: unknown, listener: (...args: unknown[]) => void) => void;
      };
      event_types?: Record<string, unknown> & { CHAT_CHANGED?: unknown };
    };
  };
};

declare const eventOn:
  | undefined
  | ((event: unknown, listener: (...args: unknown[]) => void) => void);
declare const tavern_events: undefined | { CHAT_CHANGED?: unknown };

// 酒馆助手「脚本」运行在 JS-Slash-Runner 的 TH-script iframe 中，该 iframe 的 document
// 不含主窗口的 #send_form；必须用父窗口(主文档)挂载数据库前端槽位。
const hostWindow: HostWindow = (() => {
  try {
    return (window.parent ?? window) as HostWindow;
  } catch {
    return window as HostWindow;
  }
})();
const doc: Document = hostWindow.document ?? document;
let nativeChatChangedSubscription:
  | { eventSource: NonNullable<ReturnType<typeof getSillyTavernContext>>['eventSource']; eventType: unknown; listener: () => void }
  | null = null;

function getSillyTavernContext() {
  for (const st of [hostWindow.SillyTavern, (window as HostWindow).SillyTavern]) {
    try {
      const context = st?.getContext?.();
      if (context) return context;
    } catch {
      // SillyTavern can briefly expose a half-updated context while switching chats.
    }
  }
  return null;
}

function getCurrentCharacter() {
  const context = getSillyTavernContext();
  const characterId = context?.characterId;
  if (characterId === undefined || characterId === null) return null;

  const characters = context?.characters;
  const character = Array.isArray(characters)
    ? characters[Number(characterId)]
    : characters?.[String(characterId)];

  return character ? { id: String(characterId), ...character } : { id: String(characterId) };
}

function isMysteryRevivalCardActive() {
  const character = getCurrentCharacter();
  return Boolean(
    character
      && ((character.name && mysteryCardNames.has(character.name))
        || (character.avatar && mysteryCardAvatars.has(character.avatar))),
  );
}

function getSendForm() {
  return doc.querySelector('#send_form') ?? doc.querySelector('#form_sheld');
}

const fixedHostStyleId = 'mfrs-fixed-status-host-style';

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
  host.style.setProperty('--mfrs-host-bone', '#c8c0ae');
  host.style.setProperty('--mfrs-host-copper', '#3d6b66');
  host.style.setProperty('--mfrs-host-blood', '#6b2a26');
  host.style.setProperty('--mfrs-host-teal', 'rgba(8, 10, 10, 0.72)');
}

function ensureFixedHostStyles() {
  let style = doc.getElementById(fixedHostStyleId) as HTMLStyleElement | null;
  if (!style) {
    style = doc.createElement('style');
    style.id = fixedHostStyleId;
    doc.head.appendChild(style);
  }
  style.textContent = `
#${statusContainerId} #${dashboardSlotId}:not(:empty),
#${statusContainerId} #${frontendSlotId}:not(:empty) {
  box-sizing: border-box;
  border: 1px solid color-mix(in srgb, var(--mfrs-host-copper) 70%, transparent);
  border-radius: 0;
  outline: 1px solid color-mix(in srgb, var(--mfrs-host-blood) 16%, transparent);
  outline-offset: -3px;
  background:
    linear-gradient(180deg, rgba(10, 12, 12, 0.55), rgba(8, 10, 10, 0.4)),
    var(--mfrs-host-teal);
  box-shadow:
    0 6px 16px rgba(0, 0, 0, 0.28),
    inset 0 0 0 1px rgba(61, 107, 102, 0.1);
}
#${statusContainerId} #${dashboardSlotId}:empty,
#${statusContainerId} #${frontendSlotId}:empty {
  border: 0;
  outline: 0;
  background: transparent;
  box-shadow: none;
}
@media (prefers-reduced-motion: reduce) {
  #${statusContainerId},
  #${statusContainerId} * {
    animation: none !important;
  }
}
`;
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
  ensureFixedHostStyles();

  const dashboardSlot = ensureFixedSlot(host, dashboardSlotId, '10');
  const frontendSlot = ensureFixedSlot(host, frontendSlotId, '20');

  Array.from(host.children).forEach(child => {
    if (child === dashboardSlot || child === frontendSlot) return;
    if (child.classList.contains('acu-embedded-dashboard-container')) dashboardSlot.append(child);
    else if (child.classList.contains('acu-wrapper')) frontendSlot.append(child);
  });

  host.append(dashboardSlot, frontendSlot);
  dashboardSlot.style.order = '10';
  frontendSlot.style.order = '20';
  removeStatusUi(host);
  return { dashboardSlot, frontendSlot };
}

function ensureFixedStatusBar() {
  if (!isMysteryRevivalCardActive()) {
    cleanupFixedStatusBar();
    return false;
  }

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

function cleanupFixedStatusBar() {
  doc.getElementById(statusContainerId)?.remove();
  doc.getElementById(fixedHostStyleId)?.remove();
}

function retryMount(attempt = 1) {
  if (ensureFixedStatusBar()) return;
  if (attempt < 20) setTimeout(() => retryMount(attempt + 1), 1000);
}

function handleChatChanged() {
  for (const delay of [0, 250, 1000]) {
    window.setTimeout(() => {
      if (isMysteryRevivalCardActive()) {
        void ensureFixedStatusBar();
      } else {
        cleanupFixedStatusBar();
      }
    }, delay);
  }
}

function installCleanup() {
  hostWindow.__mfrsFixedStatusCleanup__?.();
  hostWindow.__mfrsFixedStatusCleanup__ = () => {
    cleanupFixedStatusBar();
    if (nativeChatChangedSubscription) {
      nativeChatChangedSubscription.eventSource?.off?.(
        nativeChatChangedSubscription.eventType,
        nativeChatChangedSubscription.listener,
      );
      nativeChatChangedSubscription = null;
    }
    delete hostWindow.__mfrsFixedStatusCleanup__;
  };

  window.addEventListener('pagehide', hostWindow.__mfrsFixedStatusCleanup__, { once: true });

  if (typeof eventOn !== 'undefined' && typeof tavern_events !== 'undefined' && tavern_events.CHAT_CHANGED) {
    eventOn(tavern_events.CHAT_CHANGED, handleChatChanged);
    return;
  }

  const context = getSillyTavernContext();
  const eventSource = context?.eventSource;
  const eventType = context?.event_types?.CHAT_CHANGED;
  if (eventSource?.on && eventType) {
    eventSource.on(eventType, handleChatChanged);
    nativeChatChangedSubscription = { eventSource, eventType, listener: handleChatChanged };
  }
}

installCleanup();
retryMount();
