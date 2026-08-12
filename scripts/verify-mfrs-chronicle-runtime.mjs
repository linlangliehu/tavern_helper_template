/* eslint-disable import-x/no-nodejs-modules */
/**
 * verify-mfrs-chronicle-runtime.mjs —— 事件纪要 chronicle 运行态加固门禁
 *
 * 守护三项跨层契约修复：
 *  - B1: vendor validateChronicleTextInMutationStatements_ACU 长度下限对齐业务 DDL（>=20, <=600）
 *  - B2: vendor direct SQL 路径补占位符照抄检测（isChroniclePlaceholderText_ACU）
 *  - B3: SyncBridge _appendMissingSheetsFromFallback 空壳不覆盖 fallback 既有合法行
 *
 * 复用 verify-sql-debug-regressions.mjs 的 vendor 函数切片 + vm 加载模式。
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, '..');
const vendorPath = join(repoRoot, 'vendor', 'shujuku-sp-fork', 'index.js');
const templatePath = join(
  repoRoot,
  'src',
  '神秘复苏模拟器',
  '数据库',
  '神秘复苏表格SQL_v1.json',
);
const vendorSource = readFileSync(vendorPath, 'utf8');

// ─────────────────────── 工具：花括号配对（照抄 verify-sql-debug-regressions.mjs） ───────────────────────
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
      if (escaped) {
        escaped = false;
      } else if (ch === '\\') {
        escaped = true;
      } else if (ch === quote) {
        quote = null;
      }
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
    if (ch === '{') {
      depth += 1;
      continue;
    }
    if (ch === '}') {
      depth -= 1;
      if (depth === 0) return i;
    }
  }
  throw new Error(`Could not find matching brace at ${openBraceIndex}`);
}

function extractFunction(name) {
  const asyncStart = vendorSource.indexOf(`async function ${name}`);
  const normalStart = vendorSource.indexOf(`function ${name}`);
  const start = asyncStart !== -1 && (normalStart === -1 || asyncStart < normalStart)
    ? asyncStart
    : normalStart;
  assert.notEqual(start, -1, `missing function ${name}`);
  const signatureEnd = vendorSource.indexOf(')', start);
  const openBrace = vendorSource.indexOf('{', signatureEnd);
  const closeBrace = findMatchingBrace(vendorSource, openBrace);
  return vendorSource.slice(start, closeBrace + 1);
}

// ─────────────────────── B1/B2: 加载 vendor chronicle 校验函数 ───────────────────────
const debugMessages = [];
const warningMessages = [];
const ctx = {
  console,
  logDebug_ACU(...args) { debugMessages.push(args.map(a => String(a)).join(' ')); },
  logWarn_ACU(...args) { warningMessages.push(args.map(a => String(a)).join(' ')); },
  logError_ACU() {},
};
vm.createContext(ctx);

const chronicleRuntimeCode = [
  extractFunction('isQuotedString'),
  extractFunction('unquoteSqlStringLiteral_ACU'),
  extractFunction('isChroniclePlaceholderText_ACU'),
  extractFunction('splitColumnList'),
  extractFunction('splitInsertValueGroups'),
  extractFunction('splitValueList'),
  extractFunction('validateChronicleTextInMutationStatements_ACU'),
  `
    globalThis.__chronicle = {
      isChroniclePlaceholderText_ACU,
      validateChronicleTextInMutationStatements_ACU,
    };
  `,
].join('\n\n');
vm.runInContext(chronicleRuntimeCode, ctx, { filename: 'chronicle-runtime-vendor.vm.js' });
const chronicle = ctx.__chronicle;

function buildChronicleInsertSql(text) {
  // 业务 DDL：6 列 row_id, code_index, time_span, related_event, summary, chronicle_text
  const safe = String(text).replace(/'/g, "''");
  return `INSERT INTO chronicle (row_id, code_index, time_span, related_event, summary, chronicle_text) VALUES (1, 'SP0001', '2004-07-01 08:00 ~ 08:30', '七中敲门事件', '开局纪要', '${safe}');`;
}

function expectThrow(statements, regex, label) {
  assert.throws(
    () => chronicle.validateChronicleTextInMutationStatements_ACU(statements),
    regex,
    label,
  );
}
function expectPass(statements, label) {
  assert.doesNotThrow(
    () => chronicle.validateChronicleTextInMutationStatements_ACU(statements),
    label,
  );
}

// B1: 长度边界 —— 下限对齐业务 DDL（>=20），200 降为质量建议不拦截
{
  const nineteen = '纪'.repeat(19); // 19 字 < 20 → 拒绝
  expectThrow([buildChronicleInsertSql(nineteen)], /长度无效/, 'B1: 19 字纪要应被拒（< 20 下限）');

  const twenty = '纪'.repeat(20); // 20 字 → 通过（对齐 DDL）
  expectPass([buildChronicleInsertSql(twenty)], 'B1: 20 字纪要应通过（对齐业务 DDL 下限 20）');

  const sixHundred = '纪'.repeat(600); // 600 字 → 通过
  expectPass([buildChronicleInsertSql(sixHundred)], 'B1: 600 字纪要应通过（上限）');

  const sixOhOne = '纪'.repeat(601); // 601 字 → 拒绝
  expectThrow([buildChronicleInsertSql(sixOhOne)], /长度无效/, 'B1: 601 字纪要应被拒（> 600 上限）');

  // 历史硬下限 200 不再拦截 20-199 字（关键回归：跨层契约漂移修复）
  const oneHundred = '纪'.repeat(100);
  expectPass([buildChronicleInsertSql(oneHundred)], 'B1: 100 字纪要应通过（旧 200 硬下限已降级为质量建议）');
}

// B2: 占位符照抄检测（direct SQL 路径纵深，与 adapter PLACEHOLDER_TEXT 同特征）
{
  // 整串占位符：约 40 字，恰好绕过 LENGTH >= 20，但内容是"写给 AI 的指令"
  const placeholderFull = '<请写20到600字、推荐200到400字的客观纪要；不足20字禁止输出SQL；不能填SP编号>';
  expectThrow(
    [buildChronicleInsertSql(placeholderFull)],
    /照抄占位符指令/,
    'B2: 整串占位符应被占位符检测拒绝（绕过长度但命中特征）',
  );

  // 局部占位符：合法叙事中夹"禁止输出SQL"
  const partialPlaceholder = '本轮玩家在教室观察异常，请写客观纪要，禁止输出SQL，不能填SP编号。'.repeat(1);
  expectThrow(
    [buildChronicleInsertSql(partialPlaceholder)],
    /照抄占位符指令/,
    'B2: 局部含占位符特征应被拒绝',
  );

  // 合法长文不误伤（200-400 字客观叙事，无占位符特征）
  const legalChronicle = '本轮纪要以第三方视角记录玩家在场能够确认的行动、环境变化和线索取得过程，不补写隐藏真相或未出场的规律。'.repeat(4);
  expectPass(
    [buildChronicleInsertSql(legalChronicle)],
    'B2: 合法客观纪要长文不应被占位符检测误伤',
  );

  // SP0001 编号照抄仍走 LENGTH_VIOLATION 分支（6 字 < 20，hint 含"疑似把纪要编号"）
  expectThrow(
    [buildChronicleInsertSql('SP0001')],
    /长度无效.*疑似把纪要编号写进了 chronicle_text/,
    'B2: SP0001 编号照抄应走 LENGTH_VIOLATION 分支',
  );
}

// B2 防漂移：vendor 占位符正则与 table-change-adapter.ts 的 7 条必须一致
{
  const adapterSource = readFileSync(
    join(repoRoot, 'src', '神秘复苏模拟器', '脚本', '数据库前端', 'table-change-adapter.ts'),
    'utf8',
  );
  // 校验占位符特征字面量在两处都存在（防 vendor/adapter 正则漂移）。
  // 不用完整正则字面量匹配（转义差异易误伤），改用关键特征子串。
  const placeholderFeatures = [
    '请写',
    '到',
    '字',
    '推荐',
    '禁止输出',
    'SQL',
    '不能填',
    'SP',
    '不足',
    '客观纪要',
  ];
  for (const feat of placeholderFeatures) {
    assert.ok(vendorSource.includes(feat), `B2 防漂移: vendor 占位符正则应含特征 "${feat}"`);
    assert.ok(adapterSource.includes(feat), `B2 防漂移: adapter 占位符正则应含特征 "${feat}"`);
  }
  // 两条锚点正则字面量（vendor 与 adapter 应各出现一次该函数）
  assert.ok(
    vendorSource.includes('isChroniclePlaceholderText_ACU'),
    'B2: vendor 应暴露 isChroniclePlaceholderText_ACU 函数',
  );
  assert.ok(
    adapterSource.includes('isChroniclePlaceholderText'),
    'B2: adapter 应保留 isChroniclePlaceholderText 函数',
  );
}

// ─────────────────────── B3: SyncBridge 空壳不覆盖 fallback 既有合法行 ───────────────────────
// 用 mock engine 构造 SQLite 空表（chronicle 只有表头无数据行），
// fallback 里有 chronicle 合法行 → 导出结果应用 fallback 行而非空壳。
{
  const chronicleDdl = JSON.parse(readFileSync(templatePath, 'utf8')).sheet_chronicle.sourceData.ddl;
  const chronicleHeader = ['row_id', '纪要编号', '时间跨度', '关联事件', '概览', '纪要'];
  const fallbackChronicleRow = [
    1, 'SP0001', '2004-07-01 08:00 ~ 08:30', '七中敲门事件', '开局纪要',
    '开局纪要正文应足够长以通过校验。'.repeat(6),
  ];

  // mock engine：getTableNames 返回 ['chronicle']，query(SELECT * FROM chronicle) 返回空 values
  // getAllTableNames 让 _loadAllMeta 不误判无 meta 表；query(SELECT * FROM _acu_sheet_meta) 返回元数据行
  const metaRow = ['sheet_chronicle', 'sheet_chronicle', '事件纪要', 0, JSON.stringify({ ddl: chronicleDdl }), '{}', '{}'];
  const mockEngineEmpty = {
    isReady: true,
    getTableNames() { return ['chronicle']; },
    getAllTableNames() { return ['chronicle']; },
    getTableDDL() { return chronicleDdl; },
    query(sql) {
      const s = String(sql).trim();
      if (/^SELECT \* FROM chronicle/.test(s)) {
        return { columns: chronicleHeader, values: [] }; // 空表：只有列名，0 数据行
      }
      if (/^SELECT \* FROM _acu_sheet_meta/.test(s)) {
        return {
          columns: ['sheet_key', 'uid', 'name', 'order_no', 'source_data_json', 'update_config_json', 'export_config_json'],
          values: [metaRow],
        };
      }
      return { columns: [], values: [] };
    },
  };

  // 加载 SyncBridge 类 + 其依赖（buildColumnNameMap / resultToContent / isSubstantiveSheetSnapshot_MFRS）
  const syncCtx = {
    console,
    logDebug_ACU() {},
    logWarn_ACU() {},
    logError_ACU() {},
  };
  vm.createContext(syncCtx);
  const syncDeps = [
    extractFunction('isSubstantiveSheetSnapshot_MFRS'),
    extractFunction('parseDDLColumnNames'),
    extractFunction('parseDDLColumnComments'),
    extractFunction('buildColumnNameMap'),
    extractFunction('resultToContent'),
    'class SyncBridge {}', // 占位，下面整段替换
  ].join('\n\n');

  // 直接抽取 SyncBridge 整个 class（用花括号配对定位 class 体）
  const classStart = vendorSource.indexOf('class SyncBridge');
  assert.notEqual(classStart, -1, 'SyncBridge class not found');
  const classOpenBrace = vendorSource.indexOf('{', classStart);
  const classCloseBrace = findMatchingBrace(vendorSource, classOpenBrace);
  const syncBridgeClass = vendorSource.slice(classStart, classCloseBrace + 1);

  const fullSyncCode = [
    extractFunction('isSubstantiveSheetSnapshot_MFRS'),
    extractFunction('parseDDLTableName'),
    extractFunction('parseDDLColumnNames'),
    extractFunction('parseDDLColumnComments'),
    extractFunction('buildColumnNameMap'),
    extractFunction('resultToContent'),
    extractFunction('valueToString'),
    extractFunction('safeJsonParse'),
    syncBridgeClass,
    'globalThis.__SyncBridge = SyncBridge;',
  ].join('\n\n');
  vm.runInContext(fullSyncCode, syncCtx, { filename: 'syncbridge-vendor.vm.js' });
  const SyncBridge = syncCtx.__SyncBridge;

  const fallbackData = {
    mate: { type: 'acu', version: 1 },
    sheet_chronicle: {
      uid: 'sheet_chronicle',
      name: '事件纪要',
      sourceData: { ddl: chronicleDdl },
      content: [chronicleHeader, fallbackChronicleRow],
    },
  };

  // 空壳场景：SQLite chronicle 空表 → 应被 fallback 的合法行顶替
  const bridgeEmpty = new SyncBridge(mockEngineEmpty);
  const exportedEmpty = bridgeEmpty.exportToTableData(fallbackData.mate, fallbackData);
  const resultSheet = exportedEmpty.sheet_chronicle;
  assert.ok(Array.isArray(resultSheet?.content), 'B3: 导出结果应包含 chronicle sheet');
  assert.equal(
    resultSheet.content.length,
    fallbackData.sheet_chronicle.content.length,
    `B3: SQLite 空表时应被 fallback 合法行顶替，实际 content.length=${resultSheet.content.length}（期望 fallback 的 ${fallbackData.sheet_chronicle.content.length}）`,
  );
  // 用 code_index 判定数据来源：空壳应被 fallback 顶替（SP0001）
  assert.equal(
    resultSheet.content[1][1],
    'SP0001',
    'B3: 空壳顶替后第一数据行 code_index 应来自 fallback（SP0001）',
  );

  // 正常场景：SQLite chronicle 有数据行 → 不被 fallback 覆盖
  const sqliteRow = [2, 'SP0099', '2004-07-01 09:00 ~ 09:30', '其他事件', '其他纪要', '其他纪要正文。'.repeat(6)];
  const mockEngineWithData = {
    isReady: true,
    getTableNames() { return ['chronicle']; },
    getAllTableNames() { return ['chronicle']; },
    getTableDDL() { return chronicleDdl; },
    query(sql) {
      const s = String(sql).trim();
      if (/^SELECT \* FROM chronicle/.test(s)) {
        return { columns: chronicleHeader, values: [sqliteRow] };
      }
      if (/^SELECT \* FROM _acu_sheet_meta/.test(s)) {
        return {
          columns: ['sheet_key', 'uid', 'name', 'order_no', 'source_data_json', 'update_config_json', 'export_config_json'],
          values: [metaRow],
        };
      }
      return { columns: [], values: [] };
    },
  };
  const bridgeWithData = new SyncBridge(mockEngineWithData);
  const exportedWithData = bridgeWithData.exportToTableData(fallbackData.mate, fallbackData);
  assert.equal(
    exportedWithData.sheet_chronicle.content.length,
    2,
    'B3: SQLite 有数据行时导出应含表头 + 1 数据行',
  );
  // code_index 是 UNIQUE 稳定标识，用它判定数据来源（SQLite 行=SP0099，fallback 行=SP0001）
  assert.equal(
    exportedWithData.sheet_chronicle.content[1][1],
    'SP0099',
    'B3: SQLite 有数据行时 code_index 应来自 SQLite（SP0099），不被 fallback（SP0001）覆盖',
  );
}

console.log('verify-mfrs-chronicle-runtime: passed');
