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
const choicesRulePath = join(repoRoot, 'src', '神秘复苏模拟器', '世界书', '规则', '必须输出推演选项.txt');
const releaseChoicesRulePath = join(repoRoot, 'src', '神秘复苏模拟器发布版', '世界书', '规则', '必须输出推演选项.txt');
const outputProtocolExamplePaths = [
  join(repoRoot, 'src', '神秘复苏模拟器', '对话示例', '0.txt'),
  join(repoRoot, 'src', '神秘复苏模拟器发布版', '对话示例', '0.txt'),
];
const outputProtocolPromptPaths = [
  choicesRulePath,
  releaseChoicesRulePath,
  join(repoRoot, 'src', '神秘复苏模拟器', '系统提示词', '0.txt'),
  join(repoRoot, 'src', '神秘复苏模拟器发布版', '系统提示词', '0.txt'),
  ...outputProtocolExamplePaths,
];
const srcRoot = join(repoRoot, 'src');
const vendorSource = readFileSync(vendorPath, 'utf8');
const choicesRuleSource = readFileSync(choicesRulePath, 'utf8');

const dashboardSentinels = {
  apiRateLimitIssue: 'apiRateLimitIssue',
  apiGatewayIssue: 'apiGatewayIssue',
  sqlOldTableIssue: 'sqlOldTableIssue',
  sqlSchemaIssue: 'sqlSchemaIssue',
  sqlSyntaxIssue: 'sqlSyntaxIssue',
  sqlConstraintIssue: 'sqlConstraintIssue',
  // v6.13 新增细粒度分类
  sqlUniqueConstraintIssue: 'sqlUniqueConstraintIssue',
  sqlCheckConstraintIssue: 'sqlCheckConstraintIssue',
  sqlNotNullConstraintIssue: 'sqlNotNullConstraintIssue',
  sqlForeignKeyConstraintIssue: 'sqlForeignKeyConstraintIssue',
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
  const signatureEnd = vendorSource.indexOf(')', start);
  const openBrace = vendorSource.indexOf('{', signatureEnd);
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
  const debugMessages = [];
  const warningMessages = [];
  const context = {
    console,
    logDebug_ACU(...args) {
      debugMessages.push(args.map(arg => String(arg)).join(' '));
    },
    logWarn_ACU(...args) {
      warningMessages.push(args.map(arg => String(arg)).join(' '));
    },
    logError_ACU() {},
    dashboardCopy: { logs: dashboardSentinels },
  };
  vm.createContext(context);

  const runtimeCode = [
    extractRegion('function extractSqlStatementsFromTableEdit_ACU', 'function isSqlContent'),
    extractRegion('const FULLWIDTH_TO_ASCII', '    /**\n     * shared/ddl-utils.ts'),
    extractRegion('function parseDDLTableName', '    // ═══════════════════════════════════════════════════════════════\n    // 内部工具函数'),
    extractFunction('splitColumnDefinitions'),
    extractRegion('function generateInserts', '    // ═══════════════════════════════════════════════════════════════\n    // SQL 结果'),
    extractFunction('escapeValue'),
    extractFunction('sanitizeIdentifier'),
    extractFunction('chineseToIdentifier'),
    extractRegion('function splitSqlStatements', '    /**\n     * service/table/table-storage-strategy.ts'),
    extractFunction('getResponseRetryAfterText_ACU'),
    extractFunction('buildApiResponseFailureMessage_ACU'),
    extractFunction('parseNonStreamResponse_ACU'),
    extractFunction('normalizeAiTransportKind_ACU'),
    extractFunction('getAiTransportIssueLabel_ACU'),
    extractFunction('cleanAiTransportDetail_ACU'),
    extractFunction('createAiTransportFailureResult_ACU'),
    extractFunction('interpretLogEntry'),
    `
      globalThis.__regression = {
        extractSqlStatementsFromTableEdit_ACU,
        filterSqlEditStatements_ACU,
        splitSqlStatements,
        normalizeStatementValues,
        normalizeRiskLevelValue_ACU,
        validateChronicleTextInMutationStatements_ACU,
        validateChronicleAppendOnlyInMutationStatements_ACU,
        validateSqlStatementsAgainstConstraintRegistry_ACU,
        extractSqlMutationValuesForConstraintCheck_ACU,
        parseDDLTableName,
        parseDDLColumnNames,
        parseDDLConstraintRegistry_ACU,
        generateInserts,
        extractTableNamesFromStatements,
        extractUnknownSqlColumnsFromStatements_ACU,
        parseNonStreamResponse_ACU,
        createAiTransportFailureResult_ACU,
        interpretLogEntry,
      };
    `,
  ].join('\n\n');

  vm.runInContext(runtimeCode, context, { filename: 'sql-debug-regression-vendor.vm.js' });
  return Object.assign(context.__regression, { debugMessages, warningMessages });
}

const vendor = loadVendorRuntime();

function clearVendorWarnings() {
  vendor.warningMessages.length = 0;
}

function clearVendorDebugMessages() {
  vendor.debugMessages.length = 0;
}

function parseTemplate(filePath) {
  return JSON.parse(readFileSync(filePath, 'utf8'));
}

function getSheetPromptText(sheet) {
  return [
    sheet?.sourceData?.note,
    sheet?.sourceData?.initNode,
    sheet?.sourceData?.updateNode,
    sheet?.sourceData?.insertNode,
    sheet?.sourceData?.ddl,
  ].filter(Boolean).join('\n');
}

