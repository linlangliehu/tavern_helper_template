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
  background: #0a0505 !important;
  color: #9a8888 !important;
  font-family: "Noto Sans SC", "Microsoft YaHei", sans-serif !important;
}

#chat {
  background: #0a0505 !important;
}

#top-bar {
  background: linear-gradient(180deg, #0c0606 0%, #0a0505 100%) !important;
  border-bottom: 1px solid #1a0808 !important;
  box-shadow: 0 2px 12px rgba(0,0,0,0.6) !important;
}

#send_form {
  background: linear-gradient(180deg, #0a0505 0%, #0c0606 100%) !important;
  border-top: 1px solid #1a0808 !important;
  box-shadow: 0 -2px 12px rgba(0,0,0,0.5) !important;
}

#left-nav-panel {
  background: #0a0505 !important;
  border-right: 1px solid #1a0808 !important;
}

#right-nav-panel {
  background: #0a0505 !important;
  border-left: 1px solid #1a0808 !important;
}

#send_textarea {
  background: rgba(8,3,3,0.9) !important;
  color: #d8c8c8 !important;
  border: 1px solid #2a0a0a !important;
  border-radius: 4px !important;
  caret-color: #8b2020 !important;
  font-family: "Noto Sans SC", "Microsoft YaHei", sans-serif !important;
  font-size: 14px !important;
  line-height: 1.8 !important;
  padding: 12px 16px !important;
  box-shadow:
    inset 0 0 30px rgba(0,0,0,0.6),
    inset 0 0 4px rgba(60,10,10,0.08),
    0 0 6px rgba(0,0,0,0.4) !important;
  transition: border-color 0.3s ease, box-shadow 0.3s ease !important;
}

#send_textarea::placeholder {
  color: #3a2020 !important;
  font-style: italic !important;
}

#send_textarea:focus {
  border-color: #4a1212 !important;
  box-shadow:
    inset 0 0 30px rgba(0,0,0,0.6),
    inset 0 0 6px rgba(80,15,15,0.12),
    0 0 10px rgba(80,15,15,0.15) !important;
  outline: none !important;
}

#send_but,
#mes_continue,
#mes_impersonate {
  color: #4a2828 !important;
  background: transparent !important;
  border: none !important;
  transition: color 0.25s ease, text-shadow 0.25s ease !important;
}

#send_but:hover,
#mes_continue:hover,
#mes_impersonate:hover {
  color: #8b2020 !important;
  text-shadow: 0 0 10px rgba(120,20,20,0.5) !important;
}

.mes {
  border-bottom: 1px solid #120606 !important;
  padding: 10px 10px 0 !important;
  position: relative !important;
}

.mes[is_user="true"] {
  background: linear-gradient(180deg, rgba(12,5,5,0.4) 0%, rgba(10,4,4,0.2) 100%) !important;
}

.mes[is_user="false"] {
  background: linear-gradient(180deg, rgba(6,2,2,0.6) 0%, rgba(4,1,1,0.3) 100%) !important;
}

.mes[is_user="true"] .mes_text {
  background:
    linear-gradient(135deg, rgba(12,5,5,0.6) 0%, rgba(8,3,3,0.5) 100%) !important;
  border: 1px solid #1a0808 !important;
  border-left: 2px solid #2a0a0a !important;
  border-radius: 3px !important;
  padding: 14px 18px !important;
  color: #c8baba !important;
  font-family: "Noto Sans SC", "Microsoft YaHei", sans-serif !important;
  font-size: 14px !important;
  line-height: 1.9 !important;
  position: relative !important;
  box-shadow:
    inset 0 0 20px rgba(0,0,0,0.3),
    0 0 4px rgba(0,0,0,0.2) !important;
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
    linear-gradient(135deg, rgba(5,2,2,0.8) 0%, rgba(3,1,1,0.7) 100%) !important;
  border: 1px solid #120606 !important;
  border-left: 2px solid #2a0808 !important;
  border-radius: 2px !important;
  padding: 16px 20px !important;
  color: #b0a0a0 !important;
  font-family: "Noto Sans SC", "Microsoft YaHei", sans-serif !important;
  font-size: 15px !important;
  line-height: 2 !important;
  position: relative !important;
  box-shadow:
    inset 0 0 30px rgba(0,0,0,0.5),
    0 0 6px rgba(0,0,0,0.3) !important;
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
  color: #8a3030 !important;
  text-shadow: 0 0 8px rgba(120,20,20,0.35) !important;
  letter-spacing: 1.5px !important;
  font-weight: 800 !important;
}

