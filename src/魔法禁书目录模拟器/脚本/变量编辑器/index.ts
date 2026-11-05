// 悬浮变量编辑器 - 魔法禁书目录模拟器
// 右下角可拖动的悬浮按钮，打开后可查看并修改最新 AI 楼层的 stat_data。
// 设计借鉴参考卡的悬浮变量编辑器（分类编辑 / JSON 视图、暂存后统一应用），按本卡结构重写：
// - 分类与消息末尾面板对应：玩家 / 能力 / 任务 / 地点 / 关系，另有「全部 JSON」高级视图；
// - 只改值、只删数组项，不新增字段（变量结构固定，新增字段会被 Schema 丢弃）；
// - 应用前用 schema.ts 的 Schema 校验，不通过不写入；AI 生成中禁止应用，避免和 mvu-protocol-applier 同时写入；
// - 所有用户可见文本用 textContent 输出，不拼接 HTML、不 eval。
import { Schema } from '../../schema';
import schemaDefinition from '../../schema.json';
import { beginManualVariableEdit, manualEditProtocolKey } from '../_manual_variable_edit';
import { registerMfrsRuntimeBuild } from '../_runtime_identity';
import {
  canRemoveAtPath,
  clampLayout,
  cloneJson,
  coerceInput,
  fieldInputSpec,
  diffValues,
  formatPath,
  getAtPath,
  isPlainObject,
  issuesForChanges,
  applyChanges,
  itemLabel,
  ITEM_LABEL_KEYS,
  RELATION_LABEL_KEYS,
  SECTIONS,
  type SectionId,
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
type ChatMessage = {
  mes?: string;
  is_user?: boolean;
  message_id?: number;
  swipe_id?: number;
  extra?: Record<string, unknown>;
};

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

function getMessage(messageId: number): ChatMessage | undefined {
  const chat = getContext()?.chat;
  return chat?.find(item => item?.message_id === messageId) ?? chat?.[messageId];
}

async function writeStatData(messageId: number, statData: Record<string, unknown>): Promise<void> {
  const message = getMessage(messageId);
  if (!message) throw new Error('楼层不存在，请刷新后再修改');
  const option: MessageOption = { type: 'message', message_id: messageId };
  const protocolKey = manualEditProtocolKey(message);
  const rollbackMark = beginManualVariableEdit(message);
  try {
    const mvu = getMvu();
    if (mvu?.getMvuData && mvu.replaceMvuData) {
      const current = mvu.getMvuData(option) ?? {};
      await mvu.replaceMvuData({ ...current, stat_data: statData }, option);
    } else {
      const update = getRuntime('updateVariablesWith');
      if (!update) throw new Error('找不到 MVU 或酒馆助手的变量写入接口');
      await update(variables => ({ ...variables, stat_data: statData }), option);
    }
  } catch (error) {
    rollbackMark();
    throw error;
  }
  if (getMessage(messageId) !== message || manualEditProtocolKey(message) !== protocolKey) {
    throw new Error('聊天或回复已切换，请刷新后检查保存结果');
  }
  // The variables and the guard must be persisted together, including after reload.
  const context = getContext() as ReturnType<typeof getContext> & { saveChat?: () => Promise<void> };
  await context?.saveChat?.();
}

/* ---------- 状态 ---------- */

let root: HTMLDivElement | null = null;
let panelOpen = false;
/**
 * 以酒馆「停止生成」按钮是否可见为准判断 AI 是否在生成（与 mvu-protocol-applier 同一判据）。
 * 不用 GENERATION_STARTED/ENDED 维护标志：dry run（如切换聊天时的 token 统计）只发 STARTED 不发 ENDED，
 * 会让标志永久卡在「生成中」。
 */
function isGenerating(): boolean {
  const stop = safeRead(() => doc.querySelector('#mes_stop') as HTMLElement | null);
  if (!stop) return false;
  return safeRead(() => (hostWindow.getComputedStyle ?? getComputedStyle)(stop).display !== 'none') ?? false;
}
let mode: SectionId | 'json' = '玩家';
let messageId: number | null = null;
let original: Record<string, unknown> = {};
let draft: Record<string, unknown> = {};
let jsonText: string | null = null;
let applying = false;
let sourceMessage: ChatMessage | undefined;
let sourceProtocolKey = '';
const invalidInputs = new Set<string>();
const expanded = new Set<string>();
const collapsed = new Set<string>();
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
#${ROOT_ID} .mjr-ve-tabs{display:flex;flex-wrap:wrap;gap:4px;padding:6px 8px 0}
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
    el('span', 'mjr-ve-title', '变量编辑器 · 当前变量'),
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
  const tabs = el('div', 'mjr-ve-tabs');
  for (const section of SECTIONS) {
    tabs.appendChild(button(section.id, mode === section.id ? 'active' : '', () => switchMode(section.id)));
  }
  tabs.appendChild(
    button('全部 JSON', mode === 'json' ? 'active' : '', () => switchMode('json'), '高级：直接编辑完整 stat_data'),
  );

  if (messageId === null) body.appendChild(el('div', '', '当前聊天还没有 AI 楼层，暂无变量可编辑。'));
  else if (mode === 'json') body.appendChild(renderJsonEditor());
  else {
    const section = SECTIONS.find(item => item.id === mode)!;
    section.fields.forEach(field => body.appendChild(renderNode(field, draft[field], [field])));
  }

  const errors = el('div', 'mjr-ve-errors');
  errors.id = 'mjr-ve-errors';

  const foot = el('div', 'mjr-ve-foot');
  const status = el('span', 'mjr-ve-status');
  status.id = 'mjr-ve-foot-status';
  const apply = button('应用', '', () => void applyDraft(), '校验通过后写入最新楼层');
  apply.id = 'mjr-ve-apply';
  const discard = button('放弃改动', '', () => {
    draft = cloneJson(original);
    jsonText = null;
    invalidInputs.clear();
    render();
  });
  discard.id = 'mjr-ve-discard';
  foot.append(status, discard, apply);
  updateFooter(status, apply, discard);

  panel.append(head, tabs, body, errors, foot);
  return panel;
}

