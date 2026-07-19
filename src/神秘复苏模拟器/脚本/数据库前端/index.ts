import templateData from '../../数据库/神秘复苏表格SQL_v1.json';
import {
  applyTableChangePlan,
  createMemoryMutationExecutor,
  listTableMetadata,
  normalizeExportedTableData,
  previewTableChangePlan,
  tableChangePlanSchemaDescription,
  type AutoCardUpdaterCrudApi,
  type TableChangePlan,
  type TableChangeResult,
  type TableMetaSummary,
} from './table-change-adapter';
import { installMvuCoreMirror } from './mvu-core-mirror';
import { registerMfrsRuntimeBuild } from '../_runtime_identity';

registerMfrsRuntimeBuild('数据库前端');

type AutoCardUpdaterAPI = {
  __mfrsDatabaseScriptMarker__?: string;
  openVisualizer?: () => unknown | Promise<unknown>;
  importTemplateFromData?: (
    data: unknown,
    options?: { scope?: 'global' | 'chat'; presetName?: string },
  ) => unknown | Promise<unknown>;
  refreshDataAndWorldbook?: () => unknown | Promise<unknown>;
  exportTableAsJson?: () => unknown | Promise<unknown>;
  getTableTemplate?: () => unknown | Promise<unknown>;
  updateCell?: AutoCardUpdaterCrudApi['updateCell'];
  insertRow?: AutoCardUpdaterCrudApi['insertRow'];
  deleteRow?: AutoCardUpdaterCrudApi['deleteRow'];
  updateRow?: AutoCardUpdaterCrudApi['updateRow'];
  registerTableUpdateCallback?: (callback: (data: unknown) => void) => void;
  unregisterTableUpdateCallback?: (callback: (data: unknown) => void) => void;
};

type TemplateStatus = {
  templateLoaded: boolean;
  tableCount: number;
  tableNames: string[];
  missingNames: string[];
  mismatchNames: string[];
};

type FrontendState = {
  acuLoaded: boolean;
  acuCollapsed: boolean;
  embeddedDashboardVisible: boolean;
  templateStatus: TemplateStatus;
};

type HostWindow = Window & {
  AutoCardUpdaterAPI?: AutoCardUpdaterAPI;
  __mfrsDatabaseScriptMarker__?: string;
  __mfrsScriptResourceUrls__?: Record<string, string>;
  SillyTavern?: {
    saveChat?: unknown;
    getContext?: () => {
      characterId?: string | number;
      characters?: Array<{ name?: string; avatar?: string }> | Record<string, { name?: string; avatar?: string }>;
      saveChat?: unknown;
      // SillyTavern 原生事件系统：eventSource 兼容 EventEmitter（.on/.off/.emit），
      // event_types 是事件名常量表（如 CHAT_CHANGED）。酒馆助手注入环境不可用时的回退监听通道。
      eventSource?: {
        on?: (event: unknown, listener: (...args: unknown[]) => void) => void;
        off?: (event: unknown, listener: (...args: unknown[]) => void) => void;
      };
      event_types?: Record<string, unknown> & { CHAT_CHANGED?: unknown };
    };
  };
  MysteryDatabaseFrontend?: {
    __mfrsFrontendApiMarker__?: string;
    checkTemplateStatus: () => Promise<TemplateStatus>;
    importMysteryTemplate: () => Promise<boolean>;
    openVisualizer: () => Promise<void>;
    openPanel: (options?: { welcome?: boolean }) => Promise<void>;
    openDashboard: (options?: { welcome?: boolean }) => Promise<void>;
    openStatus: () => Promise<void>;
    refreshDatabase: () => Promise<void>;
    exportCurrentData: () => Promise<unknown>;
    getTableChangeSchema: () => typeof tableChangePlanSchemaDescription;
    getTableMetadata: () => Promise<TableMetaSummary[]>;
    previewTableChangePlan: (plan: TableChangePlan) => Promise<TableChangeResult>;
    applyTableChangePlan: (plan: TableChangePlan) => Promise<TableChangeResult>;
    previewMemoryChange: (plan: TableChangePlan) => Promise<TableChangeResult>;
    applyMemoryChange: (plan: TableChangePlan) => Promise<TableChangeResult>;
    requestConfirmedMemoryDelete: (request: {
      table: string;
      row_id: string | number;
    }) => Promise<TableChangeResult & { confirmed?: boolean }>;
    getPanelState: () => Promise<FrontendState>;
    refreshPanel: () => Promise<void>;
  };
  MysteryAcuVisualizer?: {
    renderInterface?: () => void;
    cleanup?: () => void;
  };
  MysteryMessagePanel?: {
    getHudActiveView?: () => unknown;
  };
  MFRS?:
    | {
        confirmDanger?: (options: {
          title: string;
          message: string;
          confirmText?: string;
          cancelText?: string;
        }) => Promise<boolean>;
      }
    | unknown;
  __mfrsFixedStatusCleanup__?: () => void;
  __mfrsDatabaseFrontendCleanup__?: (options?: DatabaseCleanupOptions) => void;
  toastr?: {
    info?: (message: string) => void;
    success?: (message: string) => void;
    warning?: (message: string) => void;
    error?: (message: string) => void;
  };
};

type DatabaseCleanupOptions = {
  removeFixedStatusHost?: boolean;
  removeGlobals?: boolean;
  unregisterNativeListener?: boolean;
};

const databaseFrontendScriptName = '神秘复苏数据库前端';
const databaseVendorPath = 'vendor/shujuku-sp-fork/index.js';
const databaseFrontendDistPath = 'dist/神秘复苏模拟器/脚本/数据库前端/index.js';
const databaseScriptCacheVersion = 'phase164-4-0-final-baseline-6-28-p5-4-hotfix13-mvu-v859';
const databaseScriptMarker = 'mfrs-4-0-final-baseline-6-28-p5-4-hotfix13-mvu-v859';
const databaseInstanceFlag = '__ACU_STAR_DB_III_LOADED__';
const mysteryCardNames = new Set(['神秘复苏模拟器', '神秘复苏模拟器发布版']);
const mysteryCardAvatars = new Set(['神秘复苏模拟器.png', '神秘复苏模拟器发布版.png']);

