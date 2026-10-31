// 悬浮变量编辑器 - 魔法禁书目录模拟器
// 右下角可拖动的悬浮按钮，打开后可查看并修改最新 AI 楼层的 stat_data。
// 设计借鉴参考卡的悬浮变量编辑器（树形 / JSON 两种视图、暂存后统一应用），按本卡结构重写：
// - 只改值、只删数组项，不新增字段（变量结构固定，新增字段会被 Schema 丢弃）；
// - 应用前用 schema.ts 的 Schema 校验，不通过不写入；AI 生成中禁止应用，避免和 mvu-protocol-applier 同时写入；
// - 所有用户可见文本用 textContent 输出，不拼接 HTML、不 eval。
import { Schema } from '../../schema';
import { registerMfrsRuntimeBuild } from '../_runtime_identity';
import {
  canRemoveAtPath,
  clampLayout,
  cloneJson,
  coerceInput,
  diffValues,
  formatPath,
  getAtPath,
  isPlainObject,
  type Layout,
  parseJsonDraft,
  type PathPart,
  removeArrayItem,
  setAtPath,
  validateDraft,
} from './editor-core';

registerMfrsRuntimeBuild('变量编辑器');

type MvuData = Record<string, unknown> & { stat_data?: Record<string, unknown> };
type MessageOption = { type: 'message'; message_id: number };
type ChatMessage = { is_user?: boolean; message_id?: number };

type HostWindow = Window & {
  __mjrVariableEditorCleanup__?: () => void;
  MagicIndexMessagePanel?: { refreshAll?: () => void };
  Mvu?: {
    getMvuData?: (options: MessageOption) => MvuData | undefined;
    replaceMvuData?: (data: MvuData, options: MessageOption) => Promise<void> | void;
  };
  getVariables?: (options: MessageOption) => Record<string, unknown> | undefined;
  updateVariablesWith?: (
    updater: (variables: Record<string, unknown>) => Record<string, unknown>,
    options: MessageOption,
  ) => unknown;
  TavernHelper?: {
    getVariables?: HostWindow['getVariables'];
    updateVariablesWith?: HostWindow['updateVariablesWith'];
  };
  toastr?: {
    success?: (message: string, title?: string) => void;
    warning?: (message: string, title?: string) => void;
    error?: (message: string, title?: string) => void;
  };
  SillyTavern?: {
    getContext?: () => {
      characterId?: string | number;
      characters?: Array<{ name?: string; avatar?: string }> | Record<string, { name?: string; avatar?: string }>;
      chat?: ChatMessage[];
    };
  };
};

declare const eventOn: undefined | ((event: string, listener: (...args: unknown[]) => void) => unknown);
declare const tavern_events: undefined | Record<string, string>;

const hostWindow: HostWindow = (() => {
  try {
    return (window.parent ?? window) as HostWindow;
  } catch {
    return window as HostWindow;
  }
})();
const doc: Document = hostWindow.document ?? document;
const localWindow = window as HostWindow;

const ROOT_ID = 'mjr-var-editor-root';
const STYLE_ID = 'mjr-var-editor-style';
const STORAGE_KEY = 'mjr-var-editor-layout-v1';
const FAB_SIZE = 44;

/* ---------- 卡片身份（与固定状态栏 / 消息内面板一致） ---------- */

function isMjrCardIdentity(name?: string | null, avatar?: string | null): boolean {
  if (name === '魔法禁书目录模拟器' || (name && /^魔法禁书目录模拟器(?:\s*[·•-]\s*|\s+)DEV\b/u.test(name))) return true;
  if (avatar === '魔法禁书目录模拟器.png') return true;
  return Boolean(avatar && /^魔法禁书目录模拟器(?:\s*[·•-]\s*|\s+)DEV\b.*\.png$/iu.test(avatar));
}

function getContext() {
  for (const st of [hostWindow.SillyTavern, localWindow.SillyTavern]) {
    try {
      const context = st?.getContext?.();
      if (context) return context;
    } catch {
      // 切换聊天时上下文可能短暂不可用
    }
  }
  return null;
}

function isMjrCardActive(): boolean {
  const context = getContext();
  const id = context?.characterId;
  if (id === undefined || id === null) return false;
  const characters = context?.characters;
  const character = Array.isArray(characters) ? characters[Number(id)] : characters?.[String(id)];
  return Boolean(character && isMjrCardIdentity(character.name, character.avatar));
}

/* ---------- 变量读写 ---------- */

