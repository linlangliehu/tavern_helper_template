type Primitive = string | number | boolean | null;
type CellValue = Primitive | undefined;

export type TableChangeAction = 'updateCell' | 'insertRow' | 'deleteRow' | 'noop';

export type TableChangeMatch = {
  rowIndex?: number;
  row_id?: Primitive;
  conditions?: Record<string, Primitive>;
} & Record<string, unknown>;

export type TableChangePlan = {
  action: TableChangeAction;
  table?: string;
  match?: TableChangeMatch;
  column?: string;
  value?: Primitive;
  set?: Record<string, Primitive>;
  data?: Record<string, Primitive>;
  reason?: string;
  confidence?: number;
  skipChatSave?: boolean;
  silent?: boolean;
};

export type TableChangeErrorCode =
  | 'INVALID_PLAN'
  | 'TABLE_NOT_FOUND'
  | 'ROW_NOT_FOUND'
  | 'MULTIPLE_ROWS_MATCHED'
  | 'COLUMN_NOT_FOUND'
  | 'NOT_NULL_VIOLATION'
  | 'CHECK_IN_VIOLATION'
  | 'CHECK_RANGE_VIOLATION'
  | 'CHECK_PATTERN_VIOLATION'
  | 'LENGTH_VIOLATION'
  | 'CHRONICLE_APPEND_ONLY'
  | 'CHRONICLE_CODE_IMMUTABLE'
  | 'TABLE_DELETE_FORBIDDEN'
  | 'TABLE_INSERT_FORBIDDEN'
  | 'API_UNAVAILABLE'
  | 'API_MUTATION_FAILED';

export type TableChangeError = {
  code: TableChangeErrorCode;
  message: string;
  table?: string;
  column?: string;
  value?: Primitive;
};

export type TableChangeResult = {
  ok: boolean;
  action: TableChangeAction;
  table?: string;
  rowIndex?: number;
  affectedColumns?: string[];
  insertedRowIndex?: number;
  errors: TableChangeError[];
};

export type AutoCardUpdaterCrudApi = {
  exportTableAsJson?: () => unknown | Promise<unknown>;
  importTableAsJson?: (
    jsonString: string,
    options?: { skipChatSave?: boolean; skipNotify?: boolean; silent?: boolean },
  ) => boolean | Promise<boolean>;
  updateCell?: (
    tableNameOrOptions:
      | string
      | {
          tableName?: string;
          table?: string;
          rowIndex?: number;
          row?: number;
          column?: string;
          colIdentifier?: string;
          value?: Primitive;
          skipChatSave?: boolean;
          silent?: boolean;
        },
    rowIndex?: number,
    colIdentifier?: string,
    value?: Primitive,
  ) => boolean | Promise<boolean>;
  insertRow?: (
    tableNameOrOptions:
      | string
      | {
          tableName?: string;
          table?: string;
          data?: Record<string, Primitive>;
          skipChatSave?: boolean;
          silent?: boolean;
        },
    data?: Record<string, Primitive>,
  ) => number | Promise<number>;
  deleteRow?: (
    tableNameOrOptions:
      | string
      | {
          tableName?: string;
          table?: string;
          rowIndex?: number;
          row?: number;
          skipChatSave?: boolean;
          silent?: boolean;
        },
    rowIndex?: number,
  ) => boolean | Promise<boolean>;
  refreshDataAndWorldbook?: () => unknown | Promise<unknown>;
};

type SheetLike = {
  __recordKey?: string;
  uid?: string;
  name?: string;
  sourceData?: {
    ddl?: string;
  };
  content?: unknown;
};

type ColumnMeta = {
  header: string;
  index: number;
  physicalName?: string;
  commentAlias?: string;
  notNull: boolean;
  primaryKey: boolean;
  unique: boolean;
  checkIn?: string[];
  checkGlob?: string;
  minValue?: number;
  maxValue?: number;
  minLength?: number;
  maxLength?: number;
};

export type TableMetaSummary = {
  uid?: string;
  name: string;
  sqlName?: string;
  columns: Array<{
    header: string;
    physicalName?: string;
    commentAlias?: string;
    notNull: boolean;
    primaryKey: boolean;
    unique: boolean;
    checkIn?: string[];
    checkGlob?: string;
    minValue?: number;
    maxValue?: number;
    minLength?: number;
    maxLength?: number;
  }>;
};

type TableMeta = {
  key: string;
  uid?: string;
  name: string;
  sqlName?: string;
  sheet: SheetLike;
  headers: string[];
  rows: unknown[][];
  columns: ColumnMeta[];
  columnAliases: Map<string, ColumnMeta>;
};

type ResolvedPlan = {
  plan: TableChangePlan;
  table: TableMeta;
  rowIndex?: number;
  values: Record<string, Primitive>;
  columns: ColumnMeta[];
  errors: TableChangeError[];
};

export const tableChangePlanSchemaDescription = {
  action: ['updateCell', 'insertRow', 'deleteRow', 'noop'],
  table: '用户可见表名、sheet uid 或 DDL 物理表名',
  match: {
    rowIndex: '数据库表 content 中的数据行索引，1 是第一条数据行',
    row_id: '优先匹配 row_id/行号',
    conditions: '列名到值的精确匹配；列名可用中文表头、DDL 物理列名或注释 alias',
  },
  updateCell: {
    column: '单列更新的目标列',
    value: '单列更新的目标值',
    set: '多列更新时使用的列值对象',
  },
  insertRow: {
    data: '新增行的列值对象',
  },
  deleteRow: {
    match: '必须能唯一定位一行',
  },
} as const;

export function normalizeExportedTableData(exported: unknown) {
  if (typeof exported !== 'string') return exported;
  try {
    return JSON.parse(exported) as unknown;
  } catch {
    return exported;
  }
}

export function listTableMetadata(currentData: unknown, templateData?: unknown): TableMetaSummary[] {
  return buildTables(currentData, templateData).map(table => ({
    uid: table.uid,
    name: table.name,
    sqlName: table.sqlName,
    columns: table.columns.map(column => ({
      header: column.header,
      physicalName: column.physicalName,
      commentAlias: column.commentAlias,
      notNull: column.notNull,
      primaryKey: column.primaryKey,
      unique: column.unique,
      checkIn: column.checkIn,
      checkGlob: column.checkGlob,
      minValue: column.minValue,
      maxValue: column.maxValue,
      minLength: column.minLength,
      maxLength: column.maxLength,
    })),
  }));
}

export function previewTableChangePlan(
  planInput: unknown,
  currentData: unknown,
  templateData?: unknown,
): TableChangeResult {
  const resolved = resolvePlan(planInput, currentData, templateData);
  return toResult(resolved);
}

