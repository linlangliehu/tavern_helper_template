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
