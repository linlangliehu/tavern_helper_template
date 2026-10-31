/**
 * 悬浮变量编辑器的纯逻辑部分（无 DOM、无酒馆 API），供 index.ts 使用并由
 * scripts/verify-mjr-variable-editor.mjs 离线测试。
 *
 * 设计借鉴参考卡「悬浮变量编辑器」的交互（暂存改动 → 应用前校验），按魔禁卡
 * 固定的 MVU 变量结构重写：只允许改值和删除数组项，不提供新增字段。
 */

export type PathPart = string | number;
export type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

export type ValueChange = { path: PathPart[]; before: unknown; after: unknown };
export type ValidationIssue = { path: string; parts: PathPart[]; message: string };
export type ValidationResult = { ok: true; data: unknown } | { ok: false; issues: ValidationIssue[] };

type SafeParseSchema = {
  safeParse: (
    input: unknown,
  ) =>
    | { success: true; data: unknown }
    | { success: false; error: { issues: Array<{ path: PropertyKey[]; message: string }> } };
};

export function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

export function cloneJson<T>(value: T): T {
  return value === undefined ? value : (JSON.parse(JSON.stringify(value)) as T);
}

export function formatPath(path: PathPart[]): string {
  if (path.length === 0) return '（根）';
  return path.map((part, index) => (typeof part === 'number' ? `[${part}]` : index === 0 ? part : `.${part}`)).join('');
}

export function getAtPath(root: unknown, path: PathPart[]): unknown {
  let cursor: unknown = root;
  for (const part of path) {
    if (Array.isArray(cursor) && typeof part === 'number') cursor = cursor[part];
    else if (isPlainObject(cursor) && typeof part === 'string') cursor = cursor[part];
    else return undefined;
  }
  return cursor;
}

/** 返回修改后的新对象（不改动入参）；路径必须已存在，禁止借此新增字段。 */
export function setAtPath<T>(root: T, path: PathPart[], value: unknown): T {
  if (path.length === 0) throw new Error('不能直接替换根对象');
  const next = cloneJson(root);
  const parent = getAtPath(next, path.slice(0, -1));
  const key = path[path.length - 1];
  if (Array.isArray(parent) && typeof key === 'number' && key >= 0 && key < parent.length) {
    parent[key] = value;
  } else if (isPlainObject(parent) && typeof key === 'string' && Object.prototype.hasOwnProperty.call(parent, key)) {
    parent[key] = value;
  } else {
    throw new Error(`路径不存在：${formatPath(path)}`);
  }
  return next;
}

/** 只允许删除数组中的一项（例如一张 NPC 关系卡片）；对象字段由变量结构固定，不可删除。 */
export function canRemoveAtPath(root: unknown, path: PathPart[]): boolean {
  if (path.length === 0) return false;
  const parent = getAtPath(root, path.slice(0, -1));
  const key = path[path.length - 1];
  return Array.isArray(parent) && typeof key === 'number' && key >= 0 && key < parent.length;
}

export function removeArrayItem<T>(root: T, path: PathPart[]): T {
  if (!canRemoveAtPath(root, path)) throw new Error(`只能删除数组项：${formatPath(path)}`);
  const next = cloneJson(root);
  const parent = getAtPath(next, path.slice(0, -1)) as unknown[];
  parent.splice(path[path.length - 1] as number, 1);
  return next;
}

/**
 * 把输入框里的文本按原值类型转换。返回 { ok:false } 表示输入非法（如数字框填了字母），
 * 调用方应提示并保留原值，而不是悄悄写入 NaN 或字符串。
 */
export function coerceInput(original: unknown, raw: string | boolean): { ok: true; value: unknown } | { ok: false } {
  if (typeof original === 'boolean') {
    if (typeof raw === 'boolean') return { ok: true, value: raw };
    if (raw === 'true' || raw === 'false') return { ok: true, value: raw === 'true' };
    return { ok: false };
  }
  if (typeof original === 'number') {
    const text = String(raw).trim();
    if (text === '') return { ok: false };
    const value = Number(text);
    return Number.isFinite(value) ? { ok: true, value } : { ok: false };
  }
  return { ok: true, value: String(raw) };
}

/** 列出叶子级改动（数组长度变化时整段数组记为一处改动）。 */
export function diffValues(before: unknown, after: unknown, path: PathPart[] = []): ValueChange[] {
  if (Object.is(before, after)) return [];
  if (Array.isArray(before) && Array.isArray(after)) {
    if (before.length !== after.length) return [{ path, before, after }];
    return before.flatMap((item, index) => diffValues(item, after[index], [...path, index]));
  }
  if (isPlainObject(before) && isPlainObject(after)) {
    const keys = [...new Set([...Object.keys(before), ...Object.keys(after)])];
    return keys.flatMap(key => diffValues(before[key], after[key], [...path, key]));
  }
  if (JSON.stringify(before) === JSON.stringify(after)) return [];
  return [{ path, before, after }];
}

