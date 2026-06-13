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
  | 'LENGTH_VIOLATION'
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
  importTableAsJson?: (jsonString: string) => boolean | Promise<boolean>;
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

  if (resolved.plan.action === 'insertRow') {
    const allowImportFallback = !resolved.plan.skipChatSave;
    if (!api.insertRow) {
      const fallbackRowIndex = allowImportFallback
        ? await tryImportJsonInsertFallback(api, resolved, currentData)
        : null;
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
    // 真实 vendor 的 insertRow 第一参为对象时按选项包解析，只从 options.data 取数据并忽略第二参，
    // 因此必须用单参 { tableName, data } 形态；旧的两参调用 (insertOptions, insertValues) 第一次必失败，
    // 靠后续单参重试兜底，徒增一次 "data must be an object" 错误日志。
    insertOptions.data = insertValues;
    let insertedRowIndex = await api.insertRow(insertOptions);
    if (typeof insertedRowIndex !== 'number' || insertedRowIndex < 0) {
      const verifiedRowIndex = await verifyInsertAppliedAfterFailedResult(api, resolved, currentData);
      if (typeof verifiedRowIndex === 'number' && verifiedRowIndex >= 0) {
        return { ...preview, insertedRowIndex: verifiedRowIndex };
      }
      const fallbackRowIndex = allowImportFallback
        ? await tryImportJsonInsertFallback(api, resolved, currentData)
        : null;
      if (typeof fallbackRowIndex === 'number' && fallbackRowIndex >= 0) {
        return { ...preview, insertedRowIndex: fallbackRowIndex };
      }
      return withError(preview, 'API_MUTATION_FAILED', 'insertRow 执行失败。');
    }
    return { ...preview, insertedRowIndex };
  }

  if (resolved.rowIndex === undefined) {
    return withError(preview, 'ROW_NOT_FOUND', '缺少可执行的行索引。');
  }

  if (resolved.plan.action === 'deleteRow') {
    const allowImportFallback = !resolved.plan.skipChatSave;
    if (!api.deleteRow) {
      if (allowImportFallback && await tryImportJsonDeleteFallback(api, resolved, currentData)) return preview;
      return withError(preview, 'API_UNAVAILABLE', '数据库 API 不支持 deleteRow。');
    }
    const ok = await api.deleteRow({
      tableName: resolved.table.name,
      rowIndex: resolved.rowIndex,
      skipChatSave: resolved.plan.skipChatSave,
      silent: resolved.plan.silent,
    });
    if (!ok && await verifyDeleteAppliedAfterFailedResult(api, resolved, currentData)) return preview;
    if (!ok && allowImportFallback && await tryImportJsonDeleteFallback(api, resolved, currentData)) return preview;
    return ok ? preview : withError(preview, 'API_MUTATION_FAILED', 'deleteRow 执行失败。');
  }

  const allowImportFallback = !resolved.plan.skipChatSave;
  if (!api.updateCell) {
    if (allowImportFallback && await tryImportJsonUpdateFallback(api, resolved, currentData)) return preview;
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
      if (allowImportFallback && await tryImportJsonUpdateFallback(api, resolved, currentData)) return preview;
      return withError(preview, 'API_MUTATION_FAILED', `updateCell 执行失败：${column.header}。`, column.header);
    }
  }

  return preview;
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
  return await importJsonData(api, cloned) ? sheet.content.length - 1 : null;
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
  return importJsonData(api, cloned);
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
  return importJsonData(api, cloned);
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

async function importJsonData(api: AutoCardUpdaterCrudApi, data: Record<string, unknown>) {
  if (!api.importTableAsJson) return false;
  return api.importTableAsJson(JSON.stringify(data));
}

