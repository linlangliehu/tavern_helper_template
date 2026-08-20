type MvuData = Record<string, unknown> & {
  stat_data?: Record<string, unknown>;
};

type Patch = {
  op?: string;
  path?: string;
  from?: string;
  value?: unknown;
};

type RawWriteResult = {
  data: MvuData;
  applied: number;
  skipped: number;
};

function clone<T>(value: T): T {
  try {
    return JSON.parse(JSON.stringify(value));
  } catch {
    return value;
  }
}

function decodePointer(pointer: string): string[] {
  if (!pointer.startsWith('/')) return [];
  return pointer
    .slice(1)
    .split('/')
    .map(part => part.replace(/~1/g, '/').replace(/~0/g, '~'));
}

function isContainer(value: unknown): value is Record<string, unknown> | unknown[] {
  return value !== null && typeof value === 'object';
}

function getParent(root: unknown, parts: string[], create = false) {
  if (parts.length < 1) return null;
  let current = root;
  for (const part of parts.slice(0, -1)) {
    if (!isContainer(current)) return null;
    let next = (current as any)[part];
    if (!isContainer(next)) {
      if (!create) return null;
      next = {};
      (current as any)[part] = next;
    }
    current = next;
  }
  return isContainer(current) ? current : null;
}

function parseIndex(value: string, length: number, allowEnd = false) {
  if (!/^\d+$/u.test(value)) return null;
  const index = Number(value);
  if (!Number.isSafeInteger(index) || index < 0 || index > length || (!allowEnd && index >= length)) return null;
  return index;
}

function applyPatch(root: MvuData, patch: Patch): boolean {
  const op = String(patch.op ?? '').trim().toLowerCase();
  const pathParts = decodePointer(String(patch.path ?? ''));
  if (pathParts.length === 0) return false;
  const fullParts = ['stat_data', ...pathParts];
  const parent = getParent(root, fullParts, op === 'replace' || op === 'delta' || op === 'insert');
  if (!parent) return false;
  const key = fullParts[fullParts.length - 1];

  if (op === 'replace') {
    (parent as any)[key] = clone(patch.value);
    return true;
  }

  if (op === 'delta') {
    const previous = Number((parent as any)[key] ?? 0);
    const delta = Number(patch.value ?? 0);
    if (!Number.isFinite(previous) || !Number.isFinite(delta)) return false;
    (parent as any)[key] = previous + delta;
    return true;
  }

  if (op === 'insert') {
    if (!Array.isArray(parent)) return false;
    const index = key === '-' ? parent.length : parseIndex(key, parent.length, true);
    if (index === null) return false;
    parent.splice(index, 0, clone(patch.value));
    return true;
  }

  if (op === 'remove') {
    if (Array.isArray(parent)) {
      const index = parseIndex(key, parent.length);
      if (index === null) return false;
      parent.splice(index, 1);
    } else {
      if (!Object.prototype.hasOwnProperty.call(parent, key)) return false;
      delete (parent as any)[key];
    }
    return true;
  }

  if (op === 'move') {
    const fromParts = decodePointer(String(patch.from ?? ''));
    if (fromParts.length === 0) return false;
    const fromFull = ['stat_data', ...fromParts];
    const fromParent = getParent(root, fromFull);
    if (!fromParent) return false;
    const fromKey = fromFull[fromFull.length - 1];
    let moved: unknown;
    if (Array.isArray(fromParent)) {
      const index = parseIndex(fromKey, fromParent.length);
      if (index === null) return false;
      moved = fromParent[index];
      fromParent.splice(index, 1);
    } else {
      if (!Object.prototype.hasOwnProperty.call(fromParent, fromKey)) return false;
      moved = fromParent[fromKey];
      delete fromParent[fromKey];
    }
    const destinationParts = ['stat_data', ...pathParts];
    const destinationParent = getParent(root, destinationParts);
    if (!destinationParent) return false;
    const destinationKey = destinationParts[destinationParts.length - 1];
    if (Array.isArray(destinationParent)) {
      const index = destinationKey === '-' ? destinationParent.length : parseIndex(destinationKey, destinationParent.length, true);
      if (index === null) return false;
      destinationParent.splice(index, 0, moved);
    } else {
      destinationParent[destinationKey] = moved;
    }
    return true;
  }

  return false;
}

function extractJsonArray(text: string) {
  const start = text.indexOf('[');
  if (start < 0) return '';
  let depth = 0;
  let quote = false;
  let escaped = false;
  for (let index = start; index < text.length; index += 1) {
    const char = text[index];
    if (quote) {
      if (escaped) escaped = false;
      else if (char === '\\') escaped = true;
      else if (char === '"') quote = false;
      continue;
    }
    if (char === '"') quote = true;
    else if (char === '[') depth += 1;
    else if (char === ']' && --depth === 0) return text.slice(start, index + 1);
  }
  return '';
}

/**
 * 数值型 delta 判定白名单：schema default 均为 0 的字段。
 * 只有这些字段才能用「协议声称 delta≠0 但当前值仍为 0」反推假性已应用——
 * 因为它们的初值确定就是 0，当前为 0 几乎只可能源自「重载后 stat_data 退回初值」。
 * 非数值字段、初值非 0 字段一律不纳入，避免误清合法 replace/归零楼层。
 */
