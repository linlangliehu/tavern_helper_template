import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

let DatabaseSync;
try {
  ({ DatabaseSync } = await import('node:sqlite'));
} catch (error) {
  throw new Error(`node:sqlite is required for this regression gate: ${error?.message || error}`);
}

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, '..');
const vendorPath = join(repoRoot, 'vendor', 'shujuku-sp-fork', 'index.js');
const srcRoot = join(repoRoot, 'src');
const vendorSource = readFileSync(vendorPath, 'utf8');

const dashboardSentinels = {
  apiGatewayIssue: 'apiGatewayIssue',
  sqlOldTableIssue: 'sqlOldTableIssue',
  sqlSchemaIssue: 'sqlSchemaIssue',
  sqlSyntaxIssue: 'sqlSyntaxIssue',
  sqlConstraintIssue: 'sqlConstraintIssue',
  sqlIssue: 'sqlIssue',
  concurrentApiFallback: 'concurrentApiFallback',
  apiIssue: 'apiIssue',
  outputFormatIssue: 'outputFormatIssue',
  commandParseIssue: 'commandParseIssue',
  saveIssue: 'saveIssue',
  genericError: 'genericError',
  genericWarning: 'genericWarning',
};

function findFiles(root, predicate) {
  const results = [];
  for (const entry of readdirSync(root)) {
    const fullPath = join(root, entry);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      results.push(...findFiles(fullPath, predicate));
    } else if (predicate(fullPath)) {
      results.push(fullPath);
    }
  }
  return results;
}

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
  const openBrace = vendorSource.indexOf('{', start);
  const closeBrace = findMatchingBrace(vendorSource, openBrace);
  return vendorSource.slice(start, closeBrace + 1);
}

function extractRegion(startMarker, endMarker) {
  const start = vendorSource.indexOf(startMarker);
  assert.notEqual(start, -1, `missing start marker ${startMarker}`);
  const rawEnd = vendorSource.indexOf(endMarker, start);
  assert.notEqual(rawEnd, -1, `missing end marker ${endMarker}`);
  const end = vendorSource.lastIndexOf('\n', rawEnd);
  return vendorSource.slice(start, end);
}

function loadVendorRuntime() {
  const context = {
    console,
    logDebug_ACU() {},
    logWarn_ACU() {},
    logError_ACU() {},
    dashboardCopy: { logs: dashboardSentinels },
  };
  vm.createContext(context);

  const runtimeCode = [
    extractRegion('function extractSqlStatementsFromTableEdit_ACU', 'function isSqlContent'),
    extractRegion('const FULLWIDTH_TO_ASCII', '    /**\n     * shared/ddl-utils.ts'),
    extractFunction('parseDDLTableName'),
    extractFunction('parseDDLColumnNames'),
    extractFunction('splitColumnDefinitions'),
    extractRegion('function splitSqlStatements', '    /**\n     * service/table/table-storage-strategy.ts'),
    extractFunction('parseNonStreamResponse_ACU'),
    extractFunction('interpretLogEntry'),
    `
      globalThis.__regression = {
        extractSqlStatementsFromTableEdit_ACU,
        filterSqlEditStatements_ACU,
        splitSqlStatements,
        normalizeStatementValues,
        normalizeRiskLevelValue_ACU,
        parseDDLTableName,
        parseDDLColumnNames,
        extractTableNamesFromStatements,
        extractUnknownSqlColumnsFromStatements_ACU,
        parseNonStreamResponse_ACU,
        interpretLogEntry,
      };
    `,
  ].join('\n\n');

  vm.runInContext(runtimeCode, context, { filename: 'sql-debug-regression-vendor.vm.js' });
  return context.__regression;
}

const vendor = loadVendorRuntime();

function parseTemplate(filePath) {
  return JSON.parse(readFileSync(filePath, 'utf8'));
}

function getSheetEntries(template) {
  return Object.entries(template).filter(([key]) => key.startsWith('sheet_'));
}