export async function applyTableChangePlan(
  api: AutoCardUpdaterCrudApi,
  planInput: unknown,
  currentData: unknown,
  templateData?: unknown,
): Promise<TableChangeResult> {
  const resolved = resolvePlan(planInput, currentData, templateData);
  const preview = toResult(resolved);
  if (!preview.ok || !resolved) return preview;
  if (resolved.plan.action === 'noop') return preview;
  const baselineData = cloneDataSnapshot(currentData);

  if (resolved.plan.action === 'insertRow') {
    if (!api.insertRow) {
      const fallbackRowIndex = await tryImportJsonInsertFallback(api, resolved, currentData);
      if (typeof fallbackRowIndex === 'number' && fallbackRowIndex >= 0) {
        return { ...preview, insertedRowIndex: fallbackRowIndex };
      }
      return withError(preview, 'API_UNAVAILABLE', '数据库 API 不支持 insertRow。');
    }
    const insertOptions: {
      tableName: string;
      skipChatSave?: boolean;
      silent?: boolean;
      data?: Record<string, Primitive>;
    } = { tableName: resolved.table.name };
    if (resolved.plan.skipChatSave) insertOptions.skipChatSave = true;
    if (resolved.plan.silent) insertOptions.silent = true;
    const insertValues = toApiInsertValues(resolved);
    if (Object.keys(insertValues).length === 0) {
      return withError(preview, 'API_MUTATION_FAILED', 'insertRow 没有可执行列，已阻止底层 DEFAULT VALUES。');
    }
    // 真实 vendor 的 insertRow 第一参为对象时按选项包解析，只从 options.data 取数据并忽略第二参，
    // 因此必须用单参 { tableName, data } 形态；旧的两参调用 (insertOptions, insertValues) 第一次必失败，
    // 靠后续单参重试兜底，徒增一次 "data must be an object" 错误日志。
    insertOptions.data = insertValues;
    let insertedRowIndex = await api.insertRow(insertOptions);
    if (typeof insertedRowIndex !== 'number' || insertedRowIndex < 0) {
      const verifiedRowIndex = await verifyInsertAppliedAfterFailedResult(api, resolved, baselineData);
      if (typeof verifiedRowIndex === 'number' && verifiedRowIndex >= 0) {
        return { ...preview, insertedRowIndex: verifiedRowIndex };
      }
      const fallbackRowIndex = await tryImportJsonInsertFallback(api, resolved, baselineData);
      if (typeof fallbackRowIndex === 'number' && fallbackRowIndex >= 0) {
        return { ...preview, insertedRowIndex: fallbackRowIndex };
      }
      return withError(preview, 'API_MUTATION_FAILED', 'insertRow 执行失败。');
    }

    const verifiedRowIndex = await verifyInsertAppliedAfterFailedResult(api, resolved, baselineData);
    if (typeof verifiedRowIndex === 'number' && verifiedRowIndex >= 0) {
      return { ...preview, insertedRowIndex: verifiedRowIndex };
    }
    const fallbackRowIndex = await tryImportJsonInsertFallback(api, resolved, baselineData);
    if (typeof fallbackRowIndex === 'number' && fallbackRowIndex >= 0) {
      return { ...preview, insertedRowIndex: fallbackRowIndex };
    }
    return { ...preview, insertedRowIndex };
  }

  if (resolved.rowIndex === undefined) {
    return withError(preview, 'ROW_NOT_FOUND', '缺少可执行的行索引。');
  }

  if (resolved.plan.action === 'deleteRow') {
    if (!api.deleteRow) {
      if (await tryImportJsonDeleteFallback(api, resolved, currentData)) return preview;
      return withError(preview, 'API_UNAVAILABLE', '数据库 API 不支持 deleteRow。');
    }
    const ok = await api.deleteRow({
      tableName: resolved.table.name,
      rowIndex: resolved.rowIndex,
      skipChatSave: resolved.plan.skipChatSave,
      silent: resolved.plan.silent,
    });
    if (!ok && await verifyDeleteAppliedAfterFailedResult(api, resolved, baselineData)) return preview;
    if (!ok && await tryImportJsonDeleteFallback(api, resolved, baselineData)) return preview;
    return ok ? preview : withError(preview, 'API_MUTATION_FAILED', 'deleteRow 执行失败。');
  }

  if (!api.updateCell) {
    if (await tryImportJsonUpdateFallback(api, resolved, currentData)) return preview;
    return withError(preview, 'API_UNAVAILABLE', '数据库 API 不支持 updateCell。');
  }
  for (const column of resolved.columns) {
    const ok = await api.updateCell({
      tableName: resolved.table.name,
      rowIndex: resolved.rowIndex,
      column: column.header,
      value: resolved.values[column.header],
      skipChatSave: resolved.plan.skipChatSave,
      silent: resolved.plan.silent,
    });
    if (!ok) {
      if (await verifyUpdateAppliedAfterFailedResult(api, resolved, column)) continue;
      if (await tryImportJsonUpdateFallback(api, resolved, baselineData)) return preview;
      return withError(preview, 'API_MUTATION_FAILED', `updateCell 执行失败：${column.header}。`, column.header);
    }
  }

  return preview;
}

function cloneDataSnapshot(data: unknown) {
  const normalized = normalizeExportedTableData(data);
  if (!isRecord(normalized)) return data;
  try {
    return JSON.parse(JSON.stringify(normalized));
  } catch {
    return normalized;
  }
}

function toApiInsertValues(resolved: ResolvedPlan) {
  const values = { ...resolved.values };
  for (const column of resolved.columns) {
    if (column.primaryKey && values[column.header] == null) delete values[column.header];
  }
  return values;
}

async function verifyInsertAppliedAfterFailedResult(
  api: AutoCardUpdaterCrudApi,
  resolved: ResolvedPlan,
  currentData: unknown,
) {
  const verifiedData = await exportVerifiedData(api);
  const verifiedContent = getSheetContent(verifiedData, resolved.table);
  if (!verifiedContent) return null;

  const beforeContent = getSheetContent(normalizeRecordData(currentData), resolved.table);
  const beforeCount = beforeContent ? countRowsMatchingPlan(beforeContent, resolved) : 0;
  const matches = findRowsMatchingResolvedValues(verifiedContent, resolved);
  if (matches.length <= beforeCount) return null;
  return matches[matches.length - 1];
}

async function verifyDeleteAppliedAfterFailedResult(
  api: AutoCardUpdaterCrudApi,
  resolved: ResolvedPlan,
  currentData: unknown,
) {
  const verifiedData = await exportVerifiedData(api);
  const beforeContent = getSheetContent(normalizeRecordData(currentData), resolved.table);
  const verifiedContent = getSheetContent(verifiedData, resolved.table);
  if (!beforeContent || !verifiedContent) return false;
  return wasDeleteApplied(beforeContent, verifiedContent, resolved);
}

async function verifyUpdateAppliedAfterFailedResult(
  api: AutoCardUpdaterCrudApi,
  resolved: ResolvedPlan,
  column: ColumnMeta,
) {
  if (resolved.rowIndex === undefined) return false;
  const verifiedData = await exportVerifiedData(api);
  const verifiedContent = getSheetContent(verifiedData, resolved.table);
  const row = verifiedContent?.[resolved.rowIndex];
  return Array.isArray(row)
    && normalizeCellValue(row[column.index]) === normalizeCellValue(resolved.values[column.header]);
}

async function exportVerifiedData(api: AutoCardUpdaterCrudApi) {
  if (!api.exportTableAsJson) return null;
  try {
    const exported = await api.exportTableAsJson();
    return normalizeRecordData(exported);
  } catch {
    return null;
  }
}

function normalizeRecordData(data: unknown) {
  const normalized = normalizeExportedTableData(data);
  return isRecord(normalized) ? normalized : null;
}

function getSheetContent(data: Record<string, unknown> | null, table: TableMeta) {
  if (!data) return null;
  const sheet = findSheetInData(data, table);
  if (!sheet || !Array.isArray(sheet.content)) return null;
  return sheet.content.filter((row): row is unknown[] => Array.isArray(row));
}

function findRowsMatchingResolvedValues(content: unknown[][], resolved: ResolvedPlan) {
  const matches: number[] = [];
  for (let rowIndex = 1; rowIndex < content.length; rowIndex += 1) {
    if (rowMatchesResolvedValues(content[rowIndex], resolved)) matches.push(rowIndex);
  }
  return matches;
}

function rowMatchesResolvedValues(row: unknown[], resolved: ResolvedPlan) {
  if (resolved.columns.length === 0) return false;
  return resolved.columns.every(column =>
    normalizeCellValue(row[column.index]) === normalizeCellValue(resolved.values[column.header]),
  );
}

function countRowsMatchingPlan(content: unknown[][], resolved: ResolvedPlan) {
  return findRowsMatchingResolvedValues(content, resolved).length;
}

function wasDeleteApplied(beforeContent: unknown[][], verifiedContent: unknown[][], resolved: ResolvedPlan) {
  if (resolved.rowIndex === undefined) return false;
  const targetRow = beforeContent[resolved.rowIndex];
  if (!Array.isArray(targetRow)) return false;
  return countRowsEqualTo(verifiedContent, targetRow) < countRowsEqualTo(beforeContent, targetRow);
}

function countRowsEqualTo(content: unknown[][], targetRow: unknown[]) {
  return content.slice(1).filter(row => rowsEqual(row, targetRow)).length;
}

function rowsEqual(left: unknown[], right: unknown[]) {
  return left.length === right.length
    && left.every((value, index) => normalizeCellValue(value) === normalizeCellValue(right[index]));
}

