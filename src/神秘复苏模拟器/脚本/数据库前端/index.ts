import templateData from '../../数据库/神秘复苏表格SQL_v1.json';
import './v10_2_visualizer.js';
import {
  applyTableChangePlan,
  listTableMetadata,
  normalizeExportedTableData,
  previewTableChangePlan,
  tableChangePlanSchemaDescription,
  type AutoCardUpdaterCrudApi,
  type TableChangePlan,
  type TableChangeResult,
  type TableMetaSummary,
} from './table-change-adapter';

type AutoCardUpdaterAPI = {
  __mfrsDatabaseScriptMarker__?: string;
  openVisualizer?: () => unknown | Promise<unknown>;
  importTemplateFromData?: (data: unknown, options?: { scope?: 'global' | 'chat'; presetName?: string }) => unknown | Promise<unknown>;
  refreshDataAndWorldbook?: () => unknown | Promise<unknown>;
  exportTableAsJson?: () => unknown | Promise<unknown>;
  getTableTemplate?: () => unknown | Promise<unknown>;
  updateCell?: AutoCardUpdaterCrudApi['updateCell'];
  insertRow?: AutoCardUpdaterCrudApi['insertRow'];
  deleteRow?: AutoCardUpdaterCrudApi['deleteRow'];
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
  SillyTavern?: {
    saveChat?: unknown;
    getContext?: () => {
      characterId?: string | number;
      characters?: Array<{ name?: string; avatar?: string }> | Record<string, { name?: string; avatar?: string }>;
      saveChat?: unknown;
    };
  };
  MysteryDatabaseFrontend?: {
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
    getPanelState: () => Promise<FrontendState>;
    refreshPanel: () => Promise<void>;
  };
  MysteryAcuVisualizer?: {
    renderInterface?: () => void;
  };
  __mfrsDatabaseFrontendCleanup__?: () => void;
  toastr?: {
    info?: (message: string) => void;
    success?: (message: string) => void;
    warning?: (message: string) => void;
    error?: (message: string) => void;
  };
};

const databaseScriptUrl = 'https://testingcf.jsdelivr.net/gh/linlangliehu/tavern_helper_template@981081a75d6d3436cefe57ea1b11a5462fb94c83/vendor/shujuku-sp-fork/index.js?v=phase161-4-0-final-baseline-6-28-p5-4-hotfix11';
const databaseScriptMarker = 'mfrs-4-0-final-baseline-6-28-p5-4-hotfix11';
const databaseInstanceFlag = '__ACU_STAR_DB_III_LOADED__';
const mysteryCardNames = new Set(['神秘复苏模拟器', '神秘复苏模拟器发布版']);
const mysteryCardAvatars = new Set(['神秘复苏模拟器.png', '神秘复苏模拟器发布版.png']);
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

const templateTableNames = Object.values(templateData as Record<string, unknown>)
  .filter((value): value is { name: string } => Boolean(value && typeof value === 'object' && 'name' in value))
  .map(sheet => sheet.name);

type TemplateSheetLike = {
  uid?: string;
  name?: string;
  content?: unknown;
};

const templateSheets = Object.values(templateData as Record<string, unknown>)
  .filter((value): value is TemplateSheetLike => Boolean(value && typeof value === 'object' && 'name' in value));

let templateAutofixPromise: Promise<void> | null = null;
let databaseScriptReloadPromise: Promise<boolean> | null = null;
let databaseScriptReloadSeq = 0;
let tableChangeQueue: Promise<unknown> = Promise.resolve();

function getHostWindow() {
  try {
    return (window.parent ?? window) as HostWindow;
  } catch {
    return window as HostWindow;
  }
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
  const character = Array.isArray(characters)
    ? characters[Number(characterId)]
    : characters?.[String(characterId)];

  return character ? { id: String(characterId), ...character } : { id: String(characterId) };
}