const FALSAPPLY_DELTA_WHITELIST: ReadonlySet<string> = new Set([
  '/风险值',
  '/厉鬼复苏程度',
  '/驭鬼者状态/总复苏风险',
]);

type DeltaPatch = { path: string; value: number };

/**
 * 从归一化后的协议文本中提取所有 delta 操作（仅白名单路径）。
 * 复用与 applyRawProtocolToMvuData 一致的 <UpdateVariable>/<JSONPatch> 解析口径，
 * 确保判定与权威写回看的是同一批 patch。
 */
function extractWhitelistedDeltaPatches(normalizedMessage: string): DeltaPatch[] {
  const blocks = String(normalizedMessage).match(/<UpdateVariable\b[^>]*>[\s\S]*?<\/UpdateVariable>/gi) ?? [];
  const out: DeltaPatch[] = [];
  for (const block of blocks) {
    const match = block.match(/<JSONPatch\b[^>]*>([\s\S]*?)<\/JSONPatch>/i);
    const arrayText = match ? extractJsonArray(match[1]) : extractJsonArray(block.replace(/<\/?JSONPatch\b[^>]*>/gi, ''));
    if (!arrayText) continue;
    let patches: Patch[];
    try {
      patches = JSON.parse(arrayText);
    } catch {
      continue;
    }
    if (!Array.isArray(patches)) continue;
    for (const patch of patches) {
      const op = String(patch.op ?? '').trim().toLowerCase();
      if (op !== 'delta') continue;
      const path = String(patch.path ?? '');
      if (!FALSAPPLY_DELTA_WHITELIST.has(path)) continue;
      const value = Number(patch.value ?? NaN);
      if (!Number.isFinite(value)) continue;
      out.push({ path, value });
    }
  }
  return out;
}

function readStatPointer(stat: Record<string, unknown>, path: string): unknown {
  let current: unknown = stat;
  for (const key of path.split('/').filter(Boolean)) {
    if (current == null || typeof current !== 'object' || Array.isArray(current)) return undefined;
    current = (current as Record<string, unknown>)[key];
  }
  return current;
}

function createFalseApplyDefaultData(): MvuData {
  return {
    stat_data: {
      风险值: 0,
      厉鬼复苏程度: 0,
      驭鬼者状态: { 总复苏风险: 0 },
    },
  };
}

/**
 * 判定「假性已应用」：协议已写回过（applied_hash 命中），但 stat_data 退回初值。
 *
 * 规则（保守，宁可漏判也不误清）：
 * 1. 仅检查 schema default 为 0 的白名单 delta 路径。
 * 2. 从 schema default 按协议原顺序完整重放；只有该路径的预期终值 > 0、当前却仍为 0，才判定回退。
 * 3. 单个负 delta、正负 delta 净归零、或后续 replace 归零都视为合法归零，不得重放。
 *
 * 不读 mes、不读预设标签；只读 oldData.stat_data + 解析 <UpdateVariable>。
 */
export function isFalselyAppliedStat(oldData: MvuData | undefined, normalizedMessage: string): boolean {
  const paths = [...new Set(extractWhitelistedDeltaPatches(normalizedMessage).map(delta => delta.path))];
  if (paths.length === 0) return false;

  const currentStat = (oldData && (oldData as MvuData).stat_data) || {};
  const expectedStat = applyRawProtocolToMvuData(createFalseApplyDefaultData(), normalizedMessage).data.stat_data || {};
  return paths.some(path => {
    const current = readStatPointer(currentStat, path);
    const expected = readStatPointer(expectedStat, path);
    return typeof current === 'number' && current === 0 && typeof expected === 'number' && expected > 0;
  });
}

export function applyRawProtocolToMvuData(oldData: MvuData, normalizedMessage: string): RawWriteResult {
  const next = clone(oldData);
  if (!next.stat_data || typeof next.stat_data !== 'object' || Array.isArray(next.stat_data)) next.stat_data = {};
  let applied = 0;
  let skipped = 0;
  const blocks = String(normalizedMessage).match(/<UpdateVariable\b[^>]*>[\s\S]*?<\/UpdateVariable>/gi) ?? [];
  for (const block of blocks) {
    const match = block.match(/<JSONPatch\b[^>]*>([\s\S]*?)<\/JSONPatch>/i);
    const arrayText = match ? extractJsonArray(match[1]) : extractJsonArray(block.replace(/<\/?JSONPatch\b[^>]*>/gi, ''));
    if (!arrayText) {
      skipped += 1;
      continue;
    }
    let patches: Patch[];
    try {
      patches = JSON.parse(arrayText);
    } catch {
      skipped += 1;
      continue;
    }
    if (!Array.isArray(patches)) {
      skipped += 1;
      continue;
    }
    for (const patch of patches) {
      if (applyPatch(next, patch)) applied += 1;
      else skipped += 1;
    }
  }
  return { data: next, applied, skipped };
}