function safeRead<T>(read: () => T): T | undefined {
  try {
    return read();
  } catch {
    return undefined;
  }
}

function getMvu() {
  return safeRead(() => hostWindow.Mvu) ?? safeRead(() => localWindow.Mvu);
}

function getRuntime<K extends 'getVariables' | 'updateVariablesWith'>(key: K): HostWindow[K] | undefined {
  // 全局声明里的 TavernHelper 类型与本文件的 HostWindow 不同，这里统一按 unknown 读取后再收窄
  const candidates: Array<() => unknown> = [
    () => (localWindow as unknown as Record<string, unknown>)[key],
    () => (localWindow.TavernHelper as unknown as Record<string, unknown> | undefined)?.[key],
    () => (hostWindow as unknown as Record<string, unknown>)[key],
    () => (hostWindow.TavernHelper as unknown as Record<string, unknown> | undefined)?.[key],
  ];
  for (const read of candidates) {
    const value = safeRead(read);
    if (typeof value === 'function') return value as HostWindow[K];
  }
  return undefined;
}

/** 最新一条 AI 楼层（消息内面板与 applier 读写的都是 AI 楼层的 message 变量）。 */
function findLatestAiMessageId(): number | null {
  const chat = getContext()?.chat;
  if (!Array.isArray(chat)) return null;
  for (let index = chat.length - 1; index >= 0; index--) {
    if (!chat[index]?.is_user) return typeof chat[index]?.message_id === 'number' ? chat[index].message_id! : index;
  }
  return null;
}

function readStatData(messageId: number): Record<string, unknown> {
  const option: MessageOption = { type: 'message', message_id: messageId };
  const fromMvu = safeRead(() => getMvu()?.getMvuData?.(option));
  const raw = fromMvu?.stat_data ?? safeRead(() => getRuntime('getVariables')?.(option))?.stat_data;
  return isPlainObject(raw) ? cloneJson(raw) : {};
}

async function writeStatData(messageId: number, statData: Record<string, unknown>): Promise<void> {
  const option: MessageOption = { type: 'message', message_id: messageId };
  const mvu = getMvu();
  if (mvu?.getMvuData && mvu.replaceMvuData) {
    const current = mvu.getMvuData(option) ?? {};
    await mvu.replaceMvuData({ ...current, stat_data: statData }, option);
    return;
  }
  const update = getRuntime('updateVariablesWith');
  if (!update) throw new Error('找不到 MVU 或酒馆助手的变量写入接口');
  await update(variables => ({ ...variables, stat_data: statData }), option);
}

/* ---------- 状态 ---------- */

let root: HTMLDivElement | null = null;
let panelOpen = false;
let generating = false;
let mode: 'tree' | 'json' = 'tree';
let messageId: number | null = null;
let original: Record<string, unknown> = {};
let draft: Record<string, unknown> = {};
let jsonText: string | null = null;
const expanded = new Set<string>(['']);
const layout = loadLayout();
const disposers: Array<() => void> = [];

function loadLayout(): { fab: { x: number; y: number } | null; panel: Layout | null } {
  try {
    const saved = JSON.parse(hostWindow.localStorage.getItem(STORAGE_KEY) ?? 'null');
    if (isPlainObject(saved)) return { fab: (saved.fab as never) ?? null, panel: (saved.panel as never) ?? null };
  } catch {
    // 存储损坏时使用默认位置
  }
  return { fab: null, panel: null };
}

function saveLayout() {
  try {
    hostWindow.localStorage.setItem(STORAGE_KEY, JSON.stringify(layout));
  } catch {
    // 隐私模式下 localStorage 可能不可写
  }
}

function viewport() {
  return { width: hostWindow.innerWidth || 1024, height: hostWindow.innerHeight || 768 };
}

function toast(kind: 'success' | 'warning' | 'error', message: string) {
  const fn = safeRead(() => hostWindow.toastr?.[kind]);
  if (fn) fn(message, '变量编辑器');
  else console.info(`[变量编辑器] ${message}`);
}

/* ---------- DOM 工具 ---------- */

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const node = doc.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function button(text: string, className: string, onClick: () => void, title?: string) {
  const node = el('button', `mjr-ve-btn ${className}`, text);
  node.type = 'button';
  if (title) node.title = title;
  node.addEventListener('click', event => {
    event.stopPropagation();
    onClick();
  });
  return node;
}