function validateTemplate(filePath) {
  const template = parseTemplate(filePath);
  const sheetEntries = getSheetEntries(template);
  assert.equal(sheetEntries.length, 14, `${relative(repoRoot, filePath)} should contain 14 sheets`);
  assert.ok(template.sheet_action_suggestions, 'missing sheet_action_suggestions');
  assert.ok(template.sheet_chronicle, 'missing sheet_chronicle');
  assert.ok(template.sheet_player_state, 'missing sheet_player_state');

  const seenSqlTables = new Set();
  for (const [sheetKey, sheet] of sheetEntries) {
    const ddl = sheet?.sourceData?.ddl;
    const header = sheet?.content?.[0];
    assert.equal(typeof ddl, 'string', `${sheetKey} has no DDL`);
    assert.ok(Array.isArray(header), `${sheetKey} has no header row`);

    const tableName = vendor.parseDDLTableName(ddl);
    assert.ok(tableName, `${sheetKey} has no SQL table name`);
    assert.ok(!seenSqlTables.has(tableName), `duplicate SQL table ${tableName}`);
    seenSqlTables.add(tableName);

    const columns = vendor.parseDDLColumnNames(ddl).filter(column => column !== 'row_id');
    const comparableHeader = header[0] === 'row_id' ? header.slice(1) : header;
    assert.equal(columns.length, comparableHeader.length, `${sheetKey} DDL/header column count mismatch`);
  }

  const actionText = [
    template.sheet_action_suggestions.sourceData.note,
    template.sheet_action_suggestions.sourceData.updateNode,
    template.sheet_action_suggestions.sourceData.ddl,
  ].join('\n');
  for (const token of ['无', '低', '中', '高', '致命', '未知', '极低', '极高', '严重']) {
    assert.ok(actionText.includes(token), `action_suggestions prompt should mention ${token}`);
  }

  const chronicleText = [
    template.sheet_chronicle.sourceData.note,
    template.sheet_chronicle.sourceData.insertNode,
    template.sheet_chronicle.sourceData.updateNode,
  ].join('\n');
  assert.ok(/chronicle/.test(chronicleText), 'chronicle prompt should name the current SQL table');
  assert.ok(/log_summary/.test(chronicleText), 'chronicle prompt should forbid legacy log_summary table');
  assert.ok(/200-600|200到600/.test(chronicleText), 'chronicle prompt should keep the 200-600 char constraint visible');
  assert.ok(/不足\s*200\s*字.*禁止输出\s*SQL/.test(chronicleText), 'chronicle prompt should forbid short chronicle_text SQL output');

  const controlledGhostsText = [
    template.sheet_controlled_ghosts.sourceData.note,
    template.sheet_controlled_ghosts.sourceData.updateNode,
    template.sheet_controlled_ghosts.sourceData.insertNode,
  ].join('\n');
  assert.ok(/WHERE\s*前.*尾逗号|尾逗号.*WHERE/.test(controlledGhostsText), 'controlled_ghosts prompt should forbid trailing comma before WHERE');
  return template;
}

function testTemplates() {
  const templatePaths = findFiles(srcRoot, filePath => filePath.endsWith('SQL_v1.json'));
  assert.equal(templatePaths.length, 2, 'expected exactly two 神秘复苏 SQL templates');
  return templatePaths.map(validateTemplate);
}

function testRiskNormalizationInSqlite(template) {
  const ddl = template.sheet_action_suggestions.sourceData.ddl;
  const rawSql = `
    INSERT OR REPLACE INTO action_suggestions
      (row_id, option_key, idea_text, main_risk, expected_gain, death_risk_level, revival_risk_level)
    VALUES
      (1, 'A', '观察', '风险一', '收益一', '极低', '极高'),
      (2, 'B', '撤离', '风险二', '收益二', '严重', ''),
      (3, 'C', '求援', '风险三', '收益三', '无法判断', '低风险'),
      (4, 'D', '等待', '风险四', '收益四', '无', '很高');
  `;
  const normalizedSql = vendor.normalizeStatementValues(rawSql.trim());
  assert.match(normalizedSql, /'低'/, '极低 should normalize to 低');
  assert.match(normalizedSql, /'致命'/, '极高/严重 should normalize to 致命');
  assert.match(normalizedSql, /'未知'/, 'empty/unknown risk should normalize to 未知');
  assert.doesNotMatch(normalizedSql, /极低|极高|严重|无法判断|''/, 'normalized SQL should not keep invalid risk values');

  const db = new DatabaseSync(':memory:');
  try {
    db.exec(ddl);
    db.exec(normalizedSql);
    const rows = db
      .prepare('SELECT row_id, death_risk_level, revival_risk_level FROM action_suggestions ORDER BY row_id')
      .all()
      .map(row => ({ ...row }));
    assert.deepEqual(rows, [
      { row_id: 1, death_risk_level: '低', revival_risk_level: '致命' },
      { row_id: 2, death_risk_level: '致命', revival_risk_level: '未知' },
      { row_id: 3, death_risk_level: '未知', revival_risk_level: '低' },
      { row_id: 4, death_risk_level: '无', revival_risk_level: '致命' },
    ]);
  } finally {
    db.close();
  }
}

