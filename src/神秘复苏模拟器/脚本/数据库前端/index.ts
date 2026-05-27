import templateData from '../../数据库/神秘复苏表格SQL_v1.json';

type AutoCardUpdaterAPI = {
  openVisualizer?: () => unknown | Promise<unknown>;
  importTemplateFromData?: (data: unknown) => unknown | Promise<unknown>;
  refreshDataAndWorldbook?: () => unknown | Promise<unknown>;
  exportTableAsJson?: () => unknown | Promise<unknown>;
  getTableTemplate?: () => unknown | Promise<unknown>;
  getTableLockState?: (tableName: string) => unknown | Promise<unknown>;
  setTableLockState?: (tableName: string, state: unknown) => unknown | Promise<unknown>;
};

type PanelPage = 'overview' | 'tables' | 'review' | 'locks' | 'io' | 'diagnostics';
type StatusVariant = 'info' | 'success' | 'warning' | 'error';
type DashboardSection = 'global' | 'player' | 'events' | 'clues' | 'ghosts' | 'database';

type SheetDefinition = {
  uid: string;
  name: string;
  headers: string[];
  orderNo: number;
  sourceNote: string;
  exportEnabled: boolean;
  exportType: string;
  splitByRow: boolean;
  keywords: string;
  extraIndexEnabled: boolean;
};

type TemplateStatus = {
  templateLoaded: boolean;
  tableCount: number;
  tableNames: string[];
  missingNames: string[];
};

type Diagnostics = {
  apiAvailable: boolean;
  availableMethods: string[];
  missingMethods: string[];
  templateStatus: TemplateStatus;
  activePage: PanelPage;
  panelVisible: boolean;
  dashboardVisible: boolean;
  dashboardCollapsed: boolean;
  lockStates: Record<string, unknown>;
  exportedSummary: { tableCount: number; rowCount: number; tableNames: string[] };
  updatedAt: string;
};

type DashboardSummary = {
  statusText: string;
  templateStatus: TemplateStatus;
  exportedSummary: { tableCount: number; rowCount: number; tableNames: string[] };
  updatedAt: string;
  sections: Record<DashboardSection, { title: string; rows: Record<string, string>[]; emptyText: string }>;
};

type HostWindow = Window & {
  AutoCardUpdaterAPI?: AutoCardUpdaterAPI;
  MysteryDatabaseFrontend?: {
    checkTemplateStatus: () => Promise<TemplateStatus>;
    importMysteryTemplate: () => Promise<boolean>;
    openVisualizer: () => Promise<void>;
    openPanel: () => Promise<void>;
    refreshDatabase: () => Promise<void>;
    exportCurrentData: () => Promise<unknown>;
    checkClueLocks: () => Promise<unknown>;
    getPanelState: () => {
      panelVisible: boolean;
      statusText: string;
      tableCount: number;
      activePage: PanelPage;
      dashboardVisible: boolean;
      dashboardCollapsed: boolean;
    };
    getDiagnostics: () => Promise<Diagnostics>;
    refreshPanel: () => Promise<void>;
    switchPage: (page: PanelPage) => Promise<void>;
  };
  toastr?: {
    info?: (message: string) => void;
    success?: (message: string) => void;
    warning?: (message: string) => void;
    error?: (message: string) => void;
  };
  SillyTavern?: {
    getContext?: () => {
      getVariable?: (name: string, scope?: string) => string | undefined;
      chat_metadata?: Record<string, unknown>;
    };
  };
  __mfrsDatabaseFrontendCleanup__?: () => void;
};

const panelId = 'mfrs-database-frontend-panel';
const buttonId = 'mfrs-database-frontend-button';
const dashboardId = 'acu-mfrs-embedded-dashboard';
const dashboardStorageKey = 'acu-mfrs-dashboard-collapsed';
const styleId = 'mfrs-database-frontend-style';
const requiredApiMethods = [
  'openVisualizer',
  'importTemplateFromData',
  'refreshDataAndWorldbook',
  'exportTableAsJson',
  'getTableTemplate',
  'getTableLockState',
] as const;
const reviewTableNames = ['线索', '灵异事件', '厉鬼档案'];
const lockTableNames = ['线索', '灵异事件', '厉鬼档案', '玩家状态', '全局状态'];
const templateSheets = Object.entries(templateData as Record<string, unknown>)
  .filter(([, value]): value is Record<string, unknown> => Boolean(value && typeof value === 'object' && 'name' in value))
  .map(([uid, sheet]) => {
    const exportConfig = (sheet.exportConfig && typeof sheet.exportConfig === 'object' ? sheet.exportConfig : {}) as Record<string, unknown>;
    const sourceData = (sheet.sourceData && typeof sheet.sourceData === 'object' ? sheet.sourceData : {}) as Record<string, unknown>;
    const content = Array.isArray(sheet.content) ? sheet.content : [];
    const headers = Array.isArray(content[0]) ? content[0].map(String) : [];
    return {
      uid,
      name: String(sheet.name),
      headers,
      orderNo: typeof sheet.orderNo === 'number' ? sheet.orderNo : 999,
      sourceNote: typeof sourceData.note === 'string' ? sourceData.note : '',
      exportEnabled: exportConfig.enabled === true,
      exportType: typeof exportConfig.entryType === 'string' ? exportConfig.entryType : 'disabled',
      splitByRow: exportConfig.splitByRow === true,
      keywords: typeof exportConfig.keywords === 'string' ? exportConfig.keywords : '',
      extraIndexEnabled: exportConfig.extraIndexEnabled === true,
    } satisfies SheetDefinition;
  })
  .sort((a, b) => a.orderNo - b.orderNo);
const templateTableNames = templateSheets.map(sheet => sheet.name);

let activePage: PanelPage = 'overview';
let dashboardCollapsed = false;
let lastTemplateStatus: TemplateStatus = { templateLoaded: false, tableCount: 0, tableNames: [], missingNames: [...templateTableNames] };
let lastExportedData: unknown = null;
let lastDashboardSummary: DashboardSummary | null = null;
let lastDiagnostics: Diagnostics | null = null;
let lastLockStates: Record<string, unknown> = {};

function getHostDocument() {
  try {
    return window.parent?.document ?? document;
  } catch {
    return document;
  }
}

function getHostWindow(hostDocument: Document) {
  return (hostDocument.defaultView ?? window) as HostWindow;
}

