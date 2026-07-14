/* eslint-disable import-x/no-nodejs-modules */
/**
 * G3: 正则 id 唯一 + 查找表达式可编译（开发/发布 index.yaml）
 */
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { isDeepStrictEqual } from 'node:util';
import YAML from 'yaml';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const CARD = '神秘复苏模拟器';
const EXPECTED_COUNT = 33;
const indexPaths = [
  join(ROOT, 'src', CARD, 'index.yaml'),
  join(ROOT, 'src', `${CARD}发布版`, 'index.yaml'),
];

const EXT = '扩展字段';
const REGEX = '正则';
const NAME = '正则名称';
const ID = 'id';
const FIND = '查找表达式';
const REPLACE = '替换为';
const ENABLED = '启用';
const SOURCE = '来源';
const APPLIES_TO = '作用于';

// RM8/RH4（BF6）：hotfix 清洗白名单 ↔ 显示正则 #「旧 sp/mfrs 面板」白名单同步守护。
const HOTFIX_PATH = join(
  ROOT, 'src', CARD, '脚本', 'hotfix-generation-ended-listeners', 'index.ts',
);
const DISPLAY_SPMFRS_REGEX_ID = 'd0f6b2d4-4b25-4b8c-9b54-2f7b6c8a2025';
// 旧版 sp_status 协议保证每个字段在单块内唯一；opener 与水平空白最多 300 字符，字段前后最多扫描 3000 个不含 "<" 的字符。
const RH5_FIELD_REGEXES = [
  { id: 'd0f6b2d4-4b25-4b8c-9b54-2f7b6c8a2021', field: 'Name', localizedField: '姓名' },
  { id: 'd0f6b2d4-4b25-4b8c-9b54-2f7b6c8a2022', field: 'Status', localizedField: '状态' },
  { id: 'd0f6b2d4-4b25-4b8c-9b54-2f7b6c8a2023', field: 'Location', localizedField: '所在位置' },
];
const RH5_BEHAVIOR_SAMPLE = [
  'Name: outside-before',
  'Status: outside-before',
  'Location: outside-before',
  '<sp_status>',
  'Name: first',
  'Status: active',
  'Location: first-room',
  '</sp_status >',
  'Name: outside-between',
  'Status: outside-between',
  'Location: outside-between',
  '<SP_STATUS data-source="fallback">',
  'Name: second',
  'Status: stable',
  'Location: second-room',
  '</SP_STATUS>',
  'Name: outside-after',
  'Status: outside-after',
  'Location: outside-after',
].join('\n');
const RH5_EXPECTED_OUTPUT = [
  'Name: outside-before',
  'Status: outside-before',
  'Location: outside-before',
  '<sp_status>',
  '姓名：first',
  '状态：active',
  '所在位置：first-room',
  '</sp_status >',
  'Name: outside-between',
  'Status: outside-between',
  'Location: outside-between',
  '<SP_STATUS data-source="fallback">',
  '姓名：second',
  '状态：stable',
  '所在位置：second-room',
  '</SP_STATUS>',
  'Name: outside-after',
  'Status: outside-after',
  'Location: outside-after',
].join('\n');

// 从形如 (?!(?:sp_start|sp_input|mfrs_roll)\b) 的负向前瞻里提取白名单标签集合。
function extractSpMfrsWhitelist(expression) {
  const m = /\(\?!\(\?:([a-z_|]+)\)\\b\)/i.exec(String(expression ?? ''));
  if (!m) return null;
  return new Set(m[1].split('|').map(s => s.trim()).filter(Boolean));
}

