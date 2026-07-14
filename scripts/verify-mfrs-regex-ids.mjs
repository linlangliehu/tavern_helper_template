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
  verifyDevReleaseRegexSync(entriesByIndex[0], entriesByIndex[1]);
  console.log('verify-mfrs-regex-ids: passed');
}

try {
  main();
} catch (error) {
  console.error(`verify-mfrs-regex-ids: failed: ${error?.message || String(error)}`);
  process.exitCode = 1;
}