function stringifyError(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function createElement<K extends keyof HTMLElementTagNameMap>(
  hostDocument: Document,
  tagName: K,
  options: { className?: string; textContent?: string } = {},
) {
  const element = hostDocument.createElement(tagName);
  if (options.className) element.className = options.className;
  if (options.textContent !== undefined) element.textContent = options.textContent;
  return element;
}

function requireApi(hostWindow: HostWindow) {
  const api = hostWindow.AutoCardUpdaterAPI;
  if (!api) throw new Error('未检测到 AutoCardUpdaterAPI，请先确认星河璀璨·数据库已加载');
  return api;
}

function getApiMethodState(api?: AutoCardUpdaterAPI) {
  const availableMethods = requiredApiMethods.filter(method => typeof api?.[method] === 'function');
  const missingMethods = requiredApiMethods.filter(method => typeof api?.[method] !== 'function');
  return { availableMethods: [...availableMethods], missingMethods: [...missingMethods] };
}

function normalizeTemplateNames(template: unknown) {
  if (!template || typeof template !== 'object') return [];
  return Object.values(template as Record<string, unknown>)
    .filter((value): value is { name: string } => Boolean(value && typeof value === 'object' && 'name' in value))
    .map(sheet => sheet.name);
}

async function readCurrentTemplate(api: AutoCardUpdaterAPI) {
  if (!api.getTableTemplate) return [];
  const result = await api.getTableTemplate();
  return normalizeTemplateNames(result);
}

async function readTemplateStatus(api: AutoCardUpdaterAPI): Promise<TemplateStatus> {
  const tableNames = await readCurrentTemplate(api);
  const missingNames = templateTableNames.filter(name => !tableNames.includes(name));
  return {
    templateLoaded: missingNames.length === 0,
    tableCount: tableNames.length,
    tableNames,
    missingNames,
  };
}

function normalizeExportedData(exported: unknown) {
  if (typeof exported === 'string') {
    try {
      return JSON.parse(exported) as unknown;
    } catch {
      return exported;
    }
  }
  return exported;
}

function getDataRowsForSheet(data: unknown, sheetName: string) {
  if (!data || typeof data !== 'object') return [];
  const record = data as Record<string, unknown>;
  const direct = record[sheetName];
  if (Array.isArray(direct)) return direct;
  for (const value of Object.values(record)) {
    if (!value || typeof value !== 'object') continue;
    const sheet = value as Record<string, unknown>;
    if (sheet.name === sheetName && Array.isArray(sheet.data)) return sheet.data;
    if (sheet.name === sheetName && Array.isArray(sheet.content)) return sheet.content.slice(1);
  }
  return [];
}

function normalizeRow(row: unknown, sheetName: string): Record<string, string> {
  if (!row) return {};
  if (!Array.isArray(row) && typeof row === 'object') {
    return Object.fromEntries(
      Object.entries(row as Record<string, unknown>).map(([key, value]) => [key, stringifyCell(value)]),
    );
  }
  if (Array.isArray(row)) {
    const headers = templateSheets.find(sheet => sheet.name === sheetName)?.headers ?? [];
    return Object.fromEntries(row.map((value, index) => [headers[index] || `字段${index + 1}`, stringifyCell(value)]));
  }
  return { 内容: stringifyCell(row) };
}

function stringifyCell(value: unknown) {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return JSON.stringify(value);
}

function pickValue(row: Record<string, string>, aliases: string[]) {
  for (const alias of aliases) {
    const exact = row[alias];
    if (exact) return exact;
    const fuzzyKey = Object.keys(row).find(key => key.includes(alias) || alias.includes(key));
    if (fuzzyKey && row[fuzzyKey]) return row[fuzzyKey];
  }
  return '';
}

function compactText(value: string, fallback = '未记录', maxLength = 42) {
  const text = value.replace(/\s+/g, ' ').trim();
  if (!text) return fallback;
  return text.length > maxLength ? `${text.slice(0, maxLength)}…` : text;
}

function getRecentRows(sheetName: string, limit: number, predicate?: (row: Record<string, string>) => boolean) {
  const rows = getDataRowsForSheet(lastExportedData, sheetName).map(row => normalizeRow(row, sheetName));
  const filtered = predicate ? rows.filter(predicate) : rows;
  return filtered.slice(-limit).reverse();
}

function isInternalClue(row: Record<string, string>) {
  const visibility = pickValue(row, ['visibility', '可见性', '可见范围', '权限', '公开状态']);
  const rowText = Object.values(row).join(' ');
  return /内部记录|仅后台|不可见|隐藏真相|后台记录/i.test(visibility) || /内部记录|仅后台|不可见|隐藏真相|后台记录/i.test(rowText);
}

function readMvuStatData(hostWindow: HostWindow): Record<string, string> {
  try {
    const context = hostWindow.SillyTavern?.getContext?.();
    if (!context?.getVariable) return {};
    const statDataRaw = context.getVariable('stat_data', 'local') || context.getVariable('stat_data', 'global') || '';
    if (!statDataRaw || typeof statDataRaw !== 'string') return {};
    const lines = statDataRaw.split('\n').filter(line => line.trim().length > 0);
    const result: Record<string, string> = {};
    for (const line of lines) {
      const colonIndex = line.indexOf('：');
      if (colonIndex > 0) {
        const key = line.slice(0, colonIndex).trim();
        const value = line.slice(colonIndex + 1).trim();
        if (key && value) result[key] = value;
      }
    }
    return result;
  } catch {
    return {};
  }
}

function buildDashboardSummary(hostWindow?: HostWindow): DashboardSummary {
  const exportedSummary = summarizeExportedData(lastExportedData);
  const globalRows = getRecentRows('全局状态', 1);
  const playerRows = getRecentRows('玩家状态', 1);
  const eventRows = getRecentRows('灵异事件', 3);
  const clueRows = getRecentRows('线索', 3, row => !isInternalClue(row));
  const ghostRows = getRecentRows('厉鬼档案', 3);
  const statusText = lastTemplateStatus.templateLoaded
    ? `模板 ${templateTableNames.length}/${templateTableNames.length} · 运行时 ${exportedSummary.tableCount} 表 / ${exportedSummary.rowCount} 行`
    : `模板缺失 ${lastTemplateStatus.missingNames.length} 张：${lastTemplateStatus.missingNames.slice(0, 3).join('、') || '待检测'}`;

  const mvuStat = hostWindow ? readMvuStatData(hostWindow) : {};

  return {
    statusText,
    templateStatus: lastTemplateStatus,
    exportedSummary,
    updatedAt: new Date().toLocaleTimeString('zh-CN', { hour12: false }),
    sections: {
      global: {
        title: '全局状态',
        emptyText: '全局状态表暂无运行时数据。',
        rows: globalRows.map(row => ({
          时间: compactText(pickValue(row, ['当前时间', '时间', '日期']), '时间未记录'),
          地点: compactText(pickValue(row, ['当前地点', '地点', '区域']), '地点未记录'),
          阶段: compactText(pickValue(row, ['原著阶段', '主线阶段', '阶段', '剧情阶段']), '阶段未记录'),
          压力: compactText(pickValue(row, ['世界压力', '灵异压力', '压力', '危险等级']), '压力未记录'),
        })),
      },
      player: {
        title: '玩家状态',
        emptyText: '玩家状态表暂无运行时数据；即时状态仍以 MVU 变量为准。',
        rows: playerRows.length > 0 ? playerRows.map(row => ({
          姓名: compactText(pickValue(row, ['姓名', '玩家', '主角']), mvuStat['姓名'] || '未命名'),
          身份: compactText(pickValue(row, ['身份', '职业', '阵营']), mvuStat['身份'] || '身份未记录'),
          所在地: compactText(pickValue(row, ['所在地', '位置', '地点']), mvuStat['所在地'] || '位置未记录'),
          状态: compactText(pickValue(row, ['当前状态', '状态', '身体状态']), mvuStat['当前状态'] || mvuStat['状态'] || '状态未记录'),
          死亡风险: compactText(mvuStat['死亡风险'] || pickValue(row, ['死亡风险', '死亡概率', '风险']), '未记录'),
          复苏风险: compactText(mvuStat['复苏风险'] || pickValue(row, ['复苏风险', '厉鬼复苏', '复苏']), '未记录'),
          最近行动: compactText(mvuStat['最近行动判定'] || mvuStat['最近行动'] || pickValue(row, ['最近行动', '行动', '上一行动']), '未记录'),
          行动建议: compactText(mvuStat['行动建议'] || pickValue(row, ['行动建议', '建议']), '未记录'),
        })) : Object.keys(mvuStat).length > 0 ? [{
          姓名: compactText(mvuStat['姓名'] || '', '未命名'),
          身份: compactText(mvuStat['身份'] || '', '身份未记录'),
          所在地: compactText(mvuStat['所在地'] || '', '位置未记录'),
          状态: compactText(mvuStat['当前状态'] || mvuStat['状态'] || '', '状态未记录'),
          死亡风险: compactText(mvuStat['死亡风险'] || '', '未记录'),
          复苏风险: compactText(mvuStat['复苏风险'] || '', '未记录'),
          最近行动: compactText(mvuStat['最近行动判定'] || mvuStat['最近行动'] || '', '未记录'),
          行动建议: compactText(mvuStat['行动建议'] || '', '未记录'),
        }] : [],
      },
      events: {
        title: '灵异事件',
        emptyText: '灵异事件表暂无运行时数据。',
        rows: eventRows.map(row => ({
          代号: compactText(pickValue(row, ['事件代号', '代号', '事件名', '名称']), '未命名事件'),
          等级: compactText(pickValue(row, ['危害等级', '等级', '危险等级']), '未评级'),
          地点: compactText(pickValue(row, ['发生地点', '地点', '区域']), '地点未记录'),
          状态: compactText(pickValue(row, ['处理状态', '状态', '进展']), '状态未记录'),
          摘要: compactText(pickValue(row, ['可见摘要', '摘要', '描述', '内容']), '暂无可见摘要', 60),
        })),
      },
      clues: {
        title: '线索',
        emptyText: '暂无玩家可见线索；标记为内部记录的线索已隐藏。',
        rows: clueRows.map(row => ({
          编号: compactText(pickValue(row, ['线索编号', '编号', 'ID', 'id']), '未编号'),
          来源: compactText(pickValue(row, ['来源', '获得方式', '发现地点']), '来源未记录'),
          可信度: compactText(pickValue(row, ['可信度', '可靠性']), '未评估'),
          验证: compactText(pickValue(row, ['验证状态', '状态']), '未验证'),
          推断: compactText(pickValue(row, ['推断', '结论', '可见摘要', '内容']), '暂无推断', 60),
        })),
      },
      ghosts: {
        title: '厉鬼档案',
        emptyText: '厉鬼档案表暂无运行时数据。',
        rows: ghostRows.map(row => ({
          编号: compactText(pickValue(row, ['档案编号', '编号', 'ID', 'id']), '未编号'),
          称呼: compactText(pickValue(row, ['厉鬼称呼', '称呼', '名称', '代号']), '未命名厉鬼'),
          状态: compactText(pickValue(row, ['关押状态', '状态', '处理状态']), '状态未记录'),
          危险: compactText(pickValue(row, ['危险备注', '危害等级', '危险等级', '备注']), '危险备注未记录', 60),
        })),
      },
      database: {
        title: '数据库状态',
        emptyText: '等待数据库 API 或模板状态。',
        rows: [{
          模板: `${templateTableNames.length - lastTemplateStatus.missingNames.length}/${templateTableNames.length}`,
          表数: `${exportedSummary.tableCount || lastTemplateStatus.tableCount}`,
          行数: `${exportedSummary.rowCount}`,
          刷新: new Date().toLocaleTimeString('zh-CN', { hour12: false }),
          边界: '只读摘要；不会自动保存、改世界书或发送。',
        }],
      },
    },
  };
}

function formatDashboardCapsule(row: Record<string, string>) {
  const entries = Object.entries(row).filter(([, value]) => value.trim().length > 0);
  if (entries.length === 0) return '未记录';
  const [primary, ...rest] = entries;
  const suffix = rest.map(([key, value]) => `${key}:${value}`).join(' · ');
  return suffix ? `${primary[1]}｜${suffix}` : primary[1];
}

function renderDashboardRows(hostDocument: Document, section: DashboardSection, rows: Record<string, string>[], emptyText: string) {
  const sectionRoot = hostDocument.querySelector<HTMLElement>(`[data-dashboard-section="${section}"]`);
  const target = sectionRoot?.querySelector<HTMLElement>('.acu-dash-slot-body');
  if (!target) return;
  target.textContent = '';
  if (rows.length === 0) {
    target.appendChild(createElement(hostDocument, 'div', { className: 'mfrs-acu-dash-empty', textContent: emptyText }));
    return;
  }
  if (sectionRoot?.dataset.dashboardStyle === 'capsule') {
    for (const row of rows) {
      const item = createElement(hostDocument, 'div', { className: 'acu-dash-npc-item', textContent: formatDashboardCapsule(row) });
      item.title = Object.entries(row).map(([key, value]) => `${key}: ${value}`).join('\n');
      target.appendChild(item);
    }
    return;
  }
  for (const row of rows) {
    for (const [key, value] of Object.entries(row)) {
      const item = createElement(hostDocument, 'div', { className: 'acu-dash-stat-row' });
      item.innerHTML = '<span class="acu-dash-stat-label"></span><span class="acu-dash-stat-val"></span>';
      item.querySelector<HTMLElement>('.acu-dash-stat-label')!.textContent = key;
      item.querySelector<HTMLElement>('.acu-dash-stat-val')!.textContent = value;
      target.appendChild(item);
    }
  }
}

function renderDashboard(hostDocument: Document, summary = lastDashboardSummary) {
  const dashboard = hostDocument.querySelector<HTMLElement>(`#${dashboardId}`);
  if (!dashboard || !summary) return;
  dashboard.classList.toggle('is-collapsed', dashboardCollapsed);
  dashboard.querySelector<HTMLElement>('.mfrs-acu-dash-status')!.textContent = summary.statusText;
  dashboard.querySelector<HTMLElement>('.mfrs-acu-dash-updated')!.textContent = `更新 ${summary.updatedAt}`;
  dashboard.querySelector<HTMLElement>('.mfrs-acu-dash-collapse')!.innerHTML = dashboardCollapsed
    ? '<i class="fa-solid fa-chevron-down"></i><span>展开</span>'
    : '<i class="fa-solid fa-chevron-up"></i><span>折叠</span>';
  dashboard.querySelector<HTMLElement>('.mfrs-acu-dash-import')!.hidden = summary.templateStatus.templateLoaded;
  for (const section of Object.keys(summary.sections) as DashboardSection[]) {
    renderDashboardRows(hostDocument, section, summary.sections[section].rows, summary.sections[section].emptyText);
  }
}

async function refreshDashboard(hostDocument: Document, api?: AutoCardUpdaterAPI) {
  const dashboard = hostDocument.querySelector<HTMLElement>(`#${dashboardId}`);
  if (!dashboard) return;
  const hostWindow = getHostWindow(hostDocument);
  try {
    if (!api) throw new Error('未检测到 AutoCardUpdaterAPI，请先确认星河璀璨·数据库已加载');
    lastTemplateStatus = await readTemplateStatus(api);
    if (api.exportTableAsJson) {
      lastExportedData = normalizeExportedData(await api.exportTableAsJson());
    }
    lastDashboardSummary = buildDashboardSummary(hostWindow);
    renderDashboard(hostDocument, lastDashboardSummary);
  } catch (error) {
    const exportedSummary = summarizeExportedData(lastExportedData);
    lastDashboardSummary = {
      statusText: `数据库 API 降级：${stringifyError(error)}`,
      templateStatus: lastTemplateStatus,
      exportedSummary,
      updatedAt: new Date().toLocaleTimeString('zh-CN', { hour12: false }),
      sections: {
        global: { title: '全局状态', rows: [], emptyText: '无法读取数据库 API。' },
        player: { title: '玩家状态', rows: [], emptyText: '无法读取数据库 API。' },
        events: { title: '灵异事件', rows: [], emptyText: '无法读取数据库 API。' },
        clues: { title: '线索', rows: [], emptyText: '无法读取数据库 API。' },
        ghosts: { title: '厉鬼档案', rows: [], emptyText: '无法读取数据库 API。' },
        database: { title: '数据库状态', rows: [{ 模板: `${lastTemplateStatus.tableCount}`, 表数: `${exportedSummary.tableCount}`, 行数: `${exportedSummary.rowCount}`, 状态: 'API 缺失或读取失败' }], emptyText: '无法读取数据库 API。' },
      },
    };
    renderDashboard(hostDocument, lastDashboardSummary);
  }
}

function summarizeExportedData(data: unknown) {
  if (!data || typeof data !== 'object') return { tableCount: 0, rowCount: 0, tableNames: [] as string[] };
  const names = new Set<string>();
  let rowCount = 0;
  const record = data as Record<string, unknown>;
  for (const [key, value] of Object.entries(record)) {
    if (Array.isArray(value)) {
      names.add(key);
      rowCount += Math.max(0, value.length - (Array.isArray(value[0]) ? 1 : 0));
      continue;
    }
    if (value && typeof value === 'object') {
      const sheet = value as Record<string, unknown>;
      if (typeof sheet.name === 'string') names.add(sheet.name);
      if (Array.isArray(sheet.data)) rowCount += sheet.data.length;
      if (Array.isArray(sheet.content)) rowCount += Math.max(0, sheet.content.length - 1);
    }
  }
  return { tableCount: names.size, rowCount, tableNames: [...names] };
}

function renderStatus(hostDocument: Document, message: string, variant: StatusVariant = 'info') {
  const target = hostDocument.querySelector<HTMLElement>('#mfrs-database-frontend-status');
  if (!target) return;
  target.dataset.variant = variant;
  target.textContent = message;
}

function setText(hostDocument: Document, selector: string, text: string) {
  const target = hostDocument.querySelector<HTMLElement>(selector);
  if (target) target.textContent = text;
}

function setPre(hostDocument: Document, selector: string, value: unknown) {
  setText(hostDocument, selector, typeof value === 'string' ? value : JSON.stringify(value, null, 2));
}

function renderTemplateList(hostDocument: Document, currentNames: string[]) {
  const list = hostDocument.querySelector<HTMLElement>('#mfrs-database-frontend-table-list');
  if (!list) return;
  list.textContent = '';
  for (const sheet of templateSheets) {
    const item = createElement(hostDocument, 'span', {
      className: currentNames.includes(sheet.name) ? 'mfrs-db-chip is-present' : 'mfrs-db-chip',
      textContent: sheet.name,
    });
    list.appendChild(item);
  }
}

function renderRadar(hostDocument: Document, status: TemplateStatus) {
  setText(hostDocument, '#mfrs-db-radar-template', `${templateTableNames.length - status.missingNames.length}/${templateTableNames.length}`);
  setText(hostDocument, '#mfrs-db-radar-runtime', `${status.tableCount} 张`);
  setText(hostDocument, '#mfrs-db-radar-api', lastDiagnostics?.availableMethods.length ? `${lastDiagnostics.availableMethods.length}/${requiredApiMethods.length}` : '待检测');
}

function renderTableBrowser(hostDocument: Document) {
  const target = hostDocument.querySelector<HTMLElement>('#mfrs-db-table-browser');
  if (!target) return;
  target.textContent = '';
  for (const sheet of templateSheets) {
    const rows = getDataRowsForSheet(lastExportedData, sheet.name).slice(0, 3);
    const card = createElement(hostDocument, 'article', { className: 'mfrs-db-table-card' });
    card.innerHTML = `
      <div class="mfrs-db-card-head">
        <div>
          <div class="mfrs-db-card-title"></div>
          <div class="mfrs-db-card-subtitle"></div>
        </div>
        <span class="mfrs-db-export-badge"></span>
      </div>
      <div class="mfrs-db-field-list"></div>
      <div class="mfrs-db-preview"></div>
    `;
    card.querySelector<HTMLElement>('.mfrs-db-card-title')!.textContent = sheet.name;
    card.querySelector<HTMLElement>('.mfrs-db-card-subtitle')!.textContent = `${sheet.headers.length} 字段 · ${sheet.uid}`;
    card.querySelector<HTMLElement>('.mfrs-db-export-badge')!.textContent = sheet.exportEnabled
      ? `${sheet.exportType}${sheet.splitByRow ? ' / 分行' : ''}${sheet.extraIndexEnabled ? ' / 索引' : ''}`
      : '不导出';

    const fieldList = card.querySelector<HTMLElement>('.mfrs-db-field-list')!;
    for (const header of sheet.headers) {
      fieldList.appendChild(createElement(hostDocument, 'span', { className: 'mfrs-db-field-chip', textContent: header }));
    }

    const preview = card.querySelector<HTMLElement>('.mfrs-db-preview')!;
    if (rows.length === 0) {
      preview.textContent = '暂无运行时数据预览；可先导入模板或打开数据库编辑器查看。';
    } else {
      preview.textContent = JSON.stringify(rows, null, 2);
    }
    target.appendChild(card);
  }
}

function renderReview(hostDocument: Document) {
  const target = hostDocument.querySelector<HTMLElement>('#mfrs-db-review-list');
  if (!target) return;
  target.textContent = '';
  for (const sheet of templateSheets.filter(item => reviewTableNames.includes(item.name))) {
    const rows = getDataRowsForSheet(lastExportedData, sheet.name);
    const note = sheet.sourceNote.slice(0, 220).replace(/\s+/g, ' ');
    const card = createElement(hostDocument, 'article', { className: 'mfrs-db-review-card' });
    card.innerHTML = `
      <div class="mfrs-db-card-title"></div>
      <div class="mfrs-db-review-meta"></div>
      <ul class="mfrs-db-check-list"></ul>
      <div class="mfrs-db-review-note"></div>
    `;
    card.querySelector<HTMLElement>('.mfrs-db-card-title')!.textContent = sheet.name;
    card.querySelector<HTMLElement>('.mfrs-db-review-meta')!.textContent = `当前预览 ${rows.length} 行 · 只读校验，不自动写库`;
    const checks = card.querySelector<HTMLElement>('.mfrs-db-check-list')!;
    const rules = [
      sheet.headers.includes('可见摘要') || sheet.headers.includes('内容') ? '可见字段存在，可检查是否误放隐藏真相。' : '可见摘要字段未命中，请人工确认字段映射。',
      sheet.headers.some(header => header.includes('状态') || header.includes('可信度')) ? '状态/可信度字段存在，可辅助审核冲突。' : '状态类字段不足，建议人工复核。',
      rows.length > 0 ? '已读取运行时行预览。' : '未读取到运行时行，当前仅展示模板规则。',
    ];
    for (const rule of rules) checks.appendChild(createElement(hostDocument, 'li', { textContent: rule }));
    card.querySelector<HTMLElement>('.mfrs-db-review-note')!.textContent = note;
    target.appendChild(card);
  }
}

function renderLocks(hostDocument: Document) {
  const target = hostDocument.querySelector<HTMLElement>('#mfrs-db-lock-list');
  if (!target) return;
  target.textContent = '';
  for (const name of lockTableNames) {
    const state = lastLockStates[name];
    const card = createElement(hostDocument, 'article', { className: 'mfrs-db-lock-card' });
    card.innerHTML = `
      <div class="mfrs-db-card-title"></div>
      <pre class="mfrs-db-code"></pre>
    `;
    card.querySelector<HTMLElement>('.mfrs-db-card-title')!.textContent = name;
    card.querySelector<HTMLElement>('pre')!.textContent = state === undefined ? '未读取' : JSON.stringify(state, null, 2);
    target.appendChild(card);
  }
}

function renderApiMatrix(hostDocument: Document, api?: AutoCardUpdaterAPI) {
  const target = hostDocument.querySelector<HTMLElement>('#mfrs-db-api-matrix');
  if (!target) return;
  target.textContent = '';
  for (const method of requiredApiMethods) {
    const available = typeof api?.[method] === 'function';
    const row = createElement(hostDocument, 'div', { className: available ? 'mfrs-db-api-row is-ok' : 'mfrs-db-api-row' });
    row.innerHTML = `<span></span><strong></strong>`;
    row.querySelector('span')!.textContent = method;
    row.querySelector('strong')!.textContent = available ? '可用' : '缺失';
    target.appendChild(row);
  }
}

function switchPage(hostDocument: Document, page: PanelPage) {
  activePage = page;
  hostDocument.querySelectorAll<HTMLElement>('[data-db-page]').forEach(section => {
    section.hidden = section.dataset.dbPage !== page;
  });
  hostDocument.querySelectorAll<HTMLElement>('.acu-nav-btn[data-page], .mfrs-db-nav button').forEach(button => {
    button.classList.toggle('is-active', button.dataset.page === page);
    button.classList.toggle('active', button.dataset.page === page);
  });
}

async function refreshPanel(hostDocument: Document, api: AutoCardUpdaterAPI, hostWindow?: HostWindow) {
  try {
    lastTemplateStatus = await readTemplateStatus(api);
    renderTemplateList(hostDocument, lastTemplateStatus.tableNames);
    renderRadar(hostDocument, lastTemplateStatus);
    renderTableBrowser(hostDocument);
    renderReview(hostDocument);
    renderLocks(hostDocument);
    renderApiMatrix(hostDocument, api);
    await refreshDashboard(hostDocument, api);
    const missing = lastTemplateStatus.missingNames;
    renderStatus(
      hostDocument,
      missing.length === 0
        ? `已识别神秘复苏 ${templateTableNames.length} 表模板。`
        : `当前缺少 ${missing.length} 张神秘复苏表：${missing.slice(0, 4).join('、')}${missing.length > 4 ? '…' : ''}`,
      missing.length === 0 ? 'success' : 'warning',
    );
    if (hostWindow) lastDiagnostics = await collectDiagnostics(hostWindow, false);
  } catch (error) {
    renderStatus(hostDocument, `读取面板状态失败：${stringifyError(error)}`, 'error');
  }
}

async function copyText(hostWindow: HostWindow, text: string) {
  if (hostWindow.navigator.clipboard?.writeText) {
    await hostWindow.navigator.clipboard.writeText(text);
    return true;
  }
  return false;
}

async function runAction(
  hostDocument: Document,
  action: () => Promise<void>,
  successMessage: string,
  hostWindow: HostWindow,
) {
  try {
    renderStatus(hostDocument, '正在执行操作…');
    await action();
    renderStatus(hostDocument, successMessage, 'success');
    hostWindow.toastr?.success?.(successMessage);
  } catch (error) {
    const message = stringifyError(error);
    renderStatus(hostDocument, message, 'error');
    hostWindow.toastr?.error?.(message);
    console.error('[神秘复苏数据库前端] 操作失败', error);
  }
}

async function collectLockStates(api: AutoCardUpdaterAPI) {
  const result: Record<string, unknown> = {};
  if (!api.getTableLockState) return result;
  for (const tableName of lockTableNames) {
    try {
      result[tableName] = await api.getTableLockState(tableName);
    } catch (error) {
      result[tableName] = { error: stringifyError(error) };
    }
  }
  return result;
}

async function collectDiagnostics(hostWindow: HostWindow, includeFreshExport = true): Promise<Diagnostics> {
  const api = hostWindow.AutoCardUpdaterAPI;
  const { availableMethods, missingMethods } = getApiMethodState(api);
  let templateStatus = lastTemplateStatus;
  let exportedSummary = summarizeExportedData(lastExportedData);
  if (api) {
    templateStatus = await readTemplateStatus(api);
    if (includeFreshExport && api.exportTableAsJson) {
      try {
        lastExportedData = normalizeExportedData(await api.exportTableAsJson());
        exportedSummary = summarizeExportedData(lastExportedData);
      } catch {
        exportedSummary = summarizeExportedData(lastExportedData);
      }
    }
  }
  return {
    apiAvailable: Boolean(api),
    availableMethods,
    missingMethods,
    templateStatus,
    activePage,
    panelVisible: !getHostDocument().querySelector<HTMLElement>(`#${panelId}`)?.hidden,
    dashboardVisible: Boolean(getHostDocument().querySelector<HTMLElement>(`#${dashboardId}`)),
    dashboardCollapsed,
    lockStates: lastLockStates,
    exportedSummary,
    updatedAt: new Date().toISOString(),
  };
}

function buildDashboard(hostDocument: Document, hostWindow: HostWindow) {
  const dashboard = createElement(hostDocument, 'section', { className: 'acu-embedded-dashboard-container acu-theme-mystery mfrs-acu-dashboard' });
  dashboard.id = dashboardId;
  dashboard.innerHTML = `
    <div class="acu-dash-ctrl-bar" data-action="dash-toggle">
      <div class="mfrs-acu-dash-title">
        <i class="fa-solid fa-tachometer-alt"></i>
        <span>仪表盘</span>
        <em class="mfrs-acu-dash-status">等待数据库本体加载…</em>
      </div>
      <div class="mfrs-acu-dash-actions">
        <span class="mfrs-acu-dash-updated">未刷新</span>
        <button type="button" class="mfrs-acu-icon-btn mfrs-acu-dash-import" data-action="dash-import" title="导入 11 表模板" aria-label="导入 11 表模板">
          <i class="fa-solid fa-file-import"></i><span>导入</span>
        </button>
        <button type="button" class="mfrs-acu-icon-btn" data-action="dash-refresh" title="刷新摘要" aria-label="刷新摘要">
          <i class="fa-solid fa-rotate"></i><span>刷新</span>
        </button>
        <button type="button" class="mfrs-acu-icon-btn" data-action="dash-open" title="打开大控制台" aria-label="打开大控制台">
          <i class="fa-solid fa-table-columns"></i><span>控制台</span>
        </button>
        <button type="button" class="mfrs-acu-icon-btn" data-action="dash-visualizer" title="打开数据库编辑器" aria-label="打开数据库编辑器">
          <i class="fa-solid fa-pen-to-square"></i><span>编辑</span>
        </button>
        <button type="button" class="mfrs-acu-icon-btn mfrs-acu-dash-collapse" data-action="dash-collapse" title="折叠仪表盘" aria-label="折叠仪表盘">
          <i class="fa-solid fa-chevron-up"></i><span>折叠</span>
        </button>
      </div>
    </div>
    <div class="acu-dash-content-wrapper">
      <div class="acu-dash-container">
        <div class="acu-dash-col">
          <article class="acu-dash-card" data-dashboard-section="global" data-dashboard-style="kv">
            <div class="acu-dash-title">全局状态</div>
            <div class="acu-dash-slot-body acu-dash-char-info"></div>
          </article>
          <article class="acu-dash-card" data-dashboard-section="player" data-dashboard-style="kv">
            <div class="acu-dash-title">玩家状态</div>
            <div class="acu-dash-slot-body acu-dash-char-info"></div>
          </article>
        </div>
        <div class="acu-dash-col">
          <article class="acu-dash-card mfrs-acu-tab-card">
            <div class="acu-tab-header">
              <button type="button" class="acu-tab-btn active" data-action="dash-tab" data-target="${dashboardId}-tab-events">灵异事件</button>
              <button type="button" class="acu-tab-btn" data-action="dash-tab" data-target="${dashboardId}-tab-clues">线索</button>
            </div>
            <div id="${dashboardId}-tab-events" class="acu-tab-pane active" data-dashboard-section="events" data-dashboard-style="capsule">
              <div class="acu-dash-slot-body acu-dash-npc-grid"></div>
            </div>
            <div id="${dashboardId}-tab-clues" class="acu-tab-pane" data-dashboard-section="clues" data-dashboard-style="capsule">
              <div class="acu-dash-slot-body acu-dash-npc-grid"></div>
            </div>
          </article>
        </div>
        <div class="acu-dash-col">
          <article class="acu-dash-card mfrs-acu-tab-card">
            <div class="acu-tab-header">
              <button type="button" class="acu-tab-btn active" data-action="dash-tab" data-target="${dashboardId}-tab-ghosts">厉鬼档案</button>
              <button type="button" class="acu-tab-btn" data-action="dash-tab" data-target="${dashboardId}-tab-database">数据库</button>
            </div>
            <div id="${dashboardId}-tab-ghosts" class="acu-tab-pane active" data-dashboard-section="ghosts" data-dashboard-style="capsule">
              <div class="acu-dash-slot-body acu-dash-npc-grid"></div>
            </div>
            <div id="${dashboardId}-tab-database" class="acu-tab-pane" data-dashboard-section="database" data-dashboard-style="kv">
              <div class="acu-dash-slot-body acu-dash-char-info"></div>
            </div>
          </article>
        </div>
      </div>
    </div>
  `;

  const toggleDashboard = () => {
    dashboardCollapsed = !dashboardCollapsed;
    try {
      hostWindow.localStorage?.setItem(dashboardStorageKey, dashboardCollapsed ? '1' : '0');
    } catch {
      // localStorage 不可用时仅保留内存折叠状态。
    }
    renderDashboard(hostDocument);
  };

  dashboard.addEventListener('click', event => {
    const button = (event.target as HTMLElement).closest<HTMLButtonElement>('button[data-action]');
    if (!button) {
      if ((event.target as HTMLElement).closest('.acu-dash-ctrl-bar')) toggleDashboard();
      return;
    }
    const action = button.dataset.action;
    const api = hostWindow.AutoCardUpdaterAPI;

    if (action === 'dash-tab') {
      const targetId = button.dataset.target;
      const card = button.closest<HTMLElement>('.acu-dash-card');
      if (!targetId || !card) return;
      card.querySelectorAll<HTMLElement>('.acu-tab-btn').forEach(tab => {
        tab.classList.toggle('active', tab === button);
      });
      card.querySelectorAll<HTMLElement>('.acu-tab-pane').forEach(pane => {
        pane.classList.toggle('active', pane.id === targetId);
      });
      return;
    }

    if (action === 'dash-collapse') {
      toggleDashboard();
      return;
    }

    if (action === 'dash-open') {
      void hostWindow.MysteryDatabaseFrontend?.openPanel();
      return;
    }

    if (action === 'dash-visualizer') {
      void hostWindow.MysteryDatabaseFrontend?.openVisualizer();
      return;
    }

    if (action === 'dash-refresh') {
      void refreshDashboard(hostDocument, api);
      return;
    }

    if (action === 'dash-import') {
      void runAction(
        hostDocument,
        async () => {
          if (!api?.importTemplateFromData) throw new Error('模板导入接口不可用');
          await api.importTemplateFromData(templateData);
          await refreshDashboard(hostDocument, api);
          await refreshPanel(hostDocument, api, hostWindow);
        },
        '神秘复苏 11 表模板已导入。',
        hostWindow,
      );
    }
  });

  return dashboard;
}

function findLatestAssistantMessageBlock(hostDocument: Document) {
  const messages = [...hostDocument.querySelectorAll<HTMLElement>('.mes')].reverse();
  const assistantMessage = messages.find(message => {
    const isUserAttr = message.getAttribute('is_user') === 'true';
    const isUserClass = message.classList.contains('user_mes') || message.classList.contains('is_user');
    return !isUserAttr && !isUserClass;
  });
  return assistantMessage?.querySelector<HTMLElement>('.mes_block') ?? assistantMessage ?? null;
}

function mountDashboard(hostDocument: Document, dashboard: HTMLElement) {
  // v10.2 风格：仪表盘挂在输入框上方，独立于对话外
  const anchors = [
    hostDocument.querySelector<HTMLElement>('#send_form'),
    hostDocument.querySelector<HTMLElement>('#form_sheld'),
    hostDocument.querySelector<HTMLElement>('#send_textarea')?.closest<HTMLElement>('form, .send_form, #send_form, #form_sheld'),
  ].filter(Boolean) as HTMLElement[];
  const anchor = anchors[0];
  if (anchor?.parentElement) {
    anchor.parentElement.insertBefore(dashboard, anchor);
    return;
  }
  // 回退：挂在 body 末尾
  hostDocument.body.appendChild(dashboard);
}

function bindAcuPanelEvents(panel: HTMLElement, hostDocument: Document, hostWindow: HostWindow) {
  panel.querySelector('.mfrs-db-close')?.addEventListener('click', () => {
    panel.hidden = true;
  });

  panel.addEventListener('click', event => {
    const pageButton = (event.target as HTMLElement).closest<HTMLButtonElement>('button[data-page]');
    if (pageButton?.dataset.page) {
      switchPage(hostDocument, pageButton.dataset.page as PanelPage);
      return;
    }

    const button = (event.target as HTMLElement).closest<HTMLButtonElement>('button[data-action]');
    if (!button) return;
    const action = button.dataset.action;
    const api = requireApi(hostWindow);

    if (action === 'open') {
      void runAction(
        hostDocument,
        async () => {
          if (!api.openVisualizer) throw new Error('数据库编辑器入口不可用');
          await api.openVisualizer();
        },
        '已打开数据库编辑器。',
        hostWindow,
      );
    }

    if (action === 'import') {
      void runAction(
        hostDocument,
        async () => {
          if (!api.importTemplateFromData) throw new Error('模板导入接口不可用');
          await api.importTemplateFromData(templateData);
          await refreshPanel(hostDocument, api, hostWindow);
        },
        '神秘复苏 11 表模板已导入。',
        hostWindow,
      );
    }

    if (action === 'refresh') {
      void runAction(
        hostDocument,
        async () => {
          if (!api.refreshDataAndWorldbook) throw new Error('刷新数据库/世界书接口不可用');
          await api.refreshDataAndWorldbook();
          await refreshPanel(hostDocument, api, hostWindow);
        },
        '数据库与世界书已刷新。',
        hostWindow,
      );
    }

    if (action === 'refresh-panel') {
      void runAction(hostDocument, () => refreshPanel(hostDocument, api, hostWindow), '面板已刷新。', hostWindow);
    }

    if (action === 'export') {
      void runAction(
        hostDocument,
        async () => {
          if (!api.exportTableAsJson) throw new Error('表格导出接口不可用');
          lastExportedData = normalizeExportedData(await api.exportTableAsJson());
          const text = JSON.stringify(lastExportedData, null, 2);
          await copyText(hostWindow, text);
          setPre(hostDocument, '#mfrs-db-export-preview', text.slice(0, 12000));
          renderTableBrowser(hostDocument);
          renderReview(hostDocument);
          console.info('[神秘复苏数据库前端] 当前表格 JSON', lastExportedData);
        },
        '当前表格 JSON 已输出到控制台，并尝试复制到剪贴板。',
        hostWindow,
      );
    }

    if (action === 'locks') {
      void runAction(
        hostDocument,
        async () => {
          lastLockStates = await collectLockStates(api);
          renderLocks(hostDocument);
          console.info('[神秘复苏数据库前端] 关键表锁定状态', lastLockStates);
        },
        '关键表锁定状态已输出到控制台。',
        hostWindow,
      );
    }

    if (action === 'diagnostics' || action === 'copy-diagnostics') {
      void runAction(
        hostDocument,
        async () => {
          lastDiagnostics = await collectDiagnostics(hostWindow);
          const text = JSON.stringify(lastDiagnostics, null, 2);
          setPre(hostDocument, '#mfrs-db-diagnostics', text);
          if (action === 'copy-diagnostics') await copyText(hostWindow, text);
        },
        action === 'copy-diagnostics' ? '诊断信息已生成，并尝试复制到剪贴板。' : '诊断信息已生成。',
        hostWindow,
      );
    }
  });
}

function buildAcuPanel(hostDocument: Document, hostWindow: HostWindow) {
  const panel = createElement(hostDocument, 'section', { className: 'acu-wrapper acu-theme-aurora mfrs-acu-shell' });
  panel.id = panelId;
  panel.innerHTML = `
    <div class="acu-data-display acu-layout-vertical visible" id="mfrs-acu-data-area">
      <header class="acu-panel-header">
        <div class="acu-panel-title"><i class="fa-solid fa-database"></i><span>神秘复苏数据库前端</span></div>
        <div class="acu-header-actions">
          <button type="button" class="acu-header-btn" data-action="refresh-panel" title="刷新面板" aria-label="刷新面板"><i class="fa-solid fa-rotate"></i></button>
          <button type="button" class="acu-header-btn" data-action="open" title="打开数据库编辑器" aria-label="打开数据库编辑器"><i class="fa-solid fa-pen-to-square"></i></button>
          <button type="button" class="acu-header-btn mfrs-db-close" title="关闭" aria-label="关闭"><i class="fa-solid fa-xmark"></i></button>
        </div>
      </header>
      <div id="mfrs-database-frontend-status" class="mfrs-acu-status" data-variant="info">等待数据库本体加载...</div>
      <main class="acu-panel-content">
        <section data-db-page="overview">
          <div class="mfrs-acu-hero">
            <article class="acu-data-card"><strong id="mfrs-db-radar-template">0/11</strong><span>模板完整度</span></article>
            <article class="acu-data-card"><strong id="mfrs-db-radar-runtime">待检测</strong><span>运行时表数</span></article>
            <article class="acu-data-card"><strong id="mfrs-db-radar-api">待检测</strong><span>API 矩阵</span></article>
          </div>
          <div class="mfrs-acu-actions">
            <button type="button" class="acu-btn-block" data-action="import"><i class="fa-solid fa-file-import"></i><span>导入 11 表模板</span></button>
            <button type="button" class="acu-btn-block" data-action="refresh"><i class="fa-solid fa-arrows-rotate"></i><span>刷新数据库/世界书</span></button>
            <button type="button" class="acu-btn-block" data-action="export"><i class="fa-solid fa-code"></i><span>导出当前 JSON</span></button>
            <button type="button" class="acu-btn-block" data-action="locks"><i class="fa-solid fa-lock"></i><span>读取锁定状态</span></button>
          </div>
          <h3 class="mfrs-acu-section-title">神秘复苏模板表</h3>
          <div id="mfrs-database-frontend-table-list" class="mfrs-db-chip-list"></div>
        </section>
        <section data-db-page="tables" hidden>
          <h3 class="mfrs-acu-section-title">表格浏览</h3>
          <p class="mfrs-acu-copy">展示模板字段、导出策略和运行时前 3 行预览；本页只读，不会写入数据库。</p>
          <div id="mfrs-db-table-browser" class="mfrs-db-table-browser"></div>
        </section>
        <section data-db-page="review" hidden>
          <h3 class="mfrs-acu-section-title">线索 / 事件 / 厉鬼审核</h3>
          <p class="mfrs-acu-copy">检查可见摘要、验证状态和隐藏真相边界；当前只读校验，不自动修复、不自动写库。</p>
          <div id="mfrs-db-review-list" class="mfrs-db-review-list"></div>
        </section>
        <section data-db-page="locks" hidden>
          <h3 class="mfrs-acu-section-title">关键表锁定状态</h3>
          <p class="mfrs-acu-copy">读取 rows / cols / cells 锁定状态；默认不修改锁。</p>
          <button type="button" class="acu-btn-block mfrs-acu-inline-action" data-action="locks"><i class="fa-solid fa-lock"></i><span>读取锁定状态</span></button>
          <div id="mfrs-db-lock-list" class="mfrs-db-lock-list"></div>
        </section>
        <section data-db-page="io" hidden>
          <h3 class="mfrs-acu-section-title">导入 / 导出</h3>
          <div class="mfrs-acu-actions">
            <button type="button" class="acu-btn-block" data-action="import"><i class="fa-solid fa-file-import"></i><span>导入 11 表模板</span></button>
            <button type="button" class="acu-btn-block" data-action="export"><i class="fa-solid fa-copy"></i><span>导出并复制 JSON</span></button>
          </div>
          <pre id="mfrs-db-export-preview" class="mfrs-db-code">尚未导出。</pre>
        </section>
        <section data-db-page="diagnostics" hidden>
          <h3 class="mfrs-acu-section-title">诊断</h3>
          <div id="mfrs-db-api-matrix" class="mfrs-db-api-matrix"></div>
          <div class="mfrs-acu-actions">
            <button type="button" class="acu-btn-block" data-action="diagnostics"><i class="fa-solid fa-stethoscope"></i><span>生成诊断</span></button>
            <button type="button" class="acu-btn-block" data-action="copy-diagnostics"><i class="fa-solid fa-copy"></i><span>复制诊断</span></button>
          </div>
          <pre id="mfrs-db-diagnostics" class="mfrs-db-code">尚未生成诊断。</pre>
        </section>
      </main>
      <footer class="acu-panel-footer"><span class="mfrs-acu-footer-note">MVU stat_data 仍是即时状态真源；数据库只做长期档案、线索、纪要、召回和审核辅助。</span></footer>
    </div>
    <div class="acu-nav-container acu-collapse-bar acu-pill-center" id="mfrs-acu-nav-bar">
      <div class="acu-nav-tabs-area">
        <button type="button" class="acu-nav-btn active is-active" data-page="overview"><i class="fa-solid fa-gauge-high"></i><span>总览</span></button>
        <button type="button" class="acu-nav-btn" data-page="tables"><i class="fa-solid fa-table"></i><span>表格</span></button>
        <button type="button" class="acu-nav-btn" data-page="review"><i class="fa-solid fa-shield-halved"></i><span>审核</span></button>
        <button type="button" class="acu-nav-btn" data-page="locks"><i class="fa-solid fa-lock"></i><span>锁定</span></button>
        <button type="button" class="acu-nav-btn" data-page="io"><i class="fa-solid fa-file-export"></i><span>导入导出</span></button>
        <button type="button" class="acu-nav-btn" data-page="diagnostics"><i class="fa-solid fa-stethoscope"></i><span>诊断</span></button>
      </div>
      <div class="acu-nav-separator"></div>
      <div class="acu-nav-actions-area">
        <button type="button" class="acu-action-btn" data-action="refresh-panel" title="刷新面板" aria-label="刷新面板"><i class="fa-solid fa-rotate"></i></button>
        <button type="button" class="acu-action-btn" data-action="open" title="数据库编辑器" aria-label="数据库编辑器"><i class="fa-solid fa-pen-to-square"></i></button>
        <button type="button" class="acu-action-btn" data-action="diagnostics" title="生成诊断" aria-label="生成诊断"><i class="fa-solid fa-clipboard-check"></i></button>
      </div>
      <div class="acu-collapsed-text">展开面板</div>
    </div>
  `;
  bindAcuPanelEvents(panel, hostDocument, hostWindow);
  return panel;
}

function mount() {
  const hostDocument = getHostDocument();
  const hostWindow = getHostWindow(hostDocument);
  hostWindow.__mfrsDatabaseFrontendCleanup__?.();
  hostDocument
    .querySelectorAll(`#${panelId}, #${buttonId}, #${dashboardId}, .mfrs-db-console`)
    .forEach(element => element.remove());

  const style = hostDocument.createElement('style');
  style.id = styleId;
  style.textContent = `
#acu-mfrs-embedded-dashboard {
  --acu-bg-nav: linear-gradient(135deg, rgba(40, 10, 10, 0.95), rgba(60, 15, 15, 0.9));
  --acu-bg-panel: linear-gradient(180deg, rgba(40, 10, 10, 0.95) 0%, rgba(70, 20, 20, 0.9) 100%);
  --acu-border: rgba(180, 50, 50, 0.6);
  --acu-text-main: #e8d5d5;
  --acu-text-sub: #b89090;
  --acu-btn-bg: linear-gradient(135deg, rgba(180, 50, 50, 0.15), rgba(140, 30, 30, 0.15));
  --acu-btn-hover: linear-gradient(135deg, rgba(180, 50, 50, 0.25), rgba(140, 30, 30, 0.25));
  --acu-table-head: linear-gradient(90deg, rgba(180, 50, 50, 0.1), rgba(140, 30, 30, 0.1));
  --acu-table-hover: rgba(180, 50, 50, 0.08);
  --acu-card-bg: linear-gradient(145deg, rgba(60, 15, 15, 0.95), rgba(40, 10, 10, 0.98));
  --acu-highlight: #d84545;
  --acu-title-color: #e8d5d5;
  --acu-font-size: 13px;
  --acu-dash-font-size: 13px;
  width: 100%;
  margin: 6px 0 10px;
  clear: both;
  color: var(--acu-text-main);
  font-family: "Segoe UI", "Microsoft YaHei", sans-serif;
  font-size: var(--acu-font-size);
  box-sizing: border-box;
}
#acu-mfrs-embedded-dashboard * { box-sizing: border-box; }
#acu-mfrs-embedded-dashboard .acu-dash-ctrl-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  background: var(--acu-bg-nav);
  border: 1px solid var(--acu-border);
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(180, 50, 50, 0.15), 0 4px 16px rgba(140, 30, 30, 0.1);
  cursor: pointer;
}
#acu-mfrs-embedded-dashboard .mfrs-acu-dash-title {
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 8px;
}
#acu-mfrs-embedded-dashboard .mfrs-acu-dash-title i { color: var(--acu-highlight); }
#acu-mfrs-embedded-dashboard .mfrs-acu-dash-title span {
  font-weight: bold;
  color: var(--acu-title-color);
  font-size: 13px;
  white-space: nowrap;
}
#acu-mfrs-embedded-dashboard .mfrs-acu-dash-title em {
  min-width: 0;
  color: var(--acu-text-sub);
  font-size: 12px;
  font-style: normal;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
#acu-mfrs-embedded-dashboard .mfrs-acu-dash-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 6px;
  flex-wrap: wrap;
}
#acu-mfrs-embedded-dashboard .mfrs-acu-dash-updated {
  color: var(--acu-text-sub);
  font-size: 11px;
  white-space: nowrap;
}
#acu-mfrs-embedded-dashboard .mfrs-acu-icon-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  min-height: 28px;
  border: 1px solid var(--acu-border);
  border-radius: 8px;
  padding: 5px 8px;
  background: var(--acu-btn-bg);
  color: var(--acu-text-main);
  font-size: 12px;
  line-height: 1;
  cursor: pointer;
  transition: all 0.2s;
}
#acu-mfrs-embedded-dashboard .mfrs-acu-icon-btn:hover {
  background: var(--acu-btn-hover);
  color: #fff;
}
#acu-mfrs-embedded-dashboard .acu-dash-content-wrapper {
  overflow: hidden;
  transition: all 0.3s ease;
  background: var(--acu-bg-nav);
  border: 1px solid var(--acu-border);
  border-top: none;
  border-radius: 0 0 12px 12px;
  max-height: 500px;
}
#acu-mfrs-embedded-dashboard.is-collapsed .acu-dash-content-wrapper {
  max-height: 0;
  opacity: 0;
  border-width: 0 1px;
}
#acu-mfrs-embedded-dashboard .acu-dash-container {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 0;
  height: 100%;
  padding: 0;
  overflow: hidden;
  box-sizing: border-box;
  font-size: var(--acu-dash-font-size, var(--acu-font-size));
}
#acu-mfrs-embedded-dashboard .acu-dash-col {
  display: flex;
  flex-direction: column;
  gap: 0;
  height: 100%;
  overflow: hidden;
  min-width: 0;
}
#acu-mfrs-embedded-dashboard .acu-dash-card {
  background: var(--acu-card-bg);
  border-radius: 0;
  border: none;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  box-shadow: none;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
}
#acu-mfrs-embedded-dashboard .acu-dash-title {
  font-size: var(--acu-dash-font-size, var(--acu-font-size));
  font-weight: bold;
  color: var(--acu-highlight);
  border-bottom: 1px dashed var(--acu-border);
  padding-bottom: 8px;
  margin-bottom: 4px;
  display: flex;
  justify-content: center;
  align-items: center;
}
#acu-mfrs-embedded-dashboard .acu-dash-char-info {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
#acu-mfrs-embedded-dashboard .acu-dash-stat-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  padding: 8px;
  background: var(--acu-btn-bg);
  border-radius: 8px;
  min-width: 0;
}
#acu-mfrs-embedded-dashboard .acu-dash-stat-label {
  color: var(--acu-text-sub);
  font-size: 0.9em;
  white-space: nowrap;
}
#acu-mfrs-embedded-dashboard .acu-dash-stat-val {
  min-width: 0;
  color: var(--acu-text-main);
  font-weight: bold;
  font-size: 1.1em;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  text-align: right;
}
#acu-mfrs-embedded-dashboard .acu-dash-npc-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 8px;
  height: 100%;
  overflow-y: auto;
  padding-right: 4px;
  scrollbar-width: thin;
  align-content: start;
}
#acu-mfrs-embedded-dashboard .acu-dash-npc-item {
  background: var(--acu-table-head);
  padding: 10px;
  border-radius: 8px;
  text-align: center;
  border: 1px solid transparent;
  transition: all 0.2s;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: var(--acu-text-main);
  font-size: 1em;
}
#acu-mfrs-embedded-dashboard .acu-dash-npc-item:hover {
  border-color: var(--acu-highlight);
  color: var(--acu-highlight);
  background: var(--acu-btn-bg);
}
#acu-mfrs-embedded-dashboard .acu-tab-header {
  display: flex;
  gap: 5px;
  border-bottom: 1px solid var(--acu-border);
  margin-bottom: 10px;
}
#acu-mfrs-embedded-dashboard .acu-tab-btn {
  padding: 6px 12px;
  cursor: pointer;
  font-size: var(--acu-dash-font-size, var(--acu-font-size));
  font-weight: bold;
  color: var(--acu-text-sub);
  border: 0;
  border-bottom: none;
  transition: all 0.2s;
  flex: 1;
  text-align: center;
  background: transparent;
}
#acu-mfrs-embedded-dashboard .acu-tab-btn:hover {
  color: var(--acu-text-main);
  background: var(--acu-table-hover);
  border-radius: 4px 4px 0 0;
}
#acu-mfrs-embedded-dashboard .acu-tab-btn.active { color: var(--acu-highlight); }
#acu-mfrs-embedded-dashboard .acu-tab-pane { display: none; animation: mfrsAcuFadeIn 0.3s; min-height: 0; }
#acu-mfrs-embedded-dashboard .acu-tab-pane.active { display: block; }
#acu-mfrs-embedded-dashboard .mfrs-acu-tab-card { flex: 1; padding: 16px; }
#acu-mfrs-embedded-dashboard .mfrs-acu-dash-empty {
  color: var(--acu-text-sub);
  font-size: 12px;
  line-height: 1.55;
  padding: 8px;
  background: var(--acu-btn-bg);
  border-radius: 8px;
}
@keyframes mfrsAcuFadeIn { from { opacity: 0; } to { opacity: 1; } }
@media (max-width: 768px) {
  #acu-mfrs-embedded-dashboard {
    width: 100%;
    margin: 6px 0 8px;
  }
  #acu-mfrs-embedded-dashboard .acu-dash-ctrl-bar {
    align-items: flex-start;
    flex-direction: column;
  }
  #acu-mfrs-embedded-dashboard .mfrs-acu-dash-actions {
    justify-content: flex-start;
  }
  #acu-mfrs-embedded-dashboard .acu-dash-content-wrapper {
    max-height: none;
  }
  #acu-mfrs-embedded-dashboard.is-collapsed .acu-dash-content-wrapper {
    max-height: 0;
  }
  #acu-mfrs-embedded-dashboard .acu-dash-container {
    grid-template-columns: 1fr;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    height: auto;
  }
  #acu-mfrs-embedded-dashboard .acu-dash-col {
    height: auto;
    flex: none;
    overflow: visible;
  }
}
@media (max-width: 560px) {
  #acu-mfrs-embedded-dashboard .mfrs-acu-dash-title {
    width: 100%;
    flex-wrap: wrap;
  }
  #acu-mfrs-embedded-dashboard .mfrs-acu-dash-title em {
    flex-basis: 100%;
  }
  #acu-mfrs-embedded-dashboard .mfrs-acu-icon-btn span {
    display: none;
  }
}
#mfrs-database-frontend-button {
  position: fixed;
  right: 14px;
  bottom: 84px;
  z-index: 4000;
  border: 1px solid rgba(130, 28, 28, .85);
  background: linear-gradient(135deg, rgba(35, 5, 5, .96), rgba(8, 3, 3, .96));
  color: #e3c8c8;
  border-radius: 999px;
  padding: 10px 14px;
  font-size: 13px;
  line-height: 1;
  box-shadow: 0 0 18px rgba(0, 0, 0, .65), inset 0 0 18px rgba(90, 0, 0, .2);
  cursor: pointer;
}
#mfrs-database-frontend-button:hover { color: #fff; border-color: #b33a3a; }
#mfrs-database-frontend-panel {
  position: fixed;
  inset: 36px 36px auto 36px;
  height: calc(100vh - 108px);
  max-height: calc(100vh - 108px);
  z-index: 4000;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  background: radial-gradient(circle at 20% 0%, rgba(85, 8, 8, .28), transparent 34%), rgba(8, 3, 3, .985);
  color: #d8c7c7;
  border: 1px solid rgba(115, 24, 24, .85);
  border-left: 3px solid #7a2020;
  border-radius: 14px;
  box-shadow: 0 24px 60px rgba(0, 0, 0, .82), inset 0 0 48px rgba(80, 0, 0, .18);
  font-family: "Noto Sans SC", "Microsoft YaHei", sans-serif;
}
#mfrs-database-frontend-panel[hidden] { display: none; }
#mfrs-database-frontend-panel.mfrs-acu-shell {
  --acu-bg-nav: linear-gradient(135deg, rgba(15, 23, 42, 0.95), rgba(30, 41, 59, 0.92));
  --acu-bg-panel: linear-gradient(180deg, rgba(15, 23, 42, 0.96), rgba(51, 65, 85, 0.92));
  --acu-border: rgba(56, 189, 248, 0.6);
  --acu-text-main: #e2e8f0;
  --acu-text-sub: #94a3b8;
  --acu-btn-bg: linear-gradient(135deg, rgba(56, 189, 248, 0.15), rgba(168, 85, 247, 0.15));
  --acu-btn-hover: linear-gradient(135deg, rgba(56, 189, 248, 0.25), rgba(168, 85, 247, 0.25));
  --acu-btn-active-bg: linear-gradient(135deg, rgba(56, 189, 248, 0.9), rgba(168, 85, 247, 0.85));
  --acu-btn-active-text: #fff;
  --acu-table-head: linear-gradient(90deg, rgba(56, 189, 248, 0.1), rgba(168, 85, 247, 0.1));
  --acu-table-hover: rgba(56, 189, 248, 0.08);
  --acu-card-bg: linear-gradient(145deg, rgba(30, 41, 59, 0.95), rgba(15, 23, 42, 0.98));
  --acu-highlight: #38bdf8;
  --acu-title-color: #e2e8f0;
  --acu-shadow: rgba(0, 0, 0, 0.35);
  --acu-nav-cols: repeat(6, minmax(82px, 1fr));
  position: fixed;
  inset: 36px 36px auto 36px;
  height: calc(100vh - 108px);
  max-height: calc(100vh - 108px);
  z-index: 4000;
  width: auto;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
  color: var(--acu-text-main);
  background: transparent;
  border: 0;
  box-shadow: none;
  font-family: "Segoe UI", "Microsoft YaHei", sans-serif;
  font-size: 13px;
}
#mfrs-database-frontend-panel.mfrs-acu-shell[hidden] { display: none; }
#mfrs-database-frontend-panel.mfrs-acu-shell * { box-sizing: border-box; }
#mfrs-database-frontend-panel .acu-data-display {
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: var(--acu-bg-panel);
  border: 1px solid var(--acu-border);
  border-radius: 12px;
  box-shadow: 0 12px 40px var(--acu-shadow);
  backdrop-filter: blur(8px);
}
#mfrs-database-frontend-panel .acu-panel-header {
  flex: 0 0 auto;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  background: var(--acu-table-head);
  border-bottom: 1px solid var(--acu-border);
  border-radius: 12px 12px 0 0;
}
#mfrs-database-frontend-panel .acu-panel-title {
  min-width: 0;
  color: var(--acu-text-main);
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 700;
  font-size: 14px;
}
#mfrs-database-frontend-panel .acu-panel-title i { color: var(--acu-highlight); }
#mfrs-database-frontend-panel .acu-header-actions,
#mfrs-database-frontend-panel .acu-nav-actions-area {
  display: flex;
  align-items: center;
  gap: 6px;
}
#mfrs-database-frontend-panel .acu-header-btn,
#mfrs-database-frontend-panel .acu-action-btn {
  width: 30px;
  height: 30px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  border: 1px solid var(--acu-border);
  background: var(--acu-btn-bg);
  color: var(--acu-text-sub);
  cursor: pointer;
  transition: all 0.2s;
}
#mfrs-database-frontend-panel .acu-header-btn:hover,
#mfrs-database-frontend-panel .acu-action-btn:hover {
  background: var(--acu-btn-hover);
  color: var(--acu-text-main);
  border-color: var(--acu-highlight);
}
#mfrs-database-frontend-panel .mfrs-acu-status {
  flex: 0 0 auto;
  padding: 8px 12px;
  color: var(--acu-text-sub);
  border-bottom: 1px dashed var(--acu-border);
  background: var(--acu-table-head);
  line-height: 1.55;
}
#mfrs-database-frontend-panel .mfrs-acu-status[data-variant="success"] { color: #bbf7d0; }
#mfrs-database-frontend-panel .mfrs-acu-status[data-variant="warning"] { color: #fde68a; }
#mfrs-database-frontend-panel .mfrs-acu-status[data-variant="error"] { color: #fecaca; }
#mfrs-database-frontend-panel .acu-panel-content {
  flex: 1 1 auto;
  min-height: 0;
  overflow: auto;
  padding: 15px;
}
#mfrs-database-frontend-panel .acu-panel-footer {
  flex: 0 0 auto;
  padding: 8px;
  border-top: 1px dashed var(--acu-border);
  background: var(--acu-table-head);
  display: flex;
  justify-content: center;
}
#mfrs-database-frontend-panel .mfrs-acu-footer-note,
#mfrs-database-frontend-panel .mfrs-acu-copy {
  color: var(--acu-text-sub);
  font-size: 12px;
  line-height: 1.65;
}
#mfrs-database-frontend-panel .acu-nav-container {
  flex: 0 0 auto;
  display: flex;
  flex-direction: column;
  gap: 0;
  padding: 6px;
  background: var(--acu-bg-nav);
  border: 1px solid var(--acu-border);
  border-radius: 14px;
  box-shadow: 0 4px 15px var(--acu-shadow);
  backdrop-filter: blur(5px);
}
#mfrs-database-frontend-panel .acu-nav-tabs-area {
  display: grid;
  grid-template-columns: var(--acu-nav-cols);
  gap: 6px;
  width: 100%;
}
#mfrs-database-frontend-panel .acu-nav-separator {
  width: 100%;
  height: 1px;
  border-top: 1px dashed var(--acu-border);
  margin: 6px 0;
  opacity: 0.6;
}
#mfrs-database-frontend-panel .acu-nav-btn {
  width: 100%;
  min-width: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  padding: 7px 4px;
  border: 1px solid var(--acu-border);
  border-radius: 8px;
  background: var(--acu-btn-bg);
  color: var(--acu-text-main);
  font-weight: 600;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
  overflow: hidden;
}
#mfrs-database-frontend-panel .acu-nav-btn span {
  overflow: hidden;
  text-overflow: ellipsis;
}
#mfrs-database-frontend-panel .acu-nav-btn:hover {
  background: var(--acu-btn-hover);
  transform: translateY(-1px);
}
#mfrs-database-frontend-panel .acu-nav-btn.active,
#mfrs-database-frontend-panel .acu-nav-btn.is-active {
  background: var(--acu-btn-active-bg);
  color: var(--acu-btn-active-text);
  border-color: transparent;
}
#mfrs-database-frontend-panel .acu-collapsed-text { display: none; }
#mfrs-database-frontend-panel .mfrs-acu-hero,
#mfrs-database-frontend-panel .mfrs-acu-actions,
#mfrs-database-frontend-panel .mfrs-db-table-browser,
#mfrs-database-frontend-panel .mfrs-db-review-list,
#mfrs-database-frontend-panel .mfrs-db-lock-list,
#mfrs-database-frontend-panel .mfrs-db-api-matrix {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
  margin-bottom: 12px;
}
#mfrs-database-frontend-panel .mfrs-acu-actions,
#mfrs-database-frontend-panel .mfrs-db-table-browser,
#mfrs-database-frontend-panel .mfrs-db-review-list,
#mfrs-database-frontend-panel .mfrs-db-lock-list,
#mfrs-database-frontend-panel .mfrs-db-api-matrix {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}
#mfrs-database-frontend-panel .acu-data-card,
#mfrs-database-frontend-panel .mfrs-db-table-card,
#mfrs-database-frontend-panel .mfrs-db-review-card,
#mfrs-database-frontend-panel .mfrs-db-lock-card {
  min-width: 0;
  border: 1px solid var(--acu-border);
  border-radius: 8px;
  background: var(--acu-card-bg);
  padding: 12px;
  box-shadow: none;
}
#mfrs-database-frontend-panel .acu-data-card strong {
  display: block;
  color: var(--acu-highlight);
  font-size: 22px;
  margin-bottom: 5px;
}
#mfrs-database-frontend-panel .acu-data-card span,
#mfrs-database-frontend-panel .mfrs-db-card-subtitle,
#mfrs-database-frontend-panel .mfrs-db-review-meta {
  color: var(--acu-text-sub);
  font-size: 12px;
}
#mfrs-database-frontend-panel .acu-btn-block {
  min-width: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  border: 1px solid var(--acu-border);
  border-radius: 8px;
  background: var(--acu-btn-bg);
  color: var(--acu-text-main);
  padding: 9px 10px;
  cursor: pointer;
}
#mfrs-database-frontend-panel .acu-btn-block:hover {
  background: var(--acu-btn-hover);
  border-color: var(--acu-highlight);
}
#mfrs-database-frontend-panel .mfrs-acu-inline-action { width: max-content; max-width: 100%; margin-bottom: 12px; }
#mfrs-database-frontend-panel .mfrs-acu-section-title,
#mfrs-database-frontend-panel .mfrs-db-card-title {
  color: var(--acu-highlight);
  margin: 0 0 10px;
  font-weight: 700;
}
#mfrs-database-frontend-panel .mfrs-db-chip,
#mfrs-database-frontend-panel .mfrs-db-field-chip {
  border-color: var(--acu-border);
  color: var(--acu-text-sub);
  background: var(--acu-btn-bg);
}
#mfrs-database-frontend-panel .mfrs-db-chip.is-present {
  color: #bbf7d0;
  border-color: rgba(74, 222, 128, 0.7);
}
#mfrs-database-frontend-panel .mfrs-db-preview,
#mfrs-database-frontend-panel .mfrs-db-code {
  border-color: var(--acu-border);
  background: rgba(15, 23, 42, 0.82);
  color: var(--acu-text-main);
}
#mfrs-database-frontend-panel .mfrs-db-api-row {
  border-color: var(--acu-border);
  color: var(--acu-text-sub);
  background: var(--acu-btn-bg);
}
#mfrs-database-frontend-panel .mfrs-db-api-row.is-ok { color: #bbf7d0; }
@media (max-width: 860px) {
  #mfrs-database-frontend-panel.mfrs-acu-shell {
    inset: 12px 8px auto 8px;
    height: calc(100vh - 70px);
    max-height: calc(100vh - 70px);
    --acu-nav-cols: repeat(3, minmax(0, 1fr));
  }
  #mfrs-database-frontend-panel .mfrs-acu-hero,
  #mfrs-database-frontend-panel .mfrs-acu-actions,
  #mfrs-database-frontend-panel .mfrs-db-table-browser,
  #mfrs-database-frontend-panel .mfrs-db-review-list,
  #mfrs-database-frontend-panel .mfrs-db-lock-list,
  #mfrs-database-frontend-panel .mfrs-db-api-matrix {
    grid-template-columns: 1fr;
  }
}
@media (max-width: 560px) {
  #mfrs-database-frontend-panel .acu-panel-header {
    align-items: flex-start;
    flex-direction: column;
  }
  #mfrs-database-frontend-panel .acu-nav-tabs-area {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
  `;

  const button = createElement(hostDocument, 'button', { textContent: '数据库前端' });
  button.id = buttonId;
  button.type = 'button';

  try {
    dashboardCollapsed = hostWindow.localStorage?.getItem(dashboardStorageKey) === '1';
  } catch {
    dashboardCollapsed = false;
  }
  const dashboard = buildDashboard(hostDocument, hostWindow);
  const panel = buildAcuPanel(hostDocument, hostWindow);
  panel.hidden = true;
  const dashboardRefreshTimers: number[] = [];

  const getApi = () => requireApi(hostWindow);
  const openPanel = async () => {
    panel.hidden = false;
    try {
      await refreshPanel(hostDocument, requireApi(hostWindow), hostWindow);
    } catch (error) {
      renderStatus(hostDocument, stringifyError(error), 'error');
    }
  };

  hostWindow.MysteryDatabaseFrontend = {
    async checkTemplateStatus() {
      const api = getApi();
      lastTemplateStatus = await readTemplateStatus(api);
      return lastTemplateStatus;
    },
    async importMysteryTemplate() {
      const api = getApi();
      if (!api.importTemplateFromData) throw new Error('模板导入接口不可用');
      await api.importTemplateFromData(templateData);
      await refreshPanel(hostDocument, api, hostWindow);
      return true;
    },
    async openVisualizer() {
      const api = getApi();
      if (!api.openVisualizer) throw new Error('数据库编辑器入口不可用');
      await api.openVisualizer();
    },
    async openPanel() {
      await openPanel();
    },
    async refreshDatabase() {
      const api = getApi();
      if (!api.refreshDataAndWorldbook) throw new Error('刷新数据库/世界书接口不可用');
      await api.refreshDataAndWorldbook();
      await refreshPanel(hostDocument, api, hostWindow);
    },
    async exportCurrentData() {
      const api = getApi();
      if (!api.exportTableAsJson) throw new Error('表格导出接口不可用');
      lastExportedData = normalizeExportedData(await api.exportTableAsJson());
      renderTableBrowser(hostDocument);
      renderReview(hostDocument);
      return lastExportedData;
    },
    async checkClueLocks() {
      const api = getApi();
      if (!api.getTableLockState) throw new Error('表格锁定接口不可用');
      const state = await api.getTableLockState('线索');
      lastLockStates = { ...lastLockStates, 线索: state };
      renderLocks(hostDocument);
      return state;
    },
    getPanelState() {
      const status = hostDocument.querySelector<HTMLElement>('#mfrs-database-frontend-status');
      return {
        panelVisible: !panel.hidden,
        statusText: status?.textContent ?? '',
        tableCount: lastTemplateStatus.tableCount,
        activePage,
        dashboardVisible: Boolean(hostDocument.querySelector<HTMLElement>(`#${dashboardId}`)),
        dashboardCollapsed,
      };
    },
    async getDiagnostics() {
      lastDiagnostics = await collectDiagnostics(hostWindow);
      setPre(hostDocument, '#mfrs-db-diagnostics', lastDiagnostics);
      return lastDiagnostics;
    },
    async refreshPanel() {
      await refreshPanel(hostDocument, getApi(), hostWindow);
    },
    async switchPage(page: PanelPage) {
      switchPage(hostDocument, page);
      await refreshPanel(hostDocument, getApi(), hostWindow);
    },
  };

  button.addEventListener('click', () => {
    if (panel.hidden) {
      void openPanel();
      return;
    }
    panel.hidden = true;
  });

  const handleOpenButtonClick = (event: Event) => {
    const target = event.target instanceof Element ? event.target.closest('.sp-db-open, .custom-sp-db-open') : null;
    if (!target) return;
    event.preventDefault();
    void openPanel();
  };

  hostDocument.addEventListener('click', handleOpenButtonClick, true);
  hostWindow.addEventListener('click', handleOpenButtonClick, true);
  hostDocument.head.appendChild(style);
  mountDashboard(hostDocument, dashboard);
  hostDocument.body.append(button, panel);
  renderTemplateList(hostDocument, []);
  renderTableBrowser(hostDocument);
  renderReview(hostDocument);
  renderLocks(hostDocument);
  renderApiMatrix(hostDocument, hostWindow.AutoCardUpdaterAPI);
  for (const delay of [0, 1000, 3000]) {
    dashboardRefreshTimers.push(
      hostWindow.setTimeout(() => {
        void refreshDashboard(hostDocument, hostWindow.AutoCardUpdaterAPI);
      }, delay),
    );
  }

  const cleanup = () => {
    dashboardRefreshTimers.forEach(timer => hostWindow.clearTimeout(timer));
    hostDocument.removeEventListener('click', handleOpenButtonClick, true);
    hostWindow.removeEventListener('click', handleOpenButtonClick, true);
    style.remove();
    dashboard.remove();
    button.remove();
    panel.remove();
    if (hostWindow.__mfrsDatabaseFrontendCleanup__ === cleanup) {
      delete hostWindow.__mfrsDatabaseFrontendCleanup__;
    }
    if (hostWindow.MysteryDatabaseFrontend) {
      delete hostWindow.MysteryDatabaseFrontend;
    }
  };

  hostWindow.__mfrsDatabaseFrontendCleanup__ = cleanup;
  window.addEventListener('pagehide', cleanup, { once: true });
  console.info('[神秘复苏数据库前端] 大控制台已挂载');
}

mount();
