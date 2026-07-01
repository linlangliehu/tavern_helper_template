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

/** 构建「状态面板」tab 的 HTML（顶部浓缩信息栏 + 左右两列 + 通栏行动建议） */
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
    ? ghostList.map((g: any) => `<div class="mfrs-msg-ghost-item">${_.escape(valueText(g.代号 || g.厉鬼名称, '未命名厉鬼'))}</div>`).join('')
    : '<div class="mfrs-msg-empty">暂无驾驭厉鬼</div>';

  const suggestions = data.行动建议 || [];
  const suggestionsHtml = suggestions.length
    ? suggestions
        .map(
          (s: any, i: number) =>
            `<button class="mfrs-msg-action-btn" data-action="${_.escape(s.text || s.label || '')}"><span class="mfrs-msg-action-key">${String.fromCharCode(65 + i)}</span><span class="mfrs-msg-action-label">${_.escape(s.label || s.text || '未知行动')}</span></button>`,
        )
        .join('')
    : '<div class="mfrs-msg-empty">暂无行动建议</div>';

  return `
<div class="mfrs-msg-header">
  <div class="mfrs-msg-header-item"><span class="mfrs-msg-header-ico">🎬</span><span class="mfrs-msg-header-lbl">阶段</span><span class="mfrs-msg-header-val">${_.escape(phase)}</span></div>
  <div class="mfrs-msg-header-item"><span class="mfrs-msg-header-ico">📍</span><span class="mfrs-msg-header-lbl">位置</span><span class="mfrs-msg-header-val">${_.escape(location)}</span></div>
  <div class="mfrs-msg-header-item"><span class="mfrs-msg-header-ico">🩸</span><span class="mfrs-msg-header-lbl">死亡风险</span><span class="mfrs-msg-header-val" style="color:${deathColor}">${deathRisk}%</span></div>
</div>
<div class="mfrs-msg-columns">
  <div class="mfrs-msg-col">
    <div class="mfrs-msg-section">
      <div class="mfrs-msg-section-title">🎭 身份信息</div>
      <div class="mfrs-msg-kv"><span>姓名</span><b>${_.escape(name)}</b></div>
      <div class="mfrs-msg-kv"><span>性别</span><b>${_.escape(gender)}</b></div>
      <div class="mfrs-msg-kv"><span>身份</span><b>${_.escape(identity)}</b></div>
    </div>
    <div class="mfrs-msg-section">
      <div class="mfrs-msg-section-title">🔮 特殊能力</div>
      <div class="mfrs-msg-info-text"><strong>能力</strong>${_.escape(ability)}</div>
      <div class="mfrs-msg-info-text"><strong>代价</strong>${_.escape(cost)}</div>
    </div>
    <div class="mfrs-msg-section">
      <div class="mfrs-msg-section-title">🩸 生存状态</div>
      <div class="mfrs-msg-risk-item">
        <div class="mfrs-msg-risk-label">死亡风险 <span style="color:${deathColor}">${deathRisk}%</span></div>
        <div class="mfrs-msg-risk-bar"><div class="mfrs-msg-risk-fill" style="width:${deathPct}%;background:${deathColor}"></div></div>
      </div>
      <div class="mfrs-msg-risk-item">
        <div class="mfrs-msg-risk-label">复苏风险 <span style="color:${reviveColor}">${reviveRisk}%</span></div>
        <div class="mfrs-msg-risk-bar"><div class="mfrs-msg-risk-fill" style="width:${revivePct}%;background:${reviveColor}"></div></div>
      </div>
      <div class="mfrs-msg-kv"><span>状态</span><b>${_.escape(playerStatus)}</b></div>
    </div>
  </div>
  <div class="mfrs-msg-col">
    <div class="mfrs-msg-section">
      <div class="mfrs-msg-section-title">👻 当前灵异事件</div>
      <div class="mfrs-msg-kv"><span>事件代号</span><b>${_.escape(eventCode)}</b></div>
      <div class="mfrs-msg-kv"><span>危害等级</span><b>${_.escape(eventLevel)}</b></div>
      <div class="mfrs-msg-kv"><span>发生地点</span><b>${_.escape(eventPlace)}</b></div>
      <div class="mfrs-msg-kv"><span>鬼域状态</span><b>${_.escape(eventDomain)}</b></div>
      <div class="mfrs-msg-kv"><span>处理状态</span><b>${_.escape(eventHandle)}</b></div>
    </div>
    <div class="mfrs-msg-section">
      <div class="mfrs-msg-section-title">⛧ 驾驭厉鬼</div>
      <div class="mfrs-msg-ghost-list">${ghostsHtml}</div>
    </div>
  </div>
</div>
<div class="mfrs-msg-section mfrs-msg-section-full">
  <div class="mfrs-msg-section-title">🎯 行动建议</div>
  <div class="mfrs-msg-actions">${suggestionsHtml}</div>
</div>
`;
}