function testUpdateTrailingCommaNormalization(template) {
  const ddl = template.sheet_controlled_ghosts.sourceData.ddl;
  const seedSql = `
    INSERT INTO controlled_ghosts
      (row_id, ghost_code, terror_level, puzzle_trait, killing_law, usable_power, cost_text, revival_progress, dead_state, suppression_relation, public_summary)
    VALUES
      (1, '鬼档案', '未知', '档案媒介', '接触档案媒介', '记录异常', '轻微鼻血', '初期', '否', '无', '鬼档案初步觉醒');
  `;
  const rawSql = `
    UPDATE controlled_ghosts
    SET cost_text = '左臂皮肤纸质化，总复苏风险增加',
    WHERE ghost_code = '鬼档案';
  `;
  const normalizedSql = vendor.normalizeStatementValues(rawSql.trim());
  assert.doesNotMatch(normalizedSql, /,\s*WHERE/i, 'UPDATE normalization should remove trailing comma before WHERE');
  assert.match(normalizedSql, /SET cost_text = '左臂皮肤纸质化，总复苏风险增加'\s+WHERE/i);

  const db = new DatabaseSync(':memory:');
  try {
    db.exec(ddl);
    db.exec(seedSql);
    db.exec(normalizedSql);
    const row = db
      .prepare("SELECT cost_text FROM controlled_ghosts WHERE ghost_code = '鬼档案'")
      .get();
    assert.equal(row.cost_text, '左臂皮肤纸质化，总复苏风险增加');
  } finally {
    db.close();
  }
}

function buildTableMeta(template) {
  const tableMeta = new Map();
  for (const [, sheet] of getSheetEntries(template)) {
    const ddl = sheet?.sourceData?.ddl;
    const tableName = vendor.parseDDLTableName(ddl);
    if (tableName) {
      tableMeta.set(tableName, new Set(vendor.parseDDLColumnNames(ddl)));
    }
  }
  return tableMeta;
}

function testTableAndColumnPreflight(template) {
  const tableMeta = buildTableMeta(template);
  for (const tableName of ['log_summary', 'simulation_summary', 'summary_logs']) {
    const oldTableSql = `INSERT INTO ${tableName} (row_id, summary) VALUES (1, '旧表');`;
    assert.deepEqual(Array.from(vendor.extractTableNamesFromStatements([oldTableSql])), [tableName]);
    assert.ok(!tableMeta.has(tableName), `${tableName} must not be a current template table`);
  }

  const badColumnSql = `INSERT INTO chronicle (row_id, bad_column) VALUES (1, 'x');`;
  assert.deepEqual(
    Array.from(vendor.extractUnknownSqlColumnsFromStatements_ACU([badColumnSql], tableMeta)),
    ['chronicle.bad_column'],
  );
}

