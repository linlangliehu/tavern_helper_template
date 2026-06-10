// 验证 CRUD 变更计划 JSON 提取/挽救逻辑（修复①）。
// 这些函数从 vendor/shujuku-sp-fork/index.js 的 parseCrudPlanResponse_ACU 链路逐字复制，
// 必须与 vendor 实现保持一致；改 vendor 时同步改这里。
// 运行：node scripts/verify-crud-plan-parse.mjs

function stripJsonFence_ACU(text) {
  return String(text || '')
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
}
function stripTableChangePlanTags_ACU(text) {
  let s = String(text || '');
  const paired = s.match(/<tableChangePlan\b[^>]*>([\s\S]*?)<\/tableChangePlan>/i);
  if (paired) return paired[1].trim();
  s = s.replace(/<\/?tableChangePlan\b[^>]*>/gi, '');
  return s.trim();
}
function salvageCrudPlanObjects_ACU(text) {
  const objects = [];
  const s = String(text || '');
  let depth = 0, start = -1, inString = false, escape = false, quote = '';
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (inString) {
      if (escape) escape = false;
      else if (ch === '\\') escape = true;
      else if (ch === quote) inString = false;
      continue;
    }
    if (ch === '"' || ch === "'") { inString = true; quote = ch; continue; }
    if (ch === '{') { if (depth === 0) start = i; depth++; }
    else if (ch === '}') {
      if (depth > 0) {
        depth--;
        if (depth === 0 && start !== -1) {
          const slice = s.slice(start, i + 1);
          try { objects.push(JSON.parse(slice)); } catch (_) { /* skip */ }
          start = -1;
        }
      }
    }
  }
  return objects;
}
function extractCrudPlanJsonText_ACU(aiResponse) {
  const stripped = stripTableChangePlanTags_ACU(aiResponse);
  return stripJsonFence_ACU(stripped);
}
function parseCrudPlanResponse_ACU(aiResponse) {
  const jsonText = extractCrudPlanJsonText_ACU(aiResponse);
  if (!jsonText) throw new Error('AI 未返回 tableChangePlan JSON。');
  let parsed = null, parseError = null;
  try { parsed = JSON.parse(jsonText); } catch (error) { parseError = error; }
  if (parsed === null && !jsonText.startsWith('[')) {
    const firstObject = jsonText.indexOf('{');
    const lastObject = jsonText.lastIndexOf('}');
    if (firstObject !== -1 && lastObject > firstObject) {
      const body = jsonText.slice(firstObject, lastObject + 1);
      try { parsed = JSON.parse(`[${body}]`); } catch (_) {}
    }
  }
  if (parsed === null) {
    const firstArray = jsonText.indexOf('[');
    const lastArray = jsonText.lastIndexOf(']');
    if (firstArray !== -1 && lastArray > firstArray) {
      try { parsed = JSON.parse(jsonText.slice(firstArray, lastArray + 1)); } catch (_) {}
    }
  }
  if (parsed === null) {
    const salvaged = salvageCrudPlanObjects_ACU(jsonText);
    if (salvaged.length > 0) parsed = salvaged;
  }
  if (parsed === null) {
    throw new Error(`tableChangePlan JSON 解析失败: ${parseError ? parseError.message : '无法挽救'}`);
  }
  const plans = Array.isArray(parsed)
    ? parsed
    : (Array.isArray(parsed?.plans) ? parsed.plans : (parsed?.plan ? [parsed.plan] : [parsed]));
  const normalized = plans.filter(p => p && typeof p === 'object').map(p => ({ ...p }));
  if (normalized.length === 0) throw new Error('tableChangePlan 为空。');
  return normalized;
}

let pass = 0, fail = 0;
function check(name, fn) {
  try { fn(); console.log(`  PASS  ${name}`); pass++; }
  catch (e) { console.log(`  FAIL  ${name}: ${e.message}`); fail++; }
}
function assertEq(a, b, msg) { if (a !== b) throw new Error(`${msg || ''} expected ${b}, got ${a}`); }