function ensureStyle() {
  if (doc.getElementById(STYLE_ID)) return;
  const style = el('style');
  style.id = STYLE_ID;
  style.textContent = `
#${ROOT_ID}{position:fixed;inset:0;pointer-events:none;z-index:31000;font:13px/1.45 system-ui,sans-serif;color:#e8e2d4}
#${ROOT_ID} .mjr-ve-fab{position:fixed;width:${FAB_SIZE}px;height:${FAB_SIZE}px;border-radius:50%;border:1px solid #3d6b66;background:rgba(14,18,18,.88);color:#c8c0ae;font-size:18px;cursor:grab;pointer-events:auto;box-shadow:0 2px 10px rgba(0,0,0,.45);touch-action:none}
#${ROOT_ID} .mjr-ve-panel{position:fixed;display:flex;flex-direction:column;background:rgba(12,15,15,.96);border:1px solid #3d6b66;border-radius:8px;pointer-events:auto;box-shadow:0 6px 24px rgba(0,0,0,.55);overflow:hidden;resize:both;min-width:240px;min-height:160px}
#${ROOT_ID} .mjr-ve-head{display:flex;align-items:center;gap:6px;padding:6px 8px;background:rgba(61,107,102,.25);cursor:move;touch-action:none;user-select:none}
#${ROOT_ID} .mjr-ve-title{flex:1;font-weight:600}
#${ROOT_ID} .mjr-ve-btn{background:rgba(255,255,255,.06);color:inherit;border:1px solid rgba(200,192,174,.3);border-radius:4px;padding:2px 8px;cursor:pointer;font:inherit}
#${ROOT_ID} .mjr-ve-btn:disabled{opacity:.4;cursor:not-allowed}
#${ROOT_ID} .mjr-ve-btn.active{background:#3d6b66}
#${ROOT_ID} .mjr-ve-btn.danger{border-color:rgba(160,60,55,.6);color:#e3a49e}
#${ROOT_ID} .mjr-ve-body{flex:1;overflow:auto;padding:6px 8px}
#${ROOT_ID} .mjr-ve-row{display:flex;align-items:center;gap:6px;padding:2px 0}
#${ROOT_ID} .mjr-ve-key{flex:0 0 auto;max-width:45%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#9fc3bd}
#${ROOT_ID} .mjr-ve-toggle{cursor:pointer;user-select:none}
#${ROOT_ID} .mjr-ve-input{flex:1;min-width:60px;background:rgba(0,0,0,.35);color:inherit;border:1px solid rgba(200,192,174,.25);border-radius:3px;padding:1px 4px;font:inherit}
#${ROOT_ID} .mjr-ve-input.changed,#${ROOT_ID} .mjr-ve-key.changed{border-color:#c9a227;color:#e9c95b}
#${ROOT_ID} .mjr-ve-children{padding-left:14px;border-left:1px dashed rgba(200,192,174,.15);margin-left:4px}
#${ROOT_ID} .mjr-ve-json{width:100%;height:100%;min-height:200px;box-sizing:border-box;background:rgba(0,0,0,.35);color:inherit;border:1px solid rgba(200,192,174,.25);font:12px/1.4 ui-monospace,monospace}
#${ROOT_ID} .mjr-ve-foot{display:flex;flex-wrap:wrap;align-items:center;gap:6px;padding:6px 8px;border-top:1px solid rgba(200,192,174,.15)}
#${ROOT_ID} .mjr-ve-status{flex:1;min-width:120px;font-size:12px;color:#b8b0a0}
#${ROOT_ID} .mjr-ve-errors{color:#e3a49e;font-size:12px;padding:0 8px 6px;max-height:30%;overflow:auto;white-space:pre-wrap}
`;
  doc.head.appendChild(style);
}

/* ---------- 拖动 ---------- */

function makeDraggable(handle: HTMLElement, onMove: (dx: number, dy: number) => void, onEnd: (moved: boolean) => void) {
  handle.addEventListener('pointerdown', event => {
    if ((event.target as HTMLElement).closest('.mjr-ve-btn') && handle.classList.contains('mjr-ve-head')) return;
    event.preventDefault();
    const startX = event.clientX;
    const startY = event.clientY;
    let moved = false;
    handle.setPointerCapture?.(event.pointerId);
    const move = (e: PointerEvent) => {
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      if (Math.abs(dx) + Math.abs(dy) > 4) moved = true;
      onMove(dx, dy);
    };
    const up = () => {
      handle.removeEventListener('pointermove', move);
      handle.removeEventListener('pointerup', up);
      handle.removeEventListener('pointercancel', up);
      onEnd(moved);
    };
    handle.addEventListener('pointermove', move);
    handle.addEventListener('pointerup', up);
    handle.addEventListener('pointercancel', up);
  });
}