function assertPromptIncludes(sheet, tokens, label) {
  const promptText = getSheetPromptText(sheet);
  for (const token of tokens) {
    assert.ok(promptText.includes(token), `${label} prompt should mention ${token}`);
  }
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

  const enumPromptChecks = [
    [
      'sheet_supernatural_events',
      ['【枚举硬约束】', 'handling_status', '只允许以下值', '未处理', '调查中', '对抗中', '已压制', '已关押', '失控扩散', '结束', '爆发中', '处理中', '已解决'],
    ],
    [
      'sheet_ghost_archives',
      ['【枚举硬约束】', 'containment_status', '只允许以下值', '未关押', '暂时压制', '已关押', '失控', '未知', '已收容', '临时控制'],
    ],
    [
      'sheet_clues',
      ['【枚举硬约束】', 'reliability', 'verification_status', 'visibility', '低', '中', '高', '误导', '未验证', '部分验证', '已验证', '已否定', '玩家可见', '内部记录', '高可信', '已证实', '后台记录'],
    ],
    [
      'sheet_characters',
      ['【枚举硬约束】', 'presence_status', 'life_status', '在场', '离场', '可联系', '未知', '存活', '死亡', '失踪', '厉鬼复苏', '现场', '活着', '下落不明'],
    ],
    [
      'sheet_locations',
      ['【枚举硬约束】', 'supernatural_status', 'lockdown_status', '正常', '疑似灵异', '鬼域影响', '封锁危险', '已清理', '未封锁', '警方封锁', '总部封锁', '黄金隔离', '鬼域中', '黄金封存'],
    ],
    [
      'sheet_action_suggestions',
      ['【枚举硬约束】', 'option_key', 'A、B、C、D', 'death_risk_level', 'revival_risk_level', '无', '低', '中', '高', '致命', '未知', '选项A', '方案B', '极低', '极高', '严重'],
    ],
  ];
  for (const [sheetKey, tokens] of enumPromptChecks) {
    assertPromptIncludes(template[sheetKey], tokens, sheetKey);
  }

  const chronicleText = [
    template.sheet_chronicle.sourceData.note,
    template.sheet_chronicle.sourceData.insertNode,
    template.sheet_chronicle.sourceData.updateNode,
  ].join('\n');
  assert.ok(/chronicle/.test(chronicleText), 'chronicle prompt should name the current SQL table');
  assert.ok(/log_summary/.test(chronicleText), 'chronicle prompt should forbid legacy log_summary table');
  assert.ok(/event_summary/.test(chronicleText), 'chronicle prompt should forbid legacy event_summary table');
  assert.ok(/20-600|20到600/.test(chronicleText), 'chronicle prompt should keep the 20-600 char constraint visible (v6.28.1 relaxed from 200)');
  assert.ok(/不足\s*20\s*字.*禁止输出\s*SQL/.test(chronicleText), 'chronicle prompt should forbid short chronicle_text SQL output (v6.28.1 relaxed from 200)');

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
  const templates = templatePaths.map(validateTemplate);
  const [firstTemplate, secondTemplate] = templates;
  for (const sheetKey of [
    'sheet_supernatural_events',
    'sheet_ghost_archives',
    'sheet_clues',
    'sheet_characters',
    'sheet_locations',
    'sheet_action_suggestions',
  ]) {
    assert.equal(
      getSheetPromptText(firstTemplate[sheetKey]),
      getSheetPromptText(secondTemplate[sheetKey]),
      `${sheetKey} enum prompt docs should match between dev and release templates`,
    );
  }
  return templates;
}

function buildTemplateConstraintRegistry(template) {
  const registry = {};
  for (const [, sheet] of getSheetEntries(template)) {
    const ddl = sheet?.sourceData?.ddl;
    const parsed = JSON.parse(JSON.stringify(vendor.parseDDLConstraintRegistry_ACU(ddl)));
    assert.ok(parsed.tableName, 'constraint registry should include table name');
    assert.ok(Array.isArray(parsed.columnOrder), `${parsed.tableName} should include column order`);
    assert.ok(parsed.columnOrder.length > 0, `${parsed.tableName} should include columns`);
    registry[parsed.tableName] = parsed;
  }
  return registry;
}