// 实测失败样本（reqid 1821）：缺开头 [ 和 <tableChangePlan> 开始标签，仅有结尾 ] 和闭合标签。
const REAL_SAMPLE = `
  {
    "action": "updateCell",
    "table": "player_state",
    "match": { "row_id": 1 },
    "set": { "status_text": "发现前门外被异常黑暗覆盖", "death_risk": 12, "last_action": "向同桌打听视频" },
    "reason": "正文明确了玩家的新行动和状态变化"
  },
  {
    "action": "updateCell",
    "table": "supernatural_events",
    "match": { "event_code": "七中敲门事件" },
    "set": { "ghost_domain_status": "走廊被浓稠黑暗覆盖", "known_laws": "门外被异常黑暗覆盖" },
    "reason": "正文更新了事件的鬼域状态"
  },
  {
    "action": "updateCell",
    "table": "ghost_archives",
    "match": { "archive_code": "G0002" },
    "set": { "phenomenon": "教室门外走廊被浓稠黑暗覆盖" },
    "reason": "正文补充了厉鬼的影响表现"
  }
]
</tableChangePlan>`;

console.log('CRUD 变更计划解析/挽救回归：');

check('实测失败样本（缺开头[与开始标签）能挽救出 3 条计划', () => {
  const plans = parseCrudPlanResponse_ACU(REAL_SAMPLE);
  assertEq(plans.length, 3, '计划条数');
  assertEq(plans[0].table, 'player_state', '第1条表名');
  assertEq(plans[1].match.event_code, '七中敲门事件', '第2条match');
  assertEq(plans[2].action, 'updateCell', '第3条action');
});

check('标准成对标签 + 数组', () => {
  const plans = parseCrudPlanResponse_ACU('<tableChangePlan>[{"action":"noop"}]</tableChangePlan>');
  assertEq(plans.length, 1, '条数'); assertEq(plans[0].action, 'noop', 'action');
});

check('```json 围栏 + 数组', () => {
  const plans = parseCrudPlanResponse_ACU('```json\n[{"action":"insertRow","table":"人物"}]\n```');
  assertEq(plans.length, 1, '条数'); assertEq(plans[0].table, '人物', 'table');
});

check('单个对象（非数组）', () => {
  const plans = parseCrudPlanResponse_ACU('{"action":"updateCell","table":"地点"}');
  assertEq(plans.length, 1, '条数'); assertEq(plans[0].table, '地点', 'table');
});

check('{plans:[...]} 包裹形态', () => {
  const plans = parseCrudPlanResponse_ACU('{"plans":[{"action":"noop"},{"action":"deleteRow","table":"线索"}]}');
  assertEq(plans.length, 2, '条数'); assertEq(plans[1].table, '线索', 'table');
});

check('尾部截断（缺最后]与标签）走括号扫描挽救', () => {
  // 第二个对象被截断（未闭合），应挽救出第一个完整对象
  const truncated = '[{"action":"updateCell","table":"人物","set":{"a":"b"}},{"action":"updateCell","tab';
  const plans = parseCrudPlanResponse_ACU(truncated);
  assertEq(plans.length, 1, '条数'); assertEq(plans[0].table, '人物', 'table');
});

check('字符串内含花括号不破坏扫描', () => {
  const tricky = '{"action":"updateCell","table":"人物","set":{"note":"含 } 和 { 的文本"}},{"action":"noop"}';
  const plans = parseCrudPlanResponse_ACU(tricky);
  assertEq(plans.length, 2, '条数');
  assertEq(plans[0].set.note, '含 } 和 { 的文本', 'note 原样');
});

check('对象间多余逗号 + 前后杂质文字', () => {
  const noisy = '好的，这是计划：\n{"action":"noop"},\n{"action":"insertRow","table":"地点"}\n以上。';
  const plans = parseCrudPlanResponse_ACU(noisy);
  assertEq(plans.length, 2, '条数'); assertEq(plans[1].table, '地点', 'table');
});

check('空内容抛错', () => {
  let threw = false;
  try { parseCrudPlanResponse_ACU('完全没有JSON的纯文本'); } catch (_) { threw = true; }
  assertEq(threw, true, '应抛错');
});

console.log(`\n结果：${pass} 通过 / ${fail} 失败`);
process.exit(fail === 0 ? 0 : 1);