/** 只刷新底栏，不重绘整个面板：输入过程中重绘会让输入框失焦、丢失尚未提交的内容。 */
function updateFooter(
  status = doc.getElementById('mjr-ve-foot-status'),
  apply = doc.getElementById('mjr-ve-apply') as HTMLButtonElement | null,
  discard = doc.getElementById('mjr-ve-discard') as HTMLButtonElement | null,
) {
  const count = diffValues(original, draft).length;
  const busy = isGenerating();
  const jsonDirty = jsonText !== null;
  if (status)
    status.textContent = applying
      ? '正在保存…'
      : busy
        ? 'AI 生成中，暂时不能应用'
        : invalidInputs.size
          ? '请先修正无效输入'
          : jsonDirty
            ? 'JSON 改动待应用'
            : count
              ? `${count} 处未应用的改动`
              : '没有改动';
  if (apply)
    apply.disabled = applying || busy || messageId === null || invalidInputs.size > 0 || (!jsonDirty && count === 0);
  if (discard) discard.disabled = applying || (count === 0 && !jsonDirty && invalidInputs.size === 0);
  root
    ?.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | HTMLButtonElement>(
      '.mjr-ve-body input, .mjr-ve-body select, .mjr-ve-body textarea, .mjr-ve-tabs button',
    )
    .forEach(input => {
      input.disabled = applying;
    });
}

function persistPanel(panel: HTMLElement) {
  const rect = panel.getBoundingClientRect();
  layout.panel = clampLayout({ x: rect.left, y: rect.top, width: rect.width, height: rect.height }, viewport());
  saveLayout();
}