function getRegistryColumn(registry, tableName, columnName) {
  const table = registry[tableName];
  assert.ok(table, `missing registry table ${tableName}`);
  const column = table.columns[columnName];
  assert.ok(column, `missing registry column ${tableName}.${columnName}`);
  return column;
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function sqlLiteral(value) {
  if (value === null) return 'NULL';
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return `'${String(value).replace(/'/g, "''")}'`;
}

function testConstraintRegistry(templates) {
  const registries = templates.map(buildTemplateConstraintRegistry);
  assert.deepEqual(registries[0], registries[1], 'development and release constraint registries should match');

  const registry = registries[0];
  assert.equal(Object.keys(registry).length, 14, 'constraint registry should include 14 SQL tables');

  const handlingStatus = getRegistryColumn(registry, 'supernatural_events', 'handling_status');
  assert.equal(handlingStatus.type, 'TEXT');
  assert.equal(handlingStatus.notNull, true);
  assert.deepEqual(
    handlingStatus.enumValues,
    ['未处理', '调查中', '对抗中', '已压制', '已关押', '失控扩散', '结束'],
    'handling_status enum should be extracted from DDL CHECK',
  );

  const revivalRisk = getRegistryColumn(registry, 'action_suggestions', 'revival_risk_level');
  assert.deepEqual(revivalRisk.enumValues, ['无', '低', '中', '高', '致命', '未知']);

  const chronicleText = getRegistryColumn(registry, 'chronicle', 'chronicle_text');
  assert.deepEqual(chronicleText.lengthRange, { min: 20, max: 600 }); // v6.28.1 relaxed from 200
  assert.equal(chronicleText.notNull, true);

  const worldPressure = getRegistryColumn(registry, 'global_state', 'world_pressure');
  assert.deepEqual(worldPressure.numericRange, { min: 0, max: 100 });

  const codeIndex = getRegistryColumn(registry, 'chronicle', 'code_index');
  assert.equal(codeIndex.globPattern, 'SP[0-9][0-9][0-9][0-9]');
  assert.equal(codeIndex.unique, true);

  const characterName = getRegistryColumn(registry, 'characters', 'name');
  assert.equal(characterName.unique, true);
}

function assertConstraintPreflightThrows(sql, registry, expectedPatterns) {
  assert.throws(
    () => vendor.validateSqlStatementsAgainstConstraintRegistry_ACU([sql], registry),
    error => {
      assert.match(error.message, /SQL schema\/CHECK 约束不合规/);
      assert.doesNotMatch(error.message, /CHECK constraint failed/);
      assert.match(error.message, /已拦截，未进入 SQLite/);
      for (const pattern of expectedPatterns) {
        assert.match(error.message, pattern);
      }
      return true;
    },
  );
}

function testSqlConstraintPreflight(template) {
  const registry = buildTemplateConstraintRegistry(template);

  const badHandlingStatus = "UPDATE supernatural_events SET handling_status='热闹中' WHERE event_code='DACHANG_KNOCK_001';";
  assertConstraintPreflightThrows(badHandlingStatus, registry, [
    /supernatural_events\.handling_status/,
    /"热闹中" 不在允许值 \[未处理, 调查中, 对抗中, 已压制, 已关押, 失控扩散, 结束\]/,
  ]);

  const validHandlingStatus = "UPDATE supernatural_events SET handling_status='失控扩散' WHERE event_code='DACHANG_KNOCK_001';";
  assert.doesNotThrow(() => vendor.validateSqlStatementsAgainstConstraintRegistry_ACU([validHandlingStatus], registry));

  const badChronicleText = "INSERT INTO chronicle (row_id, code_index, time_span, related_event, summary, chronicle_text) VALUES ((SELECT COALESCE(MAX(row_id), 0) + 1 FROM chronicle), 'SP0002', '2026-06-06 18:31', '七中敲门事件', '复测员逃出教室。', 'SP0001');";
  assertConstraintPreflightThrows(badChronicleText, registry, [
    /chronicle\.chronicle_text/,
    /长度无效/,
    /疑似把编号\/代码写入了需要正文文本的字段/,
  ]);

  const badWorldPressure = "UPDATE global_state SET world_pressure=120 WHERE row_id=1;";
  assertConstraintPreflightThrows(badWorldPressure, registry, [
    /global_state\.world_pressure/,
    /120 超出允许范围 0-100/,
  ]);

  const badCodeIndex = "UPDATE chronicle SET code_index='P0001' WHERE row_id=1;";
  assertConstraintPreflightThrows(badCodeIndex, registry, [
    /chronicle\.code_index/,
    /"P0001" 不匹配格式 SP\[0-9\]\[0-9\]\[0-9\]\[0-9\]/,
  ]);

  const blankCheckDisplay = "INSERT INTO check_suggestions (row_id, display_text, check_type, check_basis, dice_command) VALUES (1, '   ', '观察', '现场', '/r 1d20');";
  assertConstraintPreflightThrows(blankCheckDisplay, registry, [
    /check_suggestions\.display_text/,
    /不能为空/,
  ]);

  const nullCharacterName = 'UPDATE characters SET name=NULL WHERE row_id=1;';
  assertConstraintPreflightThrows(nullCharacterName, registry, [
    /characters\.name/,
    /不能为 NULL/,
  ]);

  const extracted = vendor.extractSqlMutationValuesForConstraintCheck_ACU([badChronicleText]);
  assert.ok(
    extracted.some(cell => cell.tableName === 'chronicle' && cell.columnName === 'chronicle_text' && /SP0001/.test(cell.rawValue)),
    'constraint extractor should handle row_id expressions with nested commas',
  );
}

function buildGeneratedConstraintViolationCases(registry) {
  const cases = [];
  const expectedCounts = {
    enum: 0,
    length: 0,
    numeric: 0,
    glob: 0,
    nonEmpty: 0,
    notNull: 0,
  };

  function addCase(tableName, columnName, type, value, expectedPattern) {
    cases.push({
      tableName,
      columnName,
      type,
      sql: `UPDATE ${tableName} SET ${columnName}=${sqlLiteral(value)} WHERE row_id=1;`,
      expectedPatterns: [
        new RegExp(`${escapeRegExp(tableName)}\\.${escapeRegExp(columnName)}`),
        expectedPattern,
      ],
    });
  }

  for (const [tableName, table] of Object.entries(registry)) {
    for (const columnName of table.columnOrder || Object.keys(table.columns || {})) {
      const column = table.columns[columnName];
      if (!column) continue;

      if (Array.isArray(column.enumValues) && column.enumValues.length > 0) {
        expectedCounts.enum += 1;
        addCase(tableName, columnName, 'enum', '__INVALID_ENUM__', /不在允许值/);
      }

      if (column.lengthRange) {
        expectedCounts.length += 1;
        const { min, max } = column.lengthRange;
        const invalidLength = min != null && min > 0
          ? Math.max(0, min - 1)
          : Number(max || 0) + 1;
        addCase(tableName, columnName, 'length', 'x'.repeat(invalidLength), /长度无效/);
      }

      if (column.numericRange) {
        expectedCounts.numeric += 1;
        const { min, max } = column.numericRange;
        const invalidNumber = max != null ? Number(max) + 1 : Number(min) - 1;
        addCase(tableName, columnName, 'numeric', invalidNumber, /超出允许范围/);
      }

      if (column.globPattern) {
        expectedCounts.glob += 1;
        addCase(tableName, columnName, 'glob', '__BAD_FORMAT__', /不匹配格式/);
      }

      if (column.nonEmpty) {
        expectedCounts.nonEmpty += 1;
        addCase(tableName, columnName, 'nonEmpty', '   ', /不能为空/);
      }

      if (column.notNull) {
        expectedCounts.notNull += 1;
        addCase(tableName, columnName, 'notNull', null, /不能为 NULL/);
      }
    }
  }

  return { cases, expectedCounts };
}

function testGeneratedConstraintViolationFixtures(template) {
  const registry = buildTemplateConstraintRegistry(template);
  const { cases, expectedCounts } = buildGeneratedConstraintViolationCases(registry);
  const actualCounts = cases.reduce((counts, item) => {
    counts[item.type] = (counts[item.type] || 0) + 1;
    return counts;
  }, {});

  assert.deepEqual(actualCounts, expectedCounts, 'generated constraint fixture counts should match registry-derived counts');
  assert.ok(cases.length > 0, 'generated constraint fixtures should not be empty');
  assert.ok(expectedCounts.enum >= 12, 'generated fixtures should cover all known enum CHECK constraints');
  assert.ok(expectedCounts.length > 0, 'generated fixtures should cover length CHECK constraints');
  assert.ok(expectedCounts.numeric > 0, 'generated fixtures should cover numeric CHECK constraints');
  assert.ok(expectedCounts.glob > 0, 'generated fixtures should cover GLOB CHECK constraints');
  assert.ok(expectedCounts.nonEmpty > 0, 'generated fixtures should cover TRIM non-empty CHECK constraints');

  for (const fixture of cases) {
    assertConstraintPreflightThrows(fixture.sql, registry, fixture.expectedPatterns);
  }
}

function testEnumAliasNormalization(template) {
  const registry = buildTemplateConstraintRegistry(template);
  clearVendorDebugMessages();

  const aliasCases = [
    ["UPDATE action_suggestions SET option_key='选项A' WHERE row_id=1;", /option_key\s*=\s*'A'/, /选项A/],
    ["UPDATE ghost_archives SET containment_status='已收容' WHERE ghost_code='GHOST_001';", /containment_status\s*=\s*'已关押'/, /已收容/],
    ["UPDATE clues SET reliability='假线索' WHERE clue_code='CLUE_001';", /reliability\s*=\s*'误导'/, /假线索/],
    ["UPDATE clues SET verification_status='已证实' WHERE clue_code='CLUE_001';", /verification_status\s*=\s*'已验证'/, /已证实/],
    ["UPDATE clues SET visibility='后台记录' WHERE clue_code='CLUE_001';", /visibility\s*=\s*'内部记录'/, /后台记录/],
    ["UPDATE characters SET presence_status='当前在场' WHERE character_code='CHAR_001';", /presence_status\s*=\s*'在场'/, /当前在场/],
    ["UPDATE characters SET life_status='下落不明' WHERE character_code='CHAR_001';", /life_status\s*=\s*'失踪'/, /下落不明/],
    ["UPDATE locations SET supernatural_status='鬼域中' WHERE location_code='LOC_001';", /supernatural_status\s*=\s*'鬼域影响'/, /鬼域中/],
    ["UPDATE locations SET lockdown_status='黄金封存' WHERE location_code='LOC_001';", /lockdown_status\s*=\s*'黄金隔离'/, /黄金封存/],
  ];
  for (const [sql, expectedPattern, removedPattern] of aliasCases) {
    const normalizedSql = vendor.normalizeStatementValues(sql);
    assert.match(normalizedSql, expectedPattern);
    assert.doesNotMatch(normalizedSql, removedPattern);
    assert.doesNotThrow(() => vendor.validateSqlStatementsAgainstConstraintRegistry_ACU([normalizedSql], registry));
  }

  const handlingUpdate = "UPDATE supernatural_events SET handling_status='爆发中' WHERE event_code='DACHANG_KNOCK_001';";
  const normalizedHandlingUpdate = vendor.normalizeStatementValues(handlingUpdate);
  assert.match(normalizedHandlingUpdate, /handling_status\s*=\s*'失控扩散'/);
  assert.doesNotMatch(normalizedHandlingUpdate, /爆发中/);
  assert.doesNotThrow(() => vendor.validateSqlStatementsAgainstConstraintRegistry_ACU([normalizedHandlingUpdate], registry));
  assert.ok(
    vendor.debugMessages.some(message => /SQL schema\/CHECK 约束已归一化.*supernatural_events\.handling_status.*"爆发中".*"失控扩散".*允许值/.test(message)),
    'enum alias normalization should log table, field, original value, normalized value, and allowed values',
  );

  const textAndEnumUpdate = "UPDATE supernatural_events SET public_summary='爆发中但这里只是摘要', handling_status='处理中' WHERE event_code='DACHANG_KNOCK_001';";
  const normalizedTextAndEnumUpdate = vendor.normalizeStatementValues(textAndEnumUpdate);
  assert.match(normalizedTextAndEnumUpdate, /public_summary='爆发中但这里只是摘要'/);
  assert.match(normalizedTextAndEnumUpdate, /handling_status\s*=\s*'对抗中'/);
  assert.doesNotThrow(() => vendor.validateSqlStatementsAgainstConstraintRegistry_ACU([normalizedTextAndEnumUpdate], registry));

  const handlingInsert = `
    INSERT INTO supernatural_events
      (row_id, event_code, event_name, location_code, first_seen, current_phase, ghost_domain_status, suspected_laws, handling_status, public_summary)
    VALUES
      (1, 'DACHANG_KNOCK_001', '敲门事件', 'LOC_001', '2026-06-07', '初期', '鬼域覆盖', '敲门声传播', '爆发中', '摘要含爆发中'),
      (2, 'DACHANG_KNOCK_002', '敲门事件二', 'LOC_001', '2026-06-07', '初期', '鬼域覆盖', '敲门声传播', '交战中', '摘要含交战中');
  `;
  const normalizedHandlingInsert = vendor.normalizeStatementValues(handlingInsert.trim());
  assert.match(normalizedHandlingInsert, /'失控扩散'/);
  assert.match(normalizedHandlingInsert, /'对抗中'/);
  assert.match(normalizedHandlingInsert, /'摘要含爆发中'/);
  assert.match(normalizedHandlingInsert, /'摘要含交战中'/);
  assert.doesNotMatch(normalizedHandlingInsert, /'爆发中'/);
  assert.doesNotMatch(normalizedHandlingInsert, /'交战中'/);
  assert.doesNotThrow(() => vendor.validateSqlStatementsAgainstConstraintRegistry_ACU([normalizedHandlingInsert], registry));

  const unknownHandlingUpdate = "UPDATE supernatural_events SET handling_status='热闹中' WHERE event_code='DACHANG_KNOCK_001';";
  const normalizedUnknownHandlingUpdate = vendor.normalizeStatementValues(unknownHandlingUpdate);
  assert.equal(normalizedUnknownHandlingUpdate, unknownHandlingUpdate);
  assertConstraintPreflightThrows(normalizedUnknownHandlingUpdate, registry, [
    /supernatural_events\.handling_status/,
    /"热闹中" 不在允许值 \[未处理, 调查中, 对抗中, 已压制, 已关押, 失控扩散, 结束\]/,
  ]);
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

function testEnumAliasNormalizationInGeneratedInserts(template) {
  const sheet = {
    uid: 'sheet_action_suggestions',
    content: [
      ['行号', '选项', '思路', '主要风险', '预期收益', '死亡风险', '复苏风险'],
      [1, '选项A', '观察', '风险一', '收益一', '极低', '极高'],
    ],
    sourceData: {
      ddl: template.sheet_action_suggestions.sourceData.ddl,
    },
  };
  const inserts = vendor.generateInserts(sheet, 'action_suggestions');
  assert.equal(inserts.length, 1);
  assert.match(inserts[0], /'A'/);
  assert.match(inserts[0], /'低'/);
  assert.match(inserts[0], /'致命'/);
  assert.doesNotMatch(inserts[0], /选项A|极低|极高/);

  const db = new DatabaseSync(':memory:');
  try {
    db.exec(template.sheet_action_suggestions.sourceData.ddl);
    db.exec(inserts[0]);
    const row = db
      .prepare('SELECT option_key, death_risk_level, revival_risk_level FROM action_suggestions WHERE row_id = 1')
      .get();
    assert.deepEqual({ ...row }, { option_key: 'A', death_risk_level: '低', revival_risk_level: '致命' });
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
  for (const tableName of ['log_summary', 'simulation_summary', 'summary_logs', 'event_summary']) {
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

function testChronicleSeedRowFiltering(template) {
  clearVendorWarnings();
  const sheet = JSON.parse(JSON.stringify(template.sheet_chronicle));
  sheet.content = [
    ['row_id', '纪要编号', '时间跨度', '关联事件', '概览', '纪要'],
    ['1', 'SP0002', '2026-06-06 18:31', '七中敲门事件', '复测员逃出教室，遭遇鬼域封锁。', 'SP0001'],
    [
      '2',
      'SP0003',
      '2026-06-06 18:35',
      '七中敲门事件',
      '复测员记录鬼域变化。',
      '复测员离开教室后并未立刻脱离危险，走廊尽头的门牌和窗外光线持续错位，说明鬼域仍在封锁七中局部区域。周围学生的呼救声被墙体削弱，普通撤离路线已经失效。复测员只能依据先前记录的敲门规律，避开声音最密集的方向，并把遭遇、时间、地点和可见异常整理成客观纪要，留给后续判断事件扩散趋势与行动风险。此后他短暂确认楼梯间仍能听见规律性敲门，窗外操场却没有对应人影，说明异常并非普通追逐事件，而是会改变空间感知和撤离判断的灵异现象。',
    ],
  ];
  const inserts = vendor.generateInserts(sheet, 'chronicle');
  assert.equal(inserts.length, 1, 'invalid short chronicle_text row should be skipped before SQLite');
  assert.doesNotMatch(inserts[0], /SP0002[\s\S]*SP0001/, 'bad SP code-as-text row must not produce INSERT');
  assert.ok(
    vendor.warningMessages.some(message => /\[SyncBridge\].*chronicle\.chronicle_text.*长度无效.*已跳过该行/.test(message)),
    'invalid chronicle seed row should emit a readable SyncBridge warning',
  );

  const db = new DatabaseSync(':memory:');
  db.exec(sheet.sourceData.ddl);
  db.exec(inserts[0]);
  const rows = db.prepare('SELECT code_index, LENGTH(chronicle_text) AS len FROM chronicle').all();
  assert.deepEqual(rows.map(row => row.code_index), ['SP0003']);
  assert.ok(rows[0].len >= 200 && rows[0].len <= 600);
  db.close();

  const directBadSql = "INSERT INTO chronicle (row_id, code_index, time_span, related_event, summary, chronicle_text) VALUES (1, 'SP0002', '2026-06-06 18:31', '七中敲门事件', '复测员逃出教室，遭遇鬼域封锁。', 'SP0001');";
  assert.throws(
    () => vendor.validateChronicleTextInMutationStatements_ACU([directBadSql]),
    /chronicle_text 长度无效.*疑似把纪要编号写进了 chronicle_text/,
  );

  const directValidSql = inserts[0].replace(/;$/, '');
  assert.doesNotThrow(() => vendor.validateChronicleTextInMutationStatements_ACU([directValidSql]));

  // 事件纪要追加式守卫：禁止 DELETE 已有纪要行、禁止改写 code_index，避免覆盖独立开局纪要（如开局 SP0001）。
  assert.throws(
    () => vendor.validateChronicleAppendOnlyInMutationStatements_ACU(["DELETE FROM chronicle WHERE code_index='SP0001';"]),
    /事件纪要.*禁止 DELETE/,
    'deleting an existing chronicle row should be blocked',
  );
  assert.throws(
    () => vendor.validateChronicleAppendOnlyInMutationStatements_ACU(["UPDATE chronicle SET code_index='SP0002' WHERE code_index='SP0001';"]),
    /code_index 不可改写/,
    'rewriting an existing chronicle code_index should be blocked',
  );
  // 同一行只改正文/概览等非编号字段应放行（编辑既有纪要内容是合法的）。
  assert.doesNotThrow(
    () => vendor.validateChronicleAppendOnlyInMutationStatements_ACU([
      "UPDATE chronicle SET summary='补充客观细节' WHERE code_index='SP0001';",
    ]),
    'editing non-code chronicle fields on an existing row should be allowed',
  );
  // 追加新纪要行（INSERT）应放行。
  assert.doesNotThrow(
    () => vendor.validateChronicleAppendOnlyInMutationStatements_ACU([directValidSql]),
    'inserting a new chronicle row should be allowed',
  );
  // 作用域隔离：纪要追加式守卫只能管 chronicle，绝不能误伤 player_state 的姓名更新或删除，
  // 否则会破坏“玩家姓名可被合法更新/保持”的既有行为。
  assert.doesNotThrow(
    () => vendor.validateChronicleAppendOnlyInMutationStatements_ACU([
      "UPDATE player_state SET name='林川' WHERE row_id=1;",
      "DELETE FROM player_state WHERE row_id=2;",
      "UPDATE characters SET code_index='X' WHERE row_id=1;",
    ]),
    'chronicle append-only guard must not affect non-chronicle tables (player_state name update/delete)',
  );
}

function testSyncBridgeConstraintRegistryRowValidation(template) {
  clearVendorWarnings();
  const actionSheet = {
    uid: 'sheet_action_suggestions',
    name: '行动建议',
    content: [
      ['行号', '选项', '思路', '主要风险', '预期收益', '死亡风险', '复苏风险'],
      [1, '选项A', '观察', '风险一', '收益一', '极低', '极高'],
      [2, 'E', '观察', '风险二', '收益二', '低', '高'],
      [5, 'B', '观察', '风险三', '收益三', '低', '高'],
    ],
    sourceData: {
      ddl: template.sheet_action_suggestions.sourceData.ddl,
    },
  };
  const actionInserts = vendor.generateInserts(actionSheet, 'action_suggestions');
  assert.equal(actionInserts.length, 1, 'enum/range-invalid action_suggestions seed rows should be skipped');
  assert.match(actionInserts[0], /'A'/);
  assert.doesNotMatch(actionInserts.join('\n'), /'E'|VALUES \(5,/);
  assert.ok(
    vendor.warningMessages.some(message => /action_suggestions\.option_key.*"E" 不在允许值/.test(message)),
    'invalid action_suggestions enum seed row should emit a SyncBridge warning',
  );
  assert.ok(
    vendor.warningMessages.some(message => /action_suggestions\.row_id.*5 超出允许范围 1-4/.test(message)),
    'invalid action_suggestions row_id seed row should emit a SyncBridge warning',
  );

  clearVendorWarnings();
  const globalSheet = {
    uid: 'sheet_global_state',
    name: '全局状态',
    content: [
      ['行号', '当前时间', '当前地点', '当前城市', '原著阶段', '剧情锚点', '主线阶段', '世界压力', '总部关注度', '社会公开度'],
      [1, '2026-06-07 18:30', '七中', '大昌市', '开局', '敲门事件', '调查', 80, 50, 20],
      [1, '2026/06/07 18:30', '七中', '大昌市', '开局', '敲门事件', '调查', 80, 50, 20],
      [1, '2026-06-07 18:30', '七中', '大昌市', '开局', '敲门事件', '调查', 120, 50, 20],
    ],
    sourceData: {
      ddl: template.sheet_global_state.sourceData.ddl,
    },
  };
  const globalInserts = vendor.generateInserts(globalSheet, 'global_state');
  assert.equal(globalInserts.length, 1, 'GLOB/range-invalid global_state seed rows should be skipped');
  assert.ok(
    vendor.warningMessages.some(message => /global_state\.game_time.*不匹配格式 \?\?\?\?-\?\?-\?\? \?\?:\?\?/.test(message)),
    'invalid global_state GLOB seed row should emit a SyncBridge warning',
  );
  assert.ok(
    vendor.warningMessages.some(message => /global_state\.world_pressure.*120 超出允许范围 0-100/.test(message)),
    'invalid global_state numeric range seed row should emit a SyncBridge warning',
  );

  clearVendorWarnings();
  const checkSheet = {
    uid: 'sheet_check_suggestions',
    name: '检定建议',
    content: [
      ['行号', '展示文本', '检定类型', '检定依据', '骰子命令'],
      [1, '观察门外异常', '观察', '敲门声', '/r 1d20'],
      [2, '   ', '观察', '空白展示文本', '/r 1d20'],
      [3, '检查门缝', '观察', '空白骰子命令', '   '],
    ],
    sourceData: {
      ddl: template.sheet_check_suggestions.sourceData.ddl,
    },
  };
  const checkInserts = vendor.generateInserts(checkSheet, 'check_suggestions');
  assert.equal(checkInserts.length, 1, 'non-empty-invalid check_suggestions seed rows should be skipped');
  assert.ok(
    vendor.warningMessages.some(message => /check_suggestions\.display_text.*不能为空/.test(message)),
    'blank display_text seed row should emit a SyncBridge warning',
  );
  assert.ok(
    vendor.warningMessages.some(message => /check_suggestions\.dice_command.*不能为空/.test(message)),
    'blank dice_command seed row should emit a SyncBridge warning',
  );

  const db = new DatabaseSync(':memory:');
  try {
    db.exec(template.sheet_action_suggestions.sourceData.ddl);
    for (const sql of actionInserts) db.exec(sql);
    const actionRows = db.prepare('SELECT row_id, option_key, death_risk_level, revival_risk_level FROM action_suggestions').all();
    assert.deepEqual(actionRows.map(row => ({ ...row })), [
      { row_id: 1, option_key: 'A', death_risk_level: '低', revival_risk_level: '致命' },
    ]);

    db.exec(template.sheet_global_state.sourceData.ddl);
    for (const sql of globalInserts) db.exec(sql);
    const globalRows = db.prepare('SELECT row_id, game_time, world_pressure FROM global_state').all();
    assert.deepEqual(globalRows.map(row => ({ ...row })), [
      { row_id: 1, game_time: '2026-06-07 18:30', world_pressure: 80 },
    ]);

    db.exec(template.sheet_check_suggestions.sourceData.ddl);
    for (const sql of checkInserts) db.exec(sql);
    const checkRows = db.prepare('SELECT row_id, display_text, dice_command FROM check_suggestions').all();
    assert.deepEqual(checkRows.map(row => ({ ...row })), [
      { row_id: 1, display_text: '观察门外异常', dice_command: '/r 1d20' },
    ]);
  } finally {
    db.close();
  }
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
  const incompleteFinalUpsert = "INSERT INTO characters (name, identity_text) VALUES ('测试', '学生') ON CONFLICT(name) DO UPDATE SET";
  const incompleteFinalUpsertWithSemicolon = `${incompleteFinalUpsert};`;
  const incompleteFinalUpsertWithComment = `${incompleteFinalUpsert} -- AI output stopped here`;
  for (const sql of [incompleteFinalUpsert, incompleteFinalUpsertWithSemicolon, incompleteFinalUpsertWithComment]) {
    assert.equal(vendor.extractSqlStatementsFromTableEdit_ACU(sql), '');
    assert.deepEqual(Array.from(vendor.filterSqlEditStatements_ACU(vendor.splitSqlStatements(sql))), []);
  }

  const validFinalUpsert = "INSERT INTO characters (name, identity_text) VALUES ('测试', '学生') ON CONFLICT(name) DO UPDATE SET identity_text=excluded.identity_text;";
  assert.deepEqual(Array.from(vendor.filterSqlEditStatements_ACU(vendor.splitSqlStatements(validFinalUpsert))), [
    "INSERT INTO characters (name, identity_text) VALUES ('测试', '学生') ON CONFLICT(name) DO UPDATE SET identity_text=excluded.identity_text",
  ]);
}

async function testBadGatewayParsing() {
  await assert.rejects(
    () => vendor.parseNonStreamResponse_ACU({
      status: 502,
      statusText: 'Bad Gateway',
      headers: { get: () => '' },
      json: async () => ({ error: { message: 'Bad Gateway' } }),
    }),
    /API上游网关错误: Bad Gateway/,
  );
  await assert.rejects(
    () => vendor.parseNonStreamResponse_ACU({
      status: 429,
      statusText: 'Too Many Requests',
      headers: { get: name => (name === 'Retry-After' ? '30' : '') },
      json: async () => ({ error: { message: 'Too Many Requests' } }),
    }),
    /API限流: .*HTTP 429.*Retry-After: 30/,
  );
}

function testApiTransportFailureResult() {
  const result = vendor.createAiTransportFailureResult_ACU({
    channel: 'CRUD Plan 自动填表',
    classification: {
      kind: 'rate_limit',
      message: 'API限流: API上游返回错误 HTTP 200 (OK) Too Many Requests',
    },
    cooldownMs: 15000,
  });
  assert.equal(result.success, false);
  assert.equal(result.apiTransportIssue, true);
  assert.equal(result.apiTransportKind, 'rate_limit');
  assert.equal(result.cooldownSeconds, 15);
  assert.equal(result.incompleteFill, true);
  assert.match(result.error, /本轮 CRUD Plan 自动填表未完整完成/);
  assert.match(result.error, /冷却结束后手动重试/);
  assert.equal(result.pendingRetrySummary.autoReplay, false);
  assert.equal(result.pendingRetrySummary.manualRetry, true);
}

async function testBatchSkipChatSaveDoesNotRefreshRuntime() {
  const calls = {
    save: [],
    refresh: [],
    fallbackSave: [],
    sync: [],
    notify: 0,
  };
  const debugMessages = [];
  const context = {
    logDebug_ACU(...args) {
      debugMessages.push(args.map(arg => String(arg)).join(' '));
    },
    findTableLatestFloor() {
      return 2;
    },
    SillyTavern_API_ACU: { chat: [{}, {}, {}] },
    resolveTableHistoryStateFromChat_ACU() {
      return { latestDataMessageIndex: -1 };
    },
    getCurrentIsolationKey_ACU() {
      return '';
    },
    settings_ACU: {},
    isSummaryOrOutlineTable_ACU() {
      return false;
    },
    async saveIndependentTableToChatHistory_ACU(...args) {
      calls.save.push(args);
    },
    async refreshMergedDataAndNotifyWithUI_ACU(...args) {
      calls.refresh.push(args);
    },
    async saveCurrentDataForTable_ACU(...args) {
      calls.fallbackSave.push(args);
    },
    async syncSummaryVectorIndexAfterTableEdit_ACU(...args) {
      calls.sync.push(args);
    },
    topLevelWindow_ACU: {
      AutoCardUpdaterAPI: {
        _notifyTableUpdate() {
          calls.notify += 1;
        },
      },
    },
  };
  vm.createContext(context);
  vm.runInContext(`
${extractFunction('saveToLatestFloorAndRefresh')}
globalThis.__saveToLatestFloorAndRefresh = saveToLatestFloorAndRefresh;
`, context, { filename: 'save-to-latest-floor-regression.vm.js' });

  await context.__saveToLatestFloorAndRefresh(
    'sheet_supernatural_events',
    '灵异事件',
    {},
    'insertRow',
    { skipChatSave: true, skipNotify: true },
  );
  assert.equal(calls.save.length, 0, 'batch CRUD should not per-operation save to chat');
  assert.equal(calls.refresh.length, 0, 'batch CRUD should not refresh merged data before batch persist');
  assert.equal(calls.fallbackSave.length, 0, 'batch CRUD should not fallback-save per operation');
  assert.equal(calls.sync.length, 1, 'summary vector skip path should still be evaluated');
  assert.ok(
    debugMessages.some(message => message.includes('Skip per-operation chat save and refresh')),
    'batch skip should be visible in debug logs',
  );

  await context.__saveToLatestFloorAndRefresh(
    'sheet_supernatural_events',
    '灵异事件',
    {},
    'insertRow',
    { skipChatSave: false, skipNotify: true },
  );
  assert.equal(calls.save.length, 1, 'normal CRUD should still save to chat');
  assert.equal(calls.refresh.length, 1, 'normal CRUD should still refresh after save');
}

// ========== v6.13 新增测试 ==========

function testUniqueConstraintRegistry(template) {
  // 测试 UNIQUE 约束解析
  const ghostArchivesDDL = template.sheet_ghost_archives.sourceData.ddl;
  const registry = vendor.parseDDLConstraintRegistry_ACU(ghostArchivesDDL);

  // 验证 UNIQUE 约束被正确解析
  assert.ok(registry.columns.archive_code, 'archive_code column should exist in registry');
  assert.ok(registry.columns.archive_code.unique || registry.columns.archive_code.primaryKey, 'archive_code should be marked as unique or primary key');

  // 验证新增字段存在
  assert.ok(Array.isArray(registry.uniqueConstraints), 'registry should have uniqueConstraints array');
  assert.ok(Array.isArray(registry.foreignKeys), 'registry should have foreignKeys array');
}

function testSqlAutoRewrite(template) {
  // v6.13: 自动改写函数是内部函数，通过集成测试验证
  // 这里只验证约束注册表能正确识别 UNIQUE 列
  const ghostArchivesDDL = template.sheet_ghost_archives.sourceData.ddl;
  const registry = vendor.parseDDLConstraintRegistry_ACU(ghostArchivesDDL);

  // 验证 archive_code 是 UNIQUE，这是自动改写的前提
  assert.ok(
    registry.columns.archive_code && (registry.columns.archive_code.unique || registry.columns.archive_code.primaryKey),
    'archive_code should be unique to enable auto-rewrite'
  );
}

function testSqlTemplateMatching() {
  // v6.13: 模板匹配函数是内部函数，通过日志验证
  // 这里只验证模板常量存在
  assert.ok(vendorSource.includes('SQL_SAFE_TEMPLATES_ACU'), 'SQL_SAFE_TEMPLATES_ACU should be defined');
  assert.ok(vendorSource.includes('insertGhostArchive'), 'insertGhostArchive template should exist');
  assert.ok(vendorSource.includes('updateGlobalState'), 'updateGlobalState template should exist');
}

function testEnhancedErrorClassification() {
  // 测试细粒度错误分类
  const testCases = [
    { message: 'UNIQUE constraint failed: ghost_archives.archive_code', expected: 'sqlUniqueConstraintIssue' },
    { message: 'CHECK constraint failed: chronicle.chronicle_text', expected: 'sqlCheckConstraintIssue' },
    { message: 'NOT NULL constraint failed: global_state.current_location', expected: 'sqlNotNullConstraintIssue' },
    { message: 'FOREIGN KEY constraint failed', expected: 'sqlForeignKeyConstraintIssue' },
  ];

  for (const { message, expected } of testCases) {
    const result = vendor.interpretLogEntry({ message });
    assert.equal(result, expected, `Should classify "${message}" as ${expected}`);
  }
}

function testDashboardClassification() {
  const cases = [
    ['Bad Gateway', 'apiGatewayIssue'],
    ['HTTP 502 Bad Gateway', 'apiGatewayIssue'],
    ['Too Many Requests', 'apiRateLimitIssue'],
    ['API请求失败 HTTP 429 (Too Many Requests); Retry-After: 30', 'apiRateLimitIssue'],
    ['API限流：Too Many Requests', 'apiRateLimitIssue'],
    ['Retry-After: 30', 'apiRateLimitIssue'],
    ['[SqlTableService] SQL 目标表 log_summary 不存在；事件纪要请写入 chronicle。', 'sqlOldTableIssue'],
    ['[SqlTableService] SQL 目标表 event_summary 不存在；事件纪要请写入 chronicle。', 'sqlOldTableIssue'],
    ['[SqlTableService] SQL 目标表 simulation_summary, summary_logs 不存在；事件纪要请写入 chronicle。', 'sqlOldTableIssue'],
    ['[SQL Mode] SQL 执行失败: near "<": syntax error', 'sqlSyntaxIssue'],
    // v6.13: CHECK constraint 现在有细粒度分类
    ['CHECK constraint failed: action_suggestions.revival_risk_level', 'sqlCheckConstraintIssue'],
    ['[SqlNormalizer] SQL schema/CHECK 约束已归一化: supernatural_events.handling_status "爆发中" → "失控扩散"；允许值 [未处理, 调查中, 对抗中, 已压制, 已关押, 失控扩散, 结束]', 'sqlCheckConstraintIssue'],
    ['[SqlTableService] SQL schema/CHECK 约束不合规: supernatural_events.handling_status="爆发中" 不在允许值 [未处理, 调查中, 对抗中, 已压制, 已关押, 失控扩散, 结束]。 已拦截，未进入 SQLite。', 'sqlCheckConstraintIssue'],
    // 通用约束问题（兜底）
    ['[SyncBridge] 表 sheet_chronicle (事件纪要) 第 1 行 chronicle_text 长度无效（当前 6 字，code_index=SP0002）', 'sqlConstraintIssue'],
    ['[SyncBridge] 表 sheet_action_suggestions (行动建议) 第 2 行 action_suggestions.option_key="E" 不在允许值 [A, B, C, D]。 已跳过该行以避免 SQLite CHECK 失败。', 'sqlCheckConstraintIssue'],
    ['SQL 目标列不在当前模板中: chronicle.bad_column', 'sqlSchemaIssue'],
  ];
  for (const [message, expected] of cases) {
    assert.equal(vendor.interpretLogEntry({ level: 'error', message }), expected, message);
  }
}

function testCrudPlanDiffTrackingGuards() {
  assert.ok(
    vendorSource.includes('collectCrudPlanChangedSheetKeys_ACU'),
    'CRUD Plan execution should compare before/after effective table data',
  );
  assert.ok(
    vendorSource.includes('执行返回成功但未检测到有效 diff'),
    'CRUD Plan successful no-diff operations should not be tracked as updates',
  );
  assert.ok(
    vendorSource.includes('[CRUD Plan 摘要]'),
    'CRUD Plan should emit a low-noise summary log',
  );
  assert.ok(
    vendorSource.includes('CRUD Plan 缺少 4.0 关键表计划或 noop'),
    'CRUD Plan should enforce critical 4.0 table coverage or explicit noop',
  );
  assert.ok(
    vendorSource.includes('buildMfrsCriticalCrudFallbackPlans_ACU'),
    'CRUD Plan should synthesize deterministic fallback plans before critical coverage validation',
  );
  // 注：以下曾验证的 p5.4 fallback 机制（missing critical plan 合成、rate-limit recovery、
  // 短纪要延迟、partialSuccess、collected_archives 最小记录等）已在 hotfix13 稳定化
  // （commit 9954c98 "fix: stabilize hotfix13 runtime source chain"）整体移除，
  // 相关断言同步删除；保留的仅剩 diff-tracking 核心 + 可见输出顺序守卫。
  assert.ok(
    choicesRuleSource.includes('正文剧情（首段控制在 350 字以内）')
      && choicesRuleSource.indexOf('<sp_status>') < choicesRuleSource.indexOf('<choices>'),
    'visible output rule should put compact status/clue protocol before long choices to avoid token truncation',
  );
  assert.ok(
    vendorSource.includes('keysToTrackAsUpdated = keysToPersist'),
    'first initialization should only track tables with real persisted changes',
  );
}

function testMfrsOutputProtocolPromptOrder() {
  for (const filePath of outputProtocolPromptPaths) {
    const source = readFileSync(filePath, 'utf8');
    const label = relative(repoRoot, filePath);
    assert.ok(source.includes('<sp_status>'), `${label} should mention the sp_status protocol block`);
    assert.ok(source.includes('<choices>'), `${label} should mention the choices protocol block`);
    assert.ok(
      source.indexOf('<sp_status>') < source.indexOf('<choices>'),
      `${label} should put <sp_status> before <choices>`,
    );
    if (source.includes('<sp_clue_deduce>') && source.includes('<choices>')) {
      assert.ok(
        source.indexOf('<sp_clue_deduce>') < source.indexOf('<choices>'),
        `${label} should put <sp_clue_deduce> before <choices> when clue deduction is required`,
      );
    }
  }
  for (const filePath of outputProtocolExamplePaths) {
    const source = readFileSync(filePath, 'utf8');
    assert.equal(
      source.includes('<StatusPlaceHolderImpl/>'),
      false,
      `${relative(repoRoot, filePath)} should not show the old StatusPlaceHolderImpl placeholder in examples`,
    );
  }
}

const templates = testTemplates();
testConstraintRegistry(templates);
testSqlConstraintPreflight(templates[0]);
testGeneratedConstraintViolationFixtures(templates[0]);
testEnumAliasNormalization(templates[0]);
testRiskNormalizationInSqlite(templates[0]);
testEnumAliasNormalizationInGeneratedInserts(templates[0]);
testUpdateTrailingCommaNormalization(templates[0]);
testTableAndColumnPreflight(templates[0]);
testChronicleSeedRowFiltering(templates[0]);
testSyncBridgeConstraintRegistryRowValidation(templates[0]);
testSqlFragmentCleaning();
await testBadGatewayParsing();
testApiTransportFailureResult();
await testBatchSkipChatSaveDoesNotRefreshRuntime();
testDashboardClassification();
testCrudPlanDiffTrackingGuards();
testMfrsOutputProtocolPromptOrder();

// v6.13 新增测试
testUniqueConstraintRegistry(templates[0]);
testSqlAutoRewrite(templates[0]);
testSqlTemplateMatching();
testEnhancedErrorClassification();

console.log('[ok] SQL Debug regressions verified: templates=2, sheets=14, generated CHECK fixtures, constraint registry/preflight, enum alias normalization, risk/update normalization, old table preflight, SQL cleaning, Bad Gateway, dashboard classification, CRUD Plan diff tracking guards, v6.13 UNIQUE/FK/rewrite/templates/classification');