function verifySpMfrsWhitelistSync(entries) {
  if (!existsSync(HOTFIX_PATH)) {
    console.log('verify-mfrs-regex-ids: skip 白名单同步（hotfix 源缺失）');
    return;
  }
  const hotfixSrc = readFileSync(HOTFIX_PATH, 'utf8');
  const hotfixSet = extractSpMfrsWhitelist(hotfixSrc);
  assert.ok(hotfixSet && hotfixSet.size, 'RM8: 未能从 hotfix 源提取 sp/mfrs 清洗白名单');

  const displayEntry = entries.find(e => e?.[ID]?.trim() === DISPLAY_SPMFRS_REGEX_ID);
  assert.ok(displayEntry, `RH4: 未找到显示正则 id ${DISPLAY_SPMFRS_REGEX_ID}`);
  const displaySet = extractSpMfrsWhitelist(displayEntry[FIND]);
  assert.ok(displaySet && displaySet.size, 'RH4: 未能从显示正则提取 sp/mfrs 白名单');

  // 不变式：显示正则白名单 ⊆ hotfix 白名单（hotfix 可多列自闭合的 mfrs_roll）。
  // 任一方新增/删除保留标签而另一方漏改，此断言即失败（防 RH6 式漂移）。
  const missing = [...displaySet].filter(tag => !hotfixSet.has(tag));
  assert.deepEqual(
    missing, [],
    `RM8/RH4: 显示正则白名单含 hotfix 未保留的标签: ${missing.join(', ')}（两处白名单已漂移）`,
  );
}

function parseRegexExpression(expression, label) {
  const value = String(expression ?? '').trim();
  if (!value) throw new Error(`${label}: 空查找表达式`);
  if (!value.startsWith('/')) {
    return new RegExp(value, 'g');
  }
  for (let index = value.length - 1; index > 0; index -= 1) {
    if (value[index] === '/' && value[index - 1] !== '\\') {
      const body = value.slice(1, index);
      const flags = value.slice(index + 1) || 'g';
      if (!body) throw new Error(`${label}: 正则 body 为空`);
      if (flags && !/^[gimsuy]*$/.test(flags)) throw new Error(`${label}: 非法 flags ${flags}`);
      return new RegExp(body, flags);
    }
  }
  throw new Error(`${label}: 非法正则字面量: ${value}`);
}

function verifyIndex(path) {
  if (!existsSync(path)) {
    console.log(`verify-mfrs-regex-ids: skip missing ${path}`);
    return false;
  }
  const card = YAML.parse(readFileSync(path, 'utf8'));
  const entries = card?.[EXT]?.[REGEX];
  assert.ok(Array.isArray(entries), `${path}: 扩展字段.正则 必须是数组`);
  assert.equal(entries.length, EXPECTED_COUNT, `${path}: 正则条数应为 ${EXPECTED_COUNT}，实际 ${entries.length}`);

  const ids = [];
  const names = [];
  for (const [index, entry] of entries.entries()) {
    const name = entry?.[NAME] ?? `#${index}`;
    const id = entry?.[ID];
    assert.ok(typeof id === 'string' && id.trim(), `${path}: [${name}] 缺少 id`);
    assert.equal(id, id.trim(), `${path}: [${name}] id 不应包含首尾空白`);
    assert.ok(typeof name === 'string' && name.trim(), `${path}: 第 ${index} 条缺少 正则名称`);
    ids.push(id.trim());
    names.push(name);
    parseRegexExpression(entry?.[FIND], `${path}: [${name}]`);
    assert.equal(typeof entry?.[ENABLED], 'boolean', `${path}: [${name}] 启用 必须是 boolean`);
  }

  const idSet = new Set(ids);
  assert.equal(idSet.size, ids.length, `${path}: 正则 id 冲突: ${ids.filter((id, i) => ids.indexOf(id) !== i).join(', ')}`);
  const nameSet = new Set(names);
  assert.equal(nameSet.size, names.length, `${path}: 正则名称冲突`);

  // RM8/RH4：hotfix 清洗白名单 ↔ 显示正则白名单同步（对含该显示正则的卡校验一次）
  if (entries.some(e => e?.[ID]?.trim() === DISPLAY_SPMFRS_REGEX_ID)) {
    verifySpMfrsWhitelistSync(entries);
  }

  const label = path.replace(/\\/g, '/').split('/src/').pop() || path;
  console.log(`verify-mfrs-regex-ids: ${label} passed (count=${entries.length}, uniqueIds=${idSet.size})`);
  return entries;
}