function renderNode(label: string, value: unknown, path: PathPart[]): HTMLElement {
  const key = JSON.stringify(path);
  // 顶层字段决定数组项的显示名优先级（关系用角色名，能力用能力名称…）
  const labelKeys = path[0] === 'NPC关系' ? RELATION_LABEL_KEYS : ITEM_LABEL_KEYS;
  const originalValue = getAtPath(original, path);
  const changed = JSON.stringify(originalValue) !== JSON.stringify(value);
  const wrap = el('div');
  const row = el('div', 'mjr-ve-row');
  const keyNode = el('span', `mjr-ve-key${changed ? ' changed' : ''}`, label);
  keyNode.title = formatPath(path);

  if (Array.isArray(value) || isPlainObject(value)) {
    // 分类页的顶层字段（如 能力档案 / 任务追踪）默认展开；用 collapsed 记录用户手动收起
    const open = path.length <= 1 ? !collapsed.has(key) : expanded.has(key);
    const count = Array.isArray(value) ? `[${value.length}]` : `{${Object.keys(value).length}}`;
    const toggle = el('span', 'mjr-ve-toggle', `${open ? '▾' : '▸'} `);
    row.addEventListener('click', () => {
      const store = path.length <= 1 ? collapsed : expanded;
      // 顶层：collapsed 里有 = 收起；深层：expanded 里有 = 展开
      if (path.length <= 1 ? open : !open) store.add(key);
      else store.delete(key);
      render();
    });
    row.append(toggle, keyNode, el('span', 'mjr-ve-status', count));
    if (canRemoveAtPath(draft, path)) row.appendChild(removeButton(path));
    wrap.appendChild(row);
    if (open) {
      const children = el('div', 'mjr-ve-children');
      const entries: Array<[string, unknown, PathPart]> = Array.isArray(value)
        ? value.map((item, index) => [itemLabel(item, index, labelKeys), item, index])
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
  const { kind, options } = fieldInputSpec(schemaDefinition, path, value);
  const label = formatPath(path);
  const style = changed ? 'mjr-ve-input changed' : 'mjr-ve-input';
  if (kind === 'boolean' && typeof value === 'boolean') {
    const input = el('input', style);
    input.type = 'checkbox';
    input.checked = value;
    input.setAttribute('aria-label', label);
    input.style.flex = '0 0 auto';
    input.addEventListener('change', () => commitLeaf(path, value, input.checked, kind, input));
    return input;
  }
  if (options || kind === 'boolean') {
    const select = el('select', style);
    select.setAttribute('aria-label', label);
    const choices = options ?? ['true', 'false'];
    // Invalid values remain visible until the player explicitly chooses a correction.
    const current = options && typeof value === 'string' && choices.includes(value) ? value : '__invalid__';
    if (current === '__invalid__') {
      const item = el('option', '', `原值：${String(value)}（请选择修正值）`);
      item.value = '__invalid__';
      item.disabled = true;
      select.appendChild(item);
    }
    for (const option of choices) {
      const text = kind === 'boolean' ? (option === 'true' ? '是（true）' : '否（false）') : option || '（未定）';
      const item = el('option', '', text);
      item.value = option;
      select.appendChild(item);
    }
    select.value = current;
    select.addEventListener('change', () => commitLeaf(path, value, select.value, kind, select));
    return select;
  }
  if (value === undefined) return el('span', 'mjr-ve-status', '字段缺失，请先初始化变量');
  const input = el('input', style);
  input.type = kind === 'number' ? 'number' : 'text';
  input.setAttribute('aria-label', label);
  input.value = value === null ? '' : String(value);
  if (typeof value !== kind) input.placeholder = `原值：${String(value)}`;
  input.addEventListener('input', () => commitLeaf(path, value, input.value, kind, input));
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

function commitLeaf(
  path: PathPart[],
  originalValue: unknown,
  raw: string | boolean,
  kind: 'string' | 'number' | 'boolean',
  input: HTMLInputElement | HTMLSelectElement,
) {
  const key = formatPath(path);
  const coerced = coerceInput(originalValue, raw, kind);
  if (!coerced.ok) {
    invalidInputs.add(key);
    input.setCustomValidity(`${key} 需要填写有效${kind === 'number' ? '数字' : '值'}`);
    input.setAttribute('aria-invalid', 'true');
    updateFooter();
    return;
  }
  invalidInputs.delete(key);
  input.setCustomValidity('');
  input.removeAttribute('aria-invalid');
  draft = setAtPath(draft, path, coerced.value);
  const changed = JSON.stringify(getAtPath(original, path)) !== JSON.stringify(coerced.value);
  input.classList.toggle('changed', changed);
  input.closest('.mjr-ve-row')?.querySelector('.mjr-ve-key')?.classList.toggle('changed', changed);
  showErrors([]);
  // Keep the active input and Apply button mounted while typing or blurring.
  updateFooter();
}

function renderJsonEditor(): HTMLElement {
  const area = el('textarea', 'mjr-ve-json');
  area.id = 'mjr-ve-json';
  area.spellcheck = false;
  // jsonText 保存未提交的输入，避免窗口缩放或生成事件触发重绘时丢失正在编辑的内容
  area.value = jsonText ?? JSON.stringify(draft, null, 2);
  area.addEventListener('input', () => {
    jsonText = area.value;
    updateFooter();
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

function switchMode(next: SectionId | 'json') {
  if (mode === next || applying) return;
  if (invalidInputs.size) {
    showErrors(['请先修正无效输入，或放弃改动。']);
    return;
  }
  if (mode === 'json' && !syncJsonToDraft()) return;
  mode = next;
  render();
}

/* ---------- 动作 ---------- */

function reload(discardChanges: boolean) {
  const latest = findLatestAiMessageId();
  const dirty = diffValues(original, draft).length > 0 || jsonText !== null || invalidInputs.size > 0;
  if (!discardChanges && dirty && latest === messageId) return;
  messageId = latest;
  sourceMessage = latest === null ? undefined : getMessage(latest);
  sourceProtocolKey = sourceMessage ? manualEditProtocolKey(sourceMessage) : '';
  invalidInputs.clear();
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
  if (applying || invalidInputs.size) return;
  if (isGenerating()) {
    toast('warning', 'AI 生成中，等生成结束后再应用');
    return;
  }
  if (messageId === null) return;
  if (mode === 'json' && !syncJsonToDraft()) return;
  if (
    findLatestAiMessageId() !== messageId ||
    getMessage(messageId) !== sourceMessage ||
    !sourceMessage ||
    manualEditProtocolKey(sourceMessage) !== sourceProtocolKey
  ) {
    showErrors(['聊天、楼层或回复已经变化，请先点「刷新」重新读取，再修改。']);
    return;
  }
  const changes = diffValues(original, draft);
  if (changes.length === 0) {
    toast('warning', '没有需要应用的改动');
    return;
  }
  // 只拦截落在本次改动上的校验问题；AI 写回的旧值即使不完全符合 Schema 也不阻止写入
  const result = validateDraft(Schema, draft);
  const blocking = result.ok ? [] : issuesForChanges(result.issues, changes);
  if (blocking.length > 0) {
    showErrors([
      '改动的字段未通过变量结构校验，未写入：',
      ...blocking.map(issue => `· ${issue.path}：${issue.message}`),
    ]);
    return;
  }
  const targetId = messageId;
  const targetMessage = sourceMessage;
  applying = true;
  updateFooter();
  try {
    // 补丁式写入：把改动套到最新读取的变量上，玩家没碰过的字段原样保留
    await writeStatData(targetId, applyChanges(readStatData(targetId), changes));
  } catch (error) {
    showErrors([`写入失败：${(error as Error).message}`]);
    toast('error', '写入失败，详见面板');
    return;
  } finally {
    applying = false;
    updateFooter();
  }
  if (getMessage(targetId) !== targetMessage) return;
  const count = changes.length;
  original = readStatData(targetId);
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
  if (!panelOpen) return;
  if (active) {
    // 停止按钮在 GENERATION_STARTED 后才显示，稍等再重绘以刷新「生成中」状态
    hostWindow.setTimeout(() => panelOpen && render(), 300);
  } else {
    // 生成结束后变量可能被 applier 改写；没有未应用改动时自动跟上最新楼层
    hostWindow.setTimeout(() => reload(false), 600);
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