/* ---------- 渲染 ---------- */

function fabPosition() {
  const vp = viewport();
  const fallback = { x: vp.width - FAB_SIZE - 16, y: vp.height - FAB_SIZE - 96 };
  const pos = layout.fab ?? fallback;
  return {
    x: Math.max(0, Math.min(pos.x, vp.width - FAB_SIZE)),
    y: Math.max(0, Math.min(pos.y, vp.height - FAB_SIZE)),
  };
}

function panelLayout(): Layout {
  const vp = viewport();
  const width = Math.min(420, vp.width - 16);
  const height = Math.min(520, vp.height - 80);
  return clampLayout(layout.panel ?? { width, height, x: vp.width - width - 8, y: vp.height - height - 150 }, vp);
}

function render() {
  if (!root) return;
  root.replaceChildren();
  const pos = fabPosition();
  const fab = el('button', 'mjr-ve-fab', '⚙');
  fab.type = 'button';
  fab.title = '变量编辑器';
  fab.style.left = `${pos.x}px`;
  fab.style.top = `${pos.y}px`;
  makeDraggable(
    fab,
    (dx, dy) => {
      fab.style.left = `${pos.x + dx}px`;
      fab.style.top = `${pos.y + dy}px`;
    },
    moved => {
      if (moved) {
        layout.fab = { x: parseFloat(fab.style.left), y: parseFloat(fab.style.top) };
        saveLayout();
        render();
      } else {
        togglePanel();
      }
    },
  );
  root.appendChild(fab);
  if (panelOpen) root.appendChild(renderPanel());
}

function renderPanel(): HTMLElement {
  const box = panelLayout();
  const panel = el('div', 'mjr-ve-panel');
  Object.assign(panel.style, {
    left: `${box.x}px`,
    top: `${box.y}px`,
    width: `${box.width}px`,
    height: `${box.height}px`,
  });

  const head = el('div', 'mjr-ve-head');
  head.append(
    el('span', 'mjr-ve-title', messageId === null ? '变量编辑器' : `变量编辑器 · #${messageId} 楼`),
    button('树形', mode === 'tree' ? 'active' : '', () => switchMode('tree')),
    button('JSON', mode === 'json' ? 'active' : '', () => switchMode('json')),
    button('刷新', '', () => reload(true), '重新读取最新楼层的变量（会丢弃未应用的改动）'),
    button('✕', '', () => togglePanel(false), '关闭'),
  );
  makeDraggable(
    head,
    (dx, dy) => {
      panel.style.left = `${box.x + dx}px`;
      panel.style.top = `${box.y + dy}px`;
    },
    () => persistPanel(panel),
  );
  panel.addEventListener('pointerup', () => persistPanel(panel));

  const body = el('div', 'mjr-ve-body');
  if (messageId === null) body.appendChild(el('div', '', '当前聊天还没有 AI 楼层，暂无变量可编辑。'));
  else if (mode === 'tree') body.appendChild(renderNode('stat_data', draft, []));
  else body.appendChild(renderJsonEditor());

  const errors = el('div', 'mjr-ve-errors');
  errors.id = 'mjr-ve-errors';

  const changes = diffValues(original, draft);
  const foot = el('div', 'mjr-ve-foot');
  const status = el(
    'span',
    'mjr-ve-status',
    generating ? 'AI 生成中，暂时不能应用' : changes.length ? `${changes.length} 处未应用的改动` : '没有改动',
  );
  const apply = button('应用', '', () => void applyDraft(), '校验通过后写入最新楼层');
  apply.disabled = generating || messageId === null || (mode === 'tree' && changes.length === 0);
  const discard = button('放弃改动', '', () => {
    draft = cloneJson(original);
    jsonText = null;
    render();
  });
  discard.disabled = changes.length === 0;
  foot.append(status, discard, apply);

  panel.append(head, body, errors, foot);
  return panel;
}

function persistPanel(panel: HTMLElement) {
  const rect = panel.getBoundingClientRect();
  layout.panel = clampLayout({ x: rect.left, y: rect.top, width: rect.width, height: rect.height }, viewport());
  saveLayout();
}