function isMysteryRevivalCardActive(hostWindow: HostWindow) {
  const character = getCurrentCharacter(hostWindow);
  return Boolean(
    character
      && ((character.name && mysteryCardNames.has(character.name))
        || (character.avatar && mysteryCardAvatars.has(character.avatar))),
  );
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

function clearPreviousDatabaseInstance(hostWindow: HostWindow) {
  const localWindow = window as HostWindow;
  const targets = hostWindow === localWindow ? [hostWindow] : [hostWindow, localWindow];

  for (const target of targets) {
    const targetRecord = target as HostWindow & Record<string, unknown>;
    delete target.AutoCardUpdaterAPI;
    delete target.__mfrsDatabaseScriptMarker__;
    delete targetRecord[databaseInstanceFlag];
  }
}

async function reloadDatabaseScriptForCurrentCard(hostWindow: HostWindow, reason: string) {
  if (!isMysteryRevivalCardActive(hostWindow)) return false;
  if (databaseScriptReloadPromise) return databaseScriptReloadPromise;

  const reloadUrl = `${databaseScriptUrl}&mfrs_reclaim=${Date.now()}_${databaseScriptReloadSeq++}`;
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
  const sheets = record.sheets && typeof record.sheets === 'object' ? (record.sheets as Record<string, unknown>) : record;
  return Object.values(sheets)
    .filter((value): value is TemplateSheetLike => Boolean(value && typeof value === 'object' && 'name' in value));
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
    const actual = activeSheets.find(sheet =>
      (expected.uid && sheet.uid === expected.uid)
      || (expected.name && sheet.name === expected.name)
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
  try {
    hostWindow.__mfrsDatabaseFrontendCleanup__?.();
  } catch (error) {
    console.warn('[神秘复苏数据库前端] 旧前端 cleanup 执行失败，继续清理固定节点。', error);
  }

  for (const id of LEGACY_CLEANUP_IDS) {
    hostDocument.getElementById(id)?.remove();
  }

  delete hostWindow.__mfrsDatabaseFrontendCleanup__;
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
      dashboardPosition: 'embedded',
      frontendPosition: 'bottom',
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

async function runMysteryTemplateAutofix(hostWindow: HostWindow) {
  if (!isMysteryRevivalCardActive(hostWindow)) {
    templateAutofixPromise = null;
    return;
  }

  let api = await waitForApi(hostWindow);
  if (!api) {
    await reloadDatabaseScriptForCurrentCard(hostWindow, 'api_missing');
    api = await waitForApi(hostWindow, 16, 250);
  }
  if (!api) {
    console.warn('[神秘复苏数据库前端] 数据库 API 超时未就绪，跳过自动模板校正。');
    templateAutofixPromise = null;
    return;
  }

  if (!isExpectedDatabaseApi(api)) {
    await reloadDatabaseScriptForCurrentCard(hostWindow, 'api_owner_mismatch');
    api = (await waitForApi(hostWindow, 16, 250)) ?? api;
  }

  const status = await readTemplateStatus(api);
  if (status.templateLoaded) {
    rerenderAcu(hostWindow);
    return;
  }

  // v6.13: 禁用自动 reload 数据库脚本，避免新版本被旧版本覆盖
  // 如果 marker 不匹配，只导入模板，不重新加载数据库本体
  // if (!isExpectedDatabaseApi(api)) {
  //   await reloadDatabaseScriptForCurrentCard(hostWindow, 'template_mismatch');
  //   api = (await waitForApi(hostWindow, 16, 250)) ?? api;
  //   status = await readTemplateStatus(api);
  //   if (status.templateLoaded) {
  //     rerenderAcu(hostWindow);
  //     return;
  //   }
  // }

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
  templateAutofixPromise ??= runMysteryTemplateAutofix(hostWindow).finally(() => {
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

function installCompatibilityApi() {
  const hostWindow = getHostWindow();
  const hostDocument = getHostDocument(hostWindow);

  cleanupLegacyFrontend(hostDocument, hostWindow);
  keepAcuConfigEmbedded(hostWindow);

  hostWindow.MysteryDatabaseFrontend = {
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

  console.info('[神秘复苏数据库前端] 已切换为 v10.2 原始可视化前端，并保留 MysteryDatabaseFrontend 兼容 API。');
  void ensureMysteryTemplate(hostWindow);

  // 切换/新建聊天后，脚本不会重新注入，单例 autofix 不会重跑，新聊天会停在库默认 8 表。
  // 监听 CHAT_CHANGED，每次切聊天强制重跑 autofix，使新聊天也自动获得神秘复苏 14 表。
  // eventOn 仅在酒馆助手注入环境存在；脚本卸载时监听会被自动清理，无需手动 off。
  if (typeof eventOn !== 'undefined' && typeof tavern_events !== 'undefined') {
    eventOn(tavern_events.CHAT_CHANGED, () => {
      void ensureMysteryTemplate(hostWindow, true);
    });
  }
}

installCompatibilityApi();