.mes[is_user="true"] .ch_name .name_text {
  color: #6a4040 !important;
  text-shadow: 0 0 6px rgba(100,40,40,0.25) !important;
}

.mes .mes_text p {
  margin: 0 0 10px !important;
}

.mes .mes_text p:last-child {
  margin-bottom: 0 !important;
}

.mes .mes_text hr {
  border: none !important;
  border-top: 1px solid #1a0808 !important;
  margin: 14px 0 !important;
}

.mes .mes_text blockquote {
  border-left: 2px solid #2a0808 !important;
  background: rgba(10,0,0,0.35) !important;
  padding: 8px 14px !important;
  margin: 8px 0 !important;
  color: #8a7878 !important;
}

.mes .mes_text code {
  background: rgba(20,5,5,0.6) !important;
  border: 1px solid #1a0808 !important;
  color: #a06060 !important;
  padding: 1px 5px !important;
  border-radius: 2px !important;
  font-size: 0.9em !important;
}

.mes .mes_text pre {
  background: rgba(10,3,3,0.85) !important;
  border: 1px solid #1a0808 !important;
  padding: 12px !important;
  border-radius: 2px !important;
}

.mes .mes_text details {
  background: rgba(10,3,3,0.45) !important;
  border: 1px solid #1a0808 !important;
  border-radius: 2px !important;
  padding: 8px 12px !important;
}

.mes .mes_text summary {
  color: #6a3030 !important;
  cursor: pointer !important;
  font-family: "Noto Sans SC", "Microsoft YaHei", sans-serif !important;
  font-size: 13px !important;
}

.mes .mes_text a {
  color: #8b3030 !important;
  text-decoration: none !important;
  border-bottom: 1px solid rgba(120,30,30,0.3) !important;
}

.mes .mes_text a:hover {
  color: #b04040 !important;
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
  color: #8b3030 !important;
  font-style: normal !important;
  text-shadow: 0 0 4px rgba(120,30,30,0.35) !important;
}

.mes .avatar {
  border-radius: 50% !important;
  box-shadow: 0 0 8px rgba(0,0,0,0.5), 0 0 2px rgba(60,10,10,0.15) !important;
}

.mes .swipe_left,
.mes .swipe_right {
  color: #3a1a1a !important;
  transition: color 0.2s ease, text-shadow 0.2s ease !important;
}

.mes .swipe_left:hover,
.mes .swipe_right:hover {
  color: #6a1a1a !important;
  text-shadow: 0 0 6px rgba(100,20,20,0.3) !important;
}

.mes .mes_button {
  color: #3a2020 !important;
  transition: color 0.2s ease, text-shadow 0.2s ease !important;
}

.mes .mes_button:hover {
  color: #7a2020 !important;
  text-shadow: 0 0 6px rgba(120,20,20,0.35) !important;
}

.mes .mes_reasoning_details {
  background: rgba(8,3,3,0.5) !important;
  border: 1px solid #150808 !important;
  border-radius: 2px !important;
}

.mes .mes_reasoning_details summary {
  color: #5a2828 !important;
  font-family: "Noto Sans SC", "Microsoft YaHei", sans-serif !important;
}

.mes .mes_reasoning_details .reasoning_content {
  color: #7a6868 !important;
  font-size: 13px !important;
  line-height: 1.8 !important;
}

#options_button,
#extensionsMenuButton,
.menu_button,
.nav_button {
  color: #4a2828 !important;
  transition: color 0.2s ease, text-shadow 0.2s ease !important;
}

#options_button:hover,
#extensionsMenuButton:hover,
.menu_button:hover,
.nav_button:hover {
  color: #8b2020 !important;
  text-shadow: 0 0 8px rgba(120,20,20,0.4) !important;
}

.popup,
.dialogue_popup {
  background: #0c0606 !important;
  border: 1px solid #1a0808 !important;
  box-shadow: 0 0 40px rgba(0,0,0,0.8), 0 0 8px rgba(60,10,10,0.1) !important;
}