function findSheetInData(data: Record<string, unknown>, table: TableMeta) {
  for (const value of Object.values(data)) {
    if (!isSheetLike(value)) continue;
    if ((table.uid && value.uid === table.uid) || value.name === table.name) return value;
  }
  return null;
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
  const matchedRowId = getMatchedPrimaryKeyValue(table, plan.match, primaryKeyColumn);
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
  const templateByUid = new Map(templateSheets.map(sheet => [sheet.uid, sheet]));
  const templateByName = new Map(templateSheets.map(sheet => [sheet.name, sheet]));

  return currentSheets.map((sheet, index) => {
    const fallback = (sheet.uid ? templateByUid.get(sheet.uid) : undefined)
      ?? (sheet.name ? templateByName.get(sheet.name) : undefined);
    const mergedSheet: SheetLike = {
      ...fallback,
      ...sheet,
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
  return Object.values(sheets).filter(isSheetLike);
}

function buildTableMeta(sheet: SheetLike, key: string): TableMeta {
  const content = Array.isArray(sheet.content) ? sheet.content : [];
  const headers = Array.isArray(content[0]) ? content[0].map(value => String(value)) : [];
  const rows = content.filter((row): row is unknown[] => Array.isArray(row));
  const ddlMeta = parseDdl(sheet.sourceData?.ddl);
  const columns = headers.map((header, index) => {
    const ddlColumn = ddlMeta.columns[index] ?? findDdlColumnForHeader(ddlMeta.columns, header);
    return {
      header,
      index,
      physicalName: ddlColumn?.physicalName,
      commentAlias: ddlColumn?.commentAlias,
      notNull: Boolean(ddlColumn?.notNull),
      primaryKey: Boolean(ddlColumn?.primaryKey),
      unique: Boolean(ddlColumn?.unique),
      checkIn: ddlColumn?.checkIn,
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
  return table;
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
  const betweenLength = definition.match(/LENGTH\s*\(\s*`?[A-Za-z_][\w]*`?\s*\)\s+BETWEEN\s+(\d+)\s+AND\s+(\d+)/i);
  const maxLength = Number(definition.match(/LENGTH\s*\(\s*`?[A-Za-z_][\w]*`?\s*\)\s*<=\s*(\d+)/i)?.[1] ?? betweenLength?.[2]);
  const minLength = Number(definition.match(/LENGTH\s*\(\s*`?[A-Za-z_][\w]*`?\s*\)\s*>=\s*(\d+)/i)?.[1] ?? betweenLength?.[1]);
  const minValue = Number(betweenValue?.[1]);
  const maxValue = Number(betweenValue?.[2]);

  return {
    header: commentAlias ?? physicalName,
    index: -1,
    physicalName,
    commentAlias,
    notNull: /\bNOT\s+NULL\b/i.test(definition),
    primaryKey: /\bPRIMARY\s+KEY\b/i.test(definition),
    unique: /\bUNIQUE\b/i.test(definition),
    checkIn,
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
    if (column.header !== rawColumn) {
      values[column.header] = values[rawColumn] ?? null;
      delete values[rawColumn];
    }
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
      正在爆发: '失控扩散',
      扩散中: '失控扩散',
      快速扩散: '失控扩散',
      严重扩散: '失控扩散',
      处理中: '对抗中',
      处置中: '对抗中',
      交战中: '对抗中',
      正在对抗: '对抗中',
      已解决: '结束',
      已完结: '结束',
      已处理: '结束',
      已控制: '已压制',
      已压制中: '已压制',
      已收容: '已关押',
      未开始: '未处理',
      待处理: '未处理',
    };
    const mapped = aliases[rawText.trim()];
    if (mapped && allowed.includes(mapped)) return mapped;
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

function tableHasPrimaryKeyRow(table: TableMeta, primaryKeyColumn: ColumnMeta, rowId: Primitive) {
  return table.rows
    .slice(1)
    .some(row => normalizeCellValue(row[primaryKeyColumn.index]) === normalizeCellValue(rowId));
}

function findColumnByAlias(table: TableMeta, alias: string) {
  return table.columnAliases.get(normalizeAlias(alias)) ?? null;
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

function extractMatchConditions(match: TableChangeMatch) {
  const conditions: Record<string, Primitive> = {};
  if (isPrimitiveRecord(match.conditions)) Object.assign(conditions, match.conditions);
  for (const [key, value] of Object.entries(match)) {
    if (key === 'rowIndex' || key === 'row_id' || key === 'conditions') continue;
    if (isPrimitive(value)) conditions[key] = value;
  }
  return conditions;
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
  return isRecord(value) && (typeof value.name === 'string' || typeof value.uid === 'string');
}

function isTableChangeAction(action: unknown): action is TableChangeAction {
  return action === 'updateCell' || action === 'insertRow' || action === 'deleteRow' || action === 'noop';
}
