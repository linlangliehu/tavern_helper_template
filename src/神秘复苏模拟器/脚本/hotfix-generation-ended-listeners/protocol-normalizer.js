const ARRAY_APPEND_PATHS = new Set([
  '/规律推理记录',
  // '/行动建议' — 已移除：整表替换而非逐条追加，防止单条 add 变 insert 导致累积
  '/在场人物',
  '/收录档案',
  '/收录规律',
  // '/灵异资源/鬼拼图' — 已移除：整表替换而非逐条 insert
  // '/灵异资源/灵异物品' — 已移除：整表替换而非逐条 insert
  '/势力关系/联系人',
  '/势力关系/敌对势力',
  '/势力关系/可调用资源',
  '/世界线记录',
  '/可见档案/玩家已知',
  '/可见档案/NPC已知',
  '/可见档案/已验证线索',
  '/可见档案/未验证猜测',
  '/隐藏档案/误导线索',
  '/当前灵异事件/已知杀人规律',
  '/当前灵异事件/猜测杀人规律',
  '/当前灵异事件/错误推断',
  '/主线进度/已开放主题',
  '/主线进度/锁定主题',
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
 * 状态文本→风险区间映射表（用于无法从摘要提取数字时的 fallback）。
 */
const RISK_TEXT_MAP = {
  '低': 10, '可控': 10, '安全': 5,
  '中': 30, '一般': 30,
  '高': 55, '警戒': 55, '危险': 55,
  '致命': 80, '濒死': 85, '极高': 80,
};

/**
 * 从【本轮摘要】块中提取字段，重建最小可用 <UpdateVariable> 协议块。
 *
 * 只生成 delta 和 replace 操作，不生成 insert/remove/move。
 * delta 只有在能计算新旧差值时才生成。
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

  // 2. 提取状态和风险数值
  const statusMatch = summary.match(/状态[：:]\s*(.+?)[；;]\s*死亡风险\s*(\d+|低|中|高|致命|濒死|极高|可控|警戒|危险|安全|一般)[,，]?\s*复苏风险\s*(\d+|无|低|中|高|致命|濒死|极高|可控|警戒|危险|安全|一般)/);
  if (statusMatch) {
    const statusText = statusMatch[1].trim();

    // 处理风险值
    const riskStr = statusMatch[2];
    const riskNum = parseInt(riskStr, 10);
    const newRisk = Number.isNaN(riskNum) ? (RISK_TEXT_MAP[riskStr] ?? undefined) : riskNum;
    if (newRisk !== undefined) {
      const oldRisk = safeOld('/风险值');
      if (typeof oldRisk === 'number') {
        const delta = newRisk - oldRisk;
        if (delta !== 0) {
          patches.push({ op: 'delta', path: '/风险值', value: delta });
        }
      } else {
        // oldData 中没有风险值，用 replace 直接设置
        patches.push({ op: 'replace', path: '/风险值', value: newRisk });
      }
    }

    // 处理复苏风险
    const reviveStr = statusMatch[3];
    const reviveNum = parseInt(reviveStr, 10);
    const newRevive = Number.isNaN(reviveNum) ? (reviveStr === '无' ? 0 : (RISK_TEXT_MAP[reviveStr] ?? undefined)) : reviveNum;
    if (newRevive !== undefined) {
      const oldRevive = safeOld('/驭鬼者状态/总复苏风险');
      if (typeof oldRevive === 'number') {
        const delta = newRevive - oldRevive;
        if (delta !== 0) {
          patches.push({ op: 'delta', path: '/驭鬼者状态/总复苏风险', value: delta });
        }
      } else {
        patches.push({ op: 'replace', path: '/驭鬼者状态/总复苏风险', value: newRevive });
      }
    }

    // 仅当状态文本不含数字时才 replace /状态
    if (statusText && !/\d/.test(statusText)) {
      const oldStatus = safeOld('/状态');
      if (oldStatus !== statusText) {
        patches.push({ op: 'replace', path: '/状态', value: statusText });
      }
    }
  }

  // 3. 提取事件
  const eventMatch = summary.match(/事件[：:]\s*(.+?)[；;]\s*(.+?)[；;]\s*(.+)/);
  if (eventMatch) {
    const eventCode = eventMatch[1].trim();
    const oldEventCode = safeOld('/当前灵异事件/事件代号');
    if (eventCode && eventCode !== '未立案' && oldEventCode !== eventCode) {
      patches.push({ op: 'replace', path: '/当前灵异事件/事件代号', value: eventCode });
    }
  }

  // 4. 提取下一步
  const nextMatch = summary.match(/下一步[：:]\s*(.+)/);
  if (nextMatch) {
    const nextStep = nextMatch[1].trim();
    if (nextStep && nextStep !== '等待玩家行动') {
      patches.push({
        op: 'replace',
        path: '/最近行动判定',
        value: {
          类型: '未判定',
          行动: '',
          依据: [],
          触发项: [],
          结果: '未结算',
          代价: '无',
          死亡风险变化: '+0',
          复苏风险变化: '+0',
          资源代价: '无',
          后续建议: nextStep,
          可见结论: '',
        },
      });
    }
  }

  // 5. 尝试从正文中提取 A/B/C/D 选项文本（通用匹配）
  const optionMatches = text.match(/[ABCD][：:]\s*(.+)/g);
  if (optionMatches && optionMatches.length >= 4) {
    const suggestions = optionMatches.slice(0, 4).map((line, i) => {
      const text = line.replace(/^[ABCD][：:]\s*/, '').trim();
      const key = String.fromCharCode(65 + i); // A/B/C/D
      return {
        选项: key,
        思路: text,
        主要风险: '未知',
        预期收益: '未知',
        死亡风险: '未知',
        复苏风险: '未知',
      };
    });
    // 确保 D 是自定义行动
    if (suggestions.length >= 4) {
      suggestions[3] = {
        选项: 'D',
        思路: '自定义行动',
        主要风险: '取决于玩家输入',
        预期收益: '保留自由行动',
        死亡风险: '未知',
        复苏风险: '未知',
      };
    }
    patches.push({ op: 'replace', path: '/行动建议', value: suggestions });
  } else {
    // 无法提取 4 条选项，不生成 /行动建议 replace
    // 但如果摘要中表明死亡（风险值>=100 或状态为死亡），清空行动建议
    const deathMatch = summary.match(/状态[：:]\s*死亡/) || (statusMatch && parseInt(statusMatch[2], 10) >= 100);
    if (deathMatch) {
      patches.push({ op: 'replace', path: '/行动建议', value: [] });
      patches.push({ op: 'replace', path: '/状态', value: '死亡' });
      patches.push({ op: 'replace', path: '/is_dead', value: true });
    }
  }

  // 6. 限制 patch 数量上限
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
