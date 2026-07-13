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
const mysteryTemplatePath = join(
  repoRoot,
  'src',
  '\u795e\u79d8\u590d\u82cf\u6a21\u62df\u5668',
  '\u6570\u636e\u5e93',
  '\u795e\u79d8\u590d\u82cf\u8868\u683cSQL_v1.json',
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
const mysteryTemplateData = JSON.parse(readFileSync(mysteryTemplatePath, 'utf8'));

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
const TABLE_EVENTS = '\u7075\u5f02\u4e8b\u4ef6';
const COL_EVENT_CODE = '\u4e8b\u4ef6\u4ee3\u53f7';
const COL_DANGER_LEVEL = '\u5371\u5bb3\u7b49\u7ea7';
const COL_LOCATION = '\u53d1\u751f\u5730\u70b9';
const COL_GHOST_DOMAIN = '\u9b3c\u57df\u72b6\u6001';
const COL_KNOWN_LAWS = '\u5df2\u77e5\u6740\u4eba\u89c4\u5f8b';
const COL_SUSPECTED_LAWS = '\u731c\u6d4b\u6740\u4eba\u89c4\u5f8b';
const COL_WRONG_INFERENCES = '\u9519\u8bef\u63a8\u65ad';
const COL_DEATH_COUNT = '\u6b7b\u4ea1\u4eba\u6570';
const COL_SPREAD_TREND = '\u6269\u6563\u8d8b\u52bf';
const COL_HANDLING_STATUS = '\u5904\u7406\u72b6\u6001';
const COL_PUBLIC_SUMMARY = '\u53ef\u89c1\u6458\u8981';
const STATUS_UNHANDLED = '\u672a\u5904\u7406';
const STATUS_INVESTIGATING = '\u8c03\u67e5\u4e2d';
const STATUS_CONFRONTING = '\u5bf9\u6297\u4e2d';
const STATUS_SPREADING = '\u5931\u63a7\u6269\u6563';
const TABLE_GLOBAL = '\u5168\u5c40\u72b6\u6001';
const COL_GAME_TIME = '\u5f53\u524d\u65f6\u95f4';
const COL_CURRENT_LOCATION = '\u5f53\u524d\u5730\u70b9';
const COL_CURRENT_CITY = '\u5f53\u524d\u57ce\u5e02';
const COL_CANON_STAGE = '\u539f\u8457\u9636\u6bb5';
const COL_CANON_ANCHOR = '\u5267\u60c5\u951a\u70b9';
const COL_MAIN_PHASE = '\u4e3b\u7ebf\u9636\u6bb5';
const COL_WORLD_PRESSURE = '\u4e16\u754c\u538b\u529b';
const COL_HQ_ATTENTION = '\u603b\u90e8\u5173\u6ce8\u5ea6';
const COL_PUBLIC_EXPOSURE = '\u793e\u4f1a\u516c\u5f00\u5ea6';
const TABLE_PLAYER = '\u73a9\u5bb6\u72b6\u6001';
const COL_PLAYER_NAME = '\u59d3\u540d';
const COL_PLAYER_IDENTITY = '\u8eab\u4efd';
const COL_PLAYER_LOCATION = '\u6240\u5728\u5730\u70b9';
const COL_PLAYER_STATUS = '\u5f53\u524d\u72b6\u6001';
const COL_PLAYER_DEATH_RISK = '\u6b7b\u4ea1\u98ce\u9669\u955c\u50cf';
const COL_PLAYER_REVIVAL_RISK = '\u590d\u82cf\u98ce\u9669\u955c\u50cf';
const COL_PLAYER_GHOSTS = '\u5df2\u9a7e\u9a6d\u5389\u9b3c';
const COL_PLAYER_PIECES = '\u6301\u6709\u62fc\u56fe';
const COL_PLAYER_RESOURCES = '\u7075\u5f02\u8d44\u6e90';
const COL_PLAYER_LAST_ACTION = '\u6700\u8fd1\u884c\u52a8';

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

const eventsTable = {
  uid: 'sheet_supernatural_events',
  name: TABLE_EVENTS,
  sourceData: {
    ddl: `CREATE TABLE supernatural_events ( -- ${TABLE_EVENTS}
  row_id INTEGER PRIMARY KEY, -- row_id
  event_code TEXT NOT NULL UNIQUE, -- ${COL_EVENT_CODE}
  danger_level TEXT NOT NULL, -- ${COL_DANGER_LEVEL}
  location_name TEXT NOT NULL, -- ${COL_LOCATION}
  ghost_domain_status TEXT NOT NULL, -- ${COL_GHOST_DOMAIN}
  known_laws TEXT NOT NULL, -- ${COL_KNOWN_LAWS}
  suspected_laws TEXT NOT NULL, -- ${COL_SUSPECTED_LAWS}
  wrong_inferences TEXT NOT NULL, -- ${COL_WRONG_INFERENCES}
  death_count INTEGER NOT NULL CHECK(death_count >= 0), -- ${COL_DEATH_COUNT}
  spread_trend TEXT NOT NULL, -- ${COL_SPREAD_TREND}
  handling_status TEXT NOT NULL CHECK(handling_status IN ('${STATUS_UNHANDLED}', '${STATUS_INVESTIGATING}', '${STATUS_CONFRONTING}', '\u5df2\u538b\u5236', '\u5df2\u5173\u62bc', '${STATUS_SPREADING}', '\u7ed3\u675f')), -- ${COL_HANDLING_STATUS}
  public_summary TEXT NOT NULL CHECK(LENGTH(public_summary) <= 160) -- ${COL_PUBLIC_SUMMARY}
);`,
  },
  content: [
    [
      'row_id',
      COL_EVENT_CODE,
      COL_DANGER_LEVEL,
      COL_LOCATION,
      COL_GHOST_DOMAIN,
      COL_KNOWN_LAWS,
      COL_SUSPECTED_LAWS,
      COL_WRONG_INFERENCES,
      COL_DEATH_COUNT,
      COL_SPREAD_TREND,
      COL_HANDLING_STATUS,
      COL_PUBLIC_SUMMARY,
    ],
    [
      1,
      '\u4e03\u4e2d\u6572\u95e8\u4e8b\u4ef6',
      '\u672a\u77e5',
      '\u4e03\u4e2d',
      '\u672a\u786e\u8ba4',
      '\u65e0',
      '\u542c\u5230\u6572\u95e8\u58f0\u540e\u53ef\u80fd\u88ab\u6807\u8bb0',
      '\u65e0',
      0,
      '\u5c40\u90e8',
      STATUS_INVESTIGATING,
      '\u4e03\u4e2d\u51fa\u73b0\u5f02\u5e38\u6572\u95e8\u58f0\u3002',
    ],
  ],
};

const globalStateTable = {
  uid: 'sheet_global_state',
  name: TABLE_GLOBAL,
  sourceData: {
    ddl: `CREATE TABLE global_state ( -- ${TABLE_GLOBAL}
  row_id INTEGER PRIMARY KEY CHECK(row_id = 1), -- row_id
  game_time TEXT NOT NULL CHECK(game_time GLOB '????-??-?? ??:??'), -- ${COL_GAME_TIME}
  current_location TEXT NOT NULL, -- ${COL_CURRENT_LOCATION}
  current_city TEXT NOT NULL, -- ${COL_CURRENT_CITY}
  canon_stage TEXT NOT NULL, -- ${COL_CANON_STAGE}
  canon_anchor TEXT NOT NULL, -- ${COL_CANON_ANCHOR}
  main_phase TEXT NOT NULL, -- ${COL_MAIN_PHASE}
  world_pressure INTEGER NOT NULL CHECK(world_pressure BETWEEN 0 AND 100), -- ${COL_WORLD_PRESSURE}
  hq_attention INTEGER NOT NULL CHECK(hq_attention BETWEEN 0 AND 100), -- ${COL_HQ_ATTENTION}
  public_exposure INTEGER NOT NULL CHECK(public_exposure BETWEEN 0 AND 100) -- ${COL_PUBLIC_EXPOSURE}
);`,
  },
  content: [[
    'row_id',
    COL_GAME_TIME,
    COL_CURRENT_LOCATION,
    COL_CURRENT_CITY,
    COL_CANON_STAGE,
    COL_CANON_ANCHOR,
    COL_MAIN_PHASE,
    COL_WORLD_PRESSURE,
    COL_HQ_ATTENTION,
    COL_PUBLIC_EXPOSURE,
  ]],
};

const playerStateTable = {
  uid: 'sheet_player_state',
  name: TABLE_PLAYER,
  sourceData: {
    ddl: `CREATE TABLE player_state ( -- ${TABLE_PLAYER}
  row_id INTEGER PRIMARY KEY CHECK(row_id = 1), -- row_id
  name TEXT NOT NULL, -- ${COL_PLAYER_NAME}
  identity_text TEXT NOT NULL, -- ${COL_PLAYER_IDENTITY}
  location_name TEXT NOT NULL, -- ${COL_PLAYER_LOCATION}
  status_text TEXT NOT NULL, -- ${COL_PLAYER_STATUS}
  death_risk INTEGER NOT NULL CHECK(death_risk BETWEEN 0 AND 100), -- ${COL_PLAYER_DEATH_RISK}
  revival_risk INTEGER NOT NULL CHECK(revival_risk BETWEEN 0 AND 100), -- ${COL_PLAYER_REVIVAL_RISK}
  controlled_ghosts TEXT NOT NULL, -- ${COL_PLAYER_GHOSTS}
  ghost_pieces TEXT NOT NULL, -- ${COL_PLAYER_PIECES}
  resources_text TEXT NOT NULL, -- ${COL_PLAYER_RESOURCES}
  last_action TEXT NOT NULL -- ${COL_PLAYER_LAST_ACTION}
);`,
  },
  content: [[
    'row_id',
    COL_PLAYER_NAME,
    COL_PLAYER_IDENTITY,
    COL_PLAYER_LOCATION,
    COL_PLAYER_STATUS,
    COL_PLAYER_DEATH_RISK,
    COL_PLAYER_REVIVAL_RISK,
    COL_PLAYER_GHOSTS,
    COL_PLAYER_PIECES,
    COL_PLAYER_RESOURCES,
    COL_PLAYER_LAST_ACTION,
  ]],
};

function assertError(result, code) {
  assert.equal(result.ok, false);
  assert.ok(result.errors.some(error => error.code === code), `Expected ${code}, got ${JSON.stringify(result.errors)}`);
}

function createEventData(overrides = {}) {
  return {
    event_code: '\u4e03\u4e2d\u6572\u95e8\u4e8b\u4ef6',
    danger_level: '\u672a\u77e5',
    location_name: '\u4e03\u4e2d',
    ghost_domain_status: '\u672a\u786e\u8ba4',
    known_laws: '\u65e0',
    suspected_laws: '\u542c\u5230\u6572\u95e8\u58f0\u540e\u53ef\u80fd\u88ab\u6807\u8bb0',
    wrong_inferences: '\u65e0',
    death_count: 0,
    spread_trend: '\u5c40\u90e8',
    handling_status: STATUS_INVESTIGATING,
    public_summary: '\u4e03\u4e2d\u51fa\u73b0\u5f02\u5e38\u6572\u95e8\u58f0\u3002',
    ...overrides,
  };
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

const eventsCurrentData = {
  mate: { type: 'chatSheets', version: 1 },
  sheet_supernatural_events: eventsTable,
};
const eventsMetadata = listTableMetadata(eventsCurrentData)[0];
const eventCodeColumn = eventsMetadata.columns.find(column => column.physicalName === 'event_code');
assert.equal(eventCodeColumn.unique, true);

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
assert.equal(appliedInsert.action, 'updateCell');
assert.equal(appliedInsert.rowIndex, 4);
assert.equal(calls.at(-1)[0], 'updateCell');
assert.equal(calls.at(-1)[1].rowIndex, 4);

const emptyCurrentData = JSON.parse(JSON.stringify(currentData));
emptyCurrentData.sheet_action_suggestions.content = [table.content[0]];

const appliedInsertIntoEmpty = await applyTableChangePlan(api, {
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
}, emptyCurrentData);
assert.equal(appliedInsertIntoEmpty.ok, true);
assert.equal(appliedInsertIntoEmpty.insertedRowIndex, 3);
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

const failedButMutatedInputInsertData = JSON.parse(JSON.stringify(emptyCurrentData));
const failedButMutatedInputInsertImports = [];
const failedButMutatedInputInsertApi = {
  async insertRow(options) {
    failedButMutatedInputInsertData.sheet_action_suggestions.content.push([
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
    return JSON.stringify(failedButMutatedInputInsertData);
  },
  async importTableAsJson(jsonString) {
    failedButMutatedInputInsertImports.push(JSON.parse(jsonString));
    return true;
  },
};
const failedButMutatedInputInsert = await applyTableChangePlan(failedButMutatedInputInsertApi, {
  action: 'insertRow',
  table: table.name,
  data: {
    row_id: 3,
    option_key: 'C',
    idea_text: 'mutated input insert',
    main_risk: 'mutated input risk',
    expected_gain: 'mutated input gain',
    death_risk_level: RISK_LOW,
    revival_risk_level: RISK_NONE,
  },
}, failedButMutatedInputInsertData);
assert.equal(failedButMutatedInputInsert.ok, true);
assert.equal(failedButMutatedInputInsert.insertedRowIndex, 1);
assert.equal(failedButMutatedInputInsertImports.length, 0);
assert.equal(
  failedButMutatedInputInsertData.sheet_action_suggestions.content
    .filter(row => Array.isArray(row) && row.includes('mutated input insert')).length,
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

const singletonCurrentData = {
  mate: { type: 'chatSheets', version: 1 },
  sheet_global_state: globalStateTable,
};
const singletonMetadata = listTableMetadata(singletonCurrentData);
const singletonRowId = singletonMetadata[0].columns.find(column => column.header === 'row_id');
assert.equal(singletonRowId.minValue, 1);
assert.equal(singletonRowId.maxValue, 1);

const singletonInsertCalls = [];
const singletonApi = {
  async insertRow(options) {
    singletonInsertCalls.push(['insertRow', options]);
    return 1;
  },
};
const promotedSingletonUpdate = await applyTableChangePlan(singletonApi, {
  action: 'updateCell',
  table: 'global_state',
  match: { [COL_CURRENT_CITY]: '\u5927\u660c\u5e02' },
  set: {
    game_time: '2004-07-01 08:00',
    current_location: '\u8001\u65e7\u516c\u5bd3\u8d70\u5eca',
    current_city: '\u5927\u660c\u5e02',
    canon_stage: '\u6572\u95e8\u9b3c\u4e8b\u4ef6\u524d',
    canon_anchor: '\u516c\u5bd3\u5f00\u5c40',
    main_phase: '\u5f00\u5c40\u63a5\u5165',
    world_pressure: 10,
    hq_attention: 0,
    public_exposure: 0,
  },
}, singletonCurrentData);
assert.equal(promotedSingletonUpdate.ok, true);
assert.equal(promotedSingletonUpdate.action, 'insertRow');
assert.equal(promotedSingletonUpdate.insertedRowIndex, 1);
assert.equal(singletonInsertCalls.length, 1);
assert.equal(singletonInsertCalls[0][1].tableName, TABLE_GLOBAL);
assert.equal(singletonInsertCalls[0][1].data.row_id, 1);
assert.equal(singletonInsertCalls[0][1].data[COL_CURRENT_CITY], '\u5927\u660c\u5e02');

const templateFallbackData = {
  mate: { type: 'chatSheets', version: 1 },
  sheet_global_state: globalStateTable,
  sheet_player_state: playerStateTable,
  sheet_supernatural_events: eventsTable,
};
const runtimeBareData = {
  mate: { type: 'chatSheets', version: 1 },
  sheet_global_state: { content: globalStateTable.content },
  sheet_player_state: { content: playerStateTable.content },
  sheet_supernatural_events: { content: eventsTable.content },
};
const fallbackMetadata = listTableMetadata(runtimeBareData, templateFallbackData);
assert.ok(
  fallbackMetadata.find(sheet => sheet.sqlName === 'player_state')
    ?.columns.some(column => column.physicalName === 'name' && column.header === COL_PLAYER_NAME),
  'bare runtime sheet should recover player_state physical aliases from template by sheet key',
);
assert.ok(
  fallbackMetadata.find(sheet => sheet.sqlName === 'supernatural_events')
    ?.columns.some(column => column.physicalName === 'event_code' && column.header === COL_EVENT_CODE),
  'bare runtime sheet should recover supernatural_events physical aliases from template by sheet key',
);

const aliasInsertCalls = [];
const aliasApi = {
  async insertRow(options) {
    aliasInsertCalls.push(['insertRow', options]);
    return 1;
  },
};
const currentTimeAliasUpdate = await applyTableChangePlan(aliasApi, {
  action: 'updateCell',
  table: 'global_state',
  match: { current_city: '\u5927\u660c\u5e02' },
  set: {
    current_time: '2024-04-12 22:15:48',
    current_location: '\u8001\u65e7\u5c45\u6c11\u697c\u8d70\u5eca',
    current_city: '\u5927\u660c\u5e02',
    canon_stage: '\u6572\u95e8\u9b3c\u4e8b\u4ef6\u524d',
    canon_anchor: '\u5c45\u6c11\u697c\u5f00\u5c40',
    main_phase: '\u5f00\u5c40\u63a5\u5165',
    world_pressure: 12,
    hq_attention: 0,
    public_exposure: 0,
  },
}, runtimeBareData, templateFallbackData);
assert.equal(currentTimeAliasUpdate.ok, true);
assert.equal(currentTimeAliasUpdate.action, 'insertRow');
assert.equal(aliasInsertCalls[0][1].tableName, TABLE_GLOBAL);
assert.equal(aliasInsertCalls[0][1].data[COL_GAME_TIME], '2024-04-12 22:15');

const playerPhysicalPreview = previewTableChangePlan({
  action: 'updateCell',
  table: 'player_state',
  match: { location_name: '\u8001\u65e7\u5c45\u6c11\u697c' },
  set: {
    name: '\u79e6\u5b9e',
    identity_text: '\u666e\u901a\u4eba',
    location_name: '\u8001\u65e7\u5c45\u6c11\u697c',
    status_text: '\u89c2\u5bdf\u4e2d',
    death_risk: 12,
    revival_risk: 0,
    controlled_ghosts: '\u65e0',
    ghost_pieces: '\u65e0',
    resources_text: '\u624b\u673a',
    last_action: '\u89c2\u5bdf\u5899\u4e0a\u6e7f\u811a\u5370',
  },
}, runtimeBareData, templateFallbackData);
assert.equal(playerPhysicalPreview.ok, true);
assert.equal(playerPhysicalPreview.action, 'insertRow');
assert.ok(!playerPhysicalPreview.errors.some(error => error.code === 'COLUMN_NOT_FOUND'));

const eventPhysicalPreview = previewTableChangePlan({
  action: 'insertRow',
  table: 'supernatural_events',
  data: createEventData({
    event_code: '\u5c45\u6c11\u697c\u6e7f\u811a\u5370\u4e8b\u4ef6',
    danger_level: 'C',
    location_name: '\u8001\u65e7\u5c45\u6c11\u697c',
    public_summary: '\u5c45\u6c11\u697c\u8d70\u5eca\u51fa\u73b0\u5f02\u5e38\u6e7f\u811a\u5370\u3002',
  }),
}, runtimeBareData, templateFallbackData);
assert.equal(eventPhysicalPreview.ok, true);
assert.ok(!eventPhysicalPreview.errors.some(error => error.code === 'COLUMN_NOT_FOUND'));

const p5CrudAliasCases = [
  {
    key: 'sheet_player_state',
    sqlName: 'player_state',
    expectedAction: 'insertRow',
    physicalPlan: {
      action: 'updateCell',
      table: 'player_state',
      match: { row_id: 1 },
      set: {
        name: '秦实',
        identity_text: '普通人',
        location_name: '老旧居民楼',
        status_text: '观察中',
        death_risk: 12,
        revival_risk: 0,
        controlled_ghosts: '无',
        ghost_pieces: '无',
        resources_text: '手机',
        last_action: '观察墙上湿脚印',
      },
    },
  },
  {
    key: 'sheet_ghost_archives',
    sqlName: 'ghost_archives',
    physicalPlan: {
      action: 'insertRow',
      table: 'ghost_archives',
      data: {
        archive_code: 'G0001',
        ghost_name: '湿脚印鬼',
        event_code: 'EVT_湿脚印',
        phenomenon: '走廊反复出现湿脚印',
        known_law: '无',
        suspected_law: '踩入湿脚印可能被跟随',
        suppression_method: '保持距离并封锁走廊',
        containment_status: '未知',
        puzzle_relation: '疑似水迹媒介',
        danger_note: '低声呼吸靠近',
      },
    },
  },
  {
    key: 'sheet_clues',
    sqlName: 'clues',
    physicalPlan: {
      action: 'insertRow',
      table: 'clues',
      data: {
        clue_code: 'C0001',
        event_code: 'EVT_湿脚印',
        source_text: '走廊观察',
        clue_text: '脚印从封闭房门内侧延伸到楼梯口',
        reliability: '中',
        inference_text: '异常可能依附湿脚印移动',
        verification_status: '未验证',
        visibility: '玩家可见',
      },
    },
  },
  {
    key: 'sheet_chronicle',
    sqlName: 'chronicle',
    physicalPlan: {
      action: 'insertRow',
      table: 'chronicle',
      data: {
        time_span: '2004-07-01 09:00 ~ 09:30',
        related_event: 'EVT_湿脚印',
        summary: '玩家确认湿脚印线索',
        chronicle_text: '本轮纪要只记录玩家在场能够确认的事实，包括走廊湿脚印的出现位置、观察到的环境变化、玩家对撤离路线和异常声响的判断，以及线索被记录进后续调查目标的过程。'.repeat(3),
      },
    },
  },
  {
    key: 'sheet_locations',
    sqlName: 'locations',
    physicalPlan: {
      action: 'insertRow',
      table: 'locations',
      data: {
        location_name: '老旧居民楼',
        city_name: '大昌市',
        location_type: '居民楼',
        supernatural_status: '疑似灵异',
        lockdown_status: '未封锁',
        related_event: 'EVT_湿脚印',
        description: '楼道潮湿且照明异常闪烁',
        interaction_options: '观察走廊;联系物业;撤离楼道',
      },
    },
  },
  {
    key: 'sheet_supernatural_events',
    sqlName: 'supernatural_events',
    physicalPlan: {
      action: 'insertRow',
      table: 'supernatural_events',
      data: createEventData({
        event_code: 'EVT_湿脚印',
        location_name: '老旧居民楼',
        handling_status: '蔓延中',
        public_summary: '居民楼走廊出现持续湿脚印，事件有扩散趋势。',
      }),
    },
  },
  {
    key: 'sheet_controlled_ghosts',
    sqlName: 'controlled_ghosts',
    physicalPlan: {
      action: 'insertRow',
      table: 'controlled_ghosts',
      data: {
        ghost_code: 'ARCHIVE_GHOST',
        terror_level: '未知',
        puzzle_trait: '档案化记录',
        killing_law: '未验证',
        usable_power: '记录可见灵异线索',
        cost_text: '精神压力上升',
        revival_progress: '0%',
        dead_state: '未死机',
        suppression_relation: '无',
        public_summary: '玩家暂未稳定驾驭厉鬼，仅记录候选能力边界。',
      },
    },
  },
  {
    key: 'sheet_collected_archives',
    sqlName: 'collected_archives',
    physicalPlan: {
      action: 'insertRow',
      table: 'collected_archives',
      data: {
        archive_ghost_name: '湿脚印鬼',
        archive_status: '收录中',
        ghost_info: '走廊出现持续湿脚印，疑似有看不见的灵异经过。',
        known_law: '无',
        suspected_law: '踩入湿脚印可能被跟随',
        ghost_domain: '未确认',
        archive_progress: 25,
        archive_completeness: '低',
        callable_scope: '仅作危险提示',
        public_summary: '档案仍处于早期观察，不能稳定调用规律。',
      },
    },
  },
];

const p5SparseRuntimeData = { mate: { type: 'chatSheets', version: 1 } };
for (const { key } of p5CrudAliasCases) {
  p5SparseRuntimeData[key] = { content: [['row_id']] };
}
const p5SparseMetadata = listTableMetadata(p5SparseRuntimeData, mysteryTemplateData);
const p52FailureTables = [
  'ghost_archives',
  'clues',
  'locations',
  'collected_archives',
  'chronicle',
  'controlled_ghosts',
  'player_state',
  'supernatural_events',
];
assert.deepEqual(
  p5CrudAliasCases.map(testCase => testCase.sqlName).sort(),
  [...p52FailureTables].sort(),
  'P5.2 sparse runtime regressions should cover every real failure table',
);

function metadataBySqlName(sqlName) {
  return p5SparseMetadata.find(sheet => sheet.sqlName === sqlName);
}

function planValues(plan) {
  return plan.action === 'insertRow' ? plan.data : plan.set;
}

function headerAliasData(sqlName, physicalData) {
  const metadata = metadataBySqlName(sqlName);
  assert.ok(metadata, `${sqlName} metadata should exist`);
  const output = {};
  for (const [physicalName, value] of Object.entries(physicalData)) {
    const column = metadata.columns.find(item => item.physicalName === physicalName || item.header === physicalName);
    assert.ok(column, `${sqlName}.${physicalName} should be recovered from template metadata`);
    output[column.commentAlias ?? column.header] = value;
  }
  return output;
}

function assertNoColumnNotFound(result, label) {
  assert.equal(result.ok, true, `${label} should pass: ${JSON.stringify(result.errors)}`);
  assert.ok(!result.errors.some(error => error.code === 'COLUMN_NOT_FOUND'), `${label} should not emit COLUMN_NOT_FOUND`);
}

for (const testCase of p5CrudAliasCases) {
  const metadata = metadataBySqlName(testCase.sqlName);
  assert.ok(metadata, `${testCase.sqlName} should be present in sparse runtime metadata`);
  const values = planValues(testCase.physicalPlan);
  for (const physicalName of Object.keys(values)) {
    assert.ok(
      metadata.columns.some(column => column.physicalName === physicalName),
      `${testCase.sqlName}.${physicalName} should be recovered when runtime header only has row_id`,
    );
  }

  const physicalPreview = previewTableChangePlan(testCase.physicalPlan, p5SparseRuntimeData, mysteryTemplateData);
  assertNoColumnNotFound(physicalPreview, `${testCase.sqlName} physical aliases`);
  if (testCase.expectedAction) assert.equal(physicalPreview.action, testCase.expectedAction);

  const sheetName = mysteryTemplateData[testCase.key].name;
  const commentAliasPlan = testCase.physicalPlan.action === 'insertRow'
    ? {
        ...testCase.physicalPlan,
        table: sheetName,
        data: headerAliasData(testCase.sqlName, testCase.physicalPlan.data),
      }
    : {
        ...testCase.physicalPlan,
        table: sheetName,
        set: headerAliasData(testCase.sqlName, testCase.physicalPlan.set),
      };
  const commentAliasPreview = previewTableChangePlan(commentAliasPlan, p5SparseRuntimeData, mysteryTemplateData);
  assertNoColumnNotFound(commentAliasPreview, `${testCase.sqlName} comment aliases`);

  const emptyInsertPreview = previewTableChangePlan({
    action: 'insertRow',
    table: testCase.sqlName,
    data: {},
  }, p5SparseRuntimeData, mysteryTemplateData);
  assertError(emptyInsertPreview, 'NOT_NULL_VIOLATION');

  const rowIdOnlyPreview = previewTableChangePlan({
    action: 'insertRow',
    table: testCase.sqlName,
    data: { row_id: 1 },
  }, p5SparseRuntimeData, mysteryTemplateData);
  assertError(rowIdOnlyPreview, 'NOT_NULL_VIOLATION');
}

const clueMetadata = p5SparseMetadata.find(sheet => sheet.sqlName === 'clues');
assert.equal(clueMetadata?.columns.find(column => column.physicalName === 'clue_code')?.checkGlob, 'C[0-9][0-9][0-9][0-9]');
// AI 近义列名 inference 应映射到 inference_text，避免 COLUMN_NOT_FOUND + NOT_NULL 推断
const clueAliasPreview = previewTableChangePlan({
  action: 'insertRow',
  table: '线索',
  data: {
    clue_code: 'C0099',
    event_code: 'EVT_湿脚印',
    source_text: '走廊观察',
    clue_text: '门缝渗出湿气',
    reliability: '中',
    inference: '疑似水迹媒介',
    verification_status: '未验证',
    visibility: '玩家可见',
  },
}, p5SparseRuntimeData, mysteryTemplateData);
assert.equal(
  clueAliasPreview.ok,
  true,
  `clue inference alias should pass preview: ${JSON.stringify(clueAliasPreview.errors)}`,
);
assert.ok(!clueAliasPreview.errors.some(error => error.code === 'COLUMN_NOT_FOUND'));
const invalidClueCodePreview = previewTableChangePlan({
  ...p5CrudAliasCases.find(testCase => testCase.sqlName === 'clues').physicalPlan,
  data: {
    ...p5CrudAliasCases.find(testCase => testCase.sqlName === 'clues').physicalPlan.data,
    clue_code: 'C541499',
  },
}, p5SparseRuntimeData, mysteryTemplateData);
assertError(invalidClueCodePreview, 'CHECK_PATTERN_VIOLATION');

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

const codeAsChronicleTextInsertPreview = previewTableChangePlan({
  action: 'insertRow',
  table: 'chronicle',
  data: {
    time_span: '2004-07-01 09:00 ~ 09:30',
    related_event: '七中敲门事件',
    summary: '编号误填',
    chronicle_text: 'SP0001',
  },
}, { mate: { type: 'chatSheets', version: 1 }, sheet_chronicle: chronicleTable });
assertError(codeAsChronicleTextInsertPreview, 'LENGTH_VIOLATION');

const codeAsChronicleTextUpdatePreview = previewTableChangePlan({
  action: 'updateCell',
  table: 'chronicle',
  match: { code_index: 'SP0002' },
  set: {
    chronicle_text: 'SP0001',
  },
}, { mate: { type: 'chatSheets', version: 1 }, sheet_chronicle: chronicleTable });
assertError(codeAsChronicleTextUpdatePreview, 'LENGTH_VIOLATION');

// 事件纪要追加式守卫：禁止删除已有纪要行（避免开局 SP0001 纪要被后续轮次删掉）。
const chronicleDeletePreview = previewTableChangePlan({
  action: 'deleteRow',
  table: 'chronicle',
  match: { code_index: 'SP0001' },
}, { mate: { type: 'chatSheets', version: 1 }, sheet_chronicle: chronicleTable });
assertError(chronicleDeletePreview, 'CHRONICLE_APPEND_ONLY');

// 事件纪要追加式守卫：禁止把已有行的纪要编号改写成另一个编号（避免覆盖独立开局纪要）。
const chronicleCodeRewritePreview = previewTableChangePlan({
  action: 'updateCell',
  table: 'chronicle',
  match: { code_index: 'SP0002' },
  set: {
    code_index: 'SP0001',
  },
}, { mate: { type: 'chatSheets', version: 1 }, sheet_chronicle: chronicleTable });
assertError(chronicleCodeRewritePreview, 'CHRONICLE_CODE_IMMUTABLE');

// 合法回归：在已有纪要行上修订正文（200-600 字客观纪要、不动编号）仍应通过，守卫不能误伤正常编辑。
const chronicleContentUpdatePreview = previewTableChangePlan({
  action: 'updateCell',
  table: 'chronicle',
  match: { code_index: 'SP0002' },
  set: {
    chronicle_text: '本轮纪要补充玩家在场可确认的事实。'.repeat(12),
  },
}, { mate: { type: 'chatSheets', version: 1 }, sheet_chronicle: chronicleTable });
assert.equal(
  chronicleContentUpdatePreview.ok,
  true,
  `chronicle content update should pass: ${JSON.stringify(chronicleContentUpdatePreview.errors)}`,
);

// 作用域隔离守卫：事件纪要追加式守卫只能作用于 chronicle，
// 绝不能误伤玩家状态的姓名修订或其它表的删除/编号字段。
// 这同时保证“姓名保持”不被纪要隔离守卫连带锁死——玩家姓名仍可正常更新。
const seededPlayerStateTable = {
  ...playerStateTable,
  content: [
    playerStateTable.content[0],
    [
      1, '林川', '普通学生', '七中', '观察中',
      12, 0, '无', '无', '手机', '观察走廊',
    ],
  ],
};
const playerNameUpdatePreview = previewTableChangePlan({
  action: 'updateCell',
  table: 'player_state',
  match: { row_id: 1 },
  set: { name: '周铭' },
}, { mate: { type: 'chatSheets', version: 1 }, sheet_player_state: seededPlayerStateTable });
assert.equal(
  playerNameUpdatePreview.ok,
  true,
  `player name update should pass: ${JSON.stringify(playerNameUpdatePreview.errors)}`,
);
assert.ok(
  !playerNameUpdatePreview.errors.some(error => error.code === 'CHRONICLE_APPEND_ONLY' || error.code === 'CHRONICLE_CODE_IMMUTABLE'),
  'chronicle guards must not fire on player_state name update',
);

const playerDeleteCalls = [];
const playerDeleteApi = {
  async deleteRow(options) {
    playerDeleteCalls.push(['deleteRow', options]);
    return true;
  },
};
const playerDeleteApply = await applyTableChangePlan(playerDeleteApi, {
  action: 'deleteRow',
  table: 'player_state',
  match: { row_id: 1 },
}, { mate: { type: 'chatSheets', version: 1 }, sheet_player_state: seededPlayerStateTable });
assert.ok(
  !playerDeleteApply.errors.some(error => error.code === 'CHRONICLE_APPEND_ONLY'),
  'chronicle append-only guard must not fire on non-chronicle deleteRow',
);
assert.ok(
  playerDeleteApply.errors.some(error => error.code === 'TABLE_DELETE_FORBIDDEN'),
  'player_state deleteRow must be blocked by table mutation policy (DM7)',
);
assert.equal(playerDeleteCalls.length, 0, 'forbidden deleteRow must not call API');

const uncontactedEventPreview = previewTableChangePlan({
  action: 'updateCell',
  table: 'supernatural_events',
  match: { row_id: 1 },
  set: { handling_status: '未接触' },
}, eventsCurrentData);
assert.equal(uncontactedEventPreview.ok, true, `未接触 should map to 未处理: ${JSON.stringify(uncontactedEventPreview.errors)}`);

const duplicateEventPreview = previewTableChangePlan({
  action: 'insertRow',
  table: 'supernatural_events',
  data: createEventData({ handling_status: '\u7206\u53d1\u4e2d' }),
}, eventsCurrentData);
assert.equal(duplicateEventPreview.ok, true, `duplicate event insert should promote: ${JSON.stringify(duplicateEventPreview.errors)}`);
assert.equal(duplicateEventPreview.action, 'updateCell');
assert.equal(duplicateEventPreview.rowIndex, 1);

const eventUpdateCalls = [];
const eventUpdateApi = {
  async updateCell(options) {
    eventUpdateCalls.push(['updateCell', options]);
    return true;
  },
  async insertRow(options) {
    eventUpdateCalls.push(['insertRow', options]);
    return 2;
  },
};
const duplicateEventApply = await applyTableChangePlan(eventUpdateApi, {
  action: 'insertRow',
  table: TABLE_EVENTS,
  data: createEventData({
    death_count: 1,
    spread_trend: '\u6821\u5185\u6269\u6563',
    handling_status: '\u5904\u7406\u4e2d',
    public_summary: '\u6572\u95e8\u58f0\u5df2\u5728\u6559\u5b66\u697c\u5185\u6269\u6563\u3002',
  }),
}, eventsCurrentData);
assert.equal(duplicateEventApply.ok, true);
assert.equal(duplicateEventApply.action, 'updateCell');
assert.equal(duplicateEventApply.rowIndex, 1);
assert.equal(eventUpdateCalls.some(call => call[0] === 'insertRow'), false);
assert.ok(eventUpdateCalls.some(call =>
  call[0] === 'updateCell'
  && call[1].column === COL_HANDLING_STATUS
  && call[1].value === STATUS_CONFRONTING
));

const emptyEventsCurrentData = JSON.parse(JSON.stringify(eventsCurrentData));
emptyEventsCurrentData.sheet_supernatural_events.content = [eventsTable.content[0]];
const eventInsertCalls = [];
const eventInsertApi = {
  async insertRow(options) {
    eventInsertCalls.push(['insertRow', options]);
    return 1;
  },
};
const newEventApply = await applyTableChangePlan(eventInsertApi, {
  action: 'insertRow',
  table: 'supernatural_events',
  data: createEventData({
    event_code: '\u5546\u573a\u65e0\u5934\u5f71\u4e8b\u4ef6',
    location_name: '\u5f18\u6cd5\u5546\u573a',
    handling_status: '\u7206\u53d1\u4e2d',
    public_summary: '\u5546\u573a\u76d1\u63a7\u62cd\u5230\u5f02\u5e38\u9ed1\u5f71\u3002',
  }),
}, emptyEventsCurrentData);
assert.equal(newEventApply.ok, true);
assert.equal(newEventApply.action, 'insertRow');
assert.equal(eventInsertCalls.length, 1);
assert.equal(eventInsertCalls[0][1].data[COL_HANDLING_STATUS], STATUS_SPREADING);

const sparseEventsCurrentData = {
  mate: { type: 'chatSheets', version: 1 },
  sheet_supernatural_events: {
    uid: 'sheet_supernatural_events',
    name: TABLE_EVENTS,
    content: [['row_id']],
  },
};
let sparseEventExport = JSON.parse(JSON.stringify(sparseEventsCurrentData));
const sparseEventImports = [];
const sparseEventImportOptions = [];
const sparseEventApi = {
  async exportTableAsJson() {
    return JSON.parse(JSON.stringify(sparseEventExport));
  },
  async insertRow() {
    return 1;
  },
  async importTableAsJson(jsonString, options) {
    sparseEventExport = JSON.parse(jsonString);
    sparseEventImports.push(sparseEventExport);
    sparseEventImportOptions.push(options);
    return true;
  },
};
const sparseEventApply = await applyTableChangePlan(sparseEventApi, {
  action: 'insertRow',
  table: 'supernatural_events',
  skipChatSave: true,
  silent: true,
  data: createEventData({
    event_code: 'CodexSparseEventSmoke',
    location_name: 'Codex sparse header location',
    handling_status: STATUS_INVESTIGATING,
    public_summary: 'Sparse header event insert should import canonical header.',
  }),
}, sparseEventsCurrentData, templateFallbackData);
assert.equal(sparseEventApply.ok, true);
assert.equal(sparseEventApply.action, 'insertRow');
assert.equal(sparseEventImports.length, 1, 'insert success without visible row should fall back to importTableAsJson');
assert.equal(sparseEventImportOptions.length, 1, 'insert fallback should pass import options');
assert.equal(sparseEventImportOptions[0].skipChatSave, true);
assert.equal(sparseEventImportOptions[0].skipNotify, true);
assert.deepEqual(
  sparseEventImports[0].sheet_supernatural_events.content[0],
  eventsTable.content[0],
  'insert fallback should import the canonical supernatural_events header, not the sparse row_id-only header',
);
assert.equal(sparseEventImports[0].sheet_supernatural_events.content[1][1], 'CodexSparseEventSmoke');
assert.equal(sparseEventImports[0].sheet_supernatural_events.content[1][10], STATUS_INVESTIGATING);

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

// DM7: 行动建议固定表禁止 delete；import fallback 用例改用允许删除的灵异物品表
const deletableItemsTable = {
  uid: 'sheet_supernatural_items',
  name: '灵异物品',
  sourceData: {
    ddl: `CREATE TABLE supernatural_items (
  row_id INTEGER PRIMARY KEY,
  item_name TEXT NOT NULL,
  item_type TEXT NOT NULL,
  owner_name TEXT NOT NULL,
  location_name TEXT NOT NULL,
  quantity_status TEXT NOT NULL,
  effect_text TEXT NOT NULL,
  side_effect TEXT NOT NULL,
  usage_limit TEXT NOT NULL
);`,
  },
  content: [
    ['row_id', '物品名称', '类型', '持有人', '地点', '数量状态', '效果', '副作用', '使用限制'],
    [1, '鬼烛', '保命资源', '测试', '七中', '1支', '隔绝', '燃尽', '有限'],
    [2, '黄金', '资源', '测试', '七中', '1块', '隔绝', '无', '无'],
  ],
};
const deletableItemsData = {
  mate: { type: 'chatSheets', version: 1 },
  sheet_supernatural_items: deletableItemsTable,
};

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
  table: '灵异物品',
  match: { row_id: 1 },
}, deletableItemsData);
assert.equal(fallbackDelete.ok, true, `deletable table delete fallback: ${JSON.stringify(fallbackDelete.errors)}`);
assert.equal(deleteFallbackImports.length, 1);
assert.equal(deleteFallbackImports[0].sheet_supernatural_items.content.length, 2);

const failedButAppliedDeleteData = JSON.parse(JSON.stringify(deletableItemsData));
const failedButAppliedDeleteImports = [];
const failedButAppliedDeleteApi = {
  async deleteRow(options) {
    failedButAppliedDeleteData.sheet_supernatural_items.content.splice(options.rowIndex, 1);
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
  table: '灵异物品',
  match: { row_id: 1 },
}, deletableItemsData);
assert.equal(failedButAppliedDelete.ok, true);
assert.equal(failedButAppliedDeleteImports.length, 0);
assert.equal(failedButAppliedDeleteData.sheet_supernatural_items.content.length, deletableItemsData.sheet_supernatural_items.content.length - 1);
assert.equal(failedButAppliedDeleteData.sheet_supernatural_items.content.some(row => Array.isArray(row) && row[0] === 1), false);

const failedButMutatedInputDeleteData = JSON.parse(JSON.stringify(deletableItemsData));
const failedButMutatedInputDeleteImports = [];
const failedButMutatedInputDeleteApi = {
  async deleteRow(options) {
    failedButMutatedInputDeleteData.sheet_supernatural_items.content.splice(options.rowIndex, 1);
    return false;
  },
  async exportTableAsJson() {
    return JSON.stringify(failedButMutatedInputDeleteData);
  },
  async importTableAsJson(jsonString) {
    failedButMutatedInputDeleteImports.push(JSON.parse(jsonString));
    return true;
  },
};
const failedButMutatedInputDelete = await applyTableChangePlan(failedButMutatedInputDeleteApi, {
  action: 'deleteRow',
  table: '灵异物品',
  match: { row_id: 1 },
}, failedButMutatedInputDeleteData);
assert.equal(failedButMutatedInputDelete.ok, true);
assert.equal(failedButMutatedInputDeleteImports.length, 0);
assert.equal(
  failedButMutatedInputDeleteData.sheet_supernatural_items.content.length,
  deletableItemsData.sheet_supernatural_items.content.length - 1,
);
assert.equal(failedButMutatedInputDeleteData.sheet_supernatural_items.content.some(row => Array.isArray(row) && row[0] === 1), false);

const beforeDeleteCalls = calls.length;
const blockedDelete = await applyTableChangePlan(api, {
  action: 'deleteRow',
  table: TABLE_ACTION,
  match: { death_risk_level: RISK_LOW },
}, currentData);
assertError(blockedDelete, 'TABLE_DELETE_FORBIDDEN');
assert.equal(calls.length, beforeDeleteCalls);

console.log('verify-table-change-adapter: passed');