function isMysteryCardIdentity(name?: string | null, avatar?: string | null): boolean {
  if (name) {
    if (mysteryCardNames.has(name)) return true;
    // 兼容任何以「神秘复苏模拟器 · DEV …」命名的本地开发卡（如手动导入的调试卡）
    if (/^神秘复苏模拟器(?:\s*[·•-]\s*|\s+)DEV\b/u.test(name)) return true;
  }
  if (avatar) {
    if (mysteryCardAvatars.has(avatar)) return true;
    if (/^神秘复苏模拟器(?:\s*[·•-]\s*|\s+)DEV\b.*\.png$/iu.test(avatar)) return true;
  }
  return false;
}

const ACU_UI_COLLAPSE_KEY = 'acu_ui_collapse_state';
const ACU_UI_CONFIG_KEY = 'acu_ui_config_v18';
const legacyId = (...parts: string[]) => parts.join('-');
const LEGACY_CLEANUP_IDS = [
  legacyId('mfrs', 'database', 'frontend', 'panel'),
  legacyId('mfrs', 'database', 'frontend', 'button'),
  legacyId('mfrs', 'dashboard', 'overlay'),
  legacyId('mfrs', 'dashboard', 'launcher'),
  legacyId('acu', 'mfrs', 'embedded', 'dashboard'),
  legacyId('mfrs', 'database', 'frontend', 'style'),
] as const;
const CURRENT_FRONTEND_CLEANUP_IDS = [
  'mfrs-fixed-status-host',
  'acu_visualizer_ui_v20_pagination-styles',
  'acu-dynamic-font',
  'shujuku_v120-acu-toast-style',
] as const;
const CURRENT_FRONTEND_CLEANUP_SELECTORS = [
  '.acu-wrapper',
  '.acu-embedded-dashboard-container',
  '.acu-embedded-options-container',
  '.acu-edit-overlay',
  '.acu-cell-menu',
  '.acu-menu-backdrop',
  '.acu-quick-view-overlay',
  '.acu-edit-dialog',
  '[id^="mfrs-dashboard"]',
  '[id^="mfrs-database-frontend"]',
] as const;
const MFRS_RESOURCE_URL_KEYS = ['固定状态栏', 'spv3.9.5·数据库', databaseFrontendScriptName] as const;

const templateTableNames = Object.values(templateData as Record<string, unknown>)
  .filter((value): value is { name: string } => Boolean(value && typeof value === 'object' && 'name' in value))
  .map(sheet => sheet.name);

type TemplateSheetLike = {
  uid?: string;
  name?: string;
  content?: unknown;
};

const templateSheets = Object.values(templateData as Record<string, unknown>).filter(
  (value): value is TemplateSheetLike => Boolean(value && typeof value === 'object' && 'name' in value),
);

let templateAutofixPromise: Promise<void> | null = null;
let databaseScriptReloadPromise: Promise<boolean> | null = null;
let databaseScriptReloadSeq = 0;
let tableChangeQueue: Promise<unknown> = Promise.resolve();
const memoryMutationExecutor = createMemoryMutationExecutor();
// 闭包令牌：仅在人工确认删除时传入 executor，避免裸调即可删除记忆行。
const memoryDeleteCapability = memoryMutationExecutor.confirmedMemoryDeleteCapability;
const MEMORY_TABLE_ALIASES = new Set([
  'chronicle',
  'sheet_chronicle',
  '事件纪要',
  'collected_archives',
  'sheet_collected_archives',
  '收录档案',
  'collected_rules',
  'sheet_collected_rules',
  '收录规律',
]);
let acuFrontendRuntimePromise: Promise<void> | null = null;
let nativeChatChangedSubscription: {
  eventSource: NonNullable<ReturnType<typeof getSillyTavernContext>>['eventSource'];
  eventType: unknown;
  listener: () => void;
} | null = null;

function loadAcuFrontendRuntime() {
  acuFrontendRuntimePromise ??= Promise.all([
    import(/* webpackMode: "eager" */ './frontend-config.js'),
    import(/* webpackMode: "eager" */ './v10_2_visualizer.js'),
  ]).then(() => undefined);
  return acuFrontendRuntimePromise;
}

async function waitForMfrsConfirmDanger(hostWindow: HostWindow, attempts = 20, interval = 100) {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const confirmDanger = (hostWindow.MFRS as { confirmDanger?: unknown } | undefined)?.confirmDanger;
    if (typeof confirmDanger === 'function')
      return confirmDanger as (options: {
        title: string;
        message: string;
        confirmText?: string;
        cancelText?: string;
      }) => Promise<boolean>;
    await wait(interval);
  }
  return null;
}

function getHostWindow() {
  try {
    return (window.parent ?? window) as HostWindow;
  } catch {
    return window as HostWindow;
  }
}