function testSqlFragmentCleaning() {
  const fixtures = [
    `</thought>\n\nINSERT INTO chronicle (row_id, code_index) VALUES (1, 'SP0001');`,
    `INSERT INTO chronicle (row_id, code_index) VALUES (1, 'SP0001');\n这样符合“依据正文执行编辑”的要求。</thought>\n\nINSERT INTO chronicle (row_id, code_index) VALUES (2, 'SP0002');`,
    "```sql\nINSERT OR REPLACE INTO action_suggestions (row_id, option_key, idea_text, main_risk, expected_gain, death_risk_level, revival_risk_level) VALUES (1, 'A', '观察', '风险', '收益', '极低', '极高');\n```",
    `INSERT INTO chronicle (row_id, code_index, time_span, related_event, summary, chronicle_text) VALUES
((SELECT COALESCE(MAX(row_id), 0) + 1 FROM chronicle),
 (SELECT printf('SP%04d', COALESCE(MAX(CAST(substr(code_index, 3) AS INTEGER)), 0) + 1) FROM chronicle),
INSERT OR REPLACE INTO check_suggestions (row_id, check_name, check_type, target_value, modifier, difficulty, result_note) VALUES (1, '观察档案', '线索', '鬼档案', 0, '中', '保留合法后续语句');`,
  ];

  for (const fixture of fixtures) {
    const cleaned = vendor.extractSqlStatementsFromTableEdit_ACU(fixture);
    assert.ok(cleaned.trim(), 'cleaned SQL should not be empty');
    assert.doesNotMatch(cleaned, /<\/?thought|<\/?content|```|这样符合/, 'wrapper fragments should be removed');
    const statements = vendor.filterSqlEditStatements_ACU(vendor.splitSqlStatements(cleaned));
    assert.ok(statements.length >= 1, 'should keep at least one SQL statement');
    for (const stmt of statements) {
      assert.match(stmt, /^(?:INSERT|UPDATE|DELETE|REPLACE|WITH|CREATE TEMP|DROP TABLE)/i);
    }
  }

  const truncated = fixtures[3];
  const cleaned = vendor.extractSqlStatementsFromTableEdit_ACU(truncated);
  assert.doesNotMatch(cleaned, /INSERT INTO chronicle[\s\S]*INSERT OR REPLACE INTO check_suggestions/i);
  assert.match(cleaned, /^INSERT OR REPLACE INTO check_suggestions/m);

  const directStatements = Array.from(vendor.filterSqlEditStatements_ACU(vendor.splitSqlStatements(truncated)));
  assert.deepEqual(directStatements, [
    "INSERT OR REPLACE INTO check_suggestions (row_id, check_name, check_type, target_value, modifier, difficulty, result_note) VALUES (1, '观察档案', '线索', '鬼档案', 0, '中', '保留合法后续语句')",
  ]);

  const incompleteFinalInsert = 'INSERT OR REPLACE INTO check_suggestions (row_id, display_text, check_type, check_basis, dice_command) VALUES';
  const incompleteFinalInsertWithSemicolon = `${incompleteFinalInsert};`;
  const incompleteFinalInsertWithComment = `${incompleteFinalInsert} -- AI output stopped here`;
  for (const sql of [incompleteFinalInsert, incompleteFinalInsertWithSemicolon, incompleteFinalInsertWithComment]) {
    assert.equal(vendor.extractSqlStatementsFromTableEdit_ACU(sql), '');
    assert.deepEqual(Array.from(vendor.filterSqlEditStatements_ACU(vendor.splitSqlStatements(sql))), []);
  }

  const validFinalInsert = "INSERT OR REPLACE INTO check_suggestions (row_id, display_text, check_type, check_basis, dice_command) VALUES (1, '观察档案', '线索', '鬼档案', '/r 1d20');";
  assert.deepEqual(Array.from(vendor.filterSqlEditStatements_ACU(vendor.splitSqlStatements(validFinalInsert))), [
    "INSERT OR REPLACE INTO check_suggestions (row_id, display_text, check_type, check_basis, dice_command) VALUES (1, '观察档案', '线索', '鬼档案', '/r 1d20')",
  ]);
}

async function testBadGatewayParsing() {
  await assert.rejects(
    () => vendor.parseNonStreamResponse_ACU({
      json: async () => ({ error: { message: 'Bad Gateway' } }),
    }),
    /API上游网关错误: Bad Gateway/,
  );
}

function testDashboardClassification() {
  const cases = [
    ['Bad Gateway', 'apiGatewayIssue'],
    ['[SqlTableService] SQL 目标表 log_summary 不存在；事件纪要请写入 chronicle。', 'sqlOldTableIssue'],
    ['[SqlTableService] SQL 目标表 simulation_summary, summary_logs 不存在；事件纪要请写入 chronicle。', 'sqlOldTableIssue'],
    ['[SQL Mode] SQL 执行失败: near "<": syntax error', 'sqlSyntaxIssue'],
    ['CHECK constraint failed: action_suggestions.revival_risk_level', 'sqlConstraintIssue'],
    ['SQL 目标列不在当前模板中: chronicle.bad_column', 'sqlSchemaIssue'],
  ];
  for (const [message, expected] of cases) {
    assert.equal(vendor.interpretLogEntry({ level: 'error', message }), expected, message);
  }
}

const templates = testTemplates();
testRiskNormalizationInSqlite(templates[0]);
testUpdateTrailingCommaNormalization(templates[0]);
testTableAndColumnPreflight(templates[0]);
testSqlFragmentCleaning();
await testBadGatewayParsing();
testDashboardClassification();

console.log('[ok] SQL Debug regressions verified: templates=2, sheets=14, risk/update normalization, old table preflight, SQL cleaning, Bad Gateway, dashboard classification');