async function tryImportJsonInsertFallback(
  api: AutoCardUpdaterCrudApi,
  resolved: ResolvedPlan,
  currentData: unknown,
) {
  const cloned = cloneImportableData(api, currentData);
  if (!cloned) return null;
  const sheet = findSheetInData(cloned, resolved.table);
  if (!sheet || !Array.isArray(sheet.content) || !Array.isArray(sheet.content[0])) return null;
  ensureImportSheetUsesResolvedHeader(sheet, resolved.table);

  const newRow = new Array(sheet.content[0].length).fill('');
  for (const column of resolved.table.columns) {
    if (!column.primaryKey) continue;
    const explicitValue = resolved.values[column.header];
    newRow[column.index] = explicitValue ?? nextPrimaryKeyValue(sheet.content, column.index);
  }
  for (const column of resolved.columns) {
    if (column.primaryKey) continue;
    newRow[column.index] = resolved.values[column.header] ?? '';
  }

  sheet.content.push(newRow);
  return await importJsonData(api, cloned, resolved) ? sheet.content.length - 1 : null;
}

async function tryImportJsonUpdateFallback(
  api: AutoCardUpdaterCrudApi,
  resolved: ResolvedPlan,
  currentData: unknown,
) {
  if (resolved.rowIndex === undefined) return false;
  const cloned = cloneImportableData(api, currentData);
  if (!cloned) return false;
  const sheet = findSheetInData(cloned, resolved.table);
  if (!sheet || !Array.isArray(sheet.content)) return false;
  const row = sheet.content[resolved.rowIndex];
  if (!Array.isArray(row)) return false;
  for (const column of resolved.columns) {
    row[column.index] = resolved.values[column.header] ?? '';
  }
  return importJsonData(api, cloned, resolved);
}

async function tryImportJsonDeleteFallback(
  api: AutoCardUpdaterCrudApi,
  resolved: ResolvedPlan,
  currentData: unknown,
) {
  if (resolved.rowIndex === undefined) return false;
  const cloned = cloneImportableData(api, currentData);
  if (!cloned) return false;
  const sheet = findSheetInData(cloned, resolved.table);
  if (!sheet || !Array.isArray(sheet.content) || !Array.isArray(sheet.content[resolved.rowIndex])) return false;
  sheet.content.splice(resolved.rowIndex, 1);
  return importJsonData(api, cloned, resolved);
}

function cloneImportableData(api: AutoCardUpdaterCrudApi, currentData: unknown) {
  if (!api.importTableAsJson) return null;
  const normalized = normalizeExportedTableData(currentData);
  if (!isRecord(normalized)) return null;
  try {
    return JSON.parse(JSON.stringify(normalized)) as Record<string, unknown>;
  } catch {
    return null;
  }
}

async function importJsonData(api: AutoCardUpdaterCrudApi, data: Record<string, unknown>, resolved: ResolvedPlan) {
  if (!api.importTableAsJson) return false;
  return api.importTableAsJson(JSON.stringify(data), {
    skipChatSave: resolved.plan.skipChatSave,
    skipNotify: resolved.plan.silent,
    silent: resolved.plan.silent,
  });
}

function findSheetInData(data: Record<string, unknown>, table: TableMeta) {
  for (const value of Object.values(data)) {
    if (!isSheetLike(value)) continue;
    if ((table.uid && value.uid === table.uid) || value.name === table.name) return value;
  }
  return null;
}

function ensureImportSheetUsesResolvedHeader(sheet: SheetLike, table: TableMeta) {
  if (!Array.isArray(sheet.content) || !Array.isArray(sheet.content[0])) return;
  if (!Array.isArray(table.sheet.content) || !Array.isArray(table.sheet.content[0])) return;

  const currentHeader = sheet.content[0].map(value => String(value));
  const resolvedHeader = table.sheet.content[0].map(value => String(value));
  if (resolvedHeader.length <= currentHeader.length) return;

  try {
    sheet.content = JSON.parse(JSON.stringify(table.sheet.content));
  } catch {
    sheet.content = table.sheet.content.map(row => Array.isArray(row) ? [...row] : row);
  }
}

function nextPrimaryKeyValue(rows: unknown[][], columnIndex: number) {
  const max = rows
    .slice(1)
    .map(row => Number(row[columnIndex]))
    .filter(Number.isFinite)
    .reduce((highest, value) => Math.max(highest, value), 0);
  return max + 1;
}

function toResult(resolved: ResolvedPlan | null): TableChangeResult {
  if (!resolved) {
    return {
      ok: false,
      action: 'noop',
      errors: [{ code: 'INVALID_PLAN', message: 'tableChangePlan 必须是对象。' }],
    };
  }

  return {
    ok: resolved.errors.length === 0,
    action: resolved.plan.action,
    table: resolved.table.name,
    rowIndex: resolved.rowIndex,
    affectedColumns: resolved.columns.map(column => column.header),
    errors: resolved.errors,
  };
}

function withError(
  result: TableChangeResult,
  code: TableChangeErrorCode,
  message: string,
  column?: string,
): TableChangeResult {
  return {
    ...result,
    ok: false,
    errors: [...result.errors, { code, message, table: result.table, column }],
  };
}

function resolvePlan(planInput: unknown, currentData: unknown, templateData?: unknown): ResolvedPlan | null {
  if (!isRecord(planInput)) return null;
  if (!isTableChangeAction(planInput.action)) {
    return {
      plan: { action: 'noop' },
      table: createMissingTable(),
      values: {},
      columns: [],
      errors: [{ code: 'INVALID_PLAN', message: 'action 必须是 updateCell/insertRow/deleteRow/noop。' }],
    };
  }

  const plan = normalizePlan(planInput);
  const tables = buildTables(currentData, templateData);
  const errors: TableChangeError[] = [];

  if (plan.action === 'noop') {
    return {
      plan,
      table: createMissingTable(),
      values: {},
      columns: [],
      errors: [],
    };
  }

  const table = findTable(tables, plan.table);
  if (!table) {
    return {
      plan,
      table: createMissingTable(plan.table),
      values: {},
      columns: [],
      errors: [{ code: 'TABLE_NOT_FOUND', message: `未找到表：${String(plan.table ?? '')}。`, table: plan.table }],
    };
  }

  const values = extractPlanValues(plan, errors);
  applyGeneratedInsertDefaults(table, plan, values);
  let columns = resolveColumns(table, values, errors);

  const duplicateInsert = tryPromoteDuplicateInsertToUpdate(table, plan, values, columns, errors);
  if (duplicateInsert) {
    const promotedErrors = [...duplicateInsert.errors];
    const promotedValues = { ...duplicateInsert.values };
    const promotedColumns = resolveColumns(table, promotedValues, promotedErrors);
    validateColumnValues(table, promotedColumns, promotedValues, duplicateInsert.plan.action, promotedErrors);
    return {
      plan: duplicateInsert.plan,
      table,
      rowIndex: duplicateInsert.rowIndex,
      values: promotedValues,
      columns: promotedColumns,
      errors: promotedErrors,
    };
  }

  validateColumnValues(table, columns, values, plan.action, errors);

  let rowIndex = plan.action === 'insertRow' ? undefined : resolveRowIndex(table, plan.match, errors);

  validateTableMutationPolicy(table, plan, values, errors);
  validateChronicleAppendOnly(table, plan, values, rowIndex, errors);

  const promoted = tryPromoteMissingFixedRowUpdateToInsert(table, plan, values, rowIndex, errors);
  if (promoted) {
    columns = resolveColumns(table, promoted.values, promoted.errors);
    validateColumnValues(table, columns, promoted.values, promoted.plan.action, promoted.errors);
    return {
      plan: promoted.plan,
      table,
      rowIndex: undefined,
      values: promoted.values,
      columns,
      errors: promoted.errors,
    };
  }

  return { plan, table, rowIndex, values, columns, errors };
}