function safeDecodeUrl(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function normalizePathForMatch(value: string) {
  return safeDecodeUrl(value).replace(/\\/g, '/');
}

function isUsableHttpUrl(value: unknown) {
  if (typeof value !== 'string' || !value.trim()) return false;
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

function isMatchingScriptUrl(value: unknown, distPath: string) {
  if (!isUsableHttpUrl(value)) return false;
  return normalizePathForMatch(String(value)).includes(normalizePathForMatch(distPath));
}

function getCandidateScriptUrlsFromDocument(doc: Document | undefined | null) {
  if (!doc) return [];
  const candidates: string[] = [];
  const currentScript = doc.currentScript as HTMLScriptElement | null;
  if (currentScript?.src) candidates.push(currentScript.src);
  for (const script of Array.from(doc.querySelectorAll<HTMLScriptElement>('script[src]'))) {
    if (script.src) candidates.push(script.src);
  }
  return candidates;
}

function getCandidateScriptUrlsFromPerformance(targetWindow: Window | undefined | null) {
  try {
    return (
      targetWindow?.performance
        ?.getEntriesByType?.('resource')
        ?.map(entry => entry.name)
        ?.reverse() ?? []
    );
  } catch {
    return [];
  }
}

function getCandidateScriptUrlsFromStack() {
  const stack = new Error().stack ?? '';
  return Array.from(stack.matchAll(/https?:\/\/[^\s)]+/g)).map(match => match[0]);
}

function resolveRuntimeScriptUrl(label: string, distPath: string) {
  const hostWindow = getHostWindow();
  const localWindow = window as HostWindow;
  const candidates = [
    hostWindow.__mfrsScriptResourceUrls__?.[label],
    localWindow.__mfrsScriptResourceUrls__?.[label],
    ...getCandidateScriptUrlsFromDocument(document),
    ...getCandidateScriptUrlsFromDocument(hostWindow.document),
    ...getCandidateScriptUrlsFromPerformance(window),
    ...getCandidateScriptUrlsFromPerformance(hostWindow),
    ...getCandidateScriptUrlsFromStack(),
  ];

  return candidates.find(candidate => isMatchingScriptUrl(candidate, distPath)) ?? null;
}

function buildRepositoryResourceUrl(currentScriptUrl: string, resourcePath: string) {
  const parsed = new URL(currentScriptUrl);
  const href = `${parsed.origin}${parsed.pathname}`;
  const decodedHref = normalizePathForMatch(href);
  const distIndex = decodedHref.indexOf('/dist/');
  if (distIndex >= 0) {
    return `${href.slice(0, distIndex + 1)}${resourcePath}?v=${databaseScriptCacheVersion}`;
  }

  return `${parsed.origin}/${resourcePath}?v=${databaseScriptCacheVersion}`;
}

function buildDatabaseScriptBaseUrl() {
  const currentScriptUrl = resolveRuntimeScriptUrl(databaseFrontendScriptName, databaseFrontendDistPath);
  if (!currentScriptUrl) {
    throw new Error('[神秘复苏数据库前端] 无法确认当前前端脚本 URL，已拒绝回退到 @main 以避免加载错版本 vendor。');
  }

  return buildRepositoryResourceUrl(currentScriptUrl, databaseVendorPath);
}

function getSillyTavernContext(hostWindow: HostWindow) {
  const localWindow = window as HostWindow;
  for (const st of [hostWindow.SillyTavern, localWindow.SillyTavern]) {
    try {
      const context = st?.getContext?.();
      if (context) return context;
    } catch {
      // Ignore transient host context failures while SillyTavern is switching chats.
    }
  }
  return null;
}

function getCurrentCharacter(hostWindow: HostWindow) {
  const context = getSillyTavernContext(hostWindow);
  const characterId = context?.characterId;
  if (characterId === undefined || characterId === null) return null;

  const characters = context?.characters;
  const character = Array.isArray(characters) ? characters[Number(characterId)] : characters?.[String(characterId)];

  return character ? { id: String(characterId), ...character } : { id: String(characterId) };
}

function isMysteryRevivalCardActive(hostWindow: HostWindow) {
  const character = getCurrentCharacter(hostWindow);
  return Boolean(character && isMysteryCardIdentity(character.name, character.avatar));
}

function tagDatabaseApi(hostWindow: HostWindow) {
  const api = hostWindow.AutoCardUpdaterAPI;
  if (!api || typeof api !== 'object') {
    delete hostWindow.__mfrsDatabaseScriptMarker__;
    return;
  }

  hostWindow.__mfrsDatabaseScriptMarker__ = databaseScriptMarker;
  Object.defineProperty(api, '__mfrsDatabaseScriptMarker__', {
    configurable: true,
    value: databaseScriptMarker,
  });
}

function isExpectedDatabaseApi(api: AutoCardUpdaterAPI | null | undefined) {
  return Boolean(api && api.__mfrsDatabaseScriptMarker__ === databaseScriptMarker);
}

function isUsableDatabaseApi(api: AutoCardUpdaterAPI | null | undefined) {
  return Boolean(
    api &&
    typeof api === 'object' &&
    (typeof api.getTableTemplate === 'function' || typeof api.exportTableAsJson === 'function'),
  );
}

function clearPreviousDatabaseInstance(hostWindow: HostWindow) {
  const localWindow = window as HostWindow;
  const targets = hostWindow === localWindow ? [hostWindow] : [hostWindow, localWindow];

  for (const target of targets) {
    const targetRecord = target as HostWindow & Record<string, unknown>;
    if (!isUsableDatabaseApi(target.AutoCardUpdaterAPI)) {
      delete target.AutoCardUpdaterAPI;
    }
    delete target.__mfrsDatabaseScriptMarker__;
    delete targetRecord[databaseInstanceFlag];
  }
}

async function reloadDatabaseScriptForCurrentCard(hostWindow: HostWindow, reason: string) {
  if (!isMysteryRevivalCardActive(hostWindow)) return false;
  if (databaseScriptReloadPromise) return databaseScriptReloadPromise;

  const reloadUrl = `${buildDatabaseScriptBaseUrl()}&mfrs_reclaim=${Date.now()}_${databaseScriptReloadSeq++}`;
  clearPreviousDatabaseInstance(hostWindow);
  databaseScriptReloadPromise = import(/* webpackIgnore: true */ reloadUrl)
    .then(async () => {
      const api = await waitForApi(hostWindow, 30, 100);
      if (!api) {
        delete hostWindow.__mfrsDatabaseScriptMarker__;
        console.warn('[神秘复苏数据库前端] 重新加载数据库本体后 API 仍未挂载。', { reason });
        return false;
      }
      tagDatabaseApi(hostWindow);
      console.info('[神秘复苏数据库前端] 已重新接管数据库 API。', { reason });
      return true;
    })
    .catch(error => {
      console.warn('[神秘复苏数据库前端] 重新加载数据库本体失败。', { reason, error });
      return false;
    })
    .finally(() => {
      databaseScriptReloadPromise = null;
    });

  return databaseScriptReloadPromise;
}

function getHostDocument(hostWindow: HostWindow) {
  return hostWindow.document ?? document;
}

function normalizeTemplateSheets(template: unknown) {
  if (!template || typeof template !== 'object') return [];
  const record = template as Record<string, unknown>;
  const sheets =
    record.sheets && typeof record.sheets === 'object' ? (record.sheets as Record<string, unknown>) : record;
  return Object.values(sheets).filter((value): value is TemplateSheetLike =>
    Boolean(value && typeof value === 'object' && 'name' in value),
  );
}

function normalizeTemplateNames(template: unknown) {
  return normalizeTemplateSheets(template)
    .map(sheet => sheet.name)
    .filter((name): name is string => Boolean(name));
}

function getSheetHeader(sheet: TemplateSheetLike | undefined) {
  const content = sheet?.content;
  if (!Array.isArray(content) || !Array.isArray(content[0])) return [];
  return content[0].map(value => String(value));
}

function findTemplateMismatchNames(template: unknown) {
  const activeSheets = normalizeTemplateSheets(template);
  const mismatchNames: string[] = [];
  for (const expected of templateSheets) {
    const actual = activeSheets.find(
      sheet => (expected.uid && sheet.uid === expected.uid) || (expected.name && sheet.name === expected.name),
    );
    if (!actual) continue;
    if (JSON.stringify(getSheetHeader(actual)) !== JSON.stringify(getSheetHeader(expected))) {
      mismatchNames.push(expected.name ?? expected.uid ?? '未知表');
    }
  }
  return mismatchNames;
}

function normalizeExportedData(exported: unknown) {
  return normalizeExportedTableData(exported);
}

function requireApi(hostWindow: HostWindow) {
  const api = hostWindow.AutoCardUpdaterAPI;
  if (!api) throw new Error('未检测到 AutoCardUpdaterAPI，请确认spv3.9.5·数据库已加载。');
  return api;
}

async function exportCurrentDatabaseData(api: AutoCardUpdaterAPI) {
  if (!api.exportTableAsJson) throw new Error('表格导出接口不可用。');
  return normalizeExportedData(await api.exportTableAsJson());
}

function enqueueTableChange<T>(task: () => Promise<T>) {
  const run = tableChangeQueue.then(task, task);
  tableChangeQueue = run.catch(() => undefined);
  return run;
}

function normalizeMemoryTableAlias(value: unknown) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '');
}