/** 构建「关系/环境」tab 的 HTML（在场人物名字着色 + 描述） */
function buildRelationTabHtml(data: StatusData): string {
  const location = valueText(data.所在位置);
  const phase = valueText(_.get(data, '主线进度.当前阶段'));
  const event = data.当前灵异事件 ?? {};
  const eventPlace = valueText(event.发生地点, '未知');

  const npcs = data.在场人物 || [];
  const npcsHtml = npcs.length
    ? npcs
        .map((npc: unknown) => {
          const raw = String(npc ?? '').trim();
          // 支持「名字-描述」「名字：描述」格式：名字着色，描述灰显
          const m = raw.match(/^([^-—－:：]+)[-—－:：]\s*(.+)$/);
          if (m) {
            return `<div class="mfrs-msg-npc-item"><span class="mfrs-msg-npc-name">${_.escape(m[1].trim())}</span><span class="mfrs-msg-npc-desc">${_.escape(m[2].trim())}</span></div>`;
          }
          return `<div class="mfrs-msg-npc-item"><span class="mfrs-msg-npc-name">${_.escape(raw)}</span></div>`;
        })
        .join('')
    : '<div class="mfrs-msg-empty">暂无在场人物</div>';

  return `
<div class="mfrs-msg-header">
  <div class="mfrs-msg-header-item"><span class="mfrs-msg-header-ico">📍</span><span class="mfrs-msg-header-lbl">当前位置</span><span class="mfrs-msg-header-val">${_.escape(location)}</span></div>
  <div class="mfrs-msg-header-item"><span class="mfrs-msg-header-ico">🎬</span><span class="mfrs-msg-header-lbl">阶段</span><span class="mfrs-msg-header-val">${_.escape(phase)}</span></div>
</div>
<div class="mfrs-msg-section">
  <div class="mfrs-msg-section-title">🗺️ 环境</div>
  <div class="mfrs-msg-info-text"><strong>所在</strong>${_.escape(location)}</div>
  <div class="mfrs-msg-info-text"><strong>事发地</strong>${_.escape(eventPlace)}</div>
</div>
<div class="mfrs-msg-section">
  <div class="mfrs-msg-section-title">👥 在场人物</div>
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
  // 只处理 AI 消息（含最新一条：刷新事件均在生成完成后触发，不会在流式中途注入）
  if (!mesElement.classList.contains('mes')) return;
  const isUser = mesElement.classList.contains('user');
  if (isUser) return;

  // 跳过无有效 mesid 的元素（如 SillyTavern 挂在 #chat 外的隐藏 .mes 模板）
  const mesid = mesElement.getAttribute('mesid');
  if (mesid === null || mesid === '' || isNaN(parseInt(mesid, 10))) return;

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
  const tab = target.closest?.('.mfrs-msg-tab') as HTMLElement | null;
  if (!tab) return;

  const panel = tab.closest('.mfrs-msg-panel');
  if (!panel) return;

  const tabName = tab.getAttribute('data-tab');
  if (!tabName) return;

  // 切换 tab 激活状态
  panel.querySelectorAll('.mfrs-msg-tab').forEach(t => t.classList.remove('mfrs-msg-tab-active'));
  tab.classList.add('mfrs-msg-tab-active');

  // 切换内容显示
  panel.querySelectorAll('.mfrs-msg-tab-content').forEach(content => content.classList.remove('mfrs-msg-tab-content-active'));
  const targetContent = panel.querySelector(`.mfrs-msg-tab-content[data-tab-content="${tabName}"]`);
  if (targetContent) targetContent.classList.add('mfrs-msg-tab-content-active');
}

/** 处理行动建议按钮点击事件 */
function handleActionClick(e: Event) {
  const target = e.target as HTMLElement;
  const btn = target.closest?.('.mfrs-msg-action-btn') as HTMLElement | null;
  if (!btn) return;

  const actionText = btn.getAttribute('data-action');
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
  border-radius: 10px;
  margin-top: 16px;
  padding: 0;
  box-shadow:
    0 4px 16px rgba(0,0,0,0.45),
    inset 0 0 24px rgba(100,24,24,0.12);
  overflow: hidden;
}

/* Tab 标签栏（居中胶囊） */
.mfrs-msg-tabs {
  display: flex;
  justify-content: center;
  gap: 10px;
  padding: 14px 14px 0;
  background: transparent;
}

.mfrs-msg-tab {
  flex: 0 0 auto;
  background: rgba(30,20,20,0.6);
  color: #9a8080;
  border: 1px solid rgba(90,42,42,0.5);
  border-radius: 20px;
  padding: 8px 24px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.25s ease;
  font-family: "Noto Sans SC", sans-serif;
}

.mfrs-msg-tab:hover {
  background: rgba(139,32,32,0.2);
  color: #c85c5c;
}

.mfrs-msg-tab-active {
  background: linear-gradient(180deg, rgba(160,40,40,0.35), rgba(120,30,30,0.5)) !important;
  color: #f0b0b0 !important;
  border-color: #b23a32;
  box-shadow: 0 0 12px rgba(178,58,50,0.5);
}

/* Tab 内容区 */
.mfrs-msg-tab-content {
  display: none;
  padding: 18px 20px 20px;
}

.mfrs-msg-tab-content-active {
  display: block;
}

/* 顶部浓缩信息栏 */
.mfrs-msg-header {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 20px;
  align-items: center;
  margin-bottom: 16px;
  padding: 10px 16px;
  background: linear-gradient(90deg, rgba(70,22,22,0.42), rgba(30,14,14,0.28));
  border: 1px solid rgba(139,32,32,0.35);
  border-radius: 8px;
}

.mfrs-msg-header-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12.5px;
}

.mfrs-msg-header-ico { font-size: 14px; }
.mfrs-msg-header-lbl { color: #9a8080; }
.mfrs-msg-header-val { color: #e6cccc; font-weight: 600; }

/* 左右两列 */
.mfrs-msg-columns {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 0 26px;
}

.mfrs-msg-col { min-width: 0; }

/* 分区 */
.mfrs-msg-section { margin-bottom: 20px; }
.mfrs-msg-section:last-child { margin-bottom: 0; }
.mfrs-msg-section-full { margin-top: 4px; }

.mfrs-msg-section-title {
  font-size: 15px;
  font-weight: 700;
  color: #d87070;
  margin-bottom: 10px;
  padding-bottom: 6px;
  border-bottom: 1px solid rgba(139,32,32,0.35);
  font-family: "Noto Serif SC", serif;
}

/* 键值对行 */
.mfrs-msg-kv {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 12px;
  font-size: 13px;
  line-height: 1.9;
  color: #c8baba;
  border-bottom: 1px dashed rgba(90,42,42,0.22);
  padding: 1px 0;
}

.mfrs-msg-kv:last-child { border-bottom: none; }
.mfrs-msg-kv span { color: #9a8080; flex: 0 0 auto; }
.mfrs-msg-kv b { color: #e6cccc; font-weight: 600; text-align: right; }

.mfrs-msg-info-text {
  font-size: 13px;
  line-height: 1.7;
  color: #c8baba;
  margin-bottom: 6px;
}

.mfrs-msg-info-text strong {
  color: #e0a0a0;
  display: inline-block;
  margin-right: 6px;
}

/* 风险进度条 */
.mfrs-msg-risk-item { margin-bottom: 12px; }

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

/* NPC 列表（名字着色 + 描述） */
.mfrs-msg-npc-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.mfrs-msg-npc-item {
  background: rgba(58,72,90,0.18);
  border: 1px solid rgba(90,110,140,0.3);
  border-radius: 6px;
  padding: 8px 12px;
  font-size: 13px;
  display: flex;
  gap: 10px;
  align-items: baseline;
}

.mfrs-msg-npc-name { color: #e0a860; font-weight: 700; flex: 0 0 auto; }
.mfrs-msg-npc-desc { color: #a8b0c0; line-height: 1.6; }

/* 行动建议按钮 */
.mfrs-msg-actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.mfrs-msg-action-btn {
  display: flex;
  align-items: center;
  background: linear-gradient(180deg, rgba(58,42,42,0.75), rgba(48,32,32,0.85));
  color: #e0c0a0;
  border: 1px solid rgba(139,92,32,0.45);
  border-radius: 6px;
  padding: 10px 14px;
  font-size: 13px;
  text-align: left;
  cursor: pointer;
  transition: all 0.25s ease;
  font-family: "Noto Sans SC", sans-serif;
}

.mfrs-msg-action-key {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: rgba(179,112,32,0.35);
  color: #f0d0a0;
  font-weight: 700;
  font-size: 12px;
  margin-right: 10px;
  flex: 0 0 auto;
}

.mfrs-msg-action-label { flex: 1 1 auto; }

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
