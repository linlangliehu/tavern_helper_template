/* eslint-disable import-x/no-nodejs-modules */
/**
 * G2: initvar ↔ schema 结构校验（键集与层级）
 * 以 schema.json 为结构真源；不做有损枚举/夹取语义校验（见 L5）。
 */
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import YAML from 'yaml';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const CARD = '神秘复苏模拟器';
const schemaPath = join(ROOT, 'src', CARD, 'schema.json');
const initvarPaths = [
  join(ROOT, 'src', CARD, '世界书', '变量', 'initvar.yaml'),
  join(ROOT, 'src', `${CARD}发布版`, '世界书', '变量', 'initvar.yaml'),
];

const REQUIRED_ROOT_ARRAYS = ['行动建议', '在场人物', '规律推理记录', '收录档案', '收录规律', '驾驭厉鬼', '灵异物品'];
const REQUIRED_ROOT_OBJECTS = ['当前灵异事件', '最近行动判定', '驭鬼者状态', '灵异资源', '势力关系', '可见档案', '主线进度', '隐藏档案'];

function fail(message) {
  throw new Error(message);
}

function loadInitvar(path) {
  if (!existsSync(path)) fail(`initvar 不存在: ${path}`);
  const raw = readFileSync(path, 'utf8');
  const data = YAML.parse(raw);
  if (!data || typeof data !== 'object' || Array.isArray(data)) fail(`initvar 根必须是对象: ${path}`);
  return data;
}

function loadSchemaKeys() {
  if (!existsSync(schemaPath)) fail(`schema.json 不存在: ${schemaPath}`);
  const schema = JSON.parse(readFileSync(schemaPath, 'utf8'));
  if (schema.type !== 'object' || !schema.properties) fail('schema.json 根必须是 object + properties');
  return schema;
}

function collectObjectKeys(node, prefix = '') {
  if (!node || typeof node !== 'object' || Array.isArray(node)) return [];
  const keys = [];
  for (const [key, value] of Object.entries(node)) {
    const path = prefix ? `${prefix}.${key}` : key;
    keys.push(path);
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      keys.push(...collectObjectKeys(value, path));
    }
  }
  return keys;
}

function schemaObjectKeys(schemaNode, prefix = '') {
  if (!schemaNode || schemaNode.type !== 'object' || !schemaNode.properties) return [];
  const keys = [];
  for (const [key, child] of Object.entries(schemaNode.properties)) {
    const path = prefix ? `${prefix}.${key}` : key;
    keys.push(path);
    const resolved = child?.$ref ? null : child;
    if (resolved?.type === 'object' && resolved.properties) {
      keys.push(...schemaObjectKeys(resolved, path));
    }
  }
  return keys;
}

function assertSameSet(actual, expected, label) {
  const a = new Set(actual);
  const e = new Set(expected);
  const missing = [...e].filter(k => !a.has(k)).sort();
  const extra = [...a].filter(k => !e.has(k)).sort();
  assert.deepEqual(missing, [], `${label}: initvar 缺少 schema 键: ${missing.join(', ')}`);
  assert.deepEqual(extra, [], `${label}: initvar 多出 schema 未定义键: ${extra.join(', ')}`);
}

function verifyInitvar(path, schema) {
  const data = loadInitvar(path);
  const label = path.replace(/\\/g, '/').split('/src/').pop() || path;

  const schemaRootKeys = Object.keys(schema.properties).sort();
  const initvarRootKeys = Object.keys(data).sort();
  assert.deepEqual(initvarRootKeys, schemaRootKeys, `${label}: 根键集必须与 schema 一致`);

  for (const key of REQUIRED_ROOT_ARRAYS) {
    assert.ok(Array.isArray(data[key]), `${label}: 根数组键 ${key} 必须是数组`);
  }
  for (const key of REQUIRED_ROOT_OBJECTS) {
    assert.equal(typeof data[key], 'object', `${label}: 根对象键 ${key} 必须是对象`);
    assert.ok(data[key] && !Array.isArray(data[key]), `${label}: 根对象键 ${key} 不能是数组`);
  }

  // C1 回归：四键不得仍嵌在 当前灵异事件 下
  const event = data['当前灵异事件'];
  for (const lifted of ['规律推理记录', '最近行动判定', '行动建议', '在场人物']) {
    assert.equal(Object.prototype.hasOwnProperty.call(event, lifted), false, `${label}: ${lifted} 不得嵌在 当前灵异事件 内`);
  }

  // 对象层级：只比对「对象→对象」路径（数组元素结构由 schema 约束，initvar 常为空数组）
  const schemaObjPaths = schemaObjectKeys(schema).sort();
  const initvarObjPaths = collectObjectKeys(data).sort();
  // initvar 对象路径应是 schema 对象路径的超集中的「已实例化」子集：每个 initvar 对象路径必须在 schema 中
  const schemaSet = new Set(schemaObjPaths);
  const unknown = initvarObjPaths.filter(p => !schemaSet.has(p));
  assert.deepEqual(unknown, [], `${label}: 未知对象路径: ${unknown.join(', ')}`);

  // 主线进度关键子键
  const progress = data['主线进度'];
  for (const key of ['当前阶段', '阶段序号', '权限层级', '已开放主题', '锁定主题', '阶段状态', '偏移等级', '正史锚点', '世界压力']) {
    assert.ok(Object.prototype.hasOwnProperty.call(progress, key), `${label}: 主线进度.${key} 缺失`);
  }

  console.log(`verify-mfrs-initvar-schema: ${label} passed (rootKeys=${schemaRootKeys.length})`);
}

function main() {
  const schema = loadSchemaKeys();
  assert.equal(Object.keys(schema.properties).length, 36, 'schema 根键数应为 36');
  let checked = 0;
  for (const path of initvarPaths) {
    if (!existsSync(path)) {
      console.log(`verify-mfrs-initvar-schema: skip missing ${path}`);
      continue;
    }
    verifyInitvar(path, schema);
    checked += 1;
  }
  assert.ok(checked >= 1, '至少应校验一份 initvar');
  console.log('verify-mfrs-initvar-schema: passed');
}

try {
  main();
} catch (error) {
  console.error(`verify-mfrs-initvar-schema: failed: ${error?.message || String(error)}`);
  process.exitCode = 1;
}
