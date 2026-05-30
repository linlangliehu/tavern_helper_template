import templateData from '../../数据库/神秘复苏表格SQL_v1.json';
import './v10_2_visualizer.js';

type AutoCardUpdaterAPI = {
  openVisualizer?: () => unknown | Promise<unknown>;
  importTemplateFromData?: (data: unknown) => unknown | Promise<unknown>;
  refreshDataAndWorldbook?: () => unknown | Promise<unknown>;
  exportTableAsJson?: () => unknown | Promise<unknown>;
  getTableTemplate?: () => unknown | Promise<unknown>;
};

type TemplateStatus = {
  templateLoaded: boolean;
  tableCount: number;
  tableNames: string[];
  missingNames: string[];
};

type FrontendState = {
  acuLoaded: boolean;
  acuCollapsed: boolean;
  embeddedDashboardVisible: boolean;
  templateStatus: TemplateStatus;
};

type HostWindow = Window & {
  AutoCardUpdaterAPI?: AutoCardUpdaterAPI;
  MysteryDatabaseFrontend?: {
    checkTemplateStatus: () => Promise<TemplateStatus>;
    importMysteryTemplate: () => Promise<boolean>;
    openVisualizer: () => Promise<void>;
    openPanel: (options?: { welcome?: boolean }) => Promise<void>;
    openDashboard: (options?: { welcome?: boolean }) => Promise<void>;
    openStatus: () => Promise<void>;
    refreshDatabase: () => Promise<void>;
    exportCurrentData: () => Promise<unknown>;
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

function getHostWindow() {
  try {
    return (window.parent ?? window) as HostWindow;
  } catch {
    return window as HostWindow;
  }
}

function getHostDocument(hostWindow: HostWindow) {
  return hostWindow.document ?? document;
}

function normalizeTemplateNames(template: unknown) {
  if (!template || typeof template !== 'object') return [];
  const record = template as Record<string, unknown>;
  const sheets = record.sheets && typeof record.sheets === 'object' ? (record.sheets as Record<string, unknown>) : record;
  return Object.values(sheets)
    .filter((value): value is { name: string } => Boolean(value && typeof value === 'object' && 'name' in value))
    .map(sheet => sheet.name);
}

function normalizeExportedData(exported: unknown) {
  if (typeof exported !== 'string') return exported;
  try {
    return JSON.parse(exported) as unknown;
  } catch {
    return exported;
  }
}

function requireApi(hostWindow: HostWindow) {
  const api = hostWindow.AutoCardUpdaterAPI ?? (window as HostWindow).AutoCardUpdaterAPI;
  if (!api) throw new Error('未检测到 AutoCardUpdaterAPI，请确认星河璀璨·数据库已加载。');
  return api;
}

async function readTemplateStatus(api: AutoCardUpdaterAPI): Promise<TemplateStatus> {
  const tableNames = api.getTableTemplate ? normalizeTemplateNames(await api.getTableTemplate()) : [];
  const missingNames = templateTableNames.filter(name => !tableNames.includes(name));
  return {
    templateLoaded: missingNames.length === 0,
    tableCount: tableNames.length,
    tableNames,
    missingNames,
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

async function openAcuFrontend(hostWindow: HostWindow) {
  const hostDocument = getHostDocument(hostWindow);
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
      await api.importTemplateFromData(templateData);
      hostWindow.toastr?.success?.('神秘复苏 14 表模板已导入。');
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
      const api = requireApi(hostWindow);
      if (!api.exportTableAsJson) throw new Error('表格导出接口不可用。');
      return normalizeExportedData(await api.exportTableAsJson());
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
}

installCompatibilityApi();
