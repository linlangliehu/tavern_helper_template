import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, '..');
const vendorPath = join(repoRoot, 'vendor', 'shujuku-sp-fork', 'index.js');
const source = readFileSync(vendorPath, 'utf8');

function sliceBetween(startNeedle, endNeedle) {
  const start = source.indexOf(startNeedle);
  const end = source.indexOf(endNeedle, start);
  assert.notEqual(start, -1, `Missing start marker: ${startNeedle}`);
  assert.notEqual(end, -1, `Missing end marker: ${endNeedle}`);
  return source.slice(start, end);
}

const syncBridgeSource = sliceBetween(
  '/** 同步桥的元数据表名',
  '/** 安全的 JSON 解析',
);

assert.match(syncBridgeSource, /getAllTableNames/);
assert.match(syncBridgeSource, /includes\(META_TABLE_NAME\)/);

const context = {
  logDebug_ACU() {},
  logWarn_ACU() {},
  logError_ACU() {},
  safeJsonParse(value) {
    try {
      return JSON.parse(String(value));
    } catch {
      return {};
    }
  },
};

vm.createContext(context);
vm.runInContext(
  `${syncBridgeSource}
globalThis.__SyncBridge = SyncBridge;`,
  context,
  { filename: vendorPath },
);

const { __SyncBridge: SyncBridge } = context;

const missingMetaQueries = [];
const missingMetaEngine = {
  isReady: true,
  getAllTableNames() {
    return ['action_suggestions'];
  },
  query(sql) {
    missingMetaQueries.push(sql);
    if (sql.includes('_acu_sheet_meta')) {
      throw new Error('no such table: _acu_sheet_meta');
    }
    return { columns: [], values: [] };
  },
};

const missingMetaBridge = new SyncBridge(missingMetaEngine);
const missingMeta = missingMetaBridge._loadAllMeta();

assert.equal(missingMeta.size, 0);
assert.deepEqual(missingMetaQueries, []);

const existingMetaQueries = [];
const existingMetaEngine = {
  isReady: true,
  getAllTableNames() {
    return ['_acu_sheet_meta', 'action_suggestions'];
  },
  query(sql) {
    existingMetaQueries.push(sql);
    return {
      columns: [
        'sheet_key',
        'uid',
        'name',
        'order_no',
        'source_data_json',
        'update_config_json',
        'export_config_json',
      ],
      values: [[
        'sheet_action_suggestions',
        'sheet_action_suggestions',
        'action_suggestions',
        1,
        '{"ddl":"CREATE TABLE action_suggestions(row_id INTEGER);"}',
        '{}',
        '{}',
      ]],
    };
  },
};

const existingMetaBridge = new SyncBridge(existingMetaEngine);
const existingMeta = existingMetaBridge._loadAllMeta();

assert.equal(existingMeta.size, 1);
assert.equal(existingMeta.get('sheet_action_suggestions').uid, 'sheet_action_suggestions');
assert.equal(existingMeta.get('sheet_action_suggestions').sourceData.ddl, 'CREATE TABLE action_suggestions(row_id INTEGER);');
assert.deepEqual(existingMetaQueries, ['SELECT * FROM _acu_sheet_meta;']);

console.log('verify-syncbridge-meta-no-error: passed');