.drawer-content,
#sheld {
  background: #0c0606 !important;
}

::-webkit-scrollbar {
  width: 5px !important;
}

::-webkit-scrollbar-track {
  background: #0a0505 !important;
}

::-webkit-scrollbar-thumb {
  background: #1a0808 !important;
  border-radius: 2px !important;
}

::-webkit-scrollbar-thumb:hover {
  background: #2a0a0a !important;
}

::selection {
  background: #3a0a0a !important;
  color: #d0b0b0 !important;
}

.timestamp {
  color: #3a2020 !important;
  font-size: 11px !important;
}

.horror-options {
  background: #080505 !important;
  border: 1px solid #2a0a0a !important;
  border-left: 3px solid #5c1a1a !important;
  border-right: 1px solid #2a0a0a !important;
  padding: 20px 24px !important;
  margin: 18px auto !important;
  max-width: 560px !important;
  position: relative !important;
  box-shadow: 0 0 30px rgba(0,0,0,0.95), inset 0 0 50px rgba(10,0,0,0.7), 0 0 6px rgba(80,10,10,0.15) !important;
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
  color: #a03030 !important;
  font-family: "Noto Serif SC", "SimSun", serif !important;
  font-size: 17px !important;
  font-weight: 800 !important;
  letter-spacing: 3px !important;
  text-shadow: 0 0 8px rgba(140,20,20,0.5) !important;
  border-bottom: 1px solid #2a0a0a !important;
  padding-bottom: 10px !important;
  margin-bottom: 14px !important;
}

.horror-options-body {
  color: #b0a8a8 !important;
  font-family: "Noto Sans SC", "Microsoft YaHei", sans-serif !important;
  font-size: 14px !important;
  line-height: 1.9 !important;
  white-space: pre-wrap !important;
  font-weight: 300 !important;
  letter-spacing: 0.5px !important;
}

.horror-panel {
  background: #070404 !important;
  border: 1px solid #2a0a0a !important;
  padding: 0 !important;
  margin: 18px auto !important;
  max-width: 480px !important;
  position: relative !important;
  box-shadow: 0 0 30px rgba(0,0,0,0.95), inset 0 0 40px rgba(10,0,0,0.6), 0 0 8px rgba(60,10,10,0.1) !important;
  border-radius: 2px !important;
  overflow: hidden !important;
}

.horror-panel-title {
  color: #a03030 !important;
  font-family: "Noto Serif SC", "SimSun", serif !important;
  font-size: 16px !important;
  font-weight: 800 !important;
  letter-spacing: 4px !important;
  text-shadow: 0 0 10px rgba(140,20,20,0.6) !important;
  text-align: center !important;
}

.horror-panel-text {
  color: #a09898 !important;
  font-family: "Noto Sans SC", "Microsoft YaHei", sans-serif !important;
  font-size: 13px !important;
  line-height: 2 !important;
  white-space: pre-wrap !important;
  font-weight: 300 !important;
  letter-spacing: 0.8px !important;
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
  color: #a48b8b !important;
  letter-spacing: 0.05em !important;
}

.mfrs-choice-legend-item {
  display: inline-flex !important;
  align-items: center !important;
  gap: 5px !important;
  padding: 2px 8px !important;
  border: 1px solid rgba(100,24,24,.4) !important;
  border-radius: 999px !important;
  background: rgba(10,4,4,.55) !important;
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
  background: rgba(8,3,3,.86) !important;
  border: 1px solid rgba(100,24,24,.75) !important;
  border-left: 3px solid #7a2020 !important;
  color: #c8bcbc !important;
  padding: 10px 12px !important;
  border-radius: 6px !important;
  cursor: pointer !important;
  font: inherit !important;
  line-height: 1.65 !important;
  box-shadow: inset 0 0 18px rgba(0,0,0,.35) !important;
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
  box-shadow: 0 0 14px rgba(120,20,20,.25), inset 0 0 18px rgba(0,0,0,.35) !important;
}

