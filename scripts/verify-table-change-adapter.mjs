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
const TABLE_CHRONICLE = '\u4e8b\u4ef6\u7eaa\u8981';
const COL_CODE_INDEX = '\u7eaa\u8981\u7f16\u53f7';
const COL_TIME_SPAN = '\u65f6\u95f4\u8de8\u5ea6';
const COL_RELATED_EVENT = '\u5173\u8054\u4e8b\u4ef6';
const COL_SUMMARY = '\u6982\u89c8';
const COL_CHRONICLE_TEXT = '\u7eaa\u8981';

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

const chronicleTable = {
  uid: 'sheet_chronicle',
  name: TABLE_CHRONICLE,
  sourceData: {
    ddl: `CREATE TABLE chronicle ( -- ${TABLE_CHRONICLE}
  row_id INTEGER PRIMARY KEY, -- row_id
  code_index TEXT NOT NULL UNIQUE CHECK(code_index GLOB 'SP[0-9][0-9][0-9][0-9]'), -- ${COL_CODE_INDEX}
  time_span TEXT NOT NULL, -- ${COL_TIME_SPAN}
  related_event TEXT NOT NULL, -- ${COL_RELATED_EVENT}
  summary TEXT NOT NULL CHECK(LENGTH(summary) <= 40), -- ${COL_SUMMARY}
  chronicle_text TEXT NOT NULL CHECK(LENGTH(chronicle_text) >= 200 AND LENGTH(chronicle_text) <= 600) -- ${COL_CHRONICLE_TEXT}
);`,
  },
  content: [
    ['row_id', COL_CODE_INDEX, COL_TIME_SPAN, COL_RELATED_EVENT, COL_SUMMARY, COL_CHRONICLE_TEXT],
    [1, 'SP0001', '2004-07-01 08:00 ~ 08:30', '\u4e03\u4e2d\u6572\u95e8\u4e8b\u4ef6', '\u5f00\u5c40\u51fa\u73b0\u6572\u95e8\u58f0', '\u5f00\u5c40\u7eaa\u8981'.repeat(30)],
    [2, 'SP0002', '2004-07-01 08:30 ~ 09:00', '\u4e03\u4e2d\u6572\u95e8\u4e8b\u4ef6', '\u73a9\u5bb6\u5f00\u59cb\u64a4\u79bb', '\u64a4\u79bb\u7eaa\u8981'.repeat(30)],
  ],
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

// P0 回归：以约束关键字开头的物理列（check_type/check_basis）不能被 DDL 列解析的
// ^CHECK 整行吞掉。曾导致这两列从 columns 消失 + 后续列按 index 错位 + COLUMN_NOT_FOUND。
const CHECK_TABLE = '检定建议'; // 检定建议
const CHECK_COL_DISPLAY = '展示文本'; // 展示文本
const CHECK_COL_TYPE = '检定类型'; // 检定类型
const CHECK_COL_BASIS = '检定依据'; // 检定依据
const CHECK_COL_DICE = '骰子命令'; // 骰子命令
const checkCurrentData = {
  mate: { type: 'chatSheets', version: 1 },
  sheet_check_suggestions: {
    uid: 'sheet_check_suggestions',
    name: CHECK_TABLE,
    sourceData: {
      ddl: `CREATE TABLE check_suggestions ( -- ${CHECK_TABLE}
  row_id INTEGER PRIMARY KEY CHECK(row_id BETWEEN 1 AND 5), -- row_id
  display_text TEXT NOT NULL CHECK(TRIM(display_text) <> ''), -- ${CHECK_COL_DISPLAY}
  check_type TEXT NOT NULL, -- ${CHECK_COL_TYPE}
  check_basis TEXT NOT NULL, -- ${CHECK_COL_BASIS}
  dice_command TEXT NOT NULL CHECK(TRIM(dice_command) <> '') -- ${CHECK_COL_DICE}
);`,
    },
    content: [
      ['row_id', CHECK_COL_DISPLAY, CHECK_COL_TYPE, CHECK_COL_BASIS, CHECK_COL_DICE],
      [1, '调查', '感知', '环境', '/r 1d100'],
    ],
  },
};
const checkMeta = listTableMetadata(checkCurrentData)[0];
const checkTypeCol = checkMeta.columns.find(column => column.physicalName === 'check_type');
const checkBasisCol = checkMeta.columns.find(column => column.physicalName === 'check_basis');
assert.ok(checkTypeCol, 'check_type 列应被解析出来，未被 ^CHECK 误杀');
assert.ok(checkBasisCol, 'check_basis 列应被解析出来，未被 ^CHECK 误杀');
assert.equal(checkTypeCol.header, CHECK_COL_TYPE);
assert.equal(checkBasisCol.header, CHECK_COL_BASIS);
// 列顺序不错位：dice_command 仍对齐到最后一列“骰子命令”，没被前移。
const diceCol = checkMeta.columns.find(column => column.physicalName === 'dice_command');
assert.equal(diceCol.header, CHECK_COL_DICE);
// 真约束行 CHECK(TRIM(...)) 仍被正确过滤，不会被当成名为 “CHECK(TRIM...” 的列。
// 注意只匹配 CHECK( / CHECK 空格，不能匹配 check_type 这类合法列名。
assert.ok(!checkMeta.columns.some(column => /^CHECK\b/i.test(column.physicalName ?? '')));
// AI 用 check_type/check_basis 列名写入时能命中别名，不再 COLUMN_NOT_FOUND。
const checkPreview = previewTableChangePlan({
  action: 'updateCell',
  table: 'check_suggestions',
  match: { row_id: 1 },
  set: { check_type: '推理', check_basis: '线索' },
}, checkCurrentData);
assert.equal(checkPreview.ok, true, `check_type/check_basis 写入应通过校验，实际: ${JSON.stringify(checkPreview.errors)}`);

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
  async insertRow(options) {
    // 真实 vendor：第一参为对象时按选项包解析，数据只从 options.data 取（忽略第二参）。
    if (!options || typeof options !== 'object') return -1;
    if (!options.data || typeof options.data !== 'object') return -1;
    calls.push(['insertRow', options, options.data]);
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
// P2\uff1a\u5355\u53c2\u9009\u9879\u5305\u5f62\u6001\uff0cdata \u5185\u8054\u5728\u9009\u9879\u5305\u91cc\uff08\u4e0e\u771f\u5b9e vendor \u7684 parseInsertRowArgs_ACU \u4e00\u81f4\uff09\u3002
assert.equal(insertCall[1].tableName, TABLE_ACTION);
assert.deepEqual({ ...insertCall[1].data }, {
  row_id: 4,
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

const failedButAppliedInsertData = JSON.parse(JSON.stringify(emptyCurrentData));
const failedButAppliedInsertImports = [];
const failedButAppliedInsertApi = {
  async insertRow(options) {
    failedButAppliedInsertData.sheet_action_suggestions.content.push([
      options.data.row_id,
      options.data[COL_OPTION],
      options.data[COL_IDEA],
      options.data[COL_MAIN_RISK],
      options.data[COL_GAIN],
      options.data[COL_DEATH],
      options.data[COL_REVIVAL],
    ]);
    return -1;
  },
  async exportTableAsJson() {
    return JSON.stringify(failedButAppliedInsertData);
  },
  async importTableAsJson(jsonString) {
    failedButAppliedInsertImports.push(JSON.parse(jsonString));
    return true;
  },
};
const failedButAppliedInsert = await applyTableChangePlan(failedButAppliedInsertApi, {
  action: 'insertRow',
  table: table.name,
  data: {
    row_id: 2,
    option_key: 'B',
    idea_text: 'verified insert',
    main_risk: 'verified risk',
    expected_gain: 'verified gain',
    death_risk_level: RISK_LOW,
    revival_risk_level: RISK_NONE,
  },
}, emptyCurrentData);
assert.equal(failedButAppliedInsert.ok, true);
assert.equal(failedButAppliedInsert.insertedRowIndex, 1);
assert.equal(failedButAppliedInsertImports.length, 0);
assert.equal(failedButAppliedInsertData.sheet_action_suggestions.content.length, 2);
assert.equal(
  failedButAppliedInsertData.sheet_action_suggestions.content
    .filter(row => Array.isArray(row) && row.includes('verified insert')).length,
  1,
);

const promotedUpdateCalls = [];
const promotedUpdateApi = {
  async insertRow(options) {
    promotedUpdateCalls.push(['insertRow', options]);
    return 1;
  },
};
const promotedFixedRowUpdate = await applyTableChangePlan(promotedUpdateApi, {
  action: 'updateCell',
  table: TABLE_ACTION,
  match: { row_id: 2 },
  set: {
    option_key: 'B',
    idea_text: '\u64a4\u79bb\u73b0\u573a',
    main_risk: '\u53ef\u80fd\u9519\u8fc7\u7ebf\u7d22',
    expected_gain: '\u964d\u4f4e\u6b7b\u4ea1\u98ce\u9669',
    death_risk_level: RISK_LOW,
    revival_risk_level: RISK_NONE,
  },
}, emptyCurrentData);
assert.equal(promotedFixedRowUpdate.ok, true);
assert.equal(promotedFixedRowUpdate.action, 'insertRow');
assert.equal(promotedFixedRowUpdate.insertedRowIndex, 1);
assert.equal(promotedUpdateCalls.length, 1);
assert.equal(promotedUpdateCalls[0][1].tableName, TABLE_ACTION);
assert.deepEqual({ ...promotedUpdateCalls[0][1].data }, {
  row_id: 2,
  [COL_OPTION]: 'B',
  [COL_IDEA]: '\u64a4\u79bb\u73b0\u573a',
  [COL_MAIN_RISK]: '\u53ef\u80fd\u9519\u8fc7\u7ebf\u7d22',
  [COL_GAIN]: '\u964d\u4f4e\u6b7b\u4ea1\u98ce\u9669',
  [COL_DEATH]: RISK_LOW,
  [COL_REVIVAL]: RISK_NONE,
});

const promotedIncompleteFixedRow = previewTableChangePlan({
  action: 'updateCell',
  table: TABLE_ACTION,
  match: { row_id: 3 },
  set: { option_key: 'C' },
}, emptyCurrentData);
assert.equal(promotedIncompleteFixedRow.ok, false);
assert.ok(promotedIncompleteFixedRow.errors.some(error => error.code === 'NOT_NULL_VIOLATION'));

const chronicleCalls = [];
const chronicleApi = {
  async insertRow(options) {
    chronicleCalls.push(['insertRow', options]);
    return 3;
  },
};
const chronicleText = '\u672c\u8f6e\u7eaa\u8981\u4ee5\u7b2c\u4e09\u65b9\u89c6\u89d2\u8bb0\u5f55\u5df2\u7ecf\u53d1\u751f\u7684\u4e8b\u5b9e\uff0c\u53ea\u4fdd\u7559\u73a9\u5bb6\u5728\u573a\u80fd\u591f\u786e\u8ba4\u7684\u884c\u52a8\u3001\u73af\u5883\u53d8\u5316\u548c\u7ebf\u7d22\u53d6\u5f97\u8fc7\u7a0b\uff0c\u4e0d\u8865\u5199\u9690\u85cf\u771f\u76f8\u6216\u672a\u51fa\u573a\u7684\u89c4\u5f8b\u3002'.repeat(4);
const chronicleInsert = await applyTableChangePlan(chronicleApi, {
  action: 'insertRow',
  table: 'chronicle',
  data: {
    time_span: '2004-07-01 09:00 ~ 09:30',
    related_event: '\u4e03\u4e2d\u6572\u95e8\u4e8b\u4ef6',
    summary: '\u73a9\u5bb6\u83b7\u5f97\u65b0\u8bc1\u8bcd',
    chronicle_text: chronicleText,
  },
}, { mate: { type: 'chatSheets', version: 1 }, sheet_chronicle: chronicleTable });
assert.equal(chronicleInsert.ok, true);
assert.equal(chronicleCalls.length, 1);
assert.equal(chronicleCalls[0][1].data[COL_CODE_INDEX], 'SP0003');

const shortChroniclePreview = previewTableChangePlan({
  action: 'insertRow',
  table: TABLE_CHRONICLE,
  data: {
    time_span: '2004-07-01 09:00 ~ 09:30',
    related_event: '\u4e03\u4e2d\u6572\u95e8\u4e8b\u4ef6',
    summary: '\u8fc7\u77ed\u7eaa\u8981',
    chronicle_text: '\u8fc7\u77ed\u7eaa\u8981',
  },
}, { mate: { type: 'chatSheets', version: 1 }, sheet_chronicle: chronicleTable });
assertError(shortChroniclePreview, 'LENGTH_VIOLATION');

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

const failedButAppliedUpdateData = JSON.parse(JSON.stringify(currentData));
const failedButAppliedUpdateImports = [];
const failedButAppliedUpdateApi = {
  async updateCell(options) {
    const headers = failedButAppliedUpdateData.sheet_action_suggestions.content[0];
    const columnIndex = headers.indexOf(options.column);
    failedButAppliedUpdateData.sheet_action_suggestions.content[options.rowIndex][columnIndex] = options.value;
    return false;
  },
  async exportTableAsJson() {
    return JSON.stringify(failedButAppliedUpdateData);
  },
  async importTableAsJson(jsonString) {
    failedButAppliedUpdateImports.push(JSON.parse(jsonString));
    return true;
  },
};
const failedButAppliedUpdate = await applyTableChangePlan(failedButAppliedUpdateApi, {
  action: 'updateCell',
  table: TABLE_ACTION,
  match: { row_id: 1 },
  set: {
    idea_text: 'verified update',
    main_risk: 'verified update risk',
  },
}, currentData);
assert.equal(failedButAppliedUpdate.ok, true);
assert.equal(failedButAppliedUpdateImports.length, 0);
assert.equal(failedButAppliedUpdateData.sheet_action_suggestions.content[1][2], 'verified update');
assert.equal(failedButAppliedUpdateData.sheet_action_suggestions.content[1][3], 'verified update risk');

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

const failedButAppliedDeleteData = JSON.parse(JSON.stringify(currentData));
const failedButAppliedDeleteImports = [];
const failedButAppliedDeleteApi = {
  async deleteRow(options) {
    failedButAppliedDeleteData.sheet_action_suggestions.content.splice(options.rowIndex, 1);
    return false;
  },
  async exportTableAsJson() {
    return JSON.stringify(failedButAppliedDeleteData);
  },
  async importTableAsJson(jsonString) {
    failedButAppliedDeleteImports.push(JSON.parse(jsonString));
    return true;
  },
};
const failedButAppliedDelete = await applyTableChangePlan(failedButAppliedDeleteApi, {
  action: 'deleteRow',
  table: TABLE_ACTION,
  match: { row_id: 1 },
}, currentData);
assert.equal(failedButAppliedDelete.ok, true);
assert.equal(failedButAppliedDeleteImports.length, 0);
assert.equal(failedButAppliedDeleteData.sheet_action_suggestions.content.length, currentData.sheet_action_suggestions.content.length - 1);
assert.equal(failedButAppliedDeleteData.sheet_action_suggestions.content.some(row => Array.isArray(row) && row[0] === 1), false);

const beforeDeleteCalls = calls.length;
const blockedDelete = await applyTableChangePlan(api, {
  action: 'deleteRow',
  table: TABLE_ACTION,
  match: { death_risk_level: RISK_LOW },
}, currentData);
assertError(blockedDelete, 'MULTIPLE_ROWS_MATCHED');
assert.equal(calls.length, beforeDeleteCalls);

console.log('verify-table-change-adapter: passed');
