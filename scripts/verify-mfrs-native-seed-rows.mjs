/* eslint-disable import-x/no-nodejs-modules */
/**
 * verify-mfrs-native-seed-rows.mjs —— native 固定表冷启动 seedRows 门禁
 *
 * 直接提取并运行 vendor 的 NativeTableServiceAdapter 与物化 helper，守护：
 * - 全新聊天物化全部固定表；
 * - guide 合并只物化未持久化表；
 * - 已有数据、用户清空的 header-only checkpoint 均不被覆盖或复活；
 * - 重复加载幂等，且 SQLite provider 不接入 native helper。
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, '..');
const vendorSource = readFileSync(join(repoRoot, 'vendor', 'shujuku-sp-fork', 'index.js'), 'utf8');
const template = JSON.parse(
  readFileSync(join(repoRoot, 'src', '神秘复苏模拟器', '数据库', '神秘复苏表格SQL_v1.json'), 'utf8'),
);

function findMatchingBrace(source, openBraceIndex) {
  let depth = 0;
  let quote = null;
  let escaped = false;
  let lineComment = false;
  let blockComment = false;
  for (let i = openBraceIndex; i < source.length; i += 1) {
    const ch = source[i];
    const next = source[i + 1];
    if (lineComment) {
      if (ch === '\n') lineComment = false;
      continue;
    }
    if (blockComment) {
      if (ch === '*' && next === '/') {
        blockComment = false;
        i += 1;
      }
      continue;
    }
    if (quote) {
      if (escaped) escaped = false;
      else if (ch === '\\') escaped = true;
      else if (ch === quote) quote = null;
      continue;
    }
    if (ch === '/' && next === '/') {
      lineComment = true;
      i += 1;
      continue;
    }
    if (ch === '/' && next === '*') {
      blockComment = true;
      i += 1;
      continue;
    }
    if (ch === "'" || ch === '"' || ch === '`') {
      quote = ch;
      continue;
    }
    if (ch === '{') depth += 1;
    else if (ch === '}') {
      depth -= 1;
      if (depth === 0) return i;
    }
  }
  throw new Error(`Could not find matching brace at ${openBraceIndex}`);
}

function extractClass(name) {
  const prefix = `class ${name}`;
  const start = vendorSource.indexOf(prefix);
  assert.notEqual(start, -1, `missing ${prefix}`);
  const openBrace = vendorSource.indexOf('{', start);
  const closeBrace = findMatchingBrace(vendorSource, openBrace);
  return vendorSource.slice(start, closeBrace + 1);
}

function extractFunction(name) {
  const prefix = `function ${name}`;
  const start = vendorSource.indexOf(prefix);
  assert.notEqual(start, -1, `missing ${prefix}`);
  const closeParams = vendorSource.indexOf(')', start);
  const openBrace = vendorSource.indexOf('{', closeParams);
  const closeBrace = findMatchingBrace(vendorSource, openBrace);
  return vendorSource.slice(start, closeBrace + 1);
}

function clone(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

const fixedKeys = [
  'sheet_global_state',
  'sheet_player_state',
  'sheet_action_suggestions',
  'sheet_check_suggestions',
];
const expectedRows = {
  sheet_global_state: 1,
  sheet_player_state: 1,
  sheet_action_suggestions: 4,
  sheet_check_suggestions: 5,
};
for (const key of fixedKeys) {
  assert.ok(template[key], `模板缺少固定表 ${key}`);
  assert.equal(template[key].content.length - 1, expectedRows[key], `${key} seedRows 数量漂移`);
}

function makeShell(keys = fixedKeys) {
  return Object.fromEntries(
    keys.map(key => [
      key,
      {
        uid: key,
        name: template[key].name,
        content: [clone(template[key].content[0])],
        seedRows: clone(template[key].content.slice(1)),
      },
    ]),
  );
}

let currentData = null;
let nextResult = { loaded: true, source: 'initialized' };
const logs = [];
const context = {
  console,
  JSON,
  Set,
  Array,
  Object,
  logDebug_ACU: message => logs.push(String(message)),
  logWarn_ACU: message => logs.push(String(message)),
  loadOrCreateJsonTableFromChatHistory_ACU: async () => nextResult,
  getEffectiveSeedRowsForSheet_ACU: sheetKey => clone(currentData?.[sheetKey]?.seedRows || []),
  get currentJsonTableData_ACU() {
    return currentData;
  },
  set currentJsonTableData_ACU(value) {
    currentData = value;
  },
};
vm.createContext(context);
const markerDeclaration = "const NATIVE_UNPERSISTED_GUIDE_SHEETS_MARKER_ACU = Symbol('acu.nativeUnpersistedGuideSheets');";
vm.runInContext(
  `${markerDeclaration}\n${extractFunction('markNativeUnpersistedGuideSheets_ACU')}\n${extractFunction('materializeNativeSeedRowsOnLoad_ACU')}\n${extractClass('NativeTableServiceAdapter')}\nglobalThis.__Native = NativeTableServiceAdapter;\nglobalThis.__marker = NATIVE_UNPERSISTED_GUIDE_SHEETS_MARKER_ACU;\nglobalThis.__mark = markNativeUnpersistedGuideSheets_ACU;`,
  context,
  { filename: 'native-seed-rows-vendor.vm.js' },
);
const NativeTableServiceAdapter = context.__Native;
const native = new NativeTableServiceAdapter();

// 1. 全新聊天：四张固定表全部物化真实模板 seedRows。
currentData = makeShell();
nextResult = { loaded: true, source: 'initialized' };
await native.loadFromChat();
for (const key of fixedKeys) {
  assert.equal(currentData[key].content.length - 1, expectedRows[key], `${key} 冷启动物化失败`);
  assert.deepEqual(
    Array.from(currentData[key].content.slice(1), row => row[0]),
    Array.from({ length: expectedRows[key] }, (_, index) => index + 1),
    `${key} row_id 序列错误`,
  );
}
assert.match(logs.join('\n'), /已物化 11 行冷启动 seedRows/);

// 2. 同一 adapter 重复加载：content 已有行，不得重复追加。
await native.loadFromChat();
for (const key of fixedKeys) {
  assert.equal(currentData[key].content.length - 1, expectedRows[key], `${key} 重复加载产生重复种子`);
}

// 3. 部分历史：只标记 guide 中未持久化的检定建议；已持久化全局状态保持原值。
currentData = makeShell(['sheet_global_state', 'sheet_check_suggestions']);
currentData.sheet_global_state.content.push([1, '用户已有值']);
context.__mark(currentData, ['sheet_global_state', 'sheet_check_suggestions'], { sheet_global_state: true });
assert.deepEqual(Array.from(currentData[context.__marker]), ['sheet_check_suggestions']);
assert.equal(Object.keys(currentData).includes(String(context.__marker)), false, 'marker 必须保持非枚举');
nextResult = { loaded: true, source: 'merged' };
await native.loadFromChat();
assert.equal(currentData.sheet_global_state.content[1][1], '用户已有值', '已有历史被覆盖');
assert.equal(currentData.sheet_check_suggestions.content.length - 1, 5, '部分缺失表未物化');

// 4. 已持久化但被用户清空的 header-only checkpoint 无 marker：不得复活种子。
currentData = makeShell(['sheet_global_state']);
nextResult = { loaded: true, source: 'merged' };
await native.loadFromChat();
assert.equal(currentData.sheet_global_state.content.length, 1, '用户清空的表被错误重新播种');

// 5. marker 指向已有真实行：仍不得覆盖。
currentData = makeShell(['sheet_player_state']);
currentData.sheet_player_state.content.push([1, '既有玩家']);
context.__mark(currentData, ['sheet_player_state'], {});
await native.loadFromChat();
assert.deepEqual(Array.from(currentData.sheet_player_state.content[1]), [1, '既有玩家']);
assert.equal(currentData.sheet_player_state.content.length, 2);

// 6. 接线隔离：只有 native adapter 调用 helper，SQLite provider 不得调用。
const nativeClassSource = extractClass('NativeTableServiceAdapter');
const sqliteClassSource = extractClass('SqlTableService');
assert.match(nativeClassSource, /materializeNativeSeedRowsOnLoad_ACU/);
assert.doesNotMatch(sqliteClassSource, /materializeNativeSeedRowsOnLoad_ACU/);
assert.match(vendorSource, /markNativeUnpersistedGuideSheets_ACU\(migratedData, templateSheetKeys, foundSheets\)/);

console.log('[native-seed-rows] PASS: initialized/partial/idempotent/cleared/existing/provider-isolation');