function renderNode(label: string, value: unknown, path: PathPart[]): HTMLElement {
  const key = JSON.stringify(path);
  const originalValue = getAtPath(original, path);
  const changed = JSON.stringify(originalValue) !== JSON.stringify(value);
  const wrap = el('div');
  const row = el('div', 'mjr-ve-row');
  const keyNode = el('span', `mjr-ve-key${changed ? ' changed' : ''}`, label);
  keyNode.title = formatPath(path);

  if (Array.isArray(value) || isPlainObject(value)) {
    const open = expanded.has(key) || path.length === 0;
    const count = Array.isArray(value) ? `[${value.length}]` : `{${Object.keys(value).length}}`;
    const toggle = el('span', 'mjr-ve-toggle', `${open ? '▾' : '▸'} `);
    row.addEventListener('click', () => {
      if (open) expanded.delete(key);
      else expanded.add(key);
      render();
    });
    row.append(toggle, keyNode, el('span', 'mjr-ve-status', count));
    if (canRemoveAtPath(draft, path)) row.appendChild(removeButton(path));
    wrap.appendChild(row);
    if (open) {
      const children = el('div', 'mjr-ve-children');
      const entries: Array<[string, unknown, PathPart]> = Array.isArray(value)
        ? value.map((item, index) => [`[${index}]`, item, index])
        : Object.entries(value).map(([k, v]) => [k, v, k]);
      if (entries.length === 0) children.appendChild(el('div', 'mjr-ve-status', '（空）'));
      entries.forEach(([childLabel, child, part]) =>
        children.appendChild(renderNode(childLabel, child, [...path, part])),
      );
      wrap.appendChild(children);
    }
    return wrap;
  }

  row.appendChild(keyNode);
  row.appendChild(renderLeafInput(value, path, changed));
  if (canRemoveAtPath(draft, path)) row.appendChild(removeButton(path));
  wrap.appendChild(row);
  return wrap;
}

function renderLeafInput(value: unknown, path: PathPart[], changed: boolean): HTMLElement {
  if (typeof value === 'boolean') {
    const input = el('input', `mjr-ve-input${changed ? ' changed' : ''}`);
    input.type = 'checkbox';
    input.checked = value;
    input.style.flex = '0 0 auto';
    input.addEventListener('change', () => commitLeaf(path, value, input.checked));
    return input;
  }
  if (value === null || value === undefined) {
    return el('span', 'mjr-ve-status', String(value));
  }
  const input = el('input', `mjr-ve-input${changed ? ' changed' : ''}`);
  input.type = typeof value === 'number' ? 'number' : 'text';
  input.value = String(value);
  input.addEventListener('change', () => commitLeaf(path, value, input.value));
  input.addEventListener('keydown', event => {
    if (event.key === 'Enter') input.blur();
  });
  return input;
}

function removeButton(path: PathPart[]) {
  return button(
    '删除',
    'danger',
    () => {
      draft = removeArrayItem(draft, path);
      render();
    },
    `删除 ${formatPath(path)}（应用后才会写入）`,
  );
}

function commitLeaf(path: PathPart[], originalValue: unknown, raw: string | boolean) {
  const coerced = coerceInput(originalValue, raw);
  if (!coerced.ok) {
    toast('warning', `${formatPath(path)} 需要填写${typeof originalValue === 'number' ? '数字' : '有效值'}`);
    render();
    return;
  }
  draft = setAtPath(draft, path, coerced.value);
  render();
}

function renderJsonEditor(): HTMLElement {
  const area = el('textarea', 'mjr-ve-json');
  area.id = 'mjr-ve-json';
  area.spellcheck = false;
  // jsonText 保存未提交的输入，避免窗口缩放或生成事件触发重绘时丢失正在编辑的内容
  area.value = jsonText ?? JSON.stringify(draft, null, 2);
  area.addEventListener('input', () => {
    jsonText = area.value;
  });
  return area;
}

/** 从 JSON 视图读回草稿；格式错误时返回 false 并显示错误。 */
function syncJsonToDraft(): boolean {
  if (jsonText === null) return true;
  const parsed = parseJsonDraft(jsonText);
  if (!parsed.ok) {
    showErrors([parsed.message]);
    return false;
  }
  draft = parsed.value as Record<string, unknown>;
  jsonText = null;
  return true;
}

function showErrors(lines: string[]) {
  const box = doc.getElementById('mjr-ve-errors');
  if (box) box.textContent = lines.join('\n');
}

function switchMode(next: 'tree' | 'json') {
  if (mode === next) return;
  if (mode === 'json' && !syncJsonToDraft()) return;
  mode = next;
  render();
}

