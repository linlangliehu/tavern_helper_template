const ARRAY_APPEND_PATHS = new Set([
  '/在场人物',
  '/任务追踪',
  '/NPC关系',
  '/势力关系/联系人',
  '/势力关系/敌对势力',
  '/势力关系/可调用资源',
  '/世界线记录',
  '/主线进度/已完成节点',
  '/主线进度/可触发节点',
  '/主线进度/正史锚点/玩家偏移',
]);

function extractFirstJsonArrayText(source) {
  const text = String(source || '');
  const start = text.indexOf('[');
  if (start < 0) return '';

  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let index = start; index < text.length; index += 1) {
    const char = text[index];
    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (char === '\\') {
        escaped = true;
      } else if (char === '"') {
        inString = false;
      }
      continue;
    }
    if (char === '"') {
      inString = true;
      continue;
    }
    if (char === '[') depth += 1;
    if (char === ']') {
      depth -= 1;
      if (depth === 0) return text.slice(start, index + 1);
    }
  }
  return '';
}

function normalizeJsonPointerPath(path) {
  if (typeof path !== 'string') return '';
  const trimmed = path.trim();
  if (!trimmed) return '';
  return trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
}

function normalizeAddPatch(patch) {
  if (!patch || typeof patch !== 'object' || Array.isArray(patch)) {
    return { patch: null, addToInsert: 0, addToReplace: 0, skipped: 1 };
  }

  const next = { ...patch };
  const op = typeof next.op === 'string' ? next.op.trim().toLowerCase() : '';
  const path = normalizeJsonPointerPath(next.path);
  if (!path) return { patch: null, addToInsert: 0, addToReplace: 0, skipped: 1 };
  next.path = path;

  if (op !== 'add') {
    if (op) next.op = op;
    return { patch: next, addToInsert: 0, addToReplace: 0, skipped: 0 };
  }

  if (path.endsWith('/-') || /\/\d+$/.test(path)) {
    next.op = 'insert';
    return { patch: next, addToInsert: 1, addToReplace: 0, skipped: 0 };
  }

  if (ARRAY_APPEND_PATHS.has(path) && !Array.isArray(next.value)) {
    next.op = 'insert';
    next.path = `${path}/-`;
    return { patch: next, addToInsert: 1, addToReplace: 0, skipped: 0 };
  }

  // JSON Patch 的 add 经常被模型用于“设置字段”。MVU 没有 add 操作；
  // 对非数组追加语义，replace 是最接近且可消费的保守降级。
  next.op = 'replace';
  return { patch: next, addToInsert: 0, addToReplace: 1, skipped: 0 };
}

function normalizePatchArrayText(arrayText) {
  let patches;
  try {
    patches = JSON.parse(arrayText);
  } catch {
    return { arrayText, changed: false, addToInsert: 0, addToReplace: 0, skipped: 0 };
  }
  if (!Array.isArray(patches)) {
    return { arrayText, changed: false, addToInsert: 0, addToReplace: 0, skipped: 1 };
  }

  let addToInsert = 0;
  let addToReplace = 0;
  let skipped = 0;
  const normalized = [];
  for (const patch of patches) {
    const result = normalizeAddPatch(patch);
    addToInsert += result.addToInsert;
    addToReplace += result.addToReplace;
    skipped += result.skipped;
    if (result.patch) normalized.push(result.patch);
  }

  const changed = addToInsert > 0 || addToReplace > 0 || skipped > 0 || normalized.length !== patches.length;
  return {
    arrayText: changed ? JSON.stringify(normalized, null, 2) : arrayText,
    changed,
    addToInsert,
    addToReplace,
    skipped,
  };
}

function normalizeUpdateVariableInner(inner) {
  const source = String(inner || '')
    .replace(/<Analysis\b[^>]*>[\s\S]*?<\/Analysis>/gi, '')
    .trim();

  const jsonPatchMatch = source.match(/(<JSONPatch\b[^>]*>)\s*([\s\S]*?)\s*(<\/JSONPatch>)/i);
  if (jsonPatchMatch) {
    const arrayText = extractFirstJsonArrayText(jsonPatchMatch[2]);
    if (!arrayText) {
      return { inner: source, changed: false, legacyWrapped: 0, addToInsert: 0, addToReplace: 0, skipped: 0 };
    }
    const normalized = normalizePatchArrayText(arrayText);
    const nextJsonPatch = `${jsonPatchMatch[1]}\n${normalized.arrayText}\n${jsonPatchMatch[3]}`;
    return {
      inner: source.replace(jsonPatchMatch[0], nextJsonPatch),
      changed: normalized.changed,
      legacyWrapped: 0,
      addToInsert: normalized.addToInsert,
      addToReplace: normalized.addToReplace,
      skipped: normalized.skipped,
    };
  }

  const legacyArrayText = extractFirstJsonArrayText(source.replace(/<\/?JSONPatch\b[^>]*>/gi, ''));
  if (!legacyArrayText) {
    return { inner: source, changed: false, legacyWrapped: 0, addToInsert: 0, addToReplace: 0, skipped: 0 };
  }

  const normalized = normalizePatchArrayText(legacyArrayText);
  return {
    inner: `<JSONPatch>\n${normalized.arrayText}\n</JSONPatch>`,
    changed: true,
    legacyWrapped: 1,
    addToInsert: normalized.addToInsert,
    addToReplace: normalized.addToReplace,
    skipped: normalized.skipped,
  };
}

