function getHostDocument() {
  try {
    return window.parent?.document ?? document;
  } catch {
    return document;
  }
}

type HostWindowWithThemeCleanup = Window & {
  __mfrsHorrorThemeCleanup__?: () => void;
  MysteryDatabaseFrontend?: {
    openDashboard?: (options?: { welcome?: boolean }) => void;
  };
  toastr?: {
    info?: (message: string) => void;
  };
};

function getSendTextarea(hostDocument: Document) {
  const candidates = Array.from(
    hostDocument.querySelectorAll<HTMLTextAreaElement>('#send_textarea, textarea[name="text"]'),
  );
  return candidates.find(input => input.offsetParent !== null) ?? candidates[0] ?? null;
}

function setTextareaValue(input: HTMLTextAreaElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set;
  setter?.call(input, value);
  input.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: value }));
  input.dispatchEvent(new Event('change', { bubbles: true }));
  input.focus();
}

function getActionText(rawText: string) {
  const text = rawText.replace(/^[ABCD][\.、：:]\s*/, '').trim();
  return text === '自定义行动'
    ? text
    : text.replace(/[。；;]?\s*(?:死亡风险|复苏风险|风险来源|风险|death|revive|<risk)[\s\S]*$/i, '').trim();
}

$(() => {
  const style = document.createElement('style');
  style.id = 'mfrs-horror-theme';
  style.textContent = `
@import url('https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@300;400;600;700&family=Noto+Serif+SC:wght@600;800&display=swap');

body {
  background: #151111 !important;
  color: #c8baba !important;
  font-family: "Noto Sans SC", "Microsoft YaHei", sans-serif !important;
}

#chat {
  background: #151111 !important;
}

#top-bar {
  background: linear-gradient(180deg, #1c1414 0%, #151111 100%) !important;
  border-bottom: 1px solid #3a2020 !important;
  box-shadow: 0 2px 12px rgba(0,0,0,0.35) !important;
}

#send_form {
  background: linear-gradient(180deg, #151111 0%, #1c1414 100%) !important;
  border-top: 1px solid #3a2020 !important;
  box-shadow: 0 -2px 12px rgba(0,0,0,0.3) !important;
}

#left-nav-panel {
  background: #151111 !important;
  border-right: 1px solid #3a2020 !important;
}

#right-nav-panel {
  background: #151111 !important;
  border-left: 1px solid #3a2020 !important;
}

#send_textarea {
  background: rgba(28,18,18,0.92) !important;
  color: #f0e4e4 !important;
  border: 1px solid #5a2a2a !important;
  border-radius: 4px !important;
  caret-color: #8b2020 !important;
  font-family: "Noto Sans SC", "Microsoft YaHei", sans-serif !important;
  font-size: 14px !important;
  line-height: 1.8 !important;
  padding: 12px 16px !important;
  box-shadow:
    inset 0 0 18px rgba(0,0,0,0.28),
    inset 0 0 4px rgba(100,30,30,0.12),
    0 0 6px rgba(0,0,0,0.22) !important;
  transition: border-color 0.3s ease, box-shadow 0.3s ease !important;
}

#send_textarea::placeholder {
  color: #8a6c6c !important;
  font-style: italic !important;
}

#send_textarea:focus {
  border-color: #8a3434 !important;
  box-shadow:
    inset 0 0 18px rgba(0,0,0,0.28),
    inset 0 0 6px rgba(130,35,35,0.16),
    0 0 10px rgba(130,35,35,0.2) !important;
  outline: none !important;
}

#send_but,
#mes_continue,
#mes_impersonate {
  color: #9b7777 !important;
  background: transparent !important;
  border: none !important;
  transition: color 0.25s ease, text-shadow 0.25s ease !important;
}

#send_but:hover,
#mes_continue:hover,
#mes_impersonate:hover {
  color: #d05858 !important;
  text-shadow: 0 0 10px rgba(170,45,45,0.35) !important;
}

.mes {
  border-bottom: 1px solid #2e1a1a !important;
  padding: 10px 10px 0 !important;
  position: relative !important;
}

.mes[is_user="true"] {
  background: linear-gradient(180deg, rgba(30,20,20,0.45) 0%, rgba(22,16,16,0.22) 100%) !important;
}

.mes[is_user="false"] {
  background: linear-gradient(180deg, rgba(24,17,17,0.6) 0%, rgba(18,13,13,0.34) 100%) !important;
}

.mes[is_user="true"] .mes_text {
  background:
    linear-gradient(135deg, rgba(34,23,23,0.72) 0%, rgba(28,19,19,0.62) 100%) !important;
  border: 1px solid #3a2020 !important;
  border-left: 2px solid #6a3030 !important;
  border-radius: 3px !important;
  padding: 14px 18px !important;
  color: #eadede !important;
  font-family: "Noto Sans SC", "Microsoft YaHei", sans-serif !important;
  font-size: 14px !important;
  line-height: 1.9 !important;
  position: relative !important;
  box-shadow:
    inset 0 0 14px rgba(0,0,0,0.18),
    0 0 4px rgba(0,0,0,0.16) !important;
}

.mes[is_user="true"] .mes_text::before {
  content: '' !important;
  position: absolute !important;
  top: 0 !important; left: 0 !important; right: 0 !important; bottom: 0 !important;
  background:
    radial-gradient(ellipse at 95% 5%, rgba(80,0,0,0.05) 0%, transparent 50%),
    radial-gradient(ellipse at 5% 95%, rgba(60,0,0,0.04) 0%, transparent 40%) !important;
  pointer-events: none !important;
  border-radius: 3px !important;
}

.mes[is_user="false"] .mes_text {
  background:
    linear-gradient(135deg, rgba(30,21,21,0.84) 0%, rgba(23,17,17,0.76) 100%) !important;
  border: 1px solid #322020 !important;
  border-left: 2px solid #663030 !important;
  border-radius: 2px !important;
  padding: 16px 20px !important;
  color: #ded2d2 !important;
  font-family: "Noto Sans SC", "Microsoft YaHei", sans-serif !important;
  font-size: 15px !important;
  line-height: 2 !important;
  position: relative !important;
  box-shadow:
    inset 0 0 18px rgba(0,0,0,0.22),
    0 0 6px rgba(0,0,0,0.2) !important;
}

.mes[is_user="false"] .mes_text::before {
  content: '' !important;
  position: absolute !important;
  top: 0 !important; left: 0 !important; right: 0 !important; bottom: 0 !important;
  background:
    url("data:image/svg+xml,%3Csvg viewBox='0 0 512 512' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.025'/%3E%3C/svg%3E"),
    radial-gradient(ellipse at 3% 50%, rgba(60,0,0,0.05) 0%, transparent 30%),
    radial-gradient(ellipse at 97% 10%, rgba(80,0,0,0.04) 0%, transparent 25%) !important;
  pointer-events: none !important;
  border-radius: 2px !important;
}

.mes[is_user="false"] .mes_text::after {
  content: '' !important;
  position: absolute !important;
  top: 6px !important; right: 6px !important;
  width: 18px !important; height: 26px !important;
  opacity: 0.045 !important;
  background: radial-gradient(ellipse at center, #5a1010 0%, transparent 70%) !important;
  pointer-events: none !important;
}

.mes .ch_name .name_text {
  font-family: "Noto Serif SC", "SimSun", serif !important;
  color: #c85c5c !important;
  text-shadow: 0 0 8px rgba(160,45,45,0.28) !important;
  letter-spacing: 1.5px !important;
  font-weight: 800 !important;
}

.mes[is_user="true"] .ch_name .name_text {
  color: #b98a8a !important;
  text-shadow: 0 0 6px rgba(120,60,60,0.2) !important;
}

.mes .mes_text p {
  margin: 0 0 10px !important;
}

.mes .mes_text p:last-child {
  margin-bottom: 0 !important;
}

.mes .mes_text hr {
  border: none !important;
  border-top: 1px solid #3a2020 !important;
  margin: 14px 0 !important;
}

.mes .mes_text blockquote {
  border-left: 2px solid #6a3030 !important;
  background: rgba(48,28,28,0.45) !important;
  padding: 8px 14px !important;
  margin: 8px 0 !important;
  color: #d0c0c0 !important;
}

.mes .mes_text code {
  background: rgba(52,30,30,0.65) !important;
  border: 1px solid #4a2828 !important;
  color: #e08a8a !important;
  padding: 1px 5px !important;
  border-radius: 2px !important;
  font-size: 0.9em !important;
}

.mes .mes_text pre {
  background: rgba(35,24,24,0.88) !important;
  border: 1px solid #4a2828 !important;
  padding: 12px !important;
  border-radius: 2px !important;
}

.mes .mes_text details {
  background: rgba(40,26,26,0.55) !important;
  border: 1px solid #4a2828 !important;
  border-radius: 2px !important;
  padding: 8px 12px !important;
}

.mes .mes_text summary {
  color: #c46a6a !important;
  cursor: pointer !important;
  font-family: "Noto Sans SC", "Microsoft YaHei", sans-serif !important;
  font-size: 13px !important;
}

.mes .mes_text a {
  color: #d45c5c !important;
  text-decoration: none !important;
  border-bottom: 1px solid rgba(120,30,30,0.3) !important;
}

.mes .mes_text a:hover {
  color: #ee7a7a !important;
}

.mes .mes_text .horror-keyword {
  color: #c03030 !important;
  text-shadow: 0 0 8px rgba(140,20,20,0.5) !important;
  font-weight: 600 !important;
  border-bottom: 1px solid rgba(140,20,20,0.25) !important;
  padding: 0 2px !important;
}

.mes .mes_text strong {
  color: #c04040 !important;
  text-shadow: 0 0 8px rgba(140,20,20,0.45) !important;
  font-weight: 700 !important;
}

.mes .mes_text em {
  color: #d46c6c !important;
  font-style: normal !important;
  text-shadow: 0 0 4px rgba(120,30,30,0.35) !important;
}

.mes .avatar {
  border-radius: 50% !important;
  box-shadow: 0 0 8px rgba(0,0,0,0.32), 0 0 2px rgba(100,30,30,0.18) !important;
}

.mes .swipe_left,
.mes .swipe_right {
  color: #8a6868 !important;
  transition: color 0.2s ease, text-shadow 0.2s ease !important;
}

.mes .swipe_left:hover,
.mes .swipe_right:hover {
  color: #c85c5c !important;
  text-shadow: 0 0 6px rgba(100,20,20,0.3) !important;
}

.mes .mes_button {
  color: #9a7777 !important;
  transition: color 0.2s ease, text-shadow 0.2s ease !important;
}

.mes .mes_button:hover {
  color: #d05858 !important;
  text-shadow: 0 0 6px rgba(120,20,20,0.35) !important;
}

.mes .mes_reasoning_details {
  background: rgba(38,26,26,0.55) !important;
  border: 1px solid #3a2424 !important;
  border-radius: 2px !important;
}

.mes .mes_reasoning_details summary {
  color: #b86c6c !important;
  font-family: "Noto Sans SC", "Microsoft YaHei", sans-serif !important;
}

.mes .mes_reasoning_details .reasoning_content {
  color: #c2b2b2 !important;
  font-size: 13px !important;
  line-height: 1.8 !important;
}

#options_button,
#extensionsMenuButton,
.menu_button,
.nav_button {
  color: #9b7777 !important;
  transition: color 0.2s ease, text-shadow 0.2s ease !important;
}

#options_button:hover,
#extensionsMenuButton:hover,
.menu_button:hover,
.nav_button:hover {
  color: #d05858 !important;
  text-shadow: 0 0 8px rgba(170,45,45,0.28) !important;
}

.popup,
.dialogue_popup {
  background: #1c1414 !important;
  border: 1px solid #3a2020 !important;
  box-shadow: 0 0 30px rgba(0,0,0,0.45), 0 0 8px rgba(100,30,30,0.12) !important;
}

.drawer-content,
#sheld {
  background: #1c1414 !important;
}

::-webkit-scrollbar {
  width: 5px !important;
}

::-webkit-scrollbar-track {
  background: #151111 !important;
}

::-webkit-scrollbar-thumb {
  background: #4a2828 !important;
  border-radius: 2px !important;
}

::-webkit-scrollbar-thumb:hover {
  background: #6a3030 !important;
}

::selection {
  background: #3a0a0a !important;
  color: #d0b0b0 !important;
}

.timestamp {
  color: #8a6868 !important;
  font-size: 11px !important;
}

.horror-options {
  background: #1b1414 !important;
  border: 1px solid #5a2a2a !important;
  border-left: 3px solid #9a3a3a !important;
  border-right: 1px solid #5a2a2a !important;
  padding: 20px 24px !important;
  margin: 18px auto !important;
  max-width: 560px !important;
  position: relative !important;
  box-shadow: 0 0 22px rgba(0,0,0,0.45), inset 0 0 24px rgba(40,10,10,0.32), 0 0 6px rgba(120,30,30,0.18) !important;
  border-radius: 2px !important;
}

.horror-options::before {
  content: '' !important;
  position: absolute !important;
  top: 0 !important; left: 0 !important; right: 0 !important; bottom: 0 !important;
  background:
    repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(60,0,0,0.02) 2px, rgba(60,0,0,0.02) 4px),
    url("data:image/svg+xml,%3Csvg viewBox='0 0 512 512' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.03'/%3E%3C/svg%3E") !important;
  pointer-events: none !important;
}

.horror-options::after {
  content: '' !important;
  position: absolute !important;
  top: 0 !important; right: 0 !important; bottom: 0 !important; width: 40px !important;
  background: linear-gradient(90deg, transparent, rgba(60,0,0,0.06)) !important;
  pointer-events: none !important;
}

.horror-options-title {
  color: #d85858 !important;
  font-family: "Noto Serif SC", "SimSun", serif !important;
  font-size: 17px !important;
  font-weight: 800 !important;
  letter-spacing: 3px !important;
  text-shadow: 0 0 8px rgba(140,20,20,0.5) !important;
  border-bottom: 1px solid #5a2a2a !important;
  padding-bottom: 10px !important;
  margin-bottom: 14px !important;
}

.horror-options-body {
  color: #e0d6d6 !important;
  font-family: "Noto Sans SC", "Microsoft YaHei", sans-serif !important;
  font-size: 14px !important;
  line-height: 1.9 !important;
  white-space: pre-wrap !important;
  font-weight: 300 !important;
  letter-spacing: 0.5px !important;
}

.horror-panel {
  background: #1b1414 !important;
  border: 1px solid #5a2a2a !important;
  padding: 0 !important;
  margin: 18px auto !important;
  max-width: 480px !important;
  position: relative !important;
  box-shadow: 0 0 22px rgba(0,0,0,0.45), inset 0 0 22px rgba(40,10,10,0.28), 0 0 8px rgba(100,30,30,0.14) !important;
  border-radius: 2px !important;
  overflow: hidden !important;
}

.horror-panel-title {
  color: #d85858 !important;
  font-family: "Noto Serif SC", "SimSun", serif !important;
  font-size: 16px !important;
  font-weight: 800 !important;
  letter-spacing: 4px !important;
  text-shadow: 0 0 10px rgba(140,20,20,0.6) !important;
  text-align: center !important;
}

.horror-panel-text {
  color: #d8cccc !important;
  font-family: "Noto Sans SC", "Microsoft YaHei", sans-serif !important;
  font-size: 13px !important;
  line-height: 2 !important;
  white-space: pre-wrap !important;
  font-weight: 300 !important;
  letter-spacing: 0.8px !important;
}

#mfrs-welcome-root .mfrs-dropdown,
.custom-mfrs-welcome-root .mfrs-dropdown {
  position: relative !important;
  grid-column: 1 / -1 !important;
  width: 100% !important;
  min-width: 0 !important;
}

#mfrs-welcome-root .mfrs-dropdown-trigger,
.custom-mfrs-welcome-root .mfrs-dropdown-trigger {
  width: 100% !important;
  display: flex !important;
  align-items: center !important;
  justify-content: space-between !important;
  gap: 12px !important;
  padding: 12px 14px !important;
  border: 1px solid rgba(160, 40, 40, .5) !important;
  border-radius: 10px !important;
  background: rgba(34,23,23,.82) !important;
  color: #e0d0d0 !important;
  cursor: pointer !important;
  font: inherit !important;
}

#mfrs-welcome-root .mfrs-dropdown-trigger:hover,
.custom-mfrs-welcome-root .mfrs-dropdown-trigger:hover {
  border-color: #c83838 !important;
  background: rgba(42,28,28,.90) !important;
}

#mfrs-welcome-root .mfrs-dropdown-display,
.custom-mfrs-welcome-root .mfrs-dropdown-display {
  min-width: 0 !important;
  overflow: hidden !important;
  text-overflow: ellipsis !important;
  white-space: nowrap !important;
}

#mfrs-welcome-root .mfrs-dropdown-arrow,
.custom-mfrs-welcome-root .mfrs-dropdown-arrow {
  flex: 0 0 auto !important;
  color: #902828 !important;
  font-size: 12px !important;
  transition: transform .2s ease !important;
}

#mfrs-welcome-root .mfrs-dropdown.is-open .mfrs-dropdown-arrow,
.custom-mfrs-welcome-root .mfrs-dropdown.is-open .mfrs-dropdown-arrow {
  transform: rotate(180deg) !important;
}

#mfrs-welcome-root .mfrs-dropdown-menu,
.custom-mfrs-welcome-root .mfrs-dropdown-menu {
  display: none !important;
  position: absolute !important;
  left: 0 !important;
  right: 0 !important;
  top: calc(100% + 8px) !important;
  max-height: min(420px, 62vh) !important;
  overflow-y: auto !important;
  border: 1px solid rgba(160, 40, 40, .5) !important;
  border-radius: 10px !important;
  background: rgba(34,23,23,.97) !important;
  box-shadow: 0 16px 42px rgba(0,0,0,.68) !important;
  z-index: 1000 !important;
}

#mfrs-welcome-root .mfrs-dropdown.is-open .mfrs-dropdown-menu,
.custom-mfrs-welcome-root .mfrs-dropdown.is-open .mfrs-dropdown-menu {
  display: block !important;
}

#mfrs-welcome-root .mfrs-dropdown-group,
.custom-mfrs-welcome-root .mfrs-dropdown-group {
  border-bottom: 1px solid rgba(160, 40, 40, .22) !important;
}

#mfrs-welcome-root .mfrs-dropdown-group-title,
.custom-mfrs-welcome-root .mfrs-dropdown-group-title,
#mfrs-welcome-root .mfrs-dropdown-chapter-title,
.custom-mfrs-welcome-root .mfrs-dropdown-chapter-title {
  display: flex !important;
  align-items: center !important;
  justify-content: space-between !important;
  gap: 10px !important;
  cursor: pointer !important;
  transition: background .2s ease, color .2s ease !important;
}

#mfrs-welcome-root .mfrs-dropdown-group-title,
.custom-mfrs-welcome-root .mfrs-dropdown-group-title {
  padding: 13px 16px !important;
  color: #c83838 !important;
  background: rgba(32,12,12,.55) !important;
  font-weight: 900 !important;
  font-size: 14px !important;
}

#mfrs-welcome-root .mfrs-dropdown-chapter-title,
.custom-mfrs-welcome-root .mfrs-dropdown-chapter-title {
  padding: 11px 16px 11px 26px !important;
  color: #b89090 !important;
  background: rgba(20,12,12,.50) !important;
  border-top: 1px solid rgba(160,40,40,.15) !important;
  font-size: 13px !important;
  font-weight: 800 !important;
}

#mfrs-welcome-root .mfrs-dropdown-group-title::after,
.custom-mfrs-welcome-root .mfrs-dropdown-group-title::after,
#mfrs-welcome-root .mfrs-dropdown-chapter-title::after,
.custom-mfrs-welcome-root .mfrs-dropdown-chapter-title::after {
  content: '▾' !important;
  color: #902828 !important;
  font-size: 12px !important;
  transition: transform .2s ease !important;
}

#mfrs-welcome-root .mfrs-dropdown-group.is-open > .mfrs-dropdown-group-title::after,
.custom-mfrs-welcome-root .mfrs-dropdown-group.is-open > .mfrs-dropdown-group-title::after,
#mfrs-welcome-root .mfrs-dropdown-chapter.is-open > .mfrs-dropdown-chapter-title::after,
.custom-mfrs-welcome-root .mfrs-dropdown-chapter.is-open > .mfrs-dropdown-chapter-title::after {
  transform: rotate(180deg) !important;
}

#mfrs-welcome-root .mfrs-dropdown-group-body,
.custom-mfrs-welcome-root .mfrs-dropdown-group-body,
#mfrs-welcome-root .mfrs-dropdown-chapter-body,
.custom-mfrs-welcome-root .mfrs-dropdown-chapter-body {
  display: none !important;
}

#mfrs-welcome-root .mfrs-dropdown-group.is-open > .mfrs-dropdown-group-body,
.custom-mfrs-welcome-root .mfrs-dropdown-group.is-open > .mfrs-dropdown-group-body,
#mfrs-welcome-root .mfrs-dropdown-chapter.is-open > .mfrs-dropdown-chapter-body,
.custom-mfrs-welcome-root .mfrs-dropdown-chapter.is-open > .mfrs-dropdown-chapter-body {
  display: block !important;
}

#mfrs-welcome-root .mfrs-dropdown-item,
.custom-mfrs-welcome-root .mfrs-dropdown-item {
  padding: 10px 16px 10px 40px !important;
  color: #e0d0d0 !important;
  cursor: pointer !important;
  font-size: 14px !important;
  line-height: 1.5 !important;
}

#mfrs-welcome-root .mfrs-dropdown-item:hover,
.custom-mfrs-welcome-root .mfrs-dropdown-item:hover {
  background: rgba(160,40,40,.14) !important;
}

#mfrs-welcome-root .mfrs-dropdown-item-name,
.custom-mfrs-welcome-root .mfrs-dropdown-item-name,
#mfrs-welcome-root .mfrs-dropdown-item-meta,
.custom-mfrs-welcome-root .mfrs-dropdown-item-meta {
  display: block !important;
}

#mfrs-welcome-root .mfrs-dropdown-item-name,
.custom-mfrs-welcome-root .mfrs-dropdown-item-name {
  font-weight: 700 !important;
}

#mfrs-welcome-root .mfrs-dropdown-item-meta,
.custom-mfrs-welcome-root .mfrs-dropdown-item-meta {
  margin-top: 3px !important;
  color: #8a6565 !important;
  font-size: 12px !important;
}

.mfrs-choice-list {
  display: grid !important;
  gap: 10px !important;
}

.mfrs-choice-legend {
  display: flex !important;
  flex-wrap: wrap !important;
  gap: 8px !important;
  margin-bottom: 6px !important;
  font-size: 11px !important;
  color: #cdbaba !important;
  letter-spacing: 0.05em !important;
}

.mfrs-choice-legend-item {
  display: inline-flex !important;
  align-items: center !important;
  gap: 5px !important;
  padding: 2px 8px !important;
  border: 1px solid rgba(150,58,58,.5) !important;
  border-radius: 999px !important;
  background: rgba(38,24,24,.65) !important;
}

.mfrs-choice-legend-dot {
  display: inline-block !important;
  width: 8px !important;
  height: 8px !important;
  border-radius: 50% !important;
}

.mfrs-choice-button {
  width: 100% !important;
  text-align: left !important;
  background: rgba(34,23,23,.9) !important;
  border: 1px solid rgba(150,58,58,.72) !important;
  border-left: 3px solid #a44242 !important;
  color: #eadede !important;
  padding: 10px 12px !important;
  border-radius: 6px !important;
  cursor: pointer !important;
  font: inherit !important;
  line-height: 1.65 !important;
  box-shadow: inset 0 0 14px rgba(0,0,0,.2) !important;
  position: relative !important;
}

.mfrs-choice-button[data-risk="high"] { border-left-color: #d83030 !important; }
.mfrs-choice-button[data-risk="mid"] { border-left-color: #c8742a !important; }
.mfrs-choice-button[data-risk="low"] { border-left-color: #5a7a30 !important; }
.mfrs-choice-button[data-risk="unknown"] { border-left-color: #6a4a6a !important; }

.mfrs-choice-risk {
  display: inline-block !important;
  margin-left: 6px !important;
  padding: 1px 6px !important;
  border-radius: 4px !important;
  font-size: 10px !important;
  letter-spacing: 0.05em !important;
  vertical-align: middle !important;
}
.mfrs-choice-button[data-risk="high"] .mfrs-choice-risk { background: rgba(216,48,48,.18) !important; color: #f08080 !important; }
.mfrs-choice-button[data-risk="mid"] .mfrs-choice-risk { background: rgba(200,116,42,.18) !important; color: #e7b070 !important; }
.mfrs-choice-button[data-risk="low"] .mfrs-choice-risk { background: rgba(90,122,48,.18) !important; color: #aac57a !important; }
.mfrs-choice-button[data-risk="unknown"] .mfrs-choice-risk { background: rgba(106,74,106,.18) !important; color: #c0a0c0 !important; }

.mfrs-choice-button:hover {
  color: #f0d8d8 !important;
  border-color: #b03838 !important;
  box-shadow: 0 0 14px rgba(150,45,45,.22), inset 0 0 14px rgba(0,0,0,.18) !important;
}

.mfrs-choice-key {
  color: #d05050 !important;
  font-weight: 800 !important;
  margin-right: 8px !important;
}

.mfrs-choice-item {
  display: block !important;
}
.mfrs-choice-item .mfrs-choice-button {
  border-bottom-left-radius: 6px !important;
  border-bottom-right-radius: 6px !important;
}
.mfrs-choice-item:has(> .mfrs-choice-why) .mfrs-choice-button {
  border-bottom-left-radius: 0 !important;
  border-bottom-right-radius: 0 !important;
}
.mfrs-choice-why {
  border: 1px solid rgba(150,58,58,.5) !important;
  border-top: none !important;
  border-radius: 0 0 6px 6px !important;
  background: rgba(20,12,12,.66) !important;
  overflow: hidden !important;
}
.mfrs-choice-why > summary {
  cursor: pointer !important;
  list-style: none !important;
  padding: 6px 12px !important;
  font-size: 11px !important;
  color: #b89a9a !important;
  letter-spacing: 0.06em !important;
}
.mfrs-choice-why > summary::-webkit-details-marker { display: none !important; }
.mfrs-choice-why > summary::before { content: '▸ 风险明细' !important; }
.mfrs-choice-why[open] > summary::before { content: '▾ 风险明细' !important; }
.mfrs-choice-why > summary:hover { color: #e0a0a0 !important; }
.mfrs-choice-why-body {
  padding: 4px 12px 10px !important;
  border-top: 1px solid rgba(150,58,58,.28) !important;
}
.mfrs-choice-why-row {
  font-size: 12px !important;
  line-height: 1.7 !important;
  color: #cdbaba !important;
}
.mfrs-choice-why-key {
  display: inline-block !important;
  min-width: 4.5em !important;
  margin-right: 6px !important;
  font-weight: 700 !important;
  color: #b89a9a !important;
}
.mfrs-choice-why-key.is-death { color: #f08080 !important; }
.mfrs-choice-why-key.is-revive { color: #c89adf !important; }
.mfrs-hidden-internal-choice-payload {
  display: none !important;
}
`;
  const hostDocument = getHostDocument();
  const hostWindow = hostDocument.defaultView as HostWindowWithThemeCleanup | null;
  hostWindow?.__mfrsHorrorThemeCleanup__?.();

  const hostStyle = hostDocument.createElement('style');
  hostStyle.id = style.id;
  hostStyle.textContent = style.textContent;

  const ensureStyleMounted = () => {
    const current = hostDocument.getElementById(style.id);
    if (current && current !== hostStyle) {
      current.remove();
    }
    if (!hostStyle.isConnected || hostStyle.parentElement !== hostDocument.head) {
      hostDocument.head.appendChild(hostStyle);
    }
  };

  ensureStyleMounted();

  const HostMutationObserver = hostDocument.defaultView?.MutationObserver ?? MutationObserver;
  const observer = new HostMutationObserver(ensureStyleMounted);
  observer.observe(hostDocument.head, { childList: true });

  const INTERNAL_CHOICES_TAG_HTML = /(?:&lt;|<)\s*choices\s*(?:&gt;|>)[\s\S]*?(?:&lt;|<)\s*\/\s*choices\s*(?:&gt;|>)/gi;
  const INTERNAL_CHOICE_RISK_LINE_HTML = /(?:^|<br\s*\/?>|\n|\r)[^<\n\r]*(?:risk\.death|risk\.revive)[^<\n\r]*/gi;
  const INTERNAL_CHOICE_LEAK_SELECTOR = [
    '.mes_text p',
    '.mes_text pre',
    '.mes_text code',
    '.mes_text li',
    '.mes_text blockquote',
  ].join(',');

  const isInsideRenderedChoicePanel = (element: Element) =>
    Boolean(element.closest('.custom-sp-panel-choices, .sp-panel-choices, .mfrs-choice-list'));

  const isInternalChoiceLeakText = (text: string) => {
    const normalized = text.replace(/\s+/g, ' ').trim();
    if (!normalized) return false;
    if (/<\s*choices\s*>[\s\S]*?<\s*\/\s*choices\s*>/i.test(normalized)) return true;
    if (!/(?:risk\.death|risk\.revive)/i.test(normalized)) return false;
    return /[{\[]|"\s*[A-D]\s*"|'[A-D]'|key\s*[:=]/i.test(normalized);
  };

  const stripInternalChoicePayloadsFromHtml = (html: string) => html
    .replace(INTERNAL_CHOICES_TAG_HTML, '')
    .replace(INTERNAL_CHOICE_RISK_LINE_HTML, '')
    .replace(/(?:<br\s*\/?>\s*){3,}/gi, '<br><br>');

  const hideInternalChoicePayloadLeaks = () => {
    for (const block of hostDocument.querySelectorAll<HTMLElement>(INTERNAL_CHOICE_LEAK_SELECTOR)) {
      if (isInsideRenderedChoicePanel(block)) continue;
      if (!isInternalChoiceLeakText(block.textContent ?? '')) continue;
      block.classList.add('mfrs-hidden-internal-choice-payload');
      block.setAttribute('aria-hidden', 'true');
    }

    for (const root of hostDocument.querySelectorAll<HTMLElement>('.mes_text')) {
      const currentHtml = root.innerHTML;
      if (!/(?:&lt;|<)\s*choices\s*(?:&gt;|>)|risk\.death|risk\.revive/i.test(currentHtml)) continue;
      const nextHtml = stripInternalChoicePayloadsFromHtml(currentHtml);
      if (nextHtml !== currentHtml) root.innerHTML = nextHtml;
    }
  };

  const enhanceChoicePanels = () => {
    const detectRisk = (text: string): 'high' | 'mid' | 'low' | 'unknown' => {
      const lower = text;
      if (/致命|高危|高风险|危险|险境|险峻|绝境|九死一生|送死|送命|引鬼|招鬼|招惹|强行|硬闯|挑衅|对抗|交战|交锋|搏命|拼命|不归路/.test(lower)) return 'high';
      if (/中等|中风险|警惕|谨慎|试探|冒险|博弈|两难|不确定|存疑|风险较高|侧面|绕行|拖延/.test(lower)) return 'mid';
      if (/安全|稳妥|低风险|保守|撤退|退避|回避|远离|脱离|求助|协作|休整|观察|静候|静观|按兵不动/.test(lower)) return 'low';
      return 'unknown';
    };
    const riskLabel = (risk: string) => risk === 'high' ? '高危' : risk === 'mid' ? '中险' : risk === 'low' ? '稳妥' : '未明';

    const splitChoiceDetail = (rawText: string): { detail: string; meta: Array<{ label: string; value: string }> } => {
      const meta: Array<{ label: string; value: string }> = [];
      const segments = rawText.split(/[；;]/).map(s => s.trim()).filter(Boolean);
      const detailParts: string[] = [];
      for (const segment of segments) {
        const m = segment.match(/^(死亡风险|复苏风险|风险来源|风险|代价|资源|后果|说明|提示)[：:]?\s*(.+)$/);
        if (m) {
          meta.push({ label: m[1], value: m[2].trim() });
        } else if (/(死亡风险|复苏风险|风险来源|代价|后果)/.test(segment)) {
          detailParts.push(segment);
        }
      }
      return { detail: detailParts.join('；'), meta };
    };

    const renderChoices = (body: HTMLElement, actions: string[]) => {
      body.textContent = '';
      body.style.whiteSpace = 'normal';
      body.dataset.mfrsSpEnhanced = 'true';

      const legend = hostDocument.createElement('div');
      legend.className = 'mfrs-choice-legend';
      const legendItems: Array<[string, string]> = [
        ['high', '高危'],
        ['mid', '中险'],
        ['low', '稳妥'],
        ['unknown', '未明'],
      ];
      legendItems.forEach(([risk, label]) => {
        const item = hostDocument.createElement('span');
        item.className = 'mfrs-choice-legend-item';
        const dot = hostDocument.createElement('span');
        dot.className = 'mfrs-choice-legend-dot';
        dot.style.background = risk === 'high' ? '#d83030' : risk === 'mid' ? '#c8742a' : risk === 'low' ? '#5a7a30' : '#6a4a6a';
        item.appendChild(dot);
        item.appendChild(hostDocument.createTextNode(label));
        legend.appendChild(item);
      });
      body.appendChild(legend);

      const list = hostDocument.createElement('div');
      list.className = 'mfrs-choice-list';

      actions.forEach((line, index) => {
        const key = /^[A-Da-d][\.、：:]/.test(line) ? line.slice(0, 1).toUpperCase() : String.fromCharCode(65 + index);
        const rawText = line.replace(/^[A-Da-d][\.、：:]\s*/, '').trim();
        const actionText = getActionText(rawText);
        const visibleText = actionText || rawText;
        const risk = detectRisk(rawText);
        const { meta } = splitChoiceDetail(rawText);

        const item = hostDocument.createElement('div');
        item.className = 'mfrs-choice-item';
        item.dataset.risk = risk;

        const button = hostDocument.createElement('button');
        button.type = 'button';
        button.className = 'mfrs-choice-button';
        button.dataset.risk = risk;
        const keySpan = hostDocument.createElement('span');
        keySpan.className = 'mfrs-choice-key';
        keySpan.textContent = key;
        const riskTag = hostDocument.createElement('span');
        riskTag.className = 'mfrs-choice-risk';
        riskTag.textContent = riskLabel(risk);
        button.append(keySpan, visibleText, riskTag);
        button.addEventListener('click', () => {
          const input = getSendTextarea(hostDocument);
          if (!input) return;
          setTextareaValue(input, actionText);
          hostWindow?.toastr?.info?.(`已填入选项 ${key}`);
        });
        item.appendChild(button);

        // 把死亡风险/复苏风险/风险来源等明细收进可折叠理由区，默认折叠保持简洁
        if (meta.length) {
          const details = hostDocument.createElement('details');
          details.className = 'mfrs-choice-why';
          const summary = hostDocument.createElement('summary');
          details.appendChild(summary);
          const metaWrap = hostDocument.createElement('div');
          metaWrap.className = 'mfrs-choice-why-body';
          meta.forEach(({ label, value }) => {
            const row = hostDocument.createElement('div');
            row.className = 'mfrs-choice-why-row';
            const tag = hostDocument.createElement('span');
            tag.className = 'mfrs-choice-why-key';
            if (label === '死亡风险') tag.classList.add('is-death');
            if (label === '复苏风险') tag.classList.add('is-revive');
            tag.textContent = label;
            row.append(tag, hostDocument.createTextNode(value));
            metaWrap.appendChild(row);
          });
          details.appendChild(metaWrap);
          item.appendChild(details);
        }

        list.appendChild(item);
      });

      body.appendChild(list);
    };

    const splitChoiceActions = (raw: string) => {
      const text = raw.replace(/\r\n?/g, '\n').replace(/\u00a0/g, ' ').trim();
      const marker = /(?:^|[\n\r\s。；;！？!?，,、])([A-Da-d])\s*[\.、：:]\s*/g;
      const matches = Array.from(text.matchAll(marker));
      if (!matches.length) return [];

      return matches
        .map((match, index) => {
          const markerText = match[0];
          const bodyStart = (match.index ?? 0) + markerText.length;
          const next = matches[index + 1];
          const nextMarkerText = next?.[0] ?? '';
          const nextKeyOffset = nextMarkerText.search(/[A-Da-d]/);
          const bodyEnd = next
            ? (next.index ?? text.length) + Math.max(0, nextKeyOffset)
            : text.length;
          const key = match[1].toUpperCase();
          const body = text.slice(bodyStart, bodyEnd).trim();
          if (!body || /^标题[：:]/.test(body) || /^说明[：:]/.test(body)) return '';
          return `${key}. ${body}`;
        })
        .filter(Boolean)
        .slice(0, 4);
    };

    const panels = hostDocument.querySelectorAll<HTMLElement>(
      '.custom-sp-panel-choices:not([data-mfrs-choice-ready]), .sp-panel-choices:not([data-mfrs-choice-ready])',
    );
    for (const panel of panels) {
      const body = panel.querySelector<HTMLElement>('.custom-sp-panel-body, .sp-panel-body');
      if (!body) continue;

      const raw = body.textContent ?? '';
      const lines = raw
        .split(/\n+/)
        .map(line => line.trim())
        .filter(Boolean);
      const actions = lines.filter(line => /^[A-Da-d][\.、：:]/.test(line));


      if (actions.length < 4) {
        const splitActions = splitChoiceActions(raw);
        if (splitActions.length > actions.length) {
          actions.splice(0, actions.length, ...splitActions);
        }
      }
      if (!actions.length) continue;

      renderChoices(body, actions);
      panel.dataset.mfrsChoiceReady = 'true';
    }

    const optionParagraphs = hostDocument.querySelectorAll<HTMLElement>('.mes_text p:not([data-mfrs-choice-ready])');
    for (const paragraph of optionParagraphs) {
      const fonts = Array.from(paragraph.querySelectorAll('font'));
      if (fonts.length < 4) continue;
      const actions = fonts.map(font => font.textContent?.trim() ?? '').filter(Boolean);
      if (actions.length < 4) continue;
      paragraph.dataset.mfrsChoiceReady = 'true';
      renderChoices(paragraph, actions.slice(0, 4));
    }
  };

  const SP_PRIMARY_KEY = /标题|死亡风险|复苏风险|风险变化|结果|可见结论|结论|建议|下一步|确认度|状态/;

  const renderSpLine = (line: string) => {
    const escaped = line
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    const fieldMatch = escaped.match(/^([^：:]{2,16})[：:](.*)$/);
    const riskClass = /死亡风险|复苏风险|高危|濒死|失控|命中规律|被标记/.test(escaped)
      ? ' sp-risk-high'
      : /疑似|中等|接触|鬼域|试探/.test(escaped)
        ? ' sp-risk-mid'
        : /低|暂避|隔绝|撤离|无/.test(escaped)
          ? ' sp-risk-low'
          : '';
    if (!fieldMatch) return `<span class="${riskClass.trim()}">${escaped}</span>`;
    return `<span class="sp-field-line${riskClass}"><span class="sp-field-key">${fieldMatch[1]}：</span>${fieldMatch[2]}</span>`;
  };

  const enhanceShortTagPanels = () => {
    const panels = hostDocument.querySelectorAll<HTMLElement>('.sp-panel-body:not([data-mfrs-sp-enhanced])');
    for (const panel of panels) {
      panel.dataset.mfrsSpEnhanced = 'true';
      const raw = panel.textContent ?? '';
      if (!raw.trim()) continue;
      const lines = raw.split('\n');
      const nonEmpty = lines.filter(line => line.trim());
      // 字段较少时全部直显；字段多时把次要字段收进折叠面板，核心字段（标题/风险/结论/建议）始终直显
      const primary: string[] = [];
      const secondary: string[] = [];
      nonEmpty.forEach((line, index) => {
        const isPrimary = index === 0 || SP_PRIMARY_KEY.test(line.split(/[：:]/)[0] ?? '');
        (isPrimary ? primary : secondary).push(line);
      });
      const shouldFold = nonEmpty.length > 6 && secondary.length >= 3;
      if (!shouldFold) {
        panel.innerHTML = lines.map(renderSpLine).join('\n');
        continue;
      }
      const primaryHtml = primary.map(renderSpLine).join('\n');
      const secondaryHtml = secondary.map(renderSpLine).join('\n');
      panel.innerHTML =
        `<div class="sp-primary">${primaryHtml}</div>` +
        `<details class="sp-secondary"><summary>展开细节（${secondary.length} 项）</summary>` +
        `<div class="sp-secondary-body">${secondaryHtml}</div></details>`;
    }
  };

  const computeFairRoll = (seed: string) => {
    let hash = 0;
    for (let index = 0; index < seed.length; index += 1) {
      hash = (hash * 31 + seed.charCodeAt(index)) >>> 0;
    }
    return (hash % 100) + 1;
  };

  const enhanceRollBars = () => {
    const bars = hostDocument.querySelectorAll<HTMLElement>(
      '.mfrs-roll[data-mfrs-roll]:not([data-mfrs-roll-ready])',
    );
    for (const bar of bars) {
      bar.dataset.mfrsRollReady = 'true';
      const seed = bar.dataset.seed ?? '';
      const claimed = Number.parseInt(bar.dataset.roll ?? '', 10);
      const dc = Number.parseInt(bar.dataset.dc ?? '', 10);
      if (!seed || Number.isNaN(claimed) || Number.isNaN(dc)) continue;

      const fair = computeFairRoll(seed);
      const verified = fair === claimed;
      const shown = verified ? claimed : fair;
      const pass = shown >= dc;
      const clamp = (value: number) => Math.max(0, Math.min(100, value));

      const marker = bar.querySelector<HTMLElement>('.mfrs-roll-marker');
      if (marker) marker.style.left = `${clamp(shown)}%`;
      const dcLine = bar.querySelector<HTMLElement>('.mfrs-roll-dc');
      if (dcLine) dcLine.style.left = `${clamp(dc)}%`;
      const num = bar.querySelector<HTMLElement>('.mfrs-roll-num');
      if (num) num.textContent = String(shown);

      const result = bar.querySelector<HTMLElement>('.mfrs-roll-result');
      if (result) {
        result.textContent = pass ? '通过' : '未通过';
        result.classList.add(pass ? 'is-pass' : 'is-fail');
      }
      const verify = bar.querySelector<HTMLElement>('.mfrs-roll-verify');
      if (verify) {
        const seedHtml = `<span class="mfrs-roll-seed">${seed}</span>`;
        verify.innerHTML = verified
          ? `✓ 已验证 seed ${seedHtml}`
          : `⚠ 已按 seed 复算（原值 ${Number.isNaN(claimed) ? '无' : claimed}）seed ${seedHtml}`;
      }
    }
  };

  const fillWelcomeStart = (root: HTMLElement) => {
    const fallbackSelectors: Record<string, string> = {
      name: '#mfrs-name',
      ageGender: '#mfrs-age-gender',
      identity: '#mfrs-identity',
      anchor: '#mfrs-anchor-value',
      ghostPreset1: '#mfrs-ghost-preset-1',
      ghostName1: '#mfrs-ghost-name-1',
      ghostLaw1: '#mfrs-ghost-law-1',
      ghostName2: '#mfrs-ghost-name-2',
      ghostLaw2: '#mfrs-ghost-law-2',
      specialAbility: '#mfrs-special-ability',
      resources: '#mfrs-resources',
      background: '#mfrs-background',
    };
    const getValue = (key: string) => {
      const selectors = [`[data-mfrs="${key}"]`, fallbackSelectors[key]].filter(Boolean).join(', ');
      return root.querySelector<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(selectors)?.value.trim() ?? '';
    };
    const getPresetGhost = () => getValue('ghostPreset1');
    const getCustomGhosts = () => {
      const ghosts: string[] = [];
      const presetGhost = getPresetGhost();
      if (presetGhost) ghosts.push(`第1只：预设厉鬼：${presetGhost}`);
      for (let index = 1; index <= 2; index += 1) {
        if (index === 1 && presetGhost) continue;
        const name = getValue(`ghostName${index}`) || (index === 1 ? getValue('ghostName') : '');
        const law = getValue(`ghostLaw${index}`) || (index === 1 ? getValue('ghostLaw') : '');
        if (!name && !law) continue;
        ghosts.push(`第${index}只：${name || '未命名'}；可见杀人规律：${law || '未填写'}`);
      }
      return ghosts.length ? ghosts.join('\n     ') : '无';
    };
    const anchorParts = getValue('anchor').split('|');
    const hasTimeField = anchorParts.length >= 7;
    const anchor = anchorParts[0] || '未选择节点';
    const storyTime = hasTimeField ? anchorParts[1] : '由当前剧情节点决定';
    const storyLocation = (hasTimeField ? anchorParts[2] : anchorParts[1]) || '由当前剧情节点决定';
    const storyPhase = (hasTimeField ? anchorParts[3] : anchorParts[2]) || '未定阶段';
    const eventPressure = (hasTimeField ? anchorParts[4] : anchorParts[3]) || '请根据身份与剧情节点判断接入边界';
    const visibleIntel = (hasTimeField ? anchorParts[5] : anchorParts[4]) || '仅依据当前选择与背景设定';
    const spoilerBoundary = (hasTimeField ? anchorParts[6] : anchorParts[5]) || '不得直接揭露隐藏规律、关键生路和幕后真相';
    const message = `【神秘复苏·开局设定】\n\n` +
      `1. 基本信息\n` +
      `   - 姓名：${getValue('name')}\n` +
      `   - 年龄/性别：${getValue('ageGender')}\n` +
      `   - 剧情节点：${anchor}\n` +
      `   - 当前时间：${storyTime}\n` +
      `   - 当前地点：${storyLocation}\n` +
      `   - 原著阶段：${storyPhase}\n` +
      `   - 事件压力：${eventPressure}\n` +
      `   - 玩家可见情报：${visibleIntel}\n` +
      `   - 禁止泄露边界：${spoilerBoundary}\n\n` +
      `2. 身份与能力\n` +
      `   - 身份：${getValue('identity')}\n` +
      `   - 开局厉鬼选择（第1只可选预设或自定义，第2只可自定义）：\n` +
      `     ${getCustomGhosts()}\n` +
      `   - 特殊能力（上限1个）：${getValue('specialAbility') || '无'}\n\n` +
      `3. 初始资源\n` +
      `   ${getValue('resources') || '无'}\n\n` +
      `4. 背景设定\n` +
      `   ${getValue('background')}\n\n` +
      `5. 推演边界与初始化建议\n` +
      `   - 可见信息层级：请依据身份、背景、当前证据和剧情节点动态判断；没有证据时只给眼前现象、传闻或不确定推断。\n` +
      `   - 初始变量建议：将姓名、身份、当前时间、当前地点、原著阶段、剧情锚点写入玩家/全局状态；若节点已处于灵异事件中，应按玩家可见情报立案当前灵异事件。\n` +
      `   - 调查起点：从“遭遇异常”或“收集线索”阶段开始，不直接跳到完整规律或最终生路。\n` +
      `   - 开局厉鬼判定：若玩家在第1只厉鬼选择预设，只能把预设资料当作开局可见档案和成长方向，不得直接明牌隐藏规律、关键生路或完整拼图；若玩家自定义厉鬼，只提供厉鬼名称和可见杀人规律，影响范围、灾害等级、恐怖程度、真实代价、限制和可关押条件必须由AI依据现场证据、规律表现、媒介、鬼域、成长性、衍生物和神秘复苏铁律自行推断。第1只厉鬼只能读取预设或自定义之一，第2只仅读取自定义，超出部分无效。\n` +
      `   - 特殊能力判定：特殊能力为主角独有外挂，最多读取1个；对玩家自身按声明效果生效且无自身代价，但不自动提供完整隐藏规律、最终生路、源头鬼位置或无条件关押结果。若选择“强外挂模式（非默认）·永久死机驾驭”，视为主动开启高强度辅助模式：玩家已经成功驾驭的所有厉鬼本体都会死机，包括开局厉鬼和后续驾驭的新厉鬼；但新厉鬼仍必须按灵异对抗、关押、平衡、异类或诅咒等规则完成驾驭，不能凭空获得或跳过驾驭过程。通过拼图、档案、残片、鬼奴、媒介或交易调用的外来灵异仍需判定污染、冲突、反噬和失控风险。\n` +
      `   - 隐藏边界：真实杀人规律、关键生路、鬼的真实位置、后续重大转折只写入隐藏档案，不进入正文、状态栏或选项。`;
    const input = getSendTextarea(hostDocument);
    if (!input) return;
    setTextareaValue(input, message);
    hostWindow?.toastr?.info?.('已填入神秘复苏开局设定');
  };

  const setSecondGhostSlotVisible = (root: HTMLElement, visible: boolean) => {
    const secondSlot = root.querySelector<HTMLElement>('[data-mfrs-ghost-slot="2"], [data-ghost-slot="2"]');
    const addButton = root.querySelector<HTMLElement>('.mfrs-ghost-add, .custom-mfrs-ghost-add, #mfrs-add-ghost');
    if (!secondSlot) return;

    if (visible) {
      secondSlot.hidden = false;
      if (addButton) addButton.hidden = true;
      secondSlot.querySelector<HTMLElement>('input, textarea')?.focus();
      return;
    }

    secondSlot.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>('input, textarea, select').forEach(input => {
      input.value = '';
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
    secondSlot.hidden = true;
    if (addButton) addButton.hidden = false;
  };

  const welcomeRootSelector = '#mfrs-welcome-root, .mfrs-welcome-root, .custom-mfrs-welcome-root';
  const inWelcomeRoots = (childSelector: string) => welcomeRootSelector
    .split(',')
    .map(selector => `${selector.trim()} ${childSelector}`)
    .join(', ');
  const ghostPresetSelector = '[data-mfrs="ghostPreset1"], #mfrs-ghost-preset-1';
  const specialAbilityPresetSelector = '[data-mfrs="specialAbilityPreset"], #mfrs-special-ability-preset';

  const isHostSelectElement = (element: Element | null): element is HTMLSelectElement => {
    if (!element || element.tagName !== 'SELECT') return false;
    const HostHTMLSelectElement = hostWindow?.HTMLSelectElement;
    return !HostHTMLSelectElement || element instanceof HostHTMLSelectElement || 'options' in element;
  };

  const syncPresetGhost1 = (root: HTMLElement) => {
    const preset = root.querySelector<HTMLSelectElement>('[data-mfrs="ghostPreset1"], #mfrs-ghost-preset-1');
    const nameInput = root.querySelector<HTMLInputElement>('[data-mfrs="ghostName1"], #mfrs-ghost-name-1');
    const lawInput = root.querySelector<HTMLTextAreaElement>('[data-mfrs="ghostLaw1"], #mfrs-ghost-law-1');
    if (!preset || !nameInput || !lawInput) return;
    const value = preset.value.trim();
    const lawMatch = value.match(/可见杀人规律：([^；]+)/);
    nameInput.value = value ? value.split('；')[0] : '';
    lawInput.value = value && lawMatch ? lawMatch[1] : '';
    nameInput.dispatchEvent(new Event('input', { bubbles: true }));
    lawInput.dispatchEvent(new Event('input', { bubbles: true }));
  };

  const syncSpecialAbilityPreset = (root: HTMLElement) => {
    const preset = root.querySelector<HTMLSelectElement>('[data-mfrs="specialAbilityPreset"], #mfrs-special-ability-preset');
    const abilityInput = root.querySelector<HTMLTextAreaElement>('[data-mfrs="specialAbility"], #mfrs-special-ability');
    if (!preset || !abilityInput) return;
    abilityInput.value = preset.value.trim();
    abilityInput.dispatchEvent(new Event('input', { bubbles: true }));
  };

  const closeSiblingAccordions = (node: HTMLElement, selector: string) => {
    Array.from(node.parentElement?.children ?? []).forEach(sibling => {
      if (sibling !== node && sibling.matches(selector)) sibling.classList.remove('is-open');
    });
  };

  type WelcomeAnchorOption = {
    group: string;
    chapter: string;
    name: string;
    time: string;
    loc: string;
    value: string;
  };

  const enhanceWelcomeAnchors = () => {
    hostDocument.querySelectorAll<Element>(inWelcomeRoots('select[data-mfrs="anchor"]')).forEach(element => {
      if (!isHostSelectElement(element)) return;
      const select = element;
      if (select.dataset.mfrsAnchorEnhanced === 'true') return;
      const root = select.closest<HTMLElement>(welcomeRootSelector);
      if (!root) return;
      const optionElements = Array.from(select.querySelectorAll<HTMLOptionElement>('option'));
      const options = optionElements
        .filter(option => option.value.trim())
        .map(option => {
          const parts = option.value.split('|');
          return {
            group: option.dataset.group || '剧情节点',
            chapter: option.dataset.chapter || '默认入口',
            name: option.dataset.name || parts[0] || option.textContent?.trim() || '未命名节点',
            time: option.dataset.time || parts[1] || '由当前剧情节点决定',
            loc: option.dataset.loc || parts[2] || '由当前剧情节点决定',
            value: option.value,
          };
        });
      if (!options.length) return;

      select.dataset.mfrsAnchorEnhanced = 'true';
      select.style.display = 'none';

      const dropdown = hostDocument.createElement('div');
      dropdown.className = 'mfrs-dropdown';
      dropdown.dataset.mfrsAnchorDropdown = 'true';

      const trigger = hostDocument.createElement('button');
      trigger.type = 'button';
      trigger.className = 'mfrs-dropdown-trigger';
      trigger.setAttribute('aria-haspopup', 'listbox');
      trigger.setAttribute('aria-expanded', 'false');

      const display = hostDocument.createElement('span');
      display.className = 'mfrs-dropdown-display';
      const selectedOption = optionElements.find(option => option.selected && option.value.trim());
      display.textContent = selectedOption ? selectedOption.textContent?.trim() || '选择剧情节点' : '选择剧情节点';
      trigger.appendChild(display);

      const arrow = hostDocument.createElement('span');
      arrow.className = 'mfrs-dropdown-arrow';
      arrow.textContent = '▾';
      trigger.appendChild(arrow);
      dropdown.appendChild(trigger);

      const menu = hostDocument.createElement('div');
      menu.className = 'mfrs-dropdown-menu';
      menu.setAttribute('role', 'listbox');

      const grouped = new Map<string, Map<string, WelcomeAnchorOption[]>>();
      options.forEach(option => {
        if (!grouped.has(option.group)) grouped.set(option.group, new Map());
        const chapters = grouped.get(option.group)!;
        if (!chapters.has(option.chapter)) chapters.set(option.chapter, []);
        chapters.get(option.chapter)!.push(option);
      });

      let groupIndex = 0;
      grouped.forEach((chapters, groupName) => {
        const groupDiv = hostDocument.createElement('div');
        groupDiv.className = 'mfrs-dropdown-group';
        if (groupIndex === 0) groupDiv.classList.add('is-open');

        const groupTitle = hostDocument.createElement('div');
        groupTitle.className = 'mfrs-dropdown-group-title';
        groupTitle.textContent = groupName;
        groupTitle.addEventListener('click', event => {
          event.preventDefault();
          event.stopPropagation();
          closeSiblingAccordions(groupDiv, '.mfrs-dropdown-group');
          groupDiv.classList.toggle('is-open');
        });
        groupDiv.appendChild(groupTitle);

        const groupBody = hostDocument.createElement('div');
        groupBody.className = 'mfrs-dropdown-group-body';

        let chapterIndex = 0;
        chapters.forEach((items, chapterName) => {
          const chapterDiv = hostDocument.createElement('div');
          chapterDiv.className = 'mfrs-dropdown-chapter';
          if (groupIndex === 0 && chapterIndex === 0) chapterDiv.classList.add('is-open');

          const chapterTitle = hostDocument.createElement('div');
          chapterTitle.className = 'mfrs-dropdown-chapter-title';
          chapterTitle.textContent = chapterName;
          chapterTitle.addEventListener('click', event => {
            event.preventDefault();
            event.stopPropagation();
            closeSiblingAccordions(chapterDiv, '.mfrs-dropdown-chapter');
            chapterDiv.classList.toggle('is-open');
          });
          chapterDiv.appendChild(chapterTitle);

          const chapterBody = hostDocument.createElement('div');
          chapterBody.className = 'mfrs-dropdown-chapter-body';

          items.forEach(item => {
            const itemDiv = hostDocument.createElement('div');
            itemDiv.className = 'mfrs-dropdown-item';
            itemDiv.setAttribute('role', 'option');
            itemDiv.tabIndex = 0;

            const nameSpan = hostDocument.createElement('span');
            nameSpan.className = 'mfrs-dropdown-item-name';
            nameSpan.textContent = item.name;
            itemDiv.appendChild(nameSpan);

            const metaSpan = hostDocument.createElement('span');
            metaSpan.className = 'mfrs-dropdown-item-meta';
            metaSpan.textContent = `${item.time} · ${item.loc || '自定义地点'}`;
            itemDiv.appendChild(metaSpan);

            const choose = () => {
              select.value = item.value;
              display.textContent = `${item.group} · ${item.chapter} · ${item.name}`;
              dropdown.classList.remove('is-open');
              trigger.setAttribute('aria-expanded', 'false');
              select.dispatchEvent(new Event('input', { bubbles: true }));
              select.dispatchEvent(new Event('change', { bubbles: true }));
            };
            itemDiv.addEventListener('click', event => {
              event.preventDefault();
              event.stopPropagation();
              choose();
            });
            itemDiv.addEventListener('keydown', event => {
              if (event.key !== 'Enter' && event.key !== ' ') return;
              event.preventDefault();
              choose();
            });
            chapterBody.appendChild(itemDiv);
          });

          chapterDiv.appendChild(chapterBody);
          groupBody.appendChild(chapterDiv);
          chapterIndex += 1;
        });

        groupDiv.appendChild(groupBody);
        menu.appendChild(groupDiv);
        groupIndex += 1;
      });

      dropdown.appendChild(menu);
      select.insertAdjacentElement('afterend', dropdown);

      trigger.addEventListener('click', event => {
        event.preventDefault();
        event.stopPropagation();
        const willOpen = !dropdown.classList.contains('is-open');
        root.querySelectorAll<HTMLElement>('.mfrs-dropdown.is-open, .custom-mfrs-dropdown.is-open').forEach(openDropdown => {
          if (openDropdown !== dropdown) openDropdown.classList.remove('is-open');
        });
        dropdown.classList.toggle('is-open', willOpen);
        trigger.setAttribute('aria-expanded', String(willOpen));
      });
      menu.addEventListener('click', event => event.stopPropagation());
    });
  };

  const fillInputPanel = (root: HTMLElement) => {
    const getValue = (key: string) => root.querySelector<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(`[data-mfrs-input="${key}"]`)?.value.trim() ?? '';
    const lines = [
      '【神秘复苏·复杂行动】',
      '',
      `行动类型：${getValue('type') || '复杂行动'}`,
      `目标/对象：${getValue('target') || '未指定'}`,
      `地点：${getValue('place') || '当前位置'}`,
      `方式/策略：${getValue('method') || '谨慎行动，优先确认风险'}`,
      `投入资源：${getValue('resources') || '无'}`,
      `约束与底线：${getValue('limits') || '优先保命，不主动扩大灵异影响'}`,
      `补充描述：${getValue('extra') || '请基于玩家可见事实推演结果、风险和下一步可选行动。'}`,
    ];
    const input = getSendTextarea(hostDocument);
    if (!input) return;
    setTextareaValue(input, lines.join('\n'));
    hostWindow?.toastr?.info?.('已填入复杂行动草稿');
  };

  const clearInputPanel = (root: HTMLElement) => {
    root.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>('input[data-mfrs-input], textarea[data-mfrs-input]').forEach(input => {
      input.value = '';
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
  };

  const handleInputPanelClick = (event: Event) => {
    const target = event.target as HTMLElement | null;
    const button = target?.closest('.mfrs-input-fill, .custom-mfrs-input-fill, .mfrs-input-clear, .custom-mfrs-input-clear');
    if (!button) return;
    const root = button.closest<HTMLElement>('.mfrs-input-panel, .custom-mfrs-input-panel');
    if (!root) return;
    event.preventDefault();
    if (button.matches('.mfrs-input-clear, .custom-mfrs-input-clear')) {
      clearInputPanel(root);
      return;
    }
    fillInputPanel(root);
  };

  const handleWelcomeClick = (event: Event) => {
    const target = event.target as HTMLElement | null;
    if (!target?.closest('.mfrs-dropdown, .custom-mfrs-dropdown')) {
      hostDocument.querySelectorAll<HTMLElement>('.mfrs-dropdown.is-open, .custom-mfrs-dropdown.is-open').forEach(dropdown => {
        dropdown.classList.remove('is-open');
        dropdown.querySelector<HTMLElement>('.mfrs-dropdown-trigger, .custom-mfrs-dropdown-trigger')?.setAttribute('aria-expanded', 'false');
      });
    }

    const ghostButton = target?.closest('.mfrs-ghost-add, .mfrs-ghost-remove, .custom-mfrs-ghost-add, .custom-mfrs-ghost-remove, #mfrs-add-ghost, #mfrs-remove-ghost');
    if (ghostButton) {
      const root = ghostButton.closest<HTMLElement>('#mfrs-welcome-root, .mfrs-welcome-root, .custom-mfrs-welcome-root');
      if (!root) return;
      event.preventDefault();
      event.stopPropagation();
      setSecondGhostSlotVisible(root, ghostButton.matches('.mfrs-ghost-add, .custom-mfrs-ghost-add, #mfrs-add-ghost'));
      return;
    }

    const button = target?.closest('.mfrs-submit, .custom-mfrs-submit');
    if (!button) return;
    const root = button.closest<HTMLElement>('#mfrs-welcome-root, .mfrs-welcome-root, .custom-mfrs-welcome-root');
    if (!root) return;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    fillWelcomeStart(root);
  };

  const handleWelcomeChange = (event: Event) => {
    const target = event.target as HTMLElement | null;
    if (!target?.matches(`${ghostPresetSelector}, ${specialAbilityPresetSelector}`)) return;
    const root = target.closest<HTMLElement>(welcomeRootSelector);
    if (!root) return;
    if (target.matches(ghostPresetSelector)) syncPresetGhost1(root);
    if (target.matches(specialAbilityPresetSelector)) syncSpecialAbilityPreset(root);
  };

  const bindWelcomePresetControls = () => {
    hostDocument.querySelectorAll<HTMLSelectElement>(`${ghostPresetSelector}, ${specialAbilityPresetSelector}`).forEach(select => {
      if (select.dataset.mfrsPresetBound === 'true') return;
      const root = select.closest<HTMLElement>(welcomeRootSelector);
      if (!root) return;
      select.dataset.mfrsPresetBound = 'true';
      const sync = () => {
        const currentRoot = select.closest<HTMLElement>(welcomeRootSelector);
        if (!currentRoot) return;
        if (select.matches(ghostPresetSelector)) syncPresetGhost1(currentRoot);
        if (select.matches(specialAbilityPresetSelector)) syncSpecialAbilityPreset(currentRoot);
      };
      select.addEventListener('change', sync, true);
      select.addEventListener('input', sync, true);
      select.addEventListener('click', () => hostWindow?.setTimeout(sync, 0), true);
      select.addEventListener('keyup', event => {
        if (event.key === 'Enter' || event.key === ' ') hostWindow?.setTimeout(sync, 0);
      }, true);
    });
  };

  const bindWelcomeGhostButtons = () => {
    hostDocument.querySelectorAll<HTMLElement>(
      '.mfrs-ghost-add, .mfrs-ghost-remove, .custom-mfrs-ghost-add, .custom-mfrs-ghost-remove, #mfrs-add-ghost, #mfrs-remove-ghost',
    ).forEach(button => {
      if (button.dataset.mfrsGhostBound === 'true') return;
      button.dataset.mfrsGhostBound = 'true';
      button.addEventListener('click', event => {
        const root = button.closest<HTMLElement>('#mfrs-welcome-root, .mfrs-welcome-root, .custom-mfrs-welcome-root');
        if (!root) return;
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        setSecondGhostSlotVisible(root, button.matches('.mfrs-ghost-add, .custom-mfrs-ghost-add, #mfrs-add-ghost'));
      }, true);
    });
  };

  let welcomeDashboardAutoOpenDone = false;

  const openDashboardForWelcome = () => {
    if (welcomeDashboardAutoOpenDone) return;
    const welcomeRoot = hostDocument.querySelector<HTMLElement>(welcomeRootSelector);
    if (!welcomeRoot) return;
    welcomeDashboardAutoOpenDone = true;
    const delays = [0, 500, 1500, 3000];
    delays.forEach(delay => {
      const timerId = hostWindow?.setTimeout(() => {
        hostWindow?.MysteryDatabaseFrontend?.openDashboard?.({ welcome: true });
      }, delay);
      if (timerId !== undefined) timeoutIds.push(timerId);
    });
  };

  const enhancePanels = () => {
    hideInternalChoicePayloadLeaks();
    enhanceWelcomeAnchors();
    bindWelcomePresetControls();
    bindWelcomeGhostButtons();
    enhanceChoicePanels();
    enhanceShortTagPanels();
    enhanceRollBars();
  };

  const timeoutIds = [0, 250, 1000, 2500].map(delay => hostWindow?.setTimeout(enhancePanels, delay));
  timeoutIds.push(...[0, 500, 1500, 3000].map(delay => hostWindow?.setTimeout(openDashboardForWelcome, delay)));
  const bodyObserver = new HostMutationObserver(() => {
    enhancePanels();
    openDashboardForWelcome();
  });
  bodyObserver.observe(hostDocument.body, { childList: true, subtree: true });
  hostDocument.addEventListener('click', handleWelcomeClick, true);
  hostDocument.addEventListener('change', handleWelcomeChange, true);
  hostDocument.addEventListener('click', handleInputPanelClick, true);

  const cleanup = () => {
    observer.disconnect();
    bodyObserver.disconnect();
    hostDocument.removeEventListener('click', handleWelcomeClick, true);
    hostDocument.removeEventListener('change', handleWelcomeChange, true);
    hostDocument.removeEventListener('click', handleInputPanelClick, true);
    timeoutIds.forEach(id => {
      if (id !== undefined) hostWindow?.clearTimeout(id);
    });
    hostStyle.remove();
    if (hostWindow?.__mfrsHorrorThemeCleanup__ === cleanup) {
      delete hostWindow.__mfrsHorrorThemeCleanup__;
    }
  };

  if (hostWindow) {
    hostWindow.__mfrsHorrorThemeCleanup__ = cleanup;
  }

  // 脚本卸载时清理样式
  window.addEventListener('pagehide', cleanup, { once: true });

  console.info('[界面美化] 暗黑恐怖主题已注入');
});