function verifyRh5ScopedLocalization(entries, path) {
  let output = RH5_BEHAVIOR_SAMPLE;
  for (const { id, field, localizedField } of RH5_FIELD_REGEXES) {
    const entry = entries.find(candidate => candidate?.[ID]?.trim() === id);
    assert.ok(entry, `${path}: RH5 缺少 ${field} 正则 ${id}`);
    const regex = parseRegexExpression(entry[FIND], `${path}: RH5 ${field}`);
    const replacement = String(entry[REPLACE] ?? '');
    const applyRegex = input => input.replace(new RegExp(regex.source, regex.flags), replacement);
    const maxHorizontalWhitespace = ' '.repeat(300);
    const overlongHorizontalWhitespace = ' '.repeat(301);

    assert.equal(entry[ENABLED], true, `${path}: RH5 ${field} 必须启用`);
    assert.equal(entry[SOURCE]?.用户输入, false, `${path}: RH5 ${field} 来源.用户输入 必须为 false`);
    assert.equal(entry[SOURCE]?.AI输出, true, `${path}: RH5 ${field} 来源.AI输出 必须为 true`);
    assert.equal(entry[SOURCE]?.快捷命令, false, `${path}: RH5 ${field} 来源.快捷命令 必须为 false`);
    assert.equal(entry[SOURCE]?.世界信息, false, `${path}: RH5 ${field} 来源.世界信息 必须为 false`);
    assert.equal(entry[APPLIES_TO]?.仅格式显示, true, `${path}: RH5 ${field} 作用于.仅格式显示 必须为 true`);
    assert.equal(entry[APPLIES_TO]?.仅格式提示词, false, `${path}: RH5 ${field} 作用于.仅格式提示词 必须为 false`);
    assert.ok(regex.flags.includes('g'), `${path}: RH5 ${field} 必须包含 g 标志`);
    assert.ok(regex.flags.includes('i'), `${path}: RH5 ${field} 必须包含 i 标志`);
    assert.doesNotMatch(regex.source, /[*+]|\{\d+,\}/, `${path}: RH5 ${field} 不得包含无界量词`);

    const missingFieldSample = [
      '<sp_status>',
      'Other: field-missing',
      '</sp_status>',
      `${field}: outside-after-missing`,
    ].join('\n');
    assert.equal(
      applyRegex(missingFieldSample),
      missingFieldSample,
      `${path}: RH5 ${field} 不得越过已闭合的缺字段块`,
    );

    const unclosedSample = [
      '<sp_status>',
      'Other: unclosed',
      `${field}: prose-after-unclosed`,
    ].join('\n');
    assert.equal(
      applyRegex(unclosedSample),
      unclosedSample,
      `${path}: RH5 ${field} 不得改写未闭合块后的正文`,
    );

    const maxPrefix = `${'x'.repeat(2699)}\n${maxHorizontalWhitespace}`;
    const maxPrefixSample = `<sp_status>${maxPrefix}${field}:</sp_status>`;
    const maxPrefixExpected = `<sp_status>${maxPrefix}${localizedField}：</sp_status>`;
    assert.equal(
      applyRegex(maxPrefixSample),
      maxPrefixExpected,
      `${path}: RH5 ${field} 应允许 opener 后到字段前恰好 3000 字符`,
    );
    const overlongPrefix = `${'x'.repeat(2700)}\n${maxHorizontalWhitespace}`;
    const overlongPrefixSample = `<sp_status>${overlongPrefix}${field}:</sp_status>`;
    assert.equal(
      applyRegex(overlongPrefixSample),
      overlongPrefixSample,
      `${path}: RH5 ${field} 应拒绝 opener 后到字段前 3001 字符`,
    );

    const maxSuffixSample = `<sp_status>\n${field}:${'x'.repeat(3000)}</sp_status>`;
    const maxSuffixExpected = `<sp_status>\n${localizedField}：${'x'.repeat(3000)}</sp_status>`;
    assert.equal(
      applyRegex(maxSuffixSample),
      maxSuffixExpected,
      `${path}: RH5 ${field} 应允许冒号后到 close 前恰好 3000 字符`,
    );
    const overlongSuffixSample = `<sp_status>\n${field}:${'x'.repeat(3001)}</sp_status>`;
    assert.equal(
      applyRegex(overlongSuffixSample),
      overlongSuffixSample,
      `${path}: RH5 ${field} 应拒绝冒号后到 close 前 3001 字符`,
    );

    const maxOpener = `<sp_status${' '.repeat(300)}>`;
    const maxOpenerSample = `${maxOpener}\n${field}: max-opener\n</sp_status>`;
    const maxOpenerExpected = `${maxOpener}\n${localizedField}：max-opener\n</sp_status>`;
    assert.equal(
      applyRegex(maxOpenerSample),
      maxOpenerExpected,
      `${path}: RH5 ${field} 应允许 300 字符 opener 属性区`,
    );
    const overlongOpener = `<sp_status${' '.repeat(301)}>`;
    const overlongOpenerSample = `${overlongOpener}\n${field}: overlong-opener\n</sp_status>`;
    assert.equal(
      applyRegex(overlongOpenerSample),
      overlongOpenerSample,
      `${path}: RH5 ${field} 应拒绝 301 字符 opener 属性区`,
    );
    const malformedOpenerSample = `<sp_status-extra>\n${field}: malformed-opener\n</sp_status>`;
    assert.equal(
      applyRegex(malformedOpenerSample),
      malformedOpenerSample,
      `${path}: RH5 ${field} 应拒绝 sp_status-extra 伪标签`,
    );
    const inlineDecoyPrefix = `Other: ${field}:`;
    const inlineDecoyPadding = 'x'.repeat(3000 - inlineDecoyPrefix.length);
    const inlineDecoySample = `<sp_status>${inlineDecoyPrefix}${inlineDecoyPadding}\n${field}:</sp_status>`;
    assert.equal(
      applyRegex(inlineDecoySample),
      inlineDecoySample,
      `${path}: RH5 ${field} 内联同名 decoy 不得绕过绑定到行字段的 3000 字符上限`,
    );

    const maxFieldSpacingSample = `<sp_status>\n${field}${maxHorizontalWhitespace}:value</sp_status>`;
    const maxFieldSpacingExpected = `<sp_status>\n${localizedField}：value</sp_status>`;
    assert.equal(
      applyRegex(maxFieldSpacingSample),
      maxFieldSpacingExpected,
      `${path}: RH5 ${field} 应允许字段到冒号间 300 个水平空白`,
    );
    const overlongFieldSpacingSample = `<sp_status>\n${field}${overlongHorizontalWhitespace}:value</sp_status>`;
    assert.equal(
      applyRegex(overlongFieldSpacingSample),
      overlongFieldSpacingSample,
      `${path}: RH5 ${field} 应拒绝字段到冒号间 301 个水平空白`,
    );

    const maxIndentSample = `<sp_status>\n${maxHorizontalWhitespace}${field}:value</sp_status>`;
    const maxIndentExpected = `<sp_status>\n${maxHorizontalWhitespace}${localizedField}：value</sp_status>`;
    assert.equal(
      applyRegex(maxIndentSample),
      maxIndentExpected,
      `${path}: RH5 ${field} 应允许 300 个缩进水平空白`,
    );
    const overlongIndentSample = `<sp_status>\n${overlongHorizontalWhitespace}${field}:value</sp_status>`;
    assert.equal(
      applyRegex(overlongIndentSample),
      overlongIndentSample,
      `${path}: RH5 ${field} 应拒绝 301 个缩进水平空白`,
    );

    const maxPostColonSample = `<sp_status>\n${field}:${maxHorizontalWhitespace}${'x'.repeat(2700)}</sp_status>`;
    const maxPostColonExpected = `<sp_status>\n${localizedField}：${'x'.repeat(2700)}</sp_status>`;
    assert.equal(
      applyRegex(maxPostColonSample),
      maxPostColonExpected,
      `${path}: RH5 ${field} 应将冒号后 300 个空白计入 3000 字符 suffix 预算`,
    );
    const overBudgetPostColonSample = `<sp_status>\n${field}:${maxHorizontalWhitespace}${'x'.repeat(2701)}</sp_status>`;
    assert.equal(
      applyRegex(overBudgetPostColonSample),
      overBudgetPostColonSample,
      `${path}: RH5 ${field} 应拒绝含冒号后空白的 3001 字符 suffix`,
    );
    const overlongPostColonSample = `<sp_status>\n${field}:${overlongHorizontalWhitespace}${'x'.repeat(2699)}</sp_status>`;
    assert.equal(
      applyRegex(overlongPostColonSample),
      overlongPostColonSample,
      `${path}: RH5 ${field} 应拒绝冒号后 301 个水平空白`,
    );

    const maxCloseSpacingSample = `<sp_status>\n${field}:value</sp_status${maxHorizontalWhitespace}>`;
    const maxCloseSpacingExpected = `<sp_status>\n${localizedField}：value</sp_status${maxHorizontalWhitespace}>`;
    assert.equal(
      applyRegex(maxCloseSpacingSample),
      maxCloseSpacingExpected,
      `${path}: RH5 ${field} 应允许 close tag 内 300 个水平空白`,
    );
    const overlongCloseSpacingSample = `<sp_status>\n${field}:value</sp_status${overlongHorizontalWhitespace}>`;
    assert.equal(
      applyRegex(overlongCloseSpacingSample),
      overlongCloseSpacingSample,
      `${path}: RH5 ${field} 应拒绝 close tag 内 301 个水平空白`,
    );

    output = applyRegex(output);
  }

  assert.equal(
    output,
    RH5_EXPECTED_OUTPUT,
    `${path}: RH5 只能中文化闭合 <sp_status> 内的 Name/Status/Location，并处理全部区块`,
  );
  console.log(`verify-mfrs-regex-ids: ${path} RH5 scoped behavior passed (blocks=2, fields=3)`);
  return output;
}