export function parseJsonDraft(text: string): { ok: true; value: unknown } | { ok: false; message: string } {
  try {
    const value = JSON.parse(text);
    if (!isPlainObject(value)) return { ok: false, message: 'stat_data 必须是一个 JSON 对象' };
    return { ok: true, value };
  } catch (error) {
    return { ok: false, message: `JSON 格式错误：${(error as Error).message}` };
  }
}

/** 用卡片自身的 zod 变量结构校验草稿；失败时给出可读的错误列表，调用方不得写入。 */
export function validateDraft(schema: SafeParseSchema, draft: unknown): ValidationResult {
  const result = schema.safeParse(draft);
  if (result.success) return { ok: true, data: result.data };
  return {
    ok: false,
    issues: result.error.issues.map(issue => {
      const parts = issue.path.map(part => (typeof part === 'number' ? part : String(part)));
      return { path: formatPath(parts), parts, message: issue.message };
    }),
  };
}

function isPrefix(prefix: PathPart[], path: PathPart[]): boolean {
  return prefix.length <= path.length && prefix.every((part, index) => part === path[index]);
}

/**
 * 只保留落在「本次改动」路径上的校验问题。
 * AI 写回的旧值可能本来就不完全符合 Schema（如 阵营 写成「科学侧（学园都市）」），
 * 参考卡的做法是只提交改动的补丁、不重校验整份变量；这里同理，玩家没碰过的字段不阻止写入。
 */
export function issuesForChanges(issues: ValidationIssue[], changes: ValueChange[]): ValidationIssue[] {
  return issues.filter(issue =>
    changes.some(change => isPrefix(change.path, issue.parts) || isPrefix(issue.parts, change.path)),
  );
}

/** 把改动逐条套到最新读取的变量上（补丁式写入），未改动的字段保持原样。 */
export function applyChanges<T>(base: T, changes: ValueChange[]): T {
  return changes.reduce((acc, change) => setAtPath(acc, change.path, cloneJson(change.after)), base);
}

export type Layout = { x: number; y: number; width: number; height: number };

/** 把面板或按钮位置限制在可视区域内，防止拖出屏幕后找不回来。 */
export function clampLayout(layout: Layout, viewport: { width: number; height: number }): Layout {
  const width = Math.max(240, Math.min(layout.width, viewport.width));
  const height = Math.max(160, Math.min(layout.height, viewport.height));
  return {
    width,
    height,
    x: Math.max(0, Math.min(layout.x, viewport.width - Math.min(width, 48))),
    y: Math.max(0, Math.min(layout.y, viewport.height - Math.min(height, 48))),
  };
}

/* ---------- 分类：与消息末尾面板（玩家 / 能力 / 任务 / 关系）一一对应，另加「地点」 ---------- */

export type SectionId = '玩家' | '能力' | '任务' | '地点' | '关系';

export const SECTIONS: ReadonlyArray<{ id: SectionId; fields: readonly string[] }> = [
  { id: '玩家', fields: ['姓名', '性别', '年龄', '性格', '外貌', '身份', '阵营', '状态', '身体', '情绪', '剧情阶段'] },
  { id: '能力', fields: ['能力档案'] },
  { id: '任务', fields: ['任务追踪'] },
  { id: '地点', fields: ['所在位置', '在场人物'] },
  { id: '关系', fields: ['NPC关系'] },
];

/** schema.ts 中的枚举字段（按字段名），编辑时用下拉框，避免填出校验不通过的值。 */
export const ENUM_OPTIONS: Readonly<Record<string, readonly string[]>> = {
  阵营: ['科学侧', '魔法侧', ''],
  剧情阶段: ['序章', '遭遇', '发展', '高潮', '终局'],
  阵营类型: ['超能力', '术式', '灵装', '无能力'],
};

/** 数组项的显示名：优先用能力名 / 任务名 / 角色名，便于和面板对照。 */
export function itemLabel(item: unknown, index: number): string {
  if (isPlainObject(item)) {
    for (const key of ['能力名称', '任务名称', '角色名', '名称']) {
      const value = item[key];
      if (typeof value === 'string' && value.trim()) return `${index + 1}. ${value.trim()}`;
    }
  }
  if (typeof item === 'string' && item.trim()) return `${index + 1}. ${item.trim()}`;
  return `${index + 1}.`;
}
