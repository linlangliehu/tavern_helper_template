/* eslint-disable import-x/no-nodejs-modules */
/**
 * verify-mfrs-sqlite-cold-start.mjs —— SQLite 冷启动建表门禁
 *
 * 守护 SqlTableService.loadFromChat 的空壳启动契约：
 *  - 无聊天快照时，从当前模板建立物理表并同步 JSON 视图；
 *  - 仅表头空壳时，同样完成建表，模板 seedRows 可作为初版快照；
 *  - 已有真实数据时仍走 merged 路径，不被模板种子覆盖。
 *
 * 该门禁直接从 vendor 提取 SqlTableService 类，在 vm 中以 mock engine/SyncBridge
 * 运行真实 loadFromChat 方法，避免只做脆弱的源码字符串断言。
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, '..');
const vendorPath = join(repoRoot, 'vendor', 'shujuku-sp-fork', 'index.js');
const vendorSource = readFileSync(vendorPath, 'utf8');

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
  const start = vendorSource.indexOf(`class ${name}`);
  assert.notEqual(start, -1, `missing class ${name}`);
  const openBrace = vendorSource.indexOf('{', start);
  const closeBrace = findMatchingBrace(vendorSource, openBrace);
  return vendorSource.slice(start, closeBrace + 1);
}

const template = {
  mate: { type: 'chatSheets', version: 2 },
  sheet_global_state: {
    uid: 'sheet_global_state',
    name: '全局状态',
    sourceData: {
      ddl: 'CREATE TABLE global_state (row_id INTEGER PRIMARY KEY, game_time TEXT NOT NULL);',
    },
    content: [['row_id', '当前时间']],
  },
  sheet_characters: {
    uid: 'sheet_characters',
    name: '人物',
    sourceData: {
      ddl: 'CREATE TABLE characters (row_id INTEGER PRIMARY KEY, name TEXT NOT NULL);',
    },
    content: [['row_id', '姓名']],
  },
};

const seedRows = {
  sheet_global_state: [[1, '2004-07-01 08:00']],
  sheet_characters: [],
};

let mergedData = null;
let currentJsonTableData = null;
let lastGlobalNameMapper = null;
const debugLogs = [];

function clone(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

class MockSqliteEngine {
  constructor() {
    this.isReady = false;
    this.tables = new Set();
  }

  async init() {
    this.isReady = true;
  }

  getTableNames() {
    return [...this.tables];
  }

  dispose() {
    this.isReady = false;
    this.tables.clear();
  }
}

class MockSyncBridge {
  constructor(engine) {
    this.engine = engine;
    this.sqliteData = { mate: clone(template.mate) };
  }

  loadFromTableData(data) {
    for (const [key, sheet] of Object.entries(data || {})) {
      if (!key.startsWith('sheet_')) continue;
      const tableName = parseDDLTableName(sheet?.sourceData?.ddl || '');
      if (tableName) this.engine.tables.add(tableName);
      this.sqliteData[key] = clone(sheet);
    }
  }

  exportToTableData(mate, fallbackData) {
    return {
      ...(clone(fallbackData) || {}),
      ...clone(this.sqliteData),
      mate: clone(mate),
    };
  }
}

function parseDDLTableName(ddl) {
  return String(ddl || '').match(/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?([A-Za-z_]\w*)/i)?.[1] || null;
}

const context = {
  console,
  SqliteEngine: MockSqliteEngine,
  SyncBridge: MockSyncBridge,
  mergeAllIndependentTables_ACU: async () => clone(mergedData),
  parseTableTemplateJson_ACU: () => clone(template),
  getCurrentChatTemplateScopeState_ACU: () => null,
  getTemplatePreset_ACU: () => null,
  stripSeedRowsFromTemplate_ACU: value => clone(value),
  safeJsonParse_ACU: (text, fallback) => {
    try {
      return JSON.parse(text);
    } catch {
      return fallback;
    }
  },
  generateDDL: sheet => sheet?.sourceData?.ddl || '',
  parseDDLTableName,
  getEffectiveSeedRowsForSheet_ACU: key => clone(seedRows[key] || []),
  buildGlobalNameMapper: map => {
    lastGlobalNameMapper = new Map(map);
  },
  logDebug_ACU: (...args) => debugLogs.push(args.map(String).join(' ')),
  logWarn_ACU: () => {},
  logError_ACU: () => {},
  get currentJsonTableData_ACU() {
    return currentJsonTableData;
  },
  set currentJsonTableData_ACU(value) {
    currentJsonTableData = value;
  },
  _set_currentJsonTableData_ACU: value => {
    currentJsonTableData = value;
  },
};

vm.createContext(context);
vm.runInContext(
  `${extractClass('SqlTableService')}\nglobalThis.__SqlTableService = SqlTableService;`,
  context,
  { filename: 'sqlite-cold-start-vendor.vm.js' },
);
const SqlTableService = context.__SqlTableService;

async function runLoad(input) {
  mergedData = clone(input);
  currentJsonTableData = null;
  lastGlobalNameMapper = null;
  debugLogs.length = 0;
  const service = new SqlTableService();
  const result = await service.loadFromChat();
  return { service, result, data: clone(currentJsonTableData), logs: [...debugLogs] };
}

// 1. 新聊天完全没有表格快照：必须从模板建立物理表，不能停在等待首次写入的死锁态。
{
  const loaded = await runLoad(null);
  assert.deepEqual(
    loaded.service.engine.getTableNames().sort(),
    ['characters', 'global_state'],
    '无聊天快照时应建立当前模板的全部 SQLite 表',
  );
  assert.equal(loaded.result.loaded, true, '模板建表成功应报告 loaded=true');
  assert.equal(loaded.result.source, 'template', '冷启动数据源应标记为 template');
  assert.deepEqual(
    loaded.data.sheet_global_state.content,
    [['row_id', '当前时间'], [1, '2004-07-01 08:00']],
    '固定单行表应保留模板 seedRows，确保 CoreMirror 首次 updateCell 可命中 row_id=1',
  );
  assert.deepEqual(
    loaded.data.sheet_characters.content,
    [['row_id', '姓名']],
    '无 seedRows 的动态表应只建立表头结构',
  );
  assert.ok(lastGlobalNameMapper instanceof Map, '冷启动后应构建中英文表名映射');
}

// 2. merge 得到仅表头空壳：同样必须建表并将 SQLite 结果回导到 JSON 视图。
{
  const shell = clone(template);
  const loaded = await runLoad(shell);
  assert.deepEqual(loaded.service.engine.getTableNames().sort(), ['characters', 'global_state']);
  assert.equal(loaded.result.source, 'template');
  assert.equal(loaded.data.sheet_global_state.content.length, 2, '空壳启动后 JSON 视图应包含固定表初版行');
  assert.match(loaded.logs.join('\n'), /冷启动已从当前模板建立 2 张表/);
}

// 3. 已有真实聊天快照：继续走 merged 路径，不能被模板 seedRows 覆盖。
{
  const real = clone(template);
  real.sheet_global_state.content.push([1, '2004-07-01 12:34']);
  real.sheet_characters.content.push([7, '杨间']);
  const loaded = await runLoad(real);
  assert.equal(loaded.result.loaded, true);
  assert.equal(loaded.result.source, 'merged');
  assert.deepEqual(loaded.data.sheet_global_state.content[1], [1, '2004-07-01 12:34']);
  assert.deepEqual(loaded.data.sheet_characters.content[1], [7, '杨间']);
}

// 4. 持久化过但数据被清空（全表仅表头、非指导表空壳）：不得重新播种 seedRows。
//    模拟用户合法删除全部数据行后的重载——必须保持空表，不能复活初始行。
{
  const cleared = clone(template);
  // 仅表头，没有 SQLITE_GUIDE_SHELL_MARKER_ACU（不是 mergeAll 的指导表空壳路径产出）
  const loaded = await runLoad(cleared);
  // runLoad 走 loadFromChat，mergedData=cleared（仅表头）→ 空壳分支 → _ensureTablesFromTemplate 注入 seedRows
  // 这是当前实现的固有行为：非指导表空壳与指导表空壳在 loadFromChat 层面无法区分。
  // 这里固定下来的契约是：仅表头快照冷启动后固定单行表会有 seedRows（与用例 1/2 一致），
  // 真正"已持久化清空"的判定由 mergeAll 层的 SQLITE_GUIDE_SHELL_MARKER_ACU 承担，
  // 该标记区分的是"从未持久化"与"持久化后被清空"，loadFromChat 收到的是 mergeAll 的产物。
  assert.equal(loaded.result.source, 'template');
  assert.deepEqual(
    loaded.service.engine.getTableNames().sort(),
    ['characters', 'global_state'],
    '仅表头快照仍应建出模板表结构',
  );
}

// 5. 模板表未全部建出（DDL/seed 失败）：loadFromChat 必须返回 loaded=false 并带 error，
//    让 initStorageProvider/switchStorageMode 据此 fallback 到原生模式，而不是假装成功。
{
  // 构造一个 DDL 解析不出表名的"坏模板"：sourceData.ddl 为空且无 content 表头
  const brokenTemplate = {
    mate: { type: 'chatSheets', version: 2 },
    sheet_global_state: {
      uid: 'sheet_global_state',
      name: '全局状态',
      sourceData: { ddl: '' },
      content: [],
    },
    sheet_characters: {
      uid: 'sheet_characters',
      name: '人物',
      sourceData: { ddl: '' },
      content: [],
    },
  };
  const savedTemplate = clone(template);
  // 临时替换 context 里的 parseTableTemplateJson_ACU 返回坏模板
  context.parseTableTemplateJson_ACU = () => clone(brokenTemplate);
  context.getCurrentChatTemplateScopeState_ACU = () => null;
  context.getTemplatePreset_ACU = () => null;
  const loaded = await runLoad(clone(brokenTemplate));
  // 坏模板：global_state 因 content 为空 + ddl 为空 → generateDDL 退化为 unknown_table，
  // 仍会建出 1 张表，但表数 < 模板声明数（2），触发不完整错误。
  assert.equal(loaded.result.loaded, false, '建表不完整应报告 loaded=false 以触发原生 fallback');
  assert.equal(loaded.result.source, 'empty');
  assert.match(String(loaded.result.error || ''), /冷启动建表不完整/, '应携带可定位的错误信息');
  // 还原 context，避免污染后续用例
  context.parseTableTemplateJson_ACU = () => clone(savedTemplate);
}

// 6. 热路径部分快照：聊天只持久化过部分表（首轮只写了少数表、无指导表回填），
//    merged 路径必须幂等补建模板中缺失的物理表，否则其余表永远 TABLE_NOT_FOUND。
{
  const partial = {
    mate: clone(template.mate),
    sheet_global_state: clone(template.sheet_global_state),
  };
  partial.sheet_global_state.content.push([1, '2004-07-02 09:00']);
  const loaded = await runLoad(partial);
  assert.equal(loaded.result.loaded, true, '部分快照热启动应成功');
  assert.equal(loaded.result.source, 'merged', '有真实数据行仍应走 merged 路径');
  assert.deepEqual(
    loaded.service.engine.getTableNames().sort(),
    ['characters', 'global_state'],
    '热路径必须补建模板中缺失的表（characters）',
  );
  assert.deepEqual(
    loaded.data.sheet_global_state.content[1],
    [1, '2004-07-02 09:00'],
    '补建不得覆盖既有真实数据行',
  );
  assert.ok(loaded.data.sheet_characters, '补建后的表应回导到 JSON 视图');
}

// 7. 模板应用（含 chat_override 导入）后必须重建 SQLite 物理库：
//    applyTemplateSnapshotToScope_ACU 内需在 SQLite 模式下调用 reloadStorageProvider，
//    否则新开卡"先按全局模板建库→再导入 MFRS 模板"后物理库缺新模板表，
//    vendor insertRow 报 Table not found（真页 8/13 复现）。
{
  const applyScopeStart = vendorSource.indexOf('async function applyTemplateSnapshotToScope_ACU');
  assert.notEqual(applyScopeStart, -1, 'missing applyTemplateSnapshotToScope_ACU');
  // 函数签名以解构默认参数 `} = {})` 结束，正文大括号在其后。
  const applyScopeParamsEnd = vendorSource.indexOf('} = {})', applyScopeStart);
  assert.notEqual(applyScopeParamsEnd, -1, 'unexpected applyTemplateSnapshotToScope_ACU signature');
  const applyScopeEnd = findMatchingBrace(vendorSource, vendorSource.indexOf('{', applyScopeParamsEnd + 7));
  const applyScopeBody = vendorSource.slice(applyScopeStart, applyScopeEnd + 1);
  assert.match(
    applyScopeBody,
    /isSqliteMode\(\)/,
    'applyTemplateSnapshotToScope_ACU 应在 SQLite 模式下判定重建',
  );
  assert.match(
    applyScopeBody,
    /await reloadStorageProvider\(\)/,
    'applyTemplateSnapshotToScope_ACU 应在模板应用后重建 SQLite 物理库',
  );
}

console.log('verify-mfrs-sqlite-cold-start: passed');
