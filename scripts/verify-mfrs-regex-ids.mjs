/* eslint-disable import-x/no-nodejs-modules */
/**
 * G3: 正则 id 唯一 + 查找表达式可编译（开发/发布 index.yaml）
 */
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
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
const ENABLED = '启用';

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

  const label = path.replace(/\\/g, '/').split('/src/').pop() || path;
  console.log(`verify-mfrs-regex-ids: ${label} passed (count=${entries.length}, uniqueIds=${idSet.size})`);
  return true;
}

function main() {
  let checked = 0;
  for (const path of indexPaths) {
    if (verifyIndex(path)) checked += 1;
  }
  assert.ok(checked >= 1, '至少应校验一份 index.yaml');
  console.log('verify-mfrs-regex-ids: passed');
}

try {
  main();
} catch (error) {
  console.error(`verify-mfrs-regex-ids: failed: ${error?.message || String(error)}`);
  process.exitCode = 1;
}
