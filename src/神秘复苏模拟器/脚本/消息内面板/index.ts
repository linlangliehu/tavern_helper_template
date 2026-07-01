// 消息内状态面板脚本 - 在每条 AI 消息内嵌入完整状态面板（两个 tab）+ 叙事文本包装

type StatusData = Record<string, any>;

// iframe 运行环境，必须通过 parent.document 访问主窗口 DOM
const doc: Document = window.parent?.document ?? document;

/** 从值中提取第一个数字，无数字返回 null */
function toNumber(value: unknown): number | null {
  const match = String(value ?? '').match(/-?\d+(?:\.\d+)?/);
  return match ? Number(match[0]) : null;
}

/** 风险值转颜色（≥70红 / ≥40橙 / 其他绿） */
function riskColor(value: unknown): string {
  const n = toNumber(value);
  if (n === null) return '#9aa7c0';
  if (n >= 70) return '#b23a32';
  if (n >= 40) return '#e0a040';
  return '#46c0a0';
}

/** 风险值转百分比（0-100 clamp） */
function clampPercent(value: unknown): number {
  const n = toNumber(value);
  if (n === null) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
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

/** 构建「状态面板」tab 的 HTML */
function buildStatusTabHtml(data: StatusData): string {
  const name = valueText(data.姓名);
  const gender = valueText(data.性别);
  const identity = valueText(data.身份);
  const ability = valueText(data.特殊能力描述, '无');
  const cost = valueText(data.消耗代价, '无');
  const playerStatus = valueText(data.状态, '健康');
  const location = valueText(data.所在位置);
  const phase = valueText(_.get(data, '主线进度.当前阶段'));

  const deathRisk = toNumber(data.风险值) ?? 0;
  const deathPct = clampPercent(deathRisk);
  const deathColor = riskColor(deathRisk);

  const reviveRisk = toNumber(_.get(data, '驭鬼者状态.总复苏风险')) ?? toNumber(data.厉鬼复苏程度) ?? 0;
  const revivePct = clampPercent(reviveRisk);
  const reviveColor = riskColor(reviveRisk);

  const event = data.当前灵异事件 ?? {};
  const eventCode = valueText(event.事件代号, '无');
  const eventLevel = valueText(event.危害等级, '未知');
  const eventPlace = valueText(event.发生地点, '未知');
  const eventDomain = valueText(event.鬼域状态, '未知');
  const eventHandle = valueText(event.处理状态, '未知');

  const ghostList = _.get(data, '驭鬼者状态.已驾驭厉鬼', []) || data.驾驭厉鬼 || [];
  const ghostsHtml = ghostList.length
    ? ghostList.map((g: any) => `<div class="mfrs-msg-ghost-item">${valueText(g.代号, '未命名厉鬼')}</div>`).join('')
    : '<div class="mfrs-msg-empty">暂无驾驭厉鬼</div>';

  const suggestions = data.行动建议 || [];
  const suggestionsHtml = suggestions.length
    ? suggestions
        .map(
          (s: any, i: number) =>
            `<button class="mfrs-msg-action-btn" data-action="${_.escape(s.text || s.label || '')}">${String.fromCharCode(65 + i)}. ${_.escape(s.label || s.text || '未知行动')}</button>`,
        )
        .join('')
    : '<div class="mfrs-msg-empty">暂无行动建议</div>';

  return `
<div class="mfrs-msg-section">
  <div class="mfrs-msg-section-title">身份信息</div>
  <div class="mfrs-msg-info-grid">
    <div><strong>姓名:</strong> ${_.escape(name)}</div>
    <div><strong>性别:</strong> ${_.escape(gender)}</div>
    <div><strong>身份:</strong> ${_.escape(identity)}</div>
  </div>
</div>

<div class="mfrs-msg-section">
  <div class="mfrs-msg-section-title">特殊能力</div>
  <div class="mfrs-msg-info-text"><strong>能力:</strong> ${_.escape(ability)}</div>
  <div class="mfrs-msg-info-text"><strong>代价:</strong> ${_.escape(cost)}</div>
</div>

<div class="mfrs-msg-section">
  <div class="mfrs-msg-section-title">生存状态</div>
  <div class="mfrs-msg-risk-item">
    <div class="mfrs-msg-risk-label">死亡风险 <span style="color:${deathColor}">${deathRisk}%</span></div>
    <div class="mfrs-msg-risk-bar">
      <div class="mfrs-msg-risk-fill" style="width:${deathPct}%;background:${deathColor}"></div>
    </div>
  </div>
  <div class="mfrs-msg-risk-item">
    <div class="mfrs-msg-risk-label">复苏风险 <span style="color:${reviveColor}">${reviveRisk}%</span></div>
    <div class="mfrs-msg-risk-bar">
      <div class="mfrs-msg-risk-fill" style="width:${revivePct}%;background:${reviveColor}"></div>
    </div>
  </div>
  <div class="mfrs-msg-info-grid">
    <div><strong>状态:</strong> ${_.escape(playerStatus)}</div>
    <div><strong>位置:</strong> ${_.escape(location)}</div>
    <div><strong>阶段:</strong> ${_.escape(phase)}</div>
  </div>
</div>

<div class="mfrs-msg-section">
  <div class="mfrs-msg-section-title">当前灵异事件</div>
  <div class="mfrs-msg-info-grid">
    <div><strong>事件代号:</strong> ${_.escape(eventCode)}</div>
    <div><strong>危害等级:</strong> ${_.escape(eventLevel)}</div>
    <div><strong>发生地点:</strong> ${_.escape(eventPlace)}</div>
    <div><strong>鬼域状态:</strong> ${_.escape(eventDomain)}</div>
    <div><strong>处理状态:</strong> ${_.escape(eventHandle)}</div>
  </div>
</div>

<div class="mfrs-msg-section">
  <div class="mfrs-msg-section-title">驾驭厉鬼</div>
  <div class="mfrs-msg-ghost-list">${ghostsHtml}</div>
</div>

<div class="mfrs-msg-section">
  <div class="mfrs-msg-section-title">行动建议</div>
  <div class="mfrs-msg-actions">${suggestionsHtml}</div>
</div>
`;
}

/** 构建「关系/环境」tab 的 HTML */
function buildRelationTabHtml(data: StatusData): string {
  const location = valueText(data.所在位置);
  const npcs = data.在场人物 || [];
  const npcsHtml = npcs.length
    ? npcs.map((npc: string) => `<div class="mfrs-msg-npc-item">${_.escape(npc)}</div>`).join('')
    : '<div class="mfrs-msg-empty">暂无在场人物</div>';

  return `
<div class="mfrs-msg-section">
  <div class="mfrs-msg-section-title">当前位置</div>
  <div class="mfrs-msg-info-text">${_.escape(location)}</div>
</div>

<div class="mfrs-msg-section">
  <div class="mfrs-msg-section-title">在场人物</div>
  <div class="mfrs-msg-npc-list">${npcsHtml}</div>
</div>
`;
}

/** 构建完整面板 HTML（包含 tab 切换） */
function buildPanelHtml(data: StatusData): string {
  const statusTab = buildStatusTabHtml(data);
  const relationTab = buildRelationTabHtml(data);

  return `
<div class="mfrs-msg-panel">
  <div class="mfrs-msg-tabs">
    <button class="mfrs-msg-tab mfrs-msg-tab-active" data-tab="status">状态面板</button>
    <button class="mfrs-msg-tab" data-tab="relation">关系/环境</button>
  </div>
  <div class="mfrs-msg-tab-content mfrs-msg-tab-content-active" data-tab-content="status">
    ${statusTab}
  </div>
  <div class="mfrs-msg-tab-content" data-tab-content="relation">
    ${relationTab}
  </div>
</div>
`;
}

/** 为 AI 消息注入面板（如果尚未注入） */
function injectPanelForMessage(mesElement: Element) {
  // 只处理 AI 消息
  if (!mesElement.classList.contains('mes') || mesElement.classList.contains('last_mes')) return;
  const isUser = mesElement.classList.contains('user');
  if (isUser) return;

  // 避免重复注入
  if (mesElement.querySelector('.mfrs-msg-panel')) return;

  const mesText = mesElement.querySelector('.mes_text');
  if (!mesText) return;

  const data = readStatusForMessage(mesElement);
  const panelHtml = buildPanelHtml(data);

  // 在 mes_text 末尾插入面板
  const panelContainer = document.createElement('div');
  panelContainer.innerHTML = panelHtml;
  mesText.appendChild(panelContainer.firstElementChild!);
}

/** 为叙事文本段落添加样式包装容器 */
function wrapNarrativeText(mesElement: Element) {
  const mesText = mesElement.querySelector('.mes_text');
  if (!mesText) return;

  // 避免重复包装
  if (mesElement.querySelector('.mfrs-msg-narrative-wrapper')) return;

  // 找到所有段落（排除面板）
  const panel = mesText.querySelector('.mfrs-msg-panel');
  const allNodes = Array.from(mesText.childNodes);

  // 收集面板之前的所有节点作为叙事内容
  const narrativeNodes: Node[] = [];
  for (const node of allNodes) {
    if (node === panel || (node instanceof Element && node.contains(panel))) break;
    narrativeNodes.push(node);
  }

  if (narrativeNodes.length === 0) return;

  // 创建包装容器
  const wrapper = document.createElement('div');
  wrapper.className = 'mfrs-msg-narrative-wrapper';

  // 将叙事节点移入包装器
  narrativeNodes.forEach(node => wrapper.appendChild(node));

  // 在面板之前插入包装器
  if (panel) {
    mesText.insertBefore(wrapper, panel);
  } else {
    mesText.insertBefore(wrapper, mesText.firstChild);
  }
}

/** 处理所有 AI 消息（注入面板 + 包装叙事） */
function processAllMessages() {
  const messages = doc.querySelectorAll('.mes:not(.user)');
  messages.forEach(mes => {
    injectPanelForMessage(mes);
    wrapNarrativeText(mes);
  });
}

/** 处理 tab 切换点击事件 */
function handleTabClick(e: Event) {
  const target = e.target as HTMLElement;
  if (!target.classList.contains('mfrs-msg-tab')) return;

  const panel = target.closest('.mfrs-msg-panel');
  if (!panel) return;

  const tabName = target.getAttribute('data-tab');
  if (!tabName) return;

  // 切换 tab 激活状态
  panel.querySelectorAll('.mfrs-msg-tab').forEach(tab => tab.classList.remove('mfrs-msg-tab-active'));
  target.classList.add('mfrs-msg-tab-active');

  // 切换内容显示
  panel.querySelectorAll('.mfrs-msg-tab-content').forEach(content => content.classList.remove('mfrs-msg-tab-content-active'));
  const targetContent = panel.querySelector(`.mfrs-msg-tab-content[data-tab-content="${tabName}"]`);
  if (targetContent) targetContent.classList.add('mfrs-msg-tab-content-active');
}

/** 处理行动建议按钮点击事件 */
function handleActionClick(e: Event) {
  const target = e.target as HTMLElement;
  if (!target.classList.contains('mfrs-msg-action-btn')) return;

  const actionText = target.getAttribute('data-action');
  if (!actionText) return;

  // 找到聊天输入框并填充
  const textarea = doc.querySelector('#send_textarea') as HTMLTextAreaElement | null;
  if (!textarea) return;

  // 使用原生 setter 触发事件
  const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set;
  setter?.call(textarea, actionText);
  textarea.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: actionText }));
  textarea.dispatchEvent(new Event('change', { bubbles: true }));
  textarea.focus();
}

