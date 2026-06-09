/* eslint-disable import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import { ModuleKind, ScriptTarget, transpileModule } from 'typescript';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, '..');
const adapterPath = join(
  repoRoot,
  'src',
  '\u795e\u79d8\u590d\u82cf\u6a21\u62df\u5668',
  '\u811a\u672c',
  '\u6570\u636e\u5e93\u524d\u7aef',
  'table-change-adapter.ts',
);

function loadAdapter() {
  const source = readFileSync(adapterPath, 'utf8');
  const transpiled = transpileModule(source, {
    compilerOptions: {
      module: ModuleKind.CommonJS,
      target: ScriptTarget.ES2022,
    },
    fileName: adapterPath,
  }).outputText;

  const module = { exports: {} };
  vm.runInNewContext(transpiled, { module, exports: module.exports }, { filename: adapterPath });
  return module.exports;
}

const {
  applyTableChangePlan,
  listTableMetadata,
  previewTableChangePlan,
} = loadAdapter();

const TABLE_ACTION = '\u884c\u52a8\u5efa\u8bae';
const COL_OPTION = '\u9009\u9879';
const COL_IDEA = '\u601d\u8def';
const COL_MAIN_RISK = '\u4e3b\u8981\u98ce\u9669';
const COL_GAIN = '\u9884\u671f\u6536\u76ca';
const COL_DEATH = '\u6b7b\u4ea1\u98ce\u9669';
const COL_REVIVAL = '\u590d\u82cf\u98ce\u9669';
const RISK_NONE = '\u65e0';
const RISK_LOW = '\u4f4e';
const RISK_MID = '\u4e2d';
const RISK_UNKNOWN = '\u672a\u77e5';

const table = {
  uid: 'sheet_action_suggestions',
  name: TABLE_ACTION,
  sourceData: {
    ddl: `CREATE TABLE action_suggestions (
  row_id INTEGER PRIMARY KEY CHECK(row_id BETWEEN 1 AND 4), -- row_id
  option_key TEXT NOT NULL CHECK(option_key IN ('A','B','C','D')), -- ${COL_OPTION}
  idea_text TEXT NOT NULL CHECK(LENGTH(idea_text) <= 80), -- ${COL_IDEA}
  main_risk TEXT NOT NULL CHECK(LENGTH(main_risk) <= 80), -- ${COL_MAIN_RISK}
  expected_gain TEXT NOT NULL CHECK(LENGTH(expected_gain) <= 80), -- ${COL_GAIN}
  death_risk_level TEXT NOT NULL CHECK(death_risk_level IN ('${RISK_NONE}','${RISK_LOW}','${RISK_MID}','\u9ad8','\u81f4\u547d','${RISK_UNKNOWN}')), -- ${COL_DEATH}
  revival_risk_level TEXT NOT NULL CHECK(revival_risk_level IN ('${RISK_NONE}','${RISK_LOW}','${RISK_MID}','\u9ad8','\u81f4\u547d','${RISK_UNKNOWN}')) -- ${COL_REVIVAL}
);`,
  },
  content: [
    ['row_id', COL_OPTION, COL_IDEA, COL_MAIN_RISK, COL_GAIN, COL_DEATH, COL_REVIVAL],
    [1, 'A', '\u89c2\u5bdf\u73b0\u573a', '\u539f\u98ce\u9669', '\u786e\u8ba4\u7ebf\u7d22', RISK_LOW, RISK_NONE],
    [2, 'B', '\u64a4\u79bb\u73b0\u573a', '\u539f\u98ce\u9669', '\u964d\u4f4e\u98ce\u9669', RISK_LOW, RISK_NONE],
    [3, 'C', '\u8054\u7cfb\u6c42\u63f4', '\u66b4\u9732\u4f4d\u7f6e', '\u83b7\u5f97\u652f\u63f4', RISK_MID, RISK_NONE],
    [4, 'D', '\u81ea\u5b9a\u4e49\u884c\u52a8', RISK_UNKNOWN, '\u53d6\u51b3\u4e8e\u884c\u52a8', RISK_UNKNOWN, RISK_UNKNOWN],
  ],
};

const currentData = {
  mate: { type: 'chatSheets', version: 1 },
  sheet_action_suggestions: table,
};

function assertError(result, code) {
  assert.equal(result.ok, false);
  assert.ok(result.errors.some(error => error.code === code), `Expected ${code}, got ${JSON.stringify(result.errors)}`);
}

const metadata = listTableMetadata(currentData);
assert.equal(metadata.length, 1);
assert.equal(metadata[0].name, TABLE_ACTION);
assert.equal(metadata[0].sqlName, 'action_suggestions');
assert.ok(metadata[0].columns.some(column => column.header === COL_DEATH && column.physicalName === 'death_risk_level'));
const rowIdColumn = metadata[0].columns.find(column => column.header === 'row_id');
assert.equal(rowIdColumn.minValue, 1);
assert.equal(rowIdColumn.maxValue, 4);

const preview = previewTableChangePlan({
  action: 'updateCell',
  table: 'action_suggestions',
  match: { row_id: 1 },
  set: {
    death_risk_level: RISK_MID,
    [COL_MAIN_RISK]: '\u63a5\u8fd1\u6572\u95e8\u58f0',
  },
}, currentData);
assert.equal(preview.ok, true);
assert.equal(preview.table, TABLE_ACTION);
assert.equal(preview.rowIndex, 1);
assert.deepEqual(new Set(preview.affectedColumns), new Set([COL_DEATH, COL_MAIN_RISK]));

const mirroredChoicesPreview = previewTableChangePlan({
  action: 'updateCell',
  table: TABLE_ACTION,
  match: { row_id: 4 },
  set: {
    option_key: 'D',
    idea_text: '\u81ea\u5b9a\u4e49\u884c\u52a8',
    main_risk: '\u53d6\u51b3\u4e8e\u5177\u4f53\u63cf\u8ff0',
    expected_gain: '\u53d6\u51b3\u4e8e\u81ea\u5b9a\u4e49\u884c\u52a8',
    death_risk_level: RISK_UNKNOWN,
    revival_risk_level: RISK_UNKNOWN,
  },
}, currentData);
assert.equal(mirroredChoicesPreview.ok, true);
assert.equal(mirroredChoicesPreview.rowIndex, 4);
assert.deepEqual(new Set(mirroredChoicesPreview.affectedColumns), new Set([
  COL_OPTION,
  COL_IDEA,
  COL_MAIN_RISK,
  COL_GAIN,
  COL_DEATH,
  COL_REVIVAL,
]));

assertError(previewTableChangePlan({
  action: 'updateCell',
  table: TABLE_ACTION,
  match: { row_id: 1 },
  set: { death_risk_level: '\u6781\u9ad8' },
}, currentData), 'CHECK_IN_VIOLATION');

assertError(previewTableChangePlan({
  action: 'updateCell',
  table: TABLE_ACTION,
  match: { row_id: 4 },
  set: { idea_text: 'x'.repeat(81) },
}, currentData), 'LENGTH_VIOLATION');

assertError(previewTableChangePlan({
  action: 'insertRow',
  table: TABLE_ACTION,
  data: {
    row_id: 5,
    option_key: 'D',
    idea_text: 'out of range',
    main_risk: RISK_UNKNOWN,
    expected_gain: RISK_UNKNOWN,
    death_risk_level: RISK_UNKNOWN,
    revival_risk_level: RISK_UNKNOWN,
  },
}, currentData), 'CHECK_RANGE_VIOLATION');

assertError(previewTableChangePlan({
  action: 'deleteRow',
  table: TABLE_ACTION,
  match: { death_risk_level: RISK_LOW },
}, currentData), 'MULTIPLE_ROWS_MATCHED');

const calls = [];
const api = {
  async updateCell(options) {
    calls.push(['updateCell', options]);
    return true;
  },
  async insertRow(options, data) {
    if (options?.data) return -1;
    if (!data || typeof data !== 'object') return -1;
    calls.push(['insertRow', options, data]);
    return 3;
  },
  async deleteRow(options) {
    calls.push(['deleteRow', options]);
    return true;
  },
};

const appliedUpdate = await applyTableChangePlan(api, {
  action: 'updateCell',
  table: TABLE_ACTION,
  match: { row_id: 1 },
  set: {
    death_risk_level: RISK_MID,
    main_risk: '\u63a5\u8fd1\u6572\u95e8\u58f0',
  },
}, currentData);
assert.equal(appliedUpdate.ok, true);
assert.equal(calls.length, 2);
assert.deepEqual(calls.map(call => call[1].rowIndex), [1, 1]);
assert.deepEqual(new Set(calls.map(call => call[1].column)), new Set([COL_DEATH, COL_MAIN_RISK]));

const appliedInsert = await applyTableChangePlan(api, {
  action: 'insertRow',
  table: TABLE_ACTION,
  data: {
    row_id: 4,
    option_key: 'C',
    idea_text: '\u7ed5\u884c\u89c2\u5bdf',
    main_risk: '\u7ed5\u884c\u89c2\u5bdf',
    expected_gain: '\u53d1\u73b0\u51fa\u53e3',
    death_risk_level: RISK_LOW,
    revival_risk_level: RISK_NONE,
  },
}, currentData);
assert.equal(appliedInsert.ok, true);
assert.equal(appliedInsert.insertedRowIndex, 3);
const insertCall = calls.at(-1);
assert.equal(insertCall[0], 'insertRow');
assert.equal(insertCall[1].tableName, TABLE_ACTION);
assert.deepEqual({ ...insertCall[1] }, { tableName: TABLE_ACTION });
assert.deepEqual({ ...insertCall[2] }, {
  [COL_OPTION]: 'C',
  [COL_IDEA]: '\u7ed5\u884c\u89c2\u5bdf',
  [COL_MAIN_RISK]: '\u7ed5\u884c\u89c2\u5bdf',
  [COL_GAIN]: '\u53d1\u73b0\u51fa\u53e3',
  [COL_DEATH]: RISK_LOW,
  [COL_REVIVAL]: RISK_NONE,
});

const emptyCurrentData = JSON.parse(JSON.stringify(currentData));
emptyCurrentData.sheet_action_suggestions.content = [table.content[0]];
const importedSnapshots = [];
const fallbackApi = {
  async insertRow() {
    return -1;
  },
  async importTableAsJson(jsonString) {
    importedSnapshots.push(JSON.parse(jsonString));
    return true;
  },
};
const fallbackInsert = await applyTableChangePlan(fallbackApi, {
  action: 'insertRow',
  table: table.name,
  data: {
    row_id: 1,
    option_key: 'A',
    idea_text: 'fallback insert',
    main_risk: 'fallback risk',
    expected_gain: 'fallback gain',
    death_risk_level: RISK_LOW,
    revival_risk_level: RISK_NONE,
  },
}, emptyCurrentData);
assert.equal(fallbackInsert.ok, true);
assert.equal(fallbackInsert.insertedRowIndex, 1);
assert.equal(importedSnapshots.length, 1);
assert.equal(importedSnapshots[0].sheet_action_suggestions.content.length, 2);
assert.deepEqual(importedSnapshots[0].sheet_action_suggestions.content[1], [
  1,
  'A',
  'fallback insert',
  'fallback risk',
  'fallback gain',
  RISK_LOW,
  RISK_NONE,
]);

const updateFallbackImports = [];
const updateFallbackApi = {
  async updateCell() {
    return false;
  },
  async importTableAsJson(jsonString) {
    updateFallbackImports.push(JSON.parse(jsonString));
    return true;
  },
};
const fallbackUpdate = await applyTableChangePlan(updateFallbackApi, {
  action: 'updateCell',
  table: table.name,
  match: { row_id: 1 },
  set: {
    idea_text: 'fallback update',
    main_risk: 'fallback update risk',
  },
}, importedSnapshots[0]);
assert.equal(fallbackUpdate.ok, true);
assert.equal(updateFallbackImports.length, 1);
assert.equal(updateFallbackImports[0].sheet_action_suggestions.content[1][2], 'fallback update');
assert.equal(updateFallbackImports[0].sheet_action_suggestions.content[1][3], 'fallback update risk');

const deleteFallbackImports = [];
const deleteFallbackApi = {
  async deleteRow() {
    return false;
  },
  async importTableAsJson(jsonString) {
    deleteFallbackImports.push(JSON.parse(jsonString));
    return true;
  },
};
const fallbackDelete = await applyTableChangePlan(deleteFallbackApi, {
  action: 'deleteRow',
  table: table.name,
  match: { row_id: 1 },
}, updateFallbackImports[0]);
assert.equal(fallbackDelete.ok, true);
assert.equal(deleteFallbackImports.length, 1);
assert.equal(deleteFallbackImports[0].sheet_action_suggestions.content.length, 1);

const beforeDeleteCalls = calls.length;
const blockedDelete = await applyTableChangePlan(api, {
  action: 'deleteRow',
  table: TABLE_ACTION,
  match: { death_risk_level: RISK_LOW },
}, currentData);
assertError(blockedDelete, 'MULTIPLE_ROWS_MATCHED');
assert.equal(calls.length, beforeDeleteCalls);

console.log('verify-table-change-adapter: passed');