function tryPromoteDuplicateInsertToUpdate(
  table: TableMeta,
  plan: TableChangePlan,
  values: Record<string, Primitive>,
  columns: ColumnMeta[],
  errors: TableChangeError[],
) {
  if (plan.action !== 'insertRow') return null;
  if (errors.some(error => error.code === 'COLUMN_NOT_FOUND')) return null;

  const duplicateRowIndex = findDuplicateInsertRowIndex(table, values, columns);
  if (duplicateRowIndex === undefined) return null;

  const updateValues: Record<string, Primitive> = {};
  for (const column of columns) {
    if (column.primaryKey) continue;
    if (!Object.prototype.hasOwnProperty.call(values, column.header)) continue;
    updateValues[column.header] = values[column.header] ?? null;
  }
  if (Object.keys(updateValues).length === 0) {
    return {
      plan: { ...plan, action: 'noop' as const, data: undefined },
      rowIndex: duplicateRowIndex,
      values: {},
      errors: [],
    };
  }

  return {
    plan: {
      ...plan,
      action: 'updateCell' as const,
      match: { rowIndex: duplicateRowIndex },
      data: undefined,
      set: updateValues,
    },
    rowIndex: duplicateRowIndex,
    values: updateValues,
    errors: [],
  };
}

function findDuplicateInsertRowIndex(
  table: TableMeta,
  values: Record<string, Primitive>,
  columns: ColumnMeta[],
) {
  const keyColumns = columns.filter(column =>
    (column.primaryKey || column.unique)
    && Object.prototype.hasOwnProperty.call(values, column.header)
    && !isBlank(values[column.header])
  );

  for (const column of keyColumns) {
    const expected = values[column.header];
    const matches = table.rows
      .map((row, rowIndex) => ({ row, rowIndex }))
      .filter(({ rowIndex }) => rowIndex > 0)
      .filter(({ row }) => normalizeCellValue(row[column.index]) === normalizeCellValue(expected));
    if (matches.length === 1) return matches[0].rowIndex;
  }

  return undefined;
}

function applyGeneratedInsertDefaults(
  table: TableMeta,
  plan: TableChangePlan,
  values: Record<string, Primitive>,
) {
  if (plan.action !== 'insertRow') return;
  if (!isChronicleTable(table)) return;
  const codeIndexColumn = findColumnByAlias(table, 'code_index');
  if (!codeIndexColumn || hasColumnValue(table, values, codeIndexColumn)) return;
  values[codeIndexColumn.header] = nextChronicleCodeIndex(table, codeIndexColumn);
}

function tryPromoteMissingFixedRowUpdateToInsert(
  table: TableMeta,
  plan: TableChangePlan,
  values: Record<string, Primitive>,
  rowIndex: number | undefined,
  errors: TableChangeError[],
) {
  if (plan.action !== 'updateCell' || rowIndex !== undefined) return null;
  if (!errors.some(error => error.code === 'ROW_NOT_FOUND')) return null;

  const primaryKeyColumn = getRowIdPrimaryKeyColumn(table);
  if (!primaryKeyColumn || primaryKeyColumn.minValue === undefined || primaryKeyColumn.maxValue === undefined) return null;
  const matchedRowId = getPromotablePrimaryKeyValue(table, plan.match, primaryKeyColumn);
  if (matchedRowId === undefined || matchedRowId === null) return null;
  const numericRowId = typeof matchedRowId === 'number' ? matchedRowId : Number(String(matchedRowId).trim());
  if (!Number.isFinite(numericRowId)
    || numericRowId < primaryKeyColumn.minValue
    || numericRowId > primaryKeyColumn.maxValue) {
    return null;
  }
  if (tableHasPrimaryKeyRow(table, primaryKeyColumn, matchedRowId)) return null;

  const promotedValues = { ...values, [primaryKeyColumn.header]: matchedRowId };
  return {
    plan: {
      ...plan,
      action: 'insertRow' as const,
      match: undefined,
      data: promotedValues,
    },
    values: promotedValues,
    errors: errors.filter(error => error.code !== 'ROW_NOT_FOUND'),
  };
}

function normalizePlan(record: Record<string, unknown>): TableChangePlan {
  const action = typeof record.action === 'string' ? record.action : 'noop';
  const plan: TableChangePlan = {
    action: isTableChangeAction(action) ? action : 'noop',
    table: typeof record.table === 'string' ? record.table : undefined,
    match: isRecord(record.match) ? (record.match as TableChangeMatch) : undefined,
    reason: typeof record.reason === 'string' ? record.reason : undefined,
    confidence: typeof record.confidence === 'number' ? record.confidence : undefined,
  };

  if (typeof record.column === 'string') plan.column = record.column;
  if (isPrimitive(record.value)) plan.value = record.value;
  if (isPrimitiveRecord(record.set)) plan.set = record.set;
  if (isPrimitiveRecord(record.data)) plan.data = record.data;
  if (record.skipChatSave === true) plan.skipChatSave = true;
  if (record.silent === true) plan.silent = true;
  return plan;
}

function extractPlanValues(plan: TableChangePlan, errors: TableChangeError[]) {
  if (plan.action === 'insertRow') {
    if (plan.data) return plan.data;
    errors.push({ code: 'INVALID_PLAN', message: 'insertRow 需要 data。', table: plan.table });
    return {};
  }

  if (plan.action === 'deleteRow' || plan.action === 'noop') return {};

  const values: Record<string, Primitive> = {};
  if (plan.set) Object.assign(values, plan.set);
  if (plan.column) {
    values[plan.column] = plan.value ?? null;
  }
  if (Object.keys(values).length === 0) {
    errors.push({ code: 'INVALID_PLAN', message: 'updateCell 需要 column/value 或 set。', table: plan.table });
  }
  return values;
}

function buildTables(currentData: unknown, templateData?: unknown): TableMeta[] {
  const templateSheets = normalizeSheets(templateData);
  const currentSheets = normalizeSheets(currentData);
  const templateAliases = buildSheetAliasMap(templateSheets);

  return currentSheets.map((sheet, index) => {
    const fallback = findTemplateSheetFallback(templateAliases, sheet);
    const content = mergeContentWithTemplateHeader(sheet, fallback);
    const mergedSheet: SheetLike = {
      ...fallback,
      ...sheet,
      uid: sheet.uid ?? fallback?.uid ?? sheet.__recordKey,
      name: sheet.name ?? fallback?.name ?? sheet.__recordKey,
      content,
      sourceData: {
        ...fallback?.sourceData,
        ...sheet.sourceData,
      },
    };
    return buildTableMeta(mergedSheet, `sheet_${index}`);
  });
}

function normalizeSheets(data: unknown): SheetLike[] {
  if (!data || typeof data !== 'object') return [];
  const record = data as Record<string, unknown>;
  const sheets = record.sheets && typeof record.sheets === 'object' ? (record.sheets as Record<string, unknown>) : record;
  return Object.entries(sheets)
    .map(([recordKey, value]) => (isSheetLike(value) ? { ...(value as SheetLike), __recordKey: recordKey } : null))
    .filter((sheet): sheet is SheetLike => Boolean(sheet));
}

function buildSheetAliasMap(sheets: SheetLike[]) {
  const aliases = new Map<string, SheetLike>();
  for (const sheet of sheets) {
    addSheetAlias(aliases, sheet.__recordKey, sheet);
    addSheetAlias(aliases, sheet.uid, sheet);
    addSheetAlias(aliases, sheet.name, sheet);
    addSheetAlias(aliases, parseDdl(sheet.sourceData?.ddl).tableName, sheet);
  }
  return aliases;
}

function findTemplateSheetFallback(templateAliases: Map<string, SheetLike>, sheet: SheetLike) {
  const candidates = [
    sheet.__recordKey,
    sheet.uid,
    sheet.name,
    parseDdl(sheet.sourceData?.ddl).tableName,
  ];
  for (const candidate of candidates) {
    const fallback = templateAliases.get(normalizeAlias(candidate));
    if (fallback) return fallback;
  }
  return undefined;
}

function addSheetAlias(aliasMap: Map<string, SheetLike>, alias: string | undefined, sheet: SheetLike) {
  const normalized = normalizeAlias(alias);
  if (normalized && !aliasMap.has(normalized)) aliasMap.set(normalized, sheet);
}