function normalizeMfrsUpdateVariableProtocol(message) {
  const stats = { blocks: 0, legacyWrapped: 0, addToInsert: 0, addToReplace: 0, skipped: 0 };
  const normalizedMessage = String(message || '').replace(
    /(<UpdateVariable\b[^>]*>)\s*([\s\S]*?)\s*(<\/UpdateVariable>)/gi,
    (full, openTag, inner, closeTag) => {
      stats.blocks += 1;
      const normalized = normalizeUpdateVariableInner(inner);
      stats.legacyWrapped += normalized.legacyWrapped;
      stats.addToInsert += normalized.addToInsert;
      stats.addToReplace += normalized.addToReplace;
      stats.skipped += normalized.skipped;
      return normalized.changed ? `${openTag}\n${normalized.inner}\n${closeTag}` : full;
    },
  );

  return {
    message: normalizedMessage,
    changed: normalizedMessage !== String(message || ''),
    stats,
  };
}

/**
 * 从【本轮摘要】块中提取字段，重建最小可用 <UpdateVariable> 协议块。
 *
 * 只生成 replace 操作，不生成 insert/remove/move。
 * 本卡无风险值、无异常事件、无行动建议、无最近行动判定，只重建位置与状态。
 *
 * @param {string} message - AI 原始消息文本
 * @param {Record<string, unknown>} oldData - 当前 MVU stat_data
 * @returns {string|null} 拼装好的 <UpdateVariable>... 协议块，或 null 表示无法重建
 */
function reconstructUpdateVariableFromSummary(message, oldData) {
  const text = String(message || '');
  if (!text) return null;

  // 如果消息已包含 <UpdateVariable>，不需要重建
  if (/<UpdateVariable\b/i.test(text)) return null;

  // 提取【本轮摘要】块
  const summaryMatch = text.match(/【本轮摘要】([\s\S]*?)(?=\n\s*<\w|\n\s*【[^轮]|\n\s*```|$)/);
  if (!summaryMatch) {
    console.warn('[Hotfix] 协议重建：未找到【本轮摘要】块，跳过');
    return null;
  }
  const summary = summaryMatch[1];

  const patches = [];
  const stat = (oldData && oldData.stat_data) || {};
  const safeOld = (path) => {
    const keys = path.split('/');
    let cur = stat;
    for (const k of keys) {
      if (k === '') continue;
      if (cur == null || typeof cur !== 'object') return undefined;
      cur = cur[k];
    }
    return cur;
  };

  // 1. 提取位置
  const locMatch = summary.match(/位置[：:]\s*(.+)/);
  if (locMatch) {
    const newLoc = locMatch[1].trim();
    const oldLoc = safeOld('/所在位置');
    if (typeof oldLoc === 'string' && oldLoc !== newLoc) {
      patches.push({ op: 'replace', path: '/所在位置', value: newLoc });
    } else if (oldLoc === undefined) {
      patches.push({ op: 'replace', path: '/所在位置', value: newLoc });
    }
  }

  // 2. 提取状态（仅当状态文本不含数字时才 replace）
  const statusMatch = summary.match(/状态[：:]\s*([^；;\n]+)/);
  if (statusMatch) {
    const statusText = statusMatch[1].trim();
    if (statusText && !/\d/.test(statusText)) {
      const oldStatus = safeOld('/状态');
      if (oldStatus !== statusText) {
        patches.push({ op: 'replace', path: '/状态', value: statusText });
      }
    }
  }

  // 限制 patch 数量上限
  const capped = patches.slice(0, 6);

  if (capped.length === 0) {
    console.warn('[Hotfix] 协议重建：无法从摘要提取任何字段，跳过');
    return null;
  }

  const block = '<UpdateVariable>\n<JSONPatch>\n' + JSON.stringify(capped, null, 2) + '\n</JSONPatch>\n</UpdateVariable>';

  console.info('[Hotfix] 协议重建：已从【本轮摘要】重建协议块', {
    patchCount: capped.length,
    paths: capped.map(p => p.path),
  });

  return block;
}

module.exports = {
  extractFirstJsonArrayText,
  normalizeMfrsUpdateVariableProtocol,
  normalizePatchArrayText,
  reconstructUpdateVariableFromSummary,
};
