import { teleportStyle } from '@util/script';

$(() => {
  // 在 iframe 内创建 style 元素（iframe 的 document）
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
`;
  document.head.appendChild(style);

  // 将 iframe 中的 style 复制到酒馆页面的 <head> 中，使其对酒馆页面生效
  const { destroy } = teleportStyle();

  // 脚本卸载时清理样式
  $(window).on('pagehide', () => {
    destroy();
  });

  console.info('[界面美化] 暗黑恐怖主题已注入');
});