function buildTableMeta(sheet: SheetLike, key: string): TableMeta {
  const content = Array.isArray(sheet.content) ? sheet.content : [];
  const headers = Array.isArray(content[0]) ? content[0].map(value => String(value)) : [];
  const rows = content.filter((row): row is unknown[] => Array.isArray(row));
  const ddlMeta = parseDdl(sheet.sourceData?.ddl);
  const columns = headers.map((header, index) => {
    const ddlColumn = findDdlColumnForHeader(ddlMeta.columns, header) ?? ddlMeta.columns[index];
    return {
      header,
      index,
      physicalName: ddlColumn?.physicalName,
      commentAlias: ddlColumn?.commentAlias,
      notNull: Boolean(ddlColumn?.notNull),
      primaryKey: Boolean(ddlColumn?.primaryKey),
      unique: Boolean(ddlColumn?.unique),
      checkIn: ddlColumn?.checkIn,
      checkGlob: ddlColumn?.checkGlob,
      minValue: ddlColumn?.minValue,
      maxValue: ddlColumn?.maxValue,
      minLength: ddlColumn?.minLength,
      maxLength: ddlColumn?.maxLength,
    };
  });
  const table: TableMeta = {
    key,
    uid: sheet.uid,
    name: sheet.name ?? key,
    sqlName: ddlMeta.tableName,
    sheet,
    headers,
    rows,
    columns,
    columnAliases: new Map(),
  };

  for (const column of columns) {
    addColumnAlias(table, column.header, column);
    addColumnAlias(table, column.physicalName, column);
    addColumnAlias(table, column.commentAlias, column);
  }
  addBuiltInColumnAliases(table);
  return table;
}

function mergeContentWithTemplateHeader(sheet: SheetLike, fallback: SheetLike | undefined) {
  const currentContent = normalizeContentRows(sheet.content);
  const currentHeader = getContentHeader(currentContent);
  const fallbackContent = normalizeContentRows(fallback?.content);
  const fallbackHeader = getContentHeader(fallbackContent);
  if (fallbackHeader.length === 0) return currentContent;
  if (currentHeader.length === 0) return [fallbackHeader];

  const fallbackDdlColumns = parseDdl(fallback?.sourceData?.ddl).columns;
  const targetIndexes = currentHeader.map(header =>
    findTemplateHeaderIndex(fallbackHeader, fallbackDdlColumns, header),
  );
  const hasMissingTemplateColumns = fallbackHeader.some((_, index) => !targetIndexes.includes(index));
  const hasReorderedTemplateColumns = targetIndexes.some((targetIndex, index) => targetIndex >= 0 && targetIndex !== index);
  const hasPhysicalOrAliasHeaders = currentHeader.some((header, index) => {
    const targetIndex = targetIndexes[index];
    return targetIndex >= 0 && normalizeAlias(header) !== normalizeAlias(fallbackHeader[targetIndex]);
  });
  if (!hasMissingTemplateColumns && !hasReorderedTemplateColumns && !hasPhysicalOrAliasHeaders) return currentContent;

  const extraHeaders = currentHeader.filter((_, index) => targetIndexes[index] < 0);
  const mergedHeader = [...fallbackHeader, ...extraHeaders];
  const extraOffsetBySourceIndex = new Map<number, number>();
  let extraIndex = fallbackHeader.length;
  targetIndexes.forEach((targetIndex, sourceIndex) => {
    if (targetIndex < 0) extraOffsetBySourceIndex.set(sourceIndex, extraIndex++);
  });

  const mergedRows = currentContent.slice(1).map(row => {
    const nextRow = Array.from({ length: mergedHeader.length }, () => '');
    currentHeader.forEach((_, sourceIndex) => {
      const targetIndex = targetIndexes[sourceIndex];
      const outputIndex = targetIndex >= 0 ? targetIndex : extraOffsetBySourceIndex.get(sourceIndex);
      if (outputIndex !== undefined) nextRow[outputIndex] = row[sourceIndex] ?? '';
    });
    return nextRow;
  });

  return [mergedHeader, ...mergedRows];
}

function normalizeContentRows(content: unknown) {
  return Array.isArray(content) ? content.filter((row): row is unknown[] => Array.isArray(row)) : [];
}

function getContentHeader(content: unknown[][]) {
  return Array.isArray(content[0]) ? content[0].map(value => String(value)) : [];
}

function findTemplateHeaderIndex(fallbackHeader: string[], fallbackDdlColumns: ColumnMeta[], header: string) {
  const normalizedHeader = normalizeAlias(header);
  return fallbackHeader.findIndex((templateHeader, index) => {
    const ddlColumn = findDdlColumnForHeader(fallbackDdlColumns, templateHeader) ?? fallbackDdlColumns[index];
    return [
      templateHeader,
      ddlColumn?.header,
      ddlColumn?.physicalName,
      ddlColumn?.commentAlias,
    ].some(alias => normalizeAlias(alias) === normalizedHeader);
  });
}

function findDdlColumnForHeader(columns: ColumnMeta[], header: string) {
  const normalizedHeader = normalizeAlias(header);
  return columns.find(column =>
    normalizeAlias(column.physicalName) === normalizedHeader
    || normalizeAlias(column.commentAlias) === normalizedHeader
    || normalizeAlias(column.header) === normalizedHeader
  );
}