/* ---------- 动作 ---------- */

function reload(discardChanges: boolean) {
  const latest = findLatestAiMessageId();
  const dirty = diffValues(original, draft).length > 0;
  if (!discardChanges && dirty && latest === messageId) return;
  messageId = latest;
  original = latest === null ? {} : readStatData(latest);
  draft = cloneJson(original);
  jsonText = null;
  render();
}

function togglePanel(force?: boolean) {
  panelOpen = force ?? !panelOpen;
  if (panelOpen) reload(true);
  else render();
}

async function applyDraft() {
  if (generating) {
    toast('warning', 'AI 生成中，等生成结束后再应用');
    return;
  }
  if (messageId === null) return;
  if (mode === 'json' && !syncJsonToDraft()) return;
  if (findLatestAiMessageId() !== messageId) {
    showErrors(['最新楼层已经变化，请先点「刷新」重新读取，再修改。']);
    return;
  }
  const result = validateDraft(Schema, draft);
  if (!result.ok) {
    showErrors(['变量结构校验未通过，未写入：', ...result.issues.map(issue => `· ${issue.path}：${issue.message}`)]);
    return;
  }
  try {
    await writeStatData(messageId, result.data as Record<string, unknown>);
  } catch (error) {
    showErrors([`写入失败：${(error as Error).message}`]);
    toast('error', '写入失败，详见面板');
    return;
  }
  const count = diffValues(original, result.data).length;
  original = readStatData(messageId);
  draft = cloneJson(original);
  jsonText = null;
  safeRead(() => hostWindow.MagicIndexMessagePanel?.refreshAll?.());
  toast('success', count ? `已写入 ${count} 处改动` : '已写入');
  render();
}

/* ---------- 生命周期 ---------- */

function subscribe(name: string | undefined, listener: () => void) {
  if (!name || typeof eventOn !== 'function') return;
  const sub = safeRead(() => eventOn(name, listener)) as { stop?: () => void } | (() => void) | undefined;
  if (typeof sub === 'function') disposers.push(sub);
  else if (sub && typeof sub.stop === 'function') disposers.push(() => sub.stop?.());
}

function mount() {
  if (root || !isMjrCardActive()) return;
  ensureStyle();
  root = el('div');
  root.id = ROOT_ID;
  doc.getElementById(ROOT_ID)?.remove();
  doc.body.appendChild(root);
  render();
}

function unmount() {
  root?.remove();
  root = null;
  panelOpen = false;
}

function onChatChanged() {
  [0, 300, 1000].forEach(delay =>
    hostWindow.setTimeout(() => {
      if (isMjrCardActive()) {
        mount();
        if (panelOpen) reload(true);
      } else {
        unmount();
      }
    }, delay),
  );
}

function onGenerationState(active: boolean) {
  generating = active;
  if (!active && panelOpen) {
    // 生成结束后变量可能被 applier 改写；没有未应用改动时自动跟上最新楼层
    hostWindow.setTimeout(() => reload(false), 600);
  } else if (panelOpen) {
    render();
  }
}

hostWindow.__mjrVariableEditorCleanup__?.();
const cleanup = () => {
  disposers.splice(0).forEach(dispose => safeRead(dispose));
  unmount();
  doc.getElementById(STYLE_ID)?.remove();
  if (hostWindow.__mjrVariableEditorCleanup__ === cleanup) delete hostWindow.__mjrVariableEditorCleanup__;
};
hostWindow.__mjrVariableEditorCleanup__ = cleanup;
window.addEventListener('pagehide', cleanup, { once: true });

const resize = () => root && render();
hostWindow.addEventListener('resize', resize);
disposers.push(() => hostWindow.removeEventListener('resize', resize));

subscribe(tavern_events?.CHAT_CHANGED, onChatChanged);
subscribe(tavern_events?.GENERATION_STARTED, () => onGenerationState(true));
subscribe(tavern_events?.GENERATION_ENDED, () => onGenerationState(false));
subscribe(tavern_events?.GENERATION_STOPPED, () => onGenerationState(false));
subscribe(tavern_events?.MESSAGE_SWIPED, () => panelOpen && reload(false));
subscribe(tavern_events?.MESSAGE_DELETED, () => panelOpen && reload(false));

mount();
if (!root) onChatChanged();

console.info('[变量编辑器] 魔法禁书目录模拟器悬浮变量编辑器已注入');