$(() => {
  // 注入 CSS 样式
  const style = document.createElement('style');
  style.id = 'mfrs-msg-panel-style';
  style.textContent = `
/* 叙事文本包装容器 */
.mfrs-msg-narrative-wrapper {
  background: linear-gradient(180deg, rgba(28,18,18,0.88), rgba(18,12,12,0.92));
  border: 1px solid rgba(139,32,32,0.45);
  border-radius: 6px;
  padding: 16px 20px;
  margin-bottom: 16px;
  box-shadow:
    0 2px 8px rgba(0,0,0,0.35),
    inset 0 0 20px rgba(100,20,20,0.08);
  line-height: 1.8;
}

/* 消息内面板容器 */
.mfrs-msg-panel {
  background: linear-gradient(180deg, rgba(18,14,13,0.96), rgba(24,18,17,0.98));
  border: 1px solid rgba(90,42,42,0.68);
  border-radius: 8px;
  margin-top: 16px;
  padding: 0;
  box-shadow:
    0 4px 16px rgba(0,0,0,0.45),
    inset 0 0 24px rgba(100,24,24,0.12);
  overflow: hidden;
}

/* Tab 标签栏 */
.mfrs-msg-tabs {
  display: flex;
  background: rgba(12,8,8,0.72);
  border-bottom: 1px solid rgba(90,42,42,0.58);
  padding: 0;
  gap: 0;
}

.mfrs-msg-tab {
  flex: 1;
  background: transparent;
  color: #9a8080;
  border: none;
  border-right: 1px solid rgba(90,42,42,0.35);
  padding: 12px 16px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.25s ease;
  font-family: "Noto Sans SC", sans-serif;
}

.mfrs-msg-tab:last-child {
  border-right: none;
}

.mfrs-msg-tab:hover {
  background: rgba(139,32,32,0.15);
  color: #c85c5c;
}

.mfrs-msg-tab-active {
  background: rgba(139,32,32,0.28) !important;
  color: #d87070 !important;
  border-bottom: 2px solid #b23a32;
}

/* Tab 内容区 */
.mfrs-msg-tab-content {
  display: none;
  padding: 20px;
}

.mfrs-msg-tab-content-active {
  display: block;
}

/* 分区标题 */
.mfrs-msg-section {
  margin-bottom: 20px;
}

.mfrs-msg-section:last-child {
  margin-bottom: 0;
}

.mfrs-msg-section-title {
  font-size: 15px;
  font-weight: 700;
  color: #d87070;
  margin-bottom: 10px;
  padding-bottom: 6px;
  border-bottom: 1px solid rgba(139,32,32,0.35);
  font-family: "Noto Serif SC", serif;
}

/* 信息网格 */
.mfrs-msg-info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 8px 12px;
  font-size: 13px;
  line-height: 1.6;
  color: #c8baba;
}

.mfrs-msg-info-grid strong {
  color: #e0a0a0;
}

.mfrs-msg-info-text {
  font-size: 13px;
  line-height: 1.7;
  color: #c8baba;
  margin-bottom: 6px;
}

.mfrs-msg-info-text strong {
  color: #e0a0a0;
}

/* 风险进度条 */
.mfrs-msg-risk-item {
  margin-bottom: 12px;
}

.mfrs-msg-risk-label {
  font-size: 13px;
  margin-bottom: 6px;
  color: #c8baba;
  font-weight: 600;
}

.mfrs-msg-risk-bar {
  width: 100%;
  height: 8px;
  background: rgba(40,28,28,0.75);
  border-radius: 4px;
  overflow: hidden;
  box-shadow: inset 0 1px 4px rgba(0,0,0,0.4);
}

.mfrs-msg-risk-fill {
  height: 100%;
  transition: width 0.4s ease, background 0.3s ease;
  border-radius: 4px;
  box-shadow: 0 0 8px currentColor;
}

/* 厉鬼列表 */
.mfrs-msg-ghost-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.mfrs-msg-ghost-item {
  background: rgba(139,32,32,0.22);
  color: #d87070;
  padding: 6px 12px;
  border-radius: 4px;
  font-size: 13px;
  border: 1px solid rgba(139,32,32,0.35);
}

/* NPC 列表 */
.mfrs-msg-npc-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.mfrs-msg-npc-item {
  background: rgba(58,72,90,0.25);
  color: #9aa7c0;
  padding: 6px 12px;
  border-radius: 4px;
  font-size: 13px;
  border: 1px solid rgba(90,110,140,0.35);
}

/* 行动建议按钮 */
.mfrs-msg-actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.mfrs-msg-action-btn {
  background: linear-gradient(180deg, rgba(58,42,42,0.75), rgba(48,32,32,0.85));
  color: #e0c0a0;
  border: 1px solid rgba(139,92,32,0.45);
  border-radius: 6px;
  padding: 10px 16px;
  font-size: 13px;
  text-align: left;
  cursor: pointer;
  transition: all 0.25s ease;
  font-family: "Noto Sans SC", sans-serif;
}

.mfrs-msg-action-btn:hover {
  background: linear-gradient(180deg, rgba(78,52,32,0.85), rgba(68,42,22,0.92));
  border-color: rgba(179,112,32,0.65);
  color: #f0d0b0;
  box-shadow: 0 2px 8px rgba(139,92,32,0.35);
}

.mfrs-msg-action-btn:active {
  transform: translateY(1px);
  box-shadow: 0 1px 4px rgba(139,92,32,0.25);
}

/* 空状态 */
.mfrs-msg-empty {
  color: #7a6565;
  font-size: 13px;
  font-style: italic;
}
`;

  doc.head.appendChild(style);

  // 初始化已有消息
  processAllMessages();

  // 监听相关事件
  const refreshEvents = [
    tavern_events.MESSAGE_RECEIVED,
    tavern_events.MESSAGE_UPDATED,
    tavern_events.MESSAGE_SWIPED,
    tavern_events.CHARACTER_MESSAGE_RENDERED,
    tavern_events.CHAT_CHANGED,
  ];

  refreshEvents.forEach(eventName => {
    eventOn(eventName, () => setTimeout(processAllMessages, 200));
  });

  // 事件委托：tab 切换
  doc.addEventListener('click', handleTabClick, true);

  // 事件委托：行动建议点击
  doc.addEventListener('click', handleActionClick, true);

  // 清理函数
  const cleanup = () => {
    style.remove();
    doc.removeEventListener('click', handleTabClick, true);
    doc.removeEventListener('click', handleActionClick, true);
  };

  window.addEventListener('pagehide', cleanup, { once: true });

  console.info('[消息内面板] 已注入消息内状态面板系统');
});