function verifyDevReleaseRegexSync(devEntries, releaseEntries) {
  const devById = new Map(devEntries.map(entry => [entry[ID].trim(), entry]));
  const releaseById = new Map(releaseEntries.map(entry => [entry[ID].trim(), entry]));
  const missingInRelease = [...devById.keys()].filter(id => !releaseById.has(id));
  const extraInRelease = [...releaseById.keys()].filter(id => !devById.has(id));

  assert.deepEqual(
    { missingInRelease, extraInRelease },
    { missingInRelease: [], extraInRelease: [] },
    `开发版/发布版正则 id 集合不一致: missingInRelease=[${missingInRelease.join(', ')}], extraInRelease=[${extraInRelease.join(', ')}]`,
  );

  const devOrder = devEntries.map(entry => ({ id: entry[ID], name: entry[NAME] }));
  const releaseOrder = releaseEntries.map(entry => ({ id: entry[ID], name: entry[NAME] }));
  assert.deepEqual(
    releaseOrder,
    devOrder,
    '开发版/发布版正则 id 顺序或 id-name 映射不一致',
  );

  const drift = [];
  for (const [id, devEntry] of devById) {
    const releaseEntry = releaseById.get(id);
    for (const field of [NAME, FIND, REPLACE, ENABLED, SOURCE, APPLIES_TO]) {
      if (!isDeepStrictEqual(devEntry[field], releaseEntry[field])) {
        drift.push(`${id}[${field}]`);
      }
    }
  }

  assert.deepEqual(
    drift,
    [],
    `开发版/发布版同 id 正则行为漂移: ${drift.join(', ')}`,
  );
  console.log(
    `verify-mfrs-regex-ids: dev/release sync passed `
    + `(ids=${devById.size}, ordered=true, fields=${NAME}/${FIND}/${REPLACE}/${ENABLED}/${SOURCE}/${APPLIES_TO})`,
  );
}

function main() {
  const entriesByIndex = indexPaths.map(verifyIndex);
  assert.ok(entriesByIndex.every(Boolean), '开发版和发布版 index.yaml 都必须存在');
  const rh5Outputs = entriesByIndex.map((entries, index) => verifyRh5ScopedLocalization(entries, indexPaths[index]));
  assert.equal(rh5Outputs[1], rh5Outputs[0], 'RH5 开发版/发布版行为不一致');
  verifyDevReleaseRegexSync(entriesByIndex[0], entriesByIndex[1]);
  console.log('verify-mfrs-regex-ids: passed');
}

try {
  main();
} catch (error) {
  console.error(`verify-mfrs-regex-ids: failed: ${error?.message || String(error)}`);
  process.exitCode = 1;
}
