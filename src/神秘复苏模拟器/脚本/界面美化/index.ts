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
    repeating-linear-gradient(30deg, transparent 0, transparent 23px, rgba(140,20,20,0.04) 23px, rgba(140,20,20,0.04) 24px),
    repeating-linear-gradient(150deg, transparent 0, transparent 23px, rgba(140,20,20,0.04) 23px, rgba(140,20,20,0.04) 24px),
    repeating-linear-gradient(90deg, transparent 0, transparent 41px, rgba(140,20,20,0.04) 41px, rgba(140,20,20,0.04) 42px),
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
  transform-origin: center !important;
  animation: mfrs-seal-spin 10s linear infinite !important;
}

@keyframes mfrs-seal-spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
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
  width: 8px !important;
}

::-webkit-scrollbar-track {
  background: #151111 !important;
}

::-webkit-scrollbar-thumb {
  background: rgba(140,20,20,.55) !important;
  border-radius: 2px !important;
}

::-webkit-scrollbar-thumb:hover {
  background: rgba(220,50,50,.95) !important;
  box-shadow: 0 0 6px rgba(220,50,50,.6) !important;
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
  padding: 20px 24px !important;
  margin: 18px auto !important;
  max-width: 560px !important;
  position: relative !important;
  box-shadow: 0 0 22px rgba(0,0,0,0.45), inset 0 0 24px rgba(40,10,10,0.32), 0 0 6px rgba(120,30,30,0.18) !important;
  clip-path: polygon(8px 0, calc(100% - 8px) 0, 100% 8px, 100% calc(100% - 8px), calc(100% - 8px) 100%, 8px 100%, 0 calc(100% - 8px), 0 8px) !important;
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
  text-align: center !important;
  position: relative !important;
}

.horror-options-title::before {
  content: '◆' !important;
  position: absolute !important;
  left: 0 !important;
  color: #9a3a3a !important;
  font-size: 14px !important;
}

.horror-options-title::after {
  content: '◇' !important;
  position: absolute !important;
  right: 0 !important;
  color: #9a3a3a !important;
  font-size: 14px !important;
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
  cursor: pointer !important;
  font: inherit !important;
  line-height: 1.65 !important;
  box-shadow: inset 0 0 14px rgba(0,0,0,.2) !important;
  position: relative !important;
  border-radius: 0 !important;
  clip-path: polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px) !important;
  filter: drop-shadow(0 6px 12px rgba(164,66,66,.5)) drop-shadow(0 12px 24px rgba(164,66,66,.35)) drop-shadow(0 20px 48px rgba(164,66,66,.2)) !important;
  transition: filter 0.25s ease, color 0.25s ease !important;
}