.mfrs-choice-key {
  color: #d05050 !important;
  font-weight: 800 !important;
  margin-right: 8px !important;
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
        list.appendChild(button);
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
          const keyOffset = markerText.search(/[A-Da-d]/);
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
      panel.dataset.mfrsChoiceReady = 'true';
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

  const enhanceShortTagPanels = () => {
    const panels = hostDocument.querySelectorAll<HTMLElement>('.sp-panel-body:not([data-mfrs-sp-enhanced])');
    for (const panel of panels) {
      panel.dataset.mfrsSpEnhanced = 'true';
      const raw = panel.textContent ?? '';
      if (!raw.trim()) continue;
      const html = raw
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .split('\n')
        .map(line => {
          const fieldMatch = line.match(/^([^：:]{2,16})[：:](.*)$/);
          const riskClass = /死亡风险|复苏风险|高危|濒死|失控|命中规律|被标记/.test(line)
            ? ' sp-risk-high'
            : /疑似|中等|接触|鬼域|试探/.test(line)
              ? ' sp-risk-mid'
              : /低|暂避|隔绝|撤离|无/.test(line)
                ? ' sp-risk-low'
                : '';
          if (!fieldMatch) return `<span class="${riskClass.trim()}">${line}</span>`;
          return `<span class="sp-field-line${riskClass}"><span class="sp-field-key">${fieldMatch[1]}：</span>${fieldMatch[2]}</span>`;
        })
        .join('\n');
      panel.innerHTML = html;
    }
  };

  const fillWelcomeStart = (root: HTMLElement) => {
    const getValue = (key: string) => root.querySelector<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(`[data-mfrs="${key}"]`)?.value.trim() ?? '';
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
    const anchor = anchorParts[0] || '未选择节点';
    const storyLocation = anchorParts[1] || '由当前剧情节点决定';
    const storyPhase = anchorParts[2] || '未定阶段';
    const eventPressure = anchorParts[3] || '请根据身份与地点判断接入边界';
    const visibleIntel = anchorParts[4] || '仅依据当前选择与背景设定';
    const spoilerBoundary = anchorParts[5] || '不得直接揭露隐藏规律、关键生路和幕后真相';
    const message = `【神秘复苏·开局设定】\n\n` +
      `1. 基本信息\n` +
      `   - 姓名：${getValue('name')}\n` +
      `   - 年龄/性别：${getValue('ageGender')}\n` +
      `   - 剧情节点：${anchor}\n` +
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
      `   - 初始变量建议：将姓名、身份、当前地点、原著阶段、剧情锚点写入玩家/全局状态；若节点已处于灵异事件中，应按玩家可见情报立案当前灵异事件。\n` +
      `   - 调查起点：从“遭遇异常”或“收集线索”阶段开始，不直接跳到完整规律或最终生路。\n` +
      `   - 开局厉鬼判定：若玩家在第1只厉鬼选择预设，只能把预设资料当作开局可见档案和成长方向，不得直接明牌隐藏规律、关键生路或完整拼图；若玩家自定义厉鬼，只提供厉鬼名称和可见杀人规律，影响范围、灾害等级、恐怖程度、真实代价、限制和可关押条件必须由AI依据现场证据、规律表现、媒介、鬼域、成长性、衍生物和神秘复苏铁律自行推断。第1只厉鬼只能读取预设或自定义之一，第2只仅读取自定义，超出部分无效。\n` +
      `   - 特殊能力判定：特殊能力为主角独有外挂，最多读取1个；对玩家自身按声明效果生效且无自身代价，但不自动提供完整隐藏规律、最终生路、源头鬼位置或无条件关押结果。若选择“永久死机驾驭”，玩家已经成功驾驭的所有厉鬼本体都会死机，包括开局厉鬼和后续驾驭的新厉鬼；但新厉鬼仍必须按灵异对抗、关押、平衡、异类或诅咒等规则完成驾驭，不能凭空获得或跳过驾驭过程。通过拼图、档案、残片、鬼奴、媒介或交易调用的外来灵异仍需判定污染、冲突、反噬和失控风险。\n` +
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
  const ghostPresetSelector = '[data-mfrs="ghostPreset1"], #mfrs-ghost-preset-1';
  const specialAbilityPresetSelector = '[data-mfrs="specialAbilityPreset"], #mfrs-special-ability-preset';

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
    bindWelcomePresetControls();
    bindWelcomeGhostButtons();
    enhanceChoicePanels();
    enhanceShortTagPanels();
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