function parseDdl(ddl: string | undefined) {
  const tableName = ddl?.match(/CREATE\s+TABLE\s+[`"]?([A-Za-z_][\w]*)[`"]?/i)?.[1];
  if (!ddl) return { tableName, columns: [] as ColumnMeta[] };

  const columns = ddl
    .split('\n')
    .map(line => parseDdlColumn(line))
    .filter((column): column is ColumnMeta => Boolean(column));
  return { tableName, columns };
}

function parseDdlColumn(line: string): ColumnMeta | null {
  const trimmed = line.trim().replace(/,$/, '');
  // 只过滤真正的表级约束行/结束行；关键字加 \b 词边界，避免误杀 check_type、unique_id 等
  // 以约束关键字开头的物理列名（check_ 列曾被 ^CHECK 整行吞掉导致列错位 + COLUMN_NOT_FOUND）。
  if (!trimmed || /^(?:(?:CREATE|CONSTRAINT|PRIMARY|UNIQUE|CHECK|FOREIGN)\b|\);)/i.test(trimmed)) return null;

  const match = trimmed.match(/^`?([A-Za-z_][\w]*)`?\s+(.+)$/);
  if (!match) return null;

  const physicalName = match[1];
  const definition = match[2];
  const commentAlias = definition.match(/--\s*(.+)$/)?.[1]?.trim();
  const checkInRaw = definition.match(/CHECK\s*\([^)]*\bIN\s*\(([^)]*)\)/i)?.[1];
  const checkIn = checkInRaw
    ?.split(',')
    .map(value => value.trim().replace(/^['"]|['"]$/g, ''))
    .filter(Boolean);
  const escapedPhysicalName = escapeRegExp(physicalName);
  const betweenValue = definition.match(
    new RegExp(`CHECK\\s*\\(\\s*[\`"]?${escapedPhysicalName}[\`"]?\\s+BETWEEN\\s+(-?\\d+(?:\\.\\d+)?)\\s+AND\\s+(-?\\d+(?:\\.\\d+)?)`, 'i'),
  );
  const exactValue = definition.match(
    new RegExp(`CHECK\\s*\\(\\s*[\`"]?${escapedPhysicalName}[\`"]?\\s*=\\s*(-?\\d+(?:\\.\\d+)?)\\s*\\)`, 'i'),
  );
  const betweenLength = definition.match(/LENGTH\s*\(\s*`?[A-Za-z_][\w]*`?\s*\)\s+BETWEEN\s+(\d+)\s+AND\s+(\d+)/i);
  const checkGlob = definition.match(
    new RegExp(`CHECK\\s*\\(\\s*[\`"]?${escapedPhysicalName}[\`"]?\\s+GLOB\\s+(['"])(.*?)\\1\\s*\\)`, 'i'),
  )?.[2];
  const maxLength = Number(definition.match(/LENGTH\s*\(\s*`?[A-Za-z_][\w]*`?\s*\)\s*<=\s*(\d+)/i)?.[1] ?? betweenLength?.[2]);
  const minLength = Number(definition.match(/LENGTH\s*\(\s*`?[A-Za-z_][\w]*`?\s*\)\s*>=\s*(\d+)/i)?.[1] ?? betweenLength?.[1]);
  const minValue = Number(betweenValue?.[1] ?? exactValue?.[1]);
  const maxValue = Number(betweenValue?.[2] ?? exactValue?.[1]);

  return {
    header: commentAlias ?? physicalName,
    index: -1,
    physicalName,
    commentAlias,
    notNull: /\bNOT\s+NULL\b/i.test(definition),
    primaryKey: /\bPRIMARY\s+KEY\b/i.test(definition),
    unique: /\bUNIQUE\b/i.test(definition),
    checkIn,
    checkGlob,
    minValue: Number.isFinite(minValue) ? minValue : undefined,
    maxValue: Number.isFinite(maxValue) ? maxValue : undefined,
    minLength: Number.isFinite(minLength) ? minLength : undefined,
    maxLength: Number.isFinite(maxLength) ? maxLength : undefined,
  };
}

function findTable(tables: TableMeta[], tableRef: string | undefined) {
  const normalized = normalizeAlias(tableRef);
  if (!normalized) return null;
  return tables.find(table =>
    normalizeAlias(table.name) === normalized
    || normalizeAlias(table.uid) === normalized
    || normalizeAlias(table.sqlName) === normalized
  ) ?? null;
}

function resolveColumns(table: TableMeta, values: Record<string, Primitive>, errors: TableChangeError[]) {
  const columns: ColumnMeta[] = [];
  for (const rawColumn of Object.keys(values)) {
    const column = table.columnAliases.get(normalizeAlias(rawColumn));
    if (!column) {
      errors.push({
        code: 'COLUMN_NOT_FOUND',
        message: `表「${table.name}」不存在列：${rawColumn}。`,
        table: table.name,
        column: rawColumn,
        value: values[rawColumn],
      });
      continue;
    }
    columns.push(column);
    const rawValue = values[rawColumn];
    if (column.header !== rawColumn) {
      values[column.header] = rawValue ?? null;
      delete values[rawColumn];
    }
    values[column.header] = normalizeColumnValueForColumn(table, column, values[column.header]);
  }
  return columns;
}

function validateColumnValues(
  table: TableMeta,
  columns: ColumnMeta[],
  values: Record<string, Primitive>,
  action: TableChangeAction,
  errors: TableChangeError[],
) {
  const targetColumns = action === 'insertRow'
    ? table.columns.filter(column => !column.primaryKey || Object.prototype.hasOwnProperty.call(values, column.header))
    : columns;

  for (const column of targetColumns) {
    const hasValue = Object.prototype.hasOwnProperty.call(values, column.header);
    if (!hasValue && action !== 'insertRow') continue;
    const value = values[column.header];

    if (column.notNull && isBlank(value)) {
      errors.push({
        code: 'NOT_NULL_VIOLATION',
        message: `列「${column.header}」不能为空。`,
        table: table.name,
        column: column.header,
        value,
      });
      continue;
    }

    if (!hasValue || value === null || value === undefined) continue;
    const text = String(value);
    if (isChronicleTable(table) && isChronicleTextColumn(column) && /^SP\d{4}$/i.test(text.trim())) {
      errors.push({
        code: 'LENGTH_VIOLATION',
        message: `列「${column.header}」不能只填写纪要编号，必须是 200-600 字客观纪要。`,
        table: table.name,
        column: column.header,
        value,
      });
    }

    if (column.checkIn && column.checkIn.length > 0 && !column.checkIn.includes(text)) {
      const normalized = normalizeEnumAliasValue(table, column, text);
      if (normalized && column.checkIn.includes(normalized)) {
        values[column.header] = normalized;
        continue;
      }
      errors.push({
        code: 'CHECK_IN_VIOLATION',
        message: `列「${column.header}」只能是：${column.checkIn.join('、')}。`,
        table: table.name,
        column: column.header,
        value,
      });
    }

    if (column.minValue !== undefined || column.maxValue !== undefined) {
      const numericValue = typeof value === 'number' ? value : Number(text);
      if (!Number.isFinite(numericValue)
        || (column.minValue !== undefined && numericValue < column.minValue)
        || (column.maxValue !== undefined && numericValue > column.maxValue)) {
        const range = `${column.minValue ?? '-∞'}-${column.maxValue ?? '+∞'}`;
        errors.push({
          code: 'CHECK_RANGE_VIOLATION',
          message: `列「${column.header}」必须在 ${range} 范围内。`,
          table: table.name,
          column: column.header,
          value,
        });
      }
    }

    if (column.checkGlob && !globPatternToRegExp(column.checkGlob).test(text)) {
      errors.push({
        code: 'CHECK_PATTERN_VIOLATION',
        message: `列「${column.header}」必须匹配格式 ${column.checkGlob}。`,
        table: table.name,
        column: column.header,
        value,
      });
    }

    if (column.minLength !== undefined && text.length < column.minLength) {
      errors.push({
        code: 'LENGTH_VIOLATION',
        message: `列「${column.header}」长度不能小于 ${column.minLength}。`,
        table: table.name,
        column: column.header,
        value,
      });
    }

    if (column.maxLength !== undefined && text.length > column.maxLength) {
      errors.push({
        code: 'LENGTH_VIOLATION',
        message: `列「${column.header}」长度不能大于 ${column.maxLength}。`,
        table: table.name,
        column: column.header,
        value,
      });
    }
  }
}

function normalizeEnumAliasValue(table: TableMeta, column: ColumnMeta, rawText: string) {
  const allowed = column.checkIn ?? [];
  const normalizedText = normalizeAlias(rawText);
  const tableName = normalizeAlias(table.sqlName || table.name || table.uid);
  const columnName = normalizeAlias(column.physicalName || column.header || column.commentAlias);

  if (tableName === 'supernatural_events' && columnName === 'handling_status') {
    const aliases: Record<string, string> = {
      爆发中: '失控扩散',
      爆发: '失控扩散',
      正在爆发: '失控扩散',
      蔓延中: '失控扩散',
      正在扩散: '失控扩散',
      扩散: '失控扩散',
      扩散中: '失控扩散',
      快速扩散: '失控扩散',
      严重扩散: '失控扩散',
      失控中: '失控扩散',
      已失控: '失控扩散',
      处理中: '对抗中',
      处置中: '对抗中',
      应对中: '对抗中',
      交战中: '对抗中',
      战斗中: '对抗中',
      对峙中: '对抗中',
      压制中: '对抗中',
      正在对抗: '对抗中',
      对抗: '对抗中',
      已解决: '结束',
      已完结: '结束',
      已处理: '结束',
      已结束: '结束',
      结束: '结束',
      完结: '结束',
      解决: '结束',
      控制中: '已压制',
      已控制: '已压制',
      暂时控制: '已压制',
      已压制中: '已压制',
      收容: '已关押',
      已收容: '已关押',
      关押: '已关押',
      已关押: '已关押',
      未处置: '未处理',
      未开始: '未处理',
      待处理: '未处理',
      未接触: '未处理',
    };
    const mapped = aliases[rawText.trim()];
    if (mapped && allowed.includes(mapped)) return mapped;
  }

  if (tableName === 'collected_archives' && columnName === 'archive_status') {
    const aliases: Record<string, string> = {
      收录成功: '已收录',
      已收录成功: '已收录',
      收录完成: '已收录',
      未开始: '未收录',
      待收录: '未收录',
    };
    const mapped = aliases[rawText.trim()];
    if (mapped) return mapped;
  }

  const direct = allowed.find(value => normalizeAlias(value) === normalizedText);
  if (direct) return direct;
  return null;
}

function resolveRowIndex(table: TableMeta, match: TableChangeMatch | undefined, errors: TableChangeError[]) {
  if (!match) {
    errors.push({ code: 'ROW_NOT_FOUND', message: '需要 match 来定位行。', table: table.name });
    return undefined;
  }

  const explicitIndex = typeof match.rowIndex === 'number' ? match.rowIndex : undefined;
  if (explicitIndex !== undefined) {
    if (explicitIndex >= 1 && explicitIndex < table.rows.length) return explicitIndex;
    errors.push({ code: 'ROW_NOT_FOUND', message: `rowIndex ${explicitIndex} 越界。`, table: table.name });
    return undefined;
  }

  const conditions = extractMatchConditions(match);
  if (match.row_id !== undefined && match.row_id !== null) conditions.row_id = match.row_id;
  const conditionEntries = Object.entries(conditions);
  if (conditionEntries.length === 0) {
    errors.push({ code: 'ROW_NOT_FOUND', message: 'match 至少需要 rowIndex、row_id 或 conditions。', table: table.name });
    return undefined;
  }

  const matched = table.rows
    .map((row, rowIndex) => ({ row, rowIndex }))
    .filter(({ rowIndex }) => rowIndex > 0)
    .filter(({ row }) => conditionEntries.every(([rawColumn, expected]) => {
      const column = table.columnAliases.get(normalizeAlias(rawColumn));
      if (!column) return false;
      return normalizeCellValue(row[column.index]) === normalizeCellValue(expected);
    }));

  if (matched.length === 1) return matched[0].rowIndex;
  if (matched.length > 1) {
    errors.push({ code: 'MULTIPLE_ROWS_MATCHED', message: `match 命中 ${matched.length} 行，已阻止写入。`, table: table.name });
    return undefined;
  }

  errors.push({ code: 'ROW_NOT_FOUND', message: 'match 未命中任何行。', table: table.name });
  return undefined;
}

function getRowIdPrimaryKeyColumn(table: TableMeta) {
  return table.columns.find(column => column.primaryKey && normalizeAlias(column.physicalName ?? column.header) === 'row_id')
    ?? table.columns.find(column => column.primaryKey && normalizeAlias(column.header) === 'row_id')
    ?? null;
}

function getMatchedPrimaryKeyValue(
  table: TableMeta,
  match: TableChangeMatch | undefined,
  primaryKeyColumn: ColumnMeta,
) {
  if (!match) return undefined;
  if (match.row_id !== undefined && match.row_id !== null) return match.row_id;
  const conditions = extractMatchConditions(match);
  for (const [rawColumn, value] of Object.entries(conditions)) {
    const column = table.columnAliases.get(normalizeAlias(rawColumn));
    if (column === primaryKeyColumn) return value;
  }
  return undefined;
}

function getPromotablePrimaryKeyValue(
  table: TableMeta,
  match: TableChangeMatch | undefined,
  primaryKeyColumn: ColumnMeta,
) {
  const matched = getMatchedPrimaryKeyValue(table, match, primaryKeyColumn);
  if (matched !== undefined && matched !== null) return matched;

  const minValue = primaryKeyColumn.minValue;
  const maxValue = primaryKeyColumn.maxValue;
  if (minValue === undefined || maxValue === undefined) return undefined;
  if (normalizeCellValue(minValue) !== normalizeCellValue(maxValue)) return undefined;
  if (table.rows.length > 1) return undefined;
  return minValue;
}

function tableHasPrimaryKeyRow(table: TableMeta, primaryKeyColumn: ColumnMeta, rowId: Primitive) {
  return table.rows
    .slice(1)
    .some(row => normalizeCellValue(row[primaryKeyColumn.index]) === normalizeCellValue(rowId));
}

function findColumnByAlias(table: TableMeta, alias: string) {
  return table.columnAliases.get(normalizeAlias(alias)) ?? null;
}

function isChronicleTextColumn(column: ColumnMeta) {
  return [
    column.header,
    column.physicalName,
    column.commentAlias,
  ].some(alias => normalizeAlias(alias) === 'chronicle_text'
    || normalizeAlias(alias) === normalizeAlias('纪要'));
}

function hasColumnValue(table: TableMeta, values: Record<string, Primitive>, column: ColumnMeta) {
  const aliases = [column.header, column.physicalName, column.commentAlias]
    .map(normalizeAlias)
    .filter(Boolean);
  return Object.keys(values).some(key => aliases.includes(normalizeAlias(key)));
}

function isChronicleTable(table: TableMeta) {
  return normalizeAlias(table.sqlName) === 'chronicle'
    || normalizeAlias(table.name) === normalizeAlias('事件纪要')
    || normalizeAlias(table.uid) === 'sheet_chronicle';
}

function nextChronicleCodeIndex(table: TableMeta, codeIndexColumn: ColumnMeta) {
  const maxIndex = table.rows
    .slice(1)
    .map(row => String(row[codeIndexColumn.index] ?? '').trim())
    .map(value => /^SP(\d{4})$/i.exec(value)?.[1])
    .map(value => Number(value ?? NaN))
    .filter(Number.isFinite)
    .reduce((highest, value) => Math.max(highest, value), 0);
  return `SP${String(maxIndex + 1).padStart(4, '0')}`;
}

const FORBIDDEN_DELETE_TABLES = [
  'global_state',
  'sheet_global_state',
  '全局状态',
  'player_state',
  'sheet_player_state',
  '玩家状态',
  'supernatural_events',
  'sheet_supernatural_events',
  '灵异事件',
  'action_suggestions',
  'sheet_action_suggestions',
  '行动建议',
  'check_suggestions',
  'sheet_check_suggestions',
  '检定建议',
  'ghost_archives',
  'sheet_ghost_archives',
  '厉鬼档案',
  'controlled_ghosts',
  'sheet_controlled_ghosts',
  '驾驭厉鬼',
  'collected_archives',
  'sheet_collected_archives',
  '收录档案',
  'collected_rules',
  'sheet_collected_rules',
  '收录规律',
  'clues',
  'sheet_clues',
  '线索',
  'locations',
  'sheet_locations',
  '地点',
  'chronicle',
  'sheet_chronicle',
  '事件纪要',
];

const FORBIDDEN_INSERT_TABLES = [
  'global_state',
  'sheet_global_state',
  '全局状态',
  'player_state',
  'sheet_player_state',
  '玩家状态',
  'action_suggestions',
  'sheet_action_suggestions',
  '行动建议',
  'check_suggestions',
  'sheet_check_suggestions',
  '检定建议',
];

function validateTableMutationPolicy(
  table: TableMeta,
  plan: TableChangePlan,
  values: Record<string, Primitive>,
  errors: TableChangeError[],
) {
  if (plan.action === 'deleteRow' && isTableNamed(table, FORBIDDEN_DELETE_TABLES)) {
    errors.push({
      code: 'TABLE_DELETE_FORBIDDEN',
      message: `表「${table.name}」禁止删除行；请用 updateCell 修正内容，或按模板规则追加新行。`,
      table: table.name,
    });
  }

  if (plan.action === 'insertRow' && isTableNamed(table, FORBIDDEN_INSERT_TABLES)) {
    // 固定/单行表：仅当目标 row_id 尚不存在时允许 insert（补种）；已有行应 update
    const rowIdColumn = findColumnByAlias(table, 'row_id') ?? findColumnByAlias(table, '行号');
    const requested = rowIdColumn ? Number(values[rowIdColumn.header] ?? NaN) : NaN;
    const existing = rowIdColumn
      ? table.rows.slice(1).some(row => Number(row[rowIdColumn.index]) === requested)
      : table.rows.length > 1;
    if (!Number.isFinite(requested) || existing) {
      errors.push({
        code: 'TABLE_INSERT_FORBIDDEN',
        message: `表「${table.name}」禁止新增行；请 updateCell 刷新既有 row_id，或先确保目标 row_id 缺失后再补种。`,
        table: table.name,
      });
    }
  }
}

function validateChronicleAppendOnly(
  table: TableMeta,
  plan: TableChangePlan,
  values: Record<string, Primitive>,
  rowIndex: number | undefined,
  errors: TableChangeError[],
) {
  if (!isChronicleTable(table)) return;
  // 事件纪要是追加式历史记录：开局 SP0001 等纪要行是独立的客观事实快照，
  // 后续轮次只应 insertRow 追加新编号，不应删除或重写已有行的编号，
  // 否则会出现“只剩 SP0002、开局 SP0001 纪要丢失”这类覆盖独立开局纪要的问题。
  if (plan.action === 'deleteRow') {
    errors.push({
      code: 'CHRONICLE_APPEND_ONLY',
      message: '事件纪要是追加式历史记录，禁止删除已有纪要行；记录新事实请用 insertRow 追加新的纪要编号。',
      table: table.name,
    });
    return;
  }
  if (plan.action !== 'updateCell') return;
  const codeIndexColumn = findColumnByAlias(table, 'code_index');
  if (!codeIndexColumn || !hasColumnValue(table, values, codeIndexColumn)) return;
  const newCode = String(values[codeIndexColumn.header] ?? '').trim();
  const existingCode = rowIndex !== undefined && rowIndex > 0
    ? String(table.rows[rowIndex]?.[codeIndexColumn.index] ?? '').trim()
    : '';
  if (existingCode && newCode && normalizeCellValue(newCode) !== normalizeCellValue(existingCode)) {
    errors.push({
      code: 'CHRONICLE_CODE_IMMUTABLE',
      message: `事件纪要编号「${existingCode}」不可被改写为「${newCode}」；记录新事实请 insertRow 追加新的纪要编号，避免覆盖独立开局纪要。`,
      table: table.name,
      column: codeIndexColumn.header,
      value: newCode,
    });
  }
}

function extractMatchConditions(match: TableChangeMatch) {
  const conditions: Record<string, Primitive> = {};
  if (isPrimitiveRecord(match.conditions)) Object.assign(conditions, match.conditions);
  for (const [key, value] of Object.entries(match)) {
    if (key === 'rowIndex' || key === 'row_id' || key === 'conditions') continue;
    if (isPrimitive(value)) conditions[key] = value;
  }
  return conditions;
}

function addBuiltInColumnAliases(table: TableMeta) {
  if (isTableNamed(table, ['global_state', 'sheet_global_state', '全局状态'])) {
    const gameTimeColumn = findColumnByAlias(table, 'game_time') ?? findColumnByAlias(table, '当前时间');
    if (gameTimeColumn) {
      addColumnAlias(table, 'current_time', gameTimeColumn);
      addColumnAlias(table, 'cur_time', gameTimeColumn);
      addColumnAlias(table, 'time', gameTimeColumn);
    }
  }

  // 线索：物理列 / 中文表头 / AI 近义列名互通，避免 COLUMN_NOT_FOUND + NOT_NULL 推断
  if (isTableNamed(table, ['clues', 'sheet_clues', '线索'])) {
    const aliasPairs: Array<[string[], string[]]> = [
      [['clue_code', '线索编号', '线索编码', '编号'], ['clue_code', '线索编号']],
      [['event_code', '关联事件', '事件代号', '所属事件'], ['event_code', '关联事件']],
      [['source_text', '来源', '线索来源'], ['source_text', '来源']],
      [['clue_text', '内容', '线索内容', '正文'], ['clue_text', '内容']],
      [['reliability', '可信度'], ['reliability', '可信度']],
      [['inference_text', 'inference', '推断', '推断结论', '推理'], ['inference_text', '推断']],
      [['verification_status', '验证状态'], ['verification_status', '验证状态']],
      [['visibility', '可见性'], ['visibility', '可见性']],
    ];
    for (const [aliases, targets] of aliasPairs) {
      let column: ColumnMeta | undefined;
      for (const name of [...targets, ...aliases]) {
        column = findColumnByAlias(table, name);
        if (column) break;
      }
      if (!column) continue;
      for (const alias of aliases) addColumnAlias(table, alias, column);
    }
  }

  // 驾驭厉鬼：MVU ControlledGhost 字段名 ↔ DB 表头
  if (isTableNamed(table, ['controlled_ghosts', 'sheet_controlled_ghosts', '驾驭厉鬼'])) {
    const aliasPairs: Array<[string[], string[]]> = [
      [['ghost_code', '厉鬼代号', '代号', '厉鬼名称'], ['ghost_code', '厉鬼代号']],
      [['terror_level', '恐怖程度', '恐怖等级'], ['terror_level', '恐怖程度']],
      [['usable_power', '可用能力', '使用能力'], ['usable_power', '可用能力']],
      [['death_machine_status', '死机状态', '是否死机'], ['death_machine_status', '死机状态']],
      [['public_summary', '可见摘要', '摘要'], ['public_summary', '可见摘要']],
    ];
    for (const [aliases, targets] of aliasPairs) {
      let column: ColumnMeta | undefined;
      for (const name of [...targets, ...aliases]) {
        column = findColumnByAlias(table, name);
        if (column) break;
      }
      if (!column) continue;
      for (const alias of aliases) addColumnAlias(table, alias, column);
    }
  }
}

function normalizeColumnValueForColumn(table: TableMeta, column: ColumnMeta, value: Primitive): Primitive {
  if (isTableNamed(table, ['global_state', 'sheet_global_state', '全局状态'])
    && isColumnNamed(column, ['game_time', 'current_time', 'cur_time', 'time', '当前时间'])) {
    return normalizeDateTimeMinuteValue(value);
  }
  return value;
}

function normalizeDateTimeMinuteValue(value: Primitive): Primitive {
  if (value === null || typeof value === 'boolean') return value;
  const text = String(value).trim();
  const match = text.match(/(\d{4})[-/](\d{1,2})[-/](\d{1,2})(?:[ T]|\s+|日\s*)?(\d{1,2}):(\d{2})(?::\d{2})?/);
  if (!match) return value;
  const [, year, month, day, hour, minute] = match;
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')} ${hour.padStart(2, '0')}:${minute}`;
}

function isTableNamed(table: TableMeta, aliases: string[]) {
  const tableAliases = [table.name, table.uid, table.sqlName, table.key].map(normalizeAlias).filter(Boolean);
  return aliases.map(normalizeAlias).some(alias => tableAliases.includes(alias));
}

function isColumnNamed(column: ColumnMeta, aliases: string[]) {
  const columnAliases = [column.header, column.physicalName, column.commentAlias].map(normalizeAlias).filter(Boolean);
  return aliases.map(normalizeAlias).some(alias => columnAliases.includes(alias));
}

function addColumnAlias(table: TableMeta, alias: string | undefined, column: ColumnMeta) {
  const normalized = normalizeAlias(alias);
  if (normalized) table.columnAliases.set(normalized, column);
}

function createMissingTable(name = '未知表'): TableMeta {
  return {
    key: '__missing__',
    name,
    headers: [],
    rows: [],
    columns: [],
    columnAliases: new Map(),
    sheet: {},
  };
}

function normalizeAlias(value: unknown) {
  return String(value ?? '').trim().toLowerCase().replace(/\s+/g, '');
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function globPatternToRegExp(pattern: string) {
  let source = '^';
  for (let index = 0; index < pattern.length; index += 1) {
    const char = pattern[index];
    if (char === '*') {
      source += '.*';
      continue;
    }
    if (char === '?') {
      source += '.';
      continue;
    }
    if (char === '[') {
      const end = pattern.indexOf(']', index + 1);
      if (end > index) {
        let group = pattern.slice(index + 1, end);
        if (group.startsWith('!')) group = `^${group.slice(1)}`;
        source += `[${group}]`;
        index = end;
        continue;
      }
    }
    source += escapeRegExp(char);
  }
  return new RegExp(`${source}$`);
}

function normalizeCellValue(value: unknown) {
  return String(value ?? '').trim();
}

function isBlank(value: CellValue) {
  return value === undefined || value === null || String(value).trim() === '';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function isPrimitive(value: unknown): value is Primitive {
  return value === null || ['string', 'number', 'boolean'].includes(typeof value);
}

function isPrimitiveRecord(value: unknown): value is Record<string, Primitive> {
  return isRecord(value) && Object.values(value).every(isPrimitive);
}

function isSheetLike(value: unknown): value is SheetLike {
  return isRecord(value)
    && (typeof value.name === 'string'
      || typeof value.uid === 'string'
      || Array.isArray(value.content)
      || isRecord(value.sourceData));
}

function isTableChangeAction(action: unknown): action is TableChangeAction {
  return action === 'updateCell' || action === 'insertRow' || action === 'deleteRow' || action === 'noop';
}
