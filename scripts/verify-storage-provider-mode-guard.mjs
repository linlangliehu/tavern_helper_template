/* eslint-disable import-x/no-nodejs-modules */
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

const strategySource = sliceBetween(
  '/** 当前活跃的 Provider 实例 */',
  '/**\n     * service/runtime/template-vars/sql-query-var.ts',
);
const coreDataSource = sliceBetween(
  'function createCoreDataApi',
  '    /**\n     * presentation/bootstrap/api-groups/table-crud-api.ts',
);
const tableCrudSource = sliceBetween(
  'function resolveColumnForSheet',
  '    /**\n     * 用反引号包裹标识符',
);

assert.match(strategySource, /currentProvider\.mode !== mode/);
assert.match(strategySource, /SQLite Provider 未按当前设置初始化/);
assert.match(coreDataSource, /importTableAsJson: async function \(jsonString, options = \{\}\)/);
assert.match(coreDataSource, /parseMutationOptions_ACU\(isPlainObjectArg_ACU\(options\) \? options : null\)/);
assert.match(coreDataSource, /provider\.resetFromTableData\(currentJsonTableData_ACU\)/);
assert.match(coreDataSource, /if \(!skipChatSave\) \{\s*await refreshMergedDataAndNotifyWithUI_ACU\(\{ skipNotify \}\);/);
assert.match(tableCrudSource, /function buildSqliteMutationColumnGate_ACU/);
assert.match(tableCrudSource, /function resolveSqliteMutationColumn_ACU/);
assert.doesNotMatch(tableCrudSource, /INSERT INTO[\s\S]{0,120}DEFAULT VALUES/);
assert.match(
  tableCrudSource,
  /if \(isSqliteMode\(\)\) \{[\s\S]*resolveSqliteMutationColumn_ACU[\s\S]*\}\s*else if \(numericColIdentifier === null\) \{[\s\S]*headers\.includes\(chineseColName\)/,
);

const logs = [];
const context = {
  settings_ACU: { storageMode: 'native' },
  logDebug_ACU: (...args) => logs.push(['debug', ...args]),
  logWarn_ACU: (...args) => logs.push(['warn', ...args]),
  logError_ACU: (...args) => logs.push(['error', ...args]),
  NativeTableServiceAdapter: class NativeTableServiceAdapter {
    constructor() {
      this.mode = 'native';
      this.disposed = false;
      this.loaded = false;
    }

    async loadFromChat() {
      this.loaded = true;
      return { loaded: true, source: 'stub' };
    }

    getCurrentData() {
      return { ok: true };
    }

    dispose() {
      this.disposed = true;
    }
  },
  SqlTableService: class SqlTableService {
    constructor() {
      this.mode = 'sqlite';
      this._initialized = false;
      this.engine = { isReady: false };
      this.disposed = false;
      this.loadCount = 0;
    }

    async loadFromChat() {
      this._initialized = true;
      this.engine.isReady = true;
      this.loadCount += 1;
      return { loaded: false, source: 'empty' };
    }

    getCurrentData() {
      return { ok: true };
    }

    dispose() {
      this.disposed = true;
      this._initialized = false;
      this.engine.isReady = false;
    }
  },
};
context.getCurrentStorageMode = () => (context.settings_ACU?.storageMode === 'sqlite' ? 'sqlite' : 'native');

vm.createContext(context);
vm.runInContext(
  `${strategySource}
globalThis.__api = {
  getStorageProvider,
  _ensureProviderInitializedForWrite,
  getCurrentProviderMode,
};`,
  context,
  { filename: vendorPath },
);

const api = context.__api;

const nativeProvider = api.getStorageProvider();
assert.equal(nativeProvider.mode, 'native');
assert.equal(api.getCurrentProviderMode(), 'native');

context.settings_ACU.storageMode = 'sqlite';
const sqliteProvider = api.getStorageProvider();
assert.equal(sqliteProvider.mode, 'sqlite');
assert.equal(api.getCurrentProviderMode(), 'sqlite');
assert.notEqual(sqliteProvider, nativeProvider);
assert.equal(nativeProvider.disposed, true);
assert.equal(sqliteProvider._initialized, false);

await api._ensureProviderInitializedForWrite();
const readySqliteProvider = api.getStorageProvider();
assert.equal(readySqliteProvider.mode, 'sqlite');
assert.equal(readySqliteProvider._initialized, true);
assert.equal(readySqliteProvider.engine.isReady, true);
assert.equal(readySqliteProvider.loadCount, 1);

context.settings_ACU.storageMode = 'native';
const nativeProviderAgain = api.getStorageProvider();
assert.equal(nativeProviderAgain.mode, 'native');
assert.notEqual(nativeProviderAgain, readySqliteProvider);
assert.equal(readySqliteProvider.disposed, true);

assert.match(logs.flat().join('\n'), /provider=native, settings=sqlite/);
console.log('verify-storage-provider-mode-guard: passed');