.mfrs-choice-button[data-risk="high"] { border-left-color: #b23a32 !important; filter: drop-shadow(0 6px 12px rgba(178,58,50,.5)) drop-shadow(0 12px 24px rgba(178,58,50,.35)) drop-shadow(0 20px 48px rgba(178,58,50,.2)) !important; }
.mfrs-choice-button[data-risk="mid"] { border-left-color: #c8742a !important; filter: drop-shadow(0 6px 12px rgba(200,116,42,.5)) drop-shadow(0 12px 24px rgba(200,116,42,.35)) drop-shadow(0 20px 48px rgba(200,116,42,.2)) !important; }
.mfrs-choice-button[data-risk="low"] { border-left-color: #5a7a30 !important; filter: drop-shadow(0 6px 12px rgba(90,122,48,.5)) drop-shadow(0 12px 24px rgba(90,122,48,.35)) drop-shadow(0 20px 48px rgba(90,122,48,.2)) !important; }
.mfrs-choice-button[data-risk="unknown"] { border-left-color: #6a4a6a !important; filter: drop-shadow(0 6px 12px rgba(106,74,106,.5)) drop-shadow(0 12px 24px rgba(106,74,106,.35)) drop-shadow(0 20px 48px rgba(106,74,106,.2)) !important; }

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
  filter: drop-shadow(0 8px 16px rgba(178,58,50,.65)) drop-shadow(0 16px 32px rgba(178,58,50,.45)) drop-shadow(0 28px 64px rgba(178,58,50,.3)) !important;
}

.mfrs-choice-button[data-risk="high"]:hover { filter: drop-shadow(0 8px 16px rgba(178,58,50,.65)) drop-shadow(0 16px 32px rgba(178,58,50,.45)) drop-shadow(0 28px 64px rgba(178,58,50,.3)) !important; }
.mfrs-choice-button[data-risk="mid"]:hover { filter: drop-shadow(0 8px 16px rgba(200,116,42,.65)) drop-shadow(0 16px 32px rgba(200,116,42,.45)) drop-shadow(0 28px 64px rgba(200,116,42,.3)) !important; }
.mfrs-choice-button[data-risk="low"]:hover { filter: drop-shadow(0 8px 16px rgba(90,122,48,.65)) drop-shadow(0 16px 32px rgba(90,122,48,.45)) drop-shadow(0 28px 64px rgba(90,122,48,.3)) !important; }
.mfrs-choice-button[data-risk="unknown"]:hover { filter: drop-shadow(0 8px 16px rgba(106,74,106,.65)) drop-shadow(0 16px 32px rgba(106,74,106,.45)) drop-shadow(0 28px 64px rgba(106,74,106,.3)) !important; }

.mfrs-choice-key {
  color: #d05050 !important;
  font-weight: 800 !important;
  margin-right: 8px !important;
}

.mfrs-choice-item {
  display: block !important;
}
.mfrs-choice-item .mfrs-choice-button {
  clip-path: polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px) !important;
}
.mfrs-choice-item:has(> .mfrs-choice-why) .mfrs-choice-button {
  clip-path: polygon(8px 0, 100% 0, 100% 100%, calc(100% - 8px) 100%, 0 100%, 0 8px) !important;
}
.mfrs-choice-why {
  border: 1px solid rgba(150,58,58,.5) !important;
  border-top: none !important;
  background: rgba(20,12,12,.66) !important;
  overflow: hidden !important;
  clip-path: polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 8px 100%, 0 calc(100% - 8px)) !important;
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
/* v8.7.0: nar wrapper octagon + logo spin */
.mfrs-msg-narrative-wrapper {
  position: relative !important;
  background: #080404 !important;
  border: 2px solid #b23a32 !important;
  padding: 18px 22px 16px !important;
  margin-bottom: 16px !important;
  box-shadow:
    0 0 18px rgba(178,58,50,0.35),
    0 4px 14px rgba(0,0,0,0.45),
    inset 0 0 12px rgba(178,58,50,0.15) !important;
  overflow: hidden !important;
  line-height: 1.8 !important;
  clip-path: polygon(
    10px 0, calc(100% - 10px) 0, 100% 10px,
    100% calc(100% - 10px), calc(100% - 10px) 100%,
    10px 100%, 0 calc(100% - 10px), 0 10px
  ) !important;
}
.mfrs-msg-narrative-wrapper::before {
  content: '' !important;
  position: absolute !important;
  top: 0 !important; left: 0 !important; right: 0 !important; bottom: 0 !important;
  pointer-events: none !important;
  z-index: 0 !important;
  background:
    repeating-linear-gradient(30deg, transparent 0, transparent 23px, rgba(178,58,50,0.04) 23px, rgba(178,58,50,0.04) 24px),
    repeating-linear-gradient(150deg, transparent 0, transparent 23px, rgba(178,58,50,0.04) 23px, rgba(178,58,50,0.04) 24px),
    repeating-linear-gradient(90deg, transparent 0, transparent 41px, rgba(178,58,50,0.04) 41px, rgba(178,58,50,0.04) 42px),
    radial-gradient(ellipse at 3% 50%, rgba(178,58,50,0.06) 0%, transparent 30%),
    radial-gradient(ellipse at 97% 10%, rgba(178,58,50,0.05) 0%, transparent 25%) !important;
}
.mfrs-msg-narrative-wrapper > * {
  position: relative !important;
  z-index: 1 !important;
}
.mfrs-msg-narrative-wrapper::after {
  content: '' !important;
  position: absolute !important;
  top: 8px !important;
  right: 8px !important;
  width: 36px !important;
  height: 36px !important;
  z-index: 2 !important;
  opacity: 0.55 !important;
  pointer-events: none !important;
  transform-origin: center !important;
  background-image: url("data:image/png;base64,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") !important;
  background-repeat: no-repeat !important;
  background-position: center !important;
  background-size: contain !important;
  animation: mfrs-narrative-seal-spin 10s linear infinite !important;
}
@keyframes mfrs-narrative-seal-spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
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

  const MFRS_INLINE_PROTOCOL_TAG_PATTERN = /<\/?\s*(?:choices|sp_[a-z_]+|mfrs_[a-z_]+|UpdateVariable|JSONPatch|Analysis)\b/i;

  const hideRawProtocolParagraphs = () => {
    const protocolPattern = /<UpdateVariable|<\/UpdateVariable|<JSONPatch|<\/JSONPatch|StatusPlaceHolderImpl|myactivity\.google\.com\/product\/gemini|No\.7 High School setting locked|"\s*op\s*"\s*:\s*"\s*replace\s*"|\/行动建议|\/当前灵异事件|\/最近行动判定/;
    hostDocument.querySelectorAll<HTMLElement>('.mes_text p:not([data-mfrs-protocol-hidden])').forEach(paragraph => {
      const text = paragraph.innerText || paragraph.textContent || '';
      if (!protocolPattern.test(text) && !MFRS_INLINE_PROTOCOL_TAG_PATTERN.test(text)) return;
      paragraph.dataset.mfrsProtocolHidden = 'true';
      paragraph.hidden = true;
      paragraph.setAttribute('aria-hidden', 'true');
      paragraph.style.display = 'none';
    });
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
    enhanceWelcomeAnchors();
    bindWelcomePresetControls();
    bindWelcomeGhostButtons();
    enhanceChoicePanels();
    enhanceShortTagPanels();
    hideRawProtocolParagraphs();
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