function isMemoryTableName(value: unknown) {
  return MEMORY_TABLE_ALIASES.has(normalizeMemoryTableAlias(value));
}

function makeMemoryDeleteResult(
  code: TableChangeResult['errors'][number]['code'],
  message: string,
  table?: string,
  confirmed?: boolean,
): TableChangeResult & { confirmed?: boolean } {
  return {
    ok: false,
    action: 'deleteRow',
    table,
    errors: [{ code, message, table }],
    ...(confirmed === undefined ? {} : { confirmed }),
  };
}

function getActiveMemoryWorkbenchState(hostWindow: HostWindow) {
  const shell = hostWindow.document?.getElementById('mfrs-hud-shell');
  const panel = hostWindow.MysteryMessagePanel as { getHudActiveView?: () => unknown } | undefined;
  return Boolean(shell?.classList.contains('is-active') && panel?.getHudActiveView?.() === 'memory');
}

function getMemoryRowTitle(table: string, data: unknown, rowId: string | number) {
  const record = normalizeExportedData(data) as Record<string, any> | null;
  if (!record || typeof record !== 'object') return null;
  const sheets = Object.values(record) as Array<any>;
  const target = sheets.find(sheet => {
    const aliases = [
      sheet?.uid,
      sheet?.name,
      sheet?.sourceData?.ddl?.match(/CREATE\s+TABLE\s+[`"]?([A-Za-z_][\w]*)/i)?.[1],
    ].map(normalizeMemoryTableAlias);
    return aliases.includes(normalizeMemoryTableAlias(table));
  });
  const content = target?.content;
  if (!Array.isArray(content) || !Array.isArray(content[0])) return null;
  const headers = content[0].map((value: unknown) => String(value ?? ''));
  const rowIdIndex = headers.findIndex(header => normalizeMemoryTableAlias(header) === 'row_id');
  if (rowIdIndex < 0) return null;
  const rowIndex = content.findIndex(
    (row: unknown, index: number) => index > 0 && Array.isArray(row) && String(row[rowIdIndex]) === String(rowId),
  );
  if (rowIndex < 1) return null;
  const row = content[rowIndex] as unknown[];
  const titleHeaders =
    target?.uid === 'sheet_chronicle' || target?.name === '事件纪要'
      ? ['纪要编号', '概览']
      : target?.uid === 'sheet_collected_archives' || target?.name === '收录档案'
        ? ['档案厉鬼名称', '收录状态']
        : ['来源厉鬼', '规律类型'];
  const title = titleHeaders
    .map(header => {
      const index = headers.findIndex(value => value === header || value.includes(header));
      return index >= 0 ? String(row[index] ?? '').trim() : '';
    })
    .filter(Boolean)
    .join(' · ');
  return {
    tableName: String(target?.name || table),
    rowIndex,
    title: title || `row_id=${rowId}`,
    rowSnapshot: JSON.stringify(row),
  };
}

async function readTemplateStatus(api: AutoCardUpdaterAPI): Promise<TemplateStatus> {
  const template = api.getTableTemplate ? await api.getTableTemplate() : null;
  const tableNames = normalizeTemplateNames(template);
  const missingNames = templateTableNames.filter(name => !tableNames.includes(name));
  const mismatchNames = missingNames.length === 0 ? findTemplateMismatchNames(template) : [];
  if ((missingNames.length > 0 || mismatchNames.length > 0) && api.exportTableAsJson) {
    try {
      const exportedData = normalizeExportedData(await api.exportTableAsJson());
      const exportedNames = normalizeTemplateNames(exportedData);
      const exportedMissingNames = templateTableNames.filter(name => !exportedNames.includes(name));
      const exportedMismatchNames = exportedMissingNames.length === 0 ? findTemplateMismatchNames(exportedData) : [];
      if (exportedMissingNames.length === 0 && exportedMismatchNames.length === 0) {
        return {
          templateLoaded: true,
          tableCount: exportedNames.length,
          tableNames: exportedNames,
          missingNames: [],
          mismatchNames: [],
        };
      }
    } catch (error) {
      console.debug('[神秘复苏数据库前端] 表格导出口径兜底检查失败，继续使用模板口径。', error);
    }
  }
  return {
    templateLoaded: missingNames.length === 0 && mismatchNames.length === 0,
    tableCount: tableNames.length,
    tableNames,
    missingNames,
    mismatchNames,
  };
}

function cleanupLegacyFrontend(hostDocument: Document, hostWindow: HostWindow) {
  const apiBeforeCleanup = hostWindow.AutoCardUpdaterAPI;
  const hostRecord = hostWindow as HostWindow & Record<string, unknown>;
  const hadDatabaseInstanceFlag = Object.prototype.hasOwnProperty.call(hostRecord, databaseInstanceFlag);
  const databaseInstanceFlagValue = hostRecord[databaseInstanceFlag];

  try {
    hostWindow.__mfrsDatabaseFrontendCleanup__?.({
      removeFixedStatusHost: false,
      removeGlobals: false,
      unregisterNativeListener: true,
    });
  } catch (error) {
    console.warn('[神秘复苏数据库前端] 旧前端 cleanup 执行失败，继续清理固定节点。', error);
  }

  if (!hostWindow.AutoCardUpdaterAPI && isUsableDatabaseApi(apiBeforeCleanup)) {
    hostWindow.AutoCardUpdaterAPI = apiBeforeCleanup;
    if (hadDatabaseInstanceFlag) hostRecord[databaseInstanceFlag] = databaseInstanceFlagValue;
    tagDatabaseApi(hostWindow);
    console.info('[神秘复苏数据库前端] 旧前端 cleanup 曾移除当前数据库 API，已恢复当前 runtime。');
  }

  for (const id of LEGACY_CLEANUP_IDS) {
    hostDocument.getElementById(id)?.remove();
  }

  delete hostWindow.__mfrsDatabaseFrontendCleanup__;
}

function getWindowTargets(hostWindow: HostWindow) {
  const localWindow = window as HostWindow;
  return hostWindow === localWindow ? [hostWindow] : [hostWindow, localWindow];
}

function removeMfrsResourceUrlMarkers(target: HostWindow) {
  const urls = target.__mfrsScriptResourceUrls__;
  if (!urls || typeof urls !== 'object') return;

  for (const key of MFRS_RESOURCE_URL_KEYS) {
    delete urls[key];
  }
  if (Object.keys(urls).length === 0) {
    delete target.__mfrsScriptResourceUrls__;
  }
}

function cleanupMfrsDatabaseFrontend(
  hostDocument: Document,
  hostWindow: HostWindow,
  options: DatabaseCleanupOptions = {},
) {
  const removeFixedStatusHost = options.removeFixedStatusHost ?? true;
  const removeGlobals = options.removeGlobals ?? true;
  const unregisterNativeListener = options.unregisterNativeListener ?? true;

  templateAutofixPromise = null;

  try {
    hostWindow.MysteryAcuVisualizer?.cleanup?.();
  } catch (error) {
    console.warn('[神秘复苏数据库前端] ACU 前端 cleanup 执行失败，继续清理 DOM。', error);
  }

  if (removeFixedStatusHost) {
    try {
      hostWindow.__mfrsFixedStatusCleanup__?.();
    } catch (error) {
      console.warn('[神秘复苏数据库前端] 固定状态栏 cleanup 执行失败，继续移除宿主节点。', error);
    }
  }

  for (const id of CURRENT_FRONTEND_CLEANUP_IDS) {
    if (!removeFixedStatusHost && id === 'mfrs-fixed-status-host') continue;
    hostDocument.getElementById(id)?.remove();
  }

  for (const selector of CURRENT_FRONTEND_CLEANUP_SELECTORS) {
    hostDocument.querySelectorAll(selector).forEach(node => node.remove());
  }

  for (const target of getWindowTargets(hostWindow)) {
    if (removeGlobals) {
      delete target.MysteryDatabaseFrontend;
      delete target.MFRS;
      delete target.MysteryAcuVisualizer;
      delete (target as HostWindow & Record<string, unknown>).MFRS_DATABASE_FRONTEND_CONFIG;
    }
    delete target.__mfrsDatabaseScriptMarker__;
    removeMfrsResourceUrlMarkers(target);
  }

  if (unregisterNativeListener && nativeChatChangedSubscription) {
    nativeChatChangedSubscription.eventSource?.off?.(
      nativeChatChangedSubscription.eventType,
      nativeChatChangedSubscription.listener,
    );
    nativeChatChangedSubscription = null;
  }
}

function installDatabaseFrontendCleanup(hostDocument: Document, hostWindow: HostWindow) {
  hostWindow.__mfrsDatabaseFrontendCleanup__ = (options?: DatabaseCleanupOptions) => {
    cleanupMfrsDatabaseFrontend(hostDocument, hostWindow, options);
    delete hostWindow.__mfrsDatabaseFrontendCleanup__;
  };

  window.addEventListener(
    'pagehide',
    () => {
      hostWindow.__mfrsDatabaseFrontendCleanup__?.();
    },
    { once: true },
  );
}

function keepAcuConfigEmbedded(hostWindow: HostWindow) {
  try {
    const raw = hostWindow.localStorage.getItem(ACU_UI_CONFIG_KEY);
    const current = raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
    const next = {
      ...current,
      theme: 'aurora',
      highlightColor: 'red',
      titleColor: 'red',
      customTitleColor: false,
      showDashboard: true,
      dashboardPosition: 'fixed_status',
      frontendPosition: 'fixed_status',
    };
    hostWindow.localStorage.setItem(ACU_UI_CONFIG_KEY, JSON.stringify(next));
  } catch (error) {
    console.warn('[神秘复苏数据库前端] 写入 ACU 配置失败。', error);
  }
}

function queryAcuState(hostDocument: Document): Omit<FrontendState, 'templateStatus'> {
  const nav = hostDocument.querySelector<HTMLElement>('.acu-nav-container');
  const dashboard = hostDocument.querySelector<HTMLElement>('.acu-embedded-dashboard-container');
  return {
    acuLoaded: Boolean(nav || dashboard),
    acuCollapsed: Boolean(nav?.classList.contains('collapsed')),
    embeddedDashboardVisible: Boolean(dashboard && dashboard.offsetParent !== null),
  };
}

function wait(ms: number) {
  return new Promise(resolve => window.setTimeout(resolve, ms));
}

async function waitForApi(hostWindow: HostWindow, attempts = 24, interval = 500) {
  for (let attempt = 0; attempt < attempts; attempt++) {
    const api = hostWindow.AutoCardUpdaterAPI;
    if (api?.getTableTemplate) return api;
    await wait(interval);
  }
  return null;
}

function hasHostSaveChat(hostWindow: HostWindow) {
  const localWindow = window as HostWindow;
  const candidates = [hostWindow.SillyTavern, localWindow.SillyTavern];

  return candidates.some(st => {
    try {
      return typeof st?.saveChat === 'function' || typeof st?.getContext?.().saveChat === 'function';
    } catch {
      return false;
    }
  });
}

async function waitForHostSaveChat(hostWindow: HostWindow, attempts = 20, interval = 250) {
  for (let attempt = 0; attempt < attempts; attempt++) {
    if (hasHostSaveChat(hostWindow)) return true;
    await wait(interval);
  }
  return false;
}

function rerenderAcu(hostWindow: HostWindow) {
  hostWindow.MysteryAcuVisualizer?.renderInterface?.();
  window.setTimeout(() => hostWindow.MysteryAcuVisualizer?.renderInterface?.(), 500);
}

async function runMysteryTemplateAutofix(hostWindow: HostWindow, force = false) {
  if (!isMysteryRevivalCardActive(hostWindow)) {
    templateAutofixPromise = null;
    return;
  }

  let api = await waitForApi(hostWindow);
  if (!api) {
    console.warn('[神秘复苏数据库前端] 数据库 API 超时未就绪，跳过自动模板校正。');
    templateAutofixPromise = null;
    return;
  }

  if (!isExpectedDatabaseApi(api)) {
    await reloadDatabaseScriptForCurrentCard(hostWindow, 'marker_mismatch');
    api = (await waitForApi(hostWindow, 16, 250)) ?? api;
    if (!isExpectedDatabaseApi(api)) {
      tagDatabaseApi(hostWindow);
      console.warn('[神秘复苏数据库前端] 数据库 API marker 仍不匹配，继续使用当前已加载 API。');
    }
  }

  let status = await readTemplateStatus(api);
  // force=true 表示由 CHAT_CHANGED 触发。新聊天创建时，数据库可能仍在服务旧聊天的
  // 14 表数据，CHAT_CHANGED 事件在数据切换完成之前就触发了。轮询检测数据是否从
  // 旧聊天的 14 表切换到新聊天的默认 8 表，一旦发现 templateLoaded 变 false 就继续导入。
  if (force && status.templateLoaded) {
    for (let attempt = 0; attempt < 8; attempt++) {
      await wait(500);
      status = await readTemplateStatus(api);
      if (!status.templateLoaded) break;
    }
  }
  if (status.templateLoaded) {
    rerenderAcu(hostWindow);
    return;
  }

  if (!api.importTemplateFromData) {
    console.warn('[神秘复苏数据库前端] 当前数据库 API 不支持模板导入，无法自动切换神秘复苏模板。', status);
    templateAutofixPromise = null;
    return;
  }

  try {
    await waitForHostSaveChat(hostWindow);
    console.info('[神秘复苏数据库前端] 检测到当前数据库模板不是最新神秘复苏模板，正在自动导入内置模板。', {
      currentTables: status.tableNames,
      missingTables: status.missingNames,
      mismatchTables: status.mismatchNames,
    });
    // 导入会触发库保存设置；若 ACU 设置尚未可靠加载完成（settingsStorageReadyForSave_ACU=false），
    // 库会拒绝保存（日志「设置尚未完成可靠加载，已拒绝本次保存」），导入静默失败、表停在库默认 8 表。
    // 这是时序竞态：autofix 可能比设置加载更早。对策：导入→验证→未成功则退避重试，覆盖设置加载窗口。
    // scope:'chat' 让导入即对当前聊天生效（scope:'global' 只塞预设库、不切换生效模板）。
    const retryDelays = [250, 500, 1000, 1500, 2000, 3000, 3000, 4000];
    let loaded = false;
    for (let attempt = 0; attempt < retryDelays.length; attempt++) {
      await api.importTemplateFromData(templateData, { scope: 'chat' });
      await wait(retryDelays[attempt]);
      if ((await readTemplateStatus(api)).templateLoaded) {
        loaded = true;
        break;
      }
    }
    if (loaded) {
      hostWindow.toastr?.success?.('神秘复苏 14 表模板已自动导入。');
    } else {
      hostWindow.toastr?.warning?.('神秘复苏模板已尝试导入，但当前数据库表仍不完整，请稍后手动重试。');
      console.warn('[神秘复苏数据库前端] 多次重试后模板仍不完整。', await readTemplateStatus(api));
    }
    rerenderAcu(hostWindow);
  } catch (error) {
    console.error('[神秘复苏数据库前端] 自动导入神秘复苏模板失败。', error);
    hostWindow.toastr?.error?.('神秘复苏数据库模板自动导入失败，请稍后重试。');
    templateAutofixPromise = null;
  }
}

function ensureMysteryTemplate(hostWindow: HostWindow, force = false) {
  if (!isMysteryRevivalCardActive(hostWindow)) {
    if (force) templateAutofixPromise = null;
    return Promise.resolve();
  }

  // force=true 用于切换聊天后强制重新校正：清掉上一轮单例 promise，重跑 autofix。
  if (force) templateAutofixPromise = null;
  templateAutofixPromise ??= runMysteryTemplateAutofix(hostWindow, force).finally(() => {
    templateAutofixPromise = null;
  });
  return templateAutofixPromise;
}

async function openAcuFrontend(hostWindow: HostWindow) {
  const hostDocument = getHostDocument(hostWindow);
  await ensureMysteryTemplate(hostWindow);
  keepAcuConfigEmbedded(hostWindow);

  try {
    hostWindow.localStorage.setItem(ACU_UI_COLLAPSE_KEY, 'false');
  } catch {
    // localStorage can be unavailable in unusual iframe contexts.
  }

  for (const delay of [0, 250, 750, 1500, 3000]) {
    if (delay > 0) await wait(delay);
    hostWindow.MysteryAcuVisualizer?.renderInterface?.();
    await wait(50);
    const collapsedNav = hostDocument.querySelector<HTMLElement>('.acu-nav-container.collapsed');
    if (collapsedNav) {
      collapsedNav.click();
      await wait(50);
    }

    const state = queryAcuState(hostDocument);
    if (state.acuLoaded && !state.acuCollapsed) return;
  }

  hostWindow.toastr?.info?.('v10.2 可视化前端仍在等待数据库 API 初始化，请稍后再试。');
}

async function openAcuStatus(hostWindow: HostWindow) {
  await openAcuFrontend(hostWindow);
  getHostDocument(hostWindow).dispatchEvent(new CustomEvent('mfrs:open-status'));
}

async function installCompatibilityApi() {
  const hostWindow = getHostWindow();
  const hostDocument = getHostDocument(hostWindow);

  cleanupLegacyFrontend(hostDocument, hostWindow);

  if (!isMysteryRevivalCardActive(hostWindow)) {
    cleanupMfrsDatabaseFrontend(hostDocument, hostWindow);
    return;
  }

  try {
    await loadAcuFrontendRuntime();
  } catch (error) {
    console.error('[神秘复苏数据库前端] v10.2 可视化前端加载失败。', error);
    return;
  }

  installDatabaseFrontendCleanup(hostDocument, hostWindow);
  keepAcuConfigEmbedded(hostWindow);

  const frontendApi: NonNullable<HostWindow['MysteryDatabaseFrontend']> = {
    async checkTemplateStatus() {
      return readTemplateStatus(requireApi(hostWindow));
    },
    async importMysteryTemplate() {
      const api = requireApi(hostWindow);
      if (!api.importTemplateFromData) throw new Error('模板导入接口不可用。');
      await api.importTemplateFromData(templateData, { scope: 'chat' });
      hostWindow.toastr?.success?.('神秘复苏 14 表模板已导入。');
      rerenderAcu(hostWindow);
      return true;
    },
    async openVisualizer() {
      const api = requireApi(hostWindow);
      if (!api.openVisualizer) throw new Error('数据库编辑器入口不可用。');
      await api.openVisualizer();
    },
    async openPanel() {
      await openAcuFrontend(hostWindow);
    },
    async openDashboard() {
      // options.welcome 参数为预留接口，当前实现中未做差异化处理。
      await openAcuFrontend(hostWindow);
    },
    async openStatus() {
      await openAcuStatus(hostWindow);
    },
    async refreshDatabase() {
      const api = requireApi(hostWindow);
      if (!api.refreshDataAndWorldbook) throw new Error('刷新数据库/世界书接口不可用。');
      await api.refreshDataAndWorldbook();
    },
    async exportCurrentData() {
      return exportCurrentDatabaseData(requireApi(hostWindow));
    },
    getTableChangeSchema() {
      return tableChangePlanSchemaDescription;
    },
    async getTableMetadata() {
      const api = requireApi(hostWindow);
      return listTableMetadata(await exportCurrentDatabaseData(api), templateData);
    },
    async previewTableChangePlan(plan) {
      const api = requireApi(hostWindow);
      return previewTableChangePlan(plan, await exportCurrentDatabaseData(api), templateData);
    },
    async applyTableChangePlan(plan) {
      return enqueueTableChange(async () => {
        const api = requireApi(hostWindow);
        const result = await applyTableChangePlan(api, plan, await exportCurrentDatabaseData(api), templateData);
        if (result.ok) {
          rerenderAcu(hostWindow);
        }
        return result;
      });
    },
    async previewMemoryChange(plan) {
      if (!isMemoryTableName(plan?.table) || (plan?.action !== 'insertRow' && plan?.action !== 'updateCell')) {
        return makeMemoryDeleteResult(
          'INVALID_PLAN',
          '记忆工作台仅允许对事件纪要、收录档案、收录规律执行新增或修改。',
          plan?.table,
        );
      }
      const api = requireApi(hostWindow);
      return memoryMutationExecutor.previewMemoryChange(plan, await exportCurrentDatabaseData(api), templateData);
    },
    async applyMemoryChange(plan) {
      if (!isMemoryTableName(plan?.table) || (plan?.action !== 'insertRow' && plan?.action !== 'updateCell')) {
        return makeMemoryDeleteResult(
          'INVALID_PLAN',
          '记忆工作台仅允许对事件纪要、收录档案、收录规律执行新增或修改。',
          plan?.table,
        );
      }
      return enqueueTableChange(async () => {
        const api = requireApi(hostWindow);
        const currentData = await exportCurrentDatabaseData(api);
        const result = await memoryMutationExecutor.applyMemoryChange(api, plan, currentData, templateData);
        if (result.ok) rerenderAcu(hostWindow);
        return result;
      });
    },
    async requestConfirmedMemoryDelete(request) {
      const table = String(request?.table ?? '');
      const rowId = request?.row_id;
      if (!isMemoryTableName(table) || (typeof rowId !== 'string' && typeof rowId !== 'number')) {
        return makeMemoryDeleteResult(
          'INVALID_PLAN',
          '只能从记忆工作台删除事件纪要、收录档案或收录规律的指定记录。',
          table,
        );
      }
      // 该检查是防误用的纵深保护；真正的写入授权仍是 adapter 内部不可序列化的 closure capability。
      if (!getActiveMemoryWorkbenchState(hostWindow)) {
        return makeMemoryDeleteResult('INVALID_PLAN', '删除仅能在当前沉浸“记忆”工作台中发起。', table);
      }
      const api = requireApi(hostWindow);
      const beforeConfirm = await exportCurrentDatabaseData(api);
      const target = getMemoryRowTitle(table, beforeConfirm, rowId);
      if (!target) return makeMemoryDeleteResult('ROW_NOT_FOUND', '该记忆记录已不存在或已被外部修改。', table);
      const confirmDanger = await waitForMfrsConfirmDanger(hostWindow);
      if (!confirmDanger) {
        return makeMemoryDeleteResult('API_UNAVAILABLE', '危险确认组件未就绪，已阻止删除。', table);
      }
      const confirmed = await confirmDanger({
        title: '确认永久删除记忆记录',
        message: `将永久删除「${target.tableName} · ${target.title}」。此操作无法自动恢复。`,
        confirmText: '永久删除',
        cancelText: '取消',
      });
      if (!confirmed) {
        return { ok: true, action: 'deleteRow', table: target.tableName, errors: [], confirmed: false };
      }
      return enqueueTableChange(async () => {
        const latestData = await exportCurrentDatabaseData(api);
        const latestTarget = getMemoryRowTitle(table, latestData, rowId);
        if (!latestTarget || latestTarget.rowSnapshot !== target.rowSnapshot) {
          return makeMemoryDeleteResult(
            'ROW_NOT_FOUND',
            '删除确认期间记录已变更；为避免误删，本次操作已取消。',
            target.tableName,
            true,
          );
        }
        const result = await memoryMutationExecutor.applyConfirmedMemoryDelete(
          api,
          {
            action: 'deleteRow',
            table,
            match: { row_id: rowId },
          },
          latestData,
          templateData,
          memoryDeleteCapability,
        );
        if (result.ok) rerenderAcu(hostWindow);
        return { ...result, confirmed: true };
      });
    },
    async getPanelState() {
      return {
        ...queryAcuState(hostDocument),
        templateStatus: await readTemplateStatus(requireApi(hostWindow)),
      };
    },
    async refreshPanel() {
      await openAcuFrontend(hostWindow);
    },
  };
  Object.defineProperty(frontendApi, '__mfrsFrontendApiMarker__', {
    configurable: true,
    enumerable: false,
    value: databaseScriptMarker,
  });
  hostWindow.MysteryDatabaseFrontend = frontendApi;

  console.info('[神秘复苏数据库前端] 已切换为 v10.2 原始可视化前端，并保留 MysteryDatabaseFrontend 兼容 API。');
  void ensureMysteryTemplate(hostWindow);
  const uninstallCoreMirror = installMvuCoreMirror(hostWindow);
  const previousCleanup = hostWindow.__mfrsDatabaseFrontendCleanup__;
  hostWindow.__mfrsDatabaseFrontendCleanup__ = options => {
    try {
      uninstallCoreMirror();
    } catch {
      // ignore
    }
    previousCleanup?.(options);
  };

  const handleChatChanged = () => {
    for (const delay of [0, 250, 1000]) {
      window.setTimeout(() => {
        if (!isMysteryRevivalCardActive(hostWindow)) {
          hostWindow.__mfrsDatabaseFrontendCleanup__?.({
            removeFixedStatusHost: true,
            removeGlobals: true,
            unregisterNativeListener: true,
          });
          return;
        }
        keepAcuConfigEmbedded(hostWindow);
        void ensureMysteryTemplate(hostWindow, true);
      }, delay);
    }
  };

  // 切换/新建聊天后，脚本不会重新注入；仍在 MFRS 卡内时重跑 autofix，
  // 切到其他卡时清理主文档里的 MFRS DOM/global，避免跨卡残留。
  // eventOn 仅在酒馆助手注入环境存在；脚本卸载时监听会被自动清理，无需手动 off。
  if (typeof eventOn !== 'undefined' && typeof tavern_events !== 'undefined') {
    eventOn(tavern_events.CHAT_CHANGED, handleChatChanged);
  } else {
    // 酒馆助手注入环境不可用（脚本在主 window 运行）时，回退到 SillyTavern 原生事件系统。
    const stContext = getSillyTavernContext(hostWindow);
    const eventSource = stContext?.eventSource;
    const eventTypes = stContext?.event_types;
    if (eventSource && typeof eventSource.on === 'function' && eventTypes?.CHAT_CHANGED) {
      eventSource.on(eventTypes.CHAT_CHANGED, handleChatChanged);
      nativeChatChangedSubscription = {
        eventSource,
        eventType: eventTypes.CHAT_CHANGED,
        listener: handleChatChanged,
      };
      console.info('[神秘复苏数据库前端] 已通过 SillyTavern 原生事件系统注册 CHAT_CHANGED 监听。');
    } else {
      console.warn('[神秘复苏数据库前端] 无法注册 CHAT_CHANGED 事件监听，切换聊天后可能需要手动刷新模板。');
    }
  }
}

void installCompatibilityApi();
