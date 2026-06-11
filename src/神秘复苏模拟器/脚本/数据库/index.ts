const databaseScriptName = 'spv3.9.5·数据库';
// 自托管 fork（vendor/shujuku-sp-fork/index.js，已把库默认提示词的 AM 编码改为 SP）。
// 指向包含 v6.19 P1 批次容错与显式 row_id 修复的资源提交；后续若再改 fork，需同步更新此哈希并重新 build。
const databaseScriptUrl = 'https://testingcf.jsdelivr.net/gh/linlangliehu/tavern_helper_template@f88460d97127f3a16ee3c332b0631929541d7bdf/vendor/shujuku-sp-fork/index.js?v=phase131-crud-p1-rowid-batch-6-19';
const databaseScriptMarker = 'mfrs-crud-p1-rowid-batch-6-19';
const databaseInstanceFlag = '__ACU_STAR_DB_III_LOADED__';
let databaseScriptLoadSeq = 0;

type DatabaseHostWindow = Window & {
  AutoCardUpdaterAPI?: Record<string, unknown>;
  __mfrsDatabaseScriptMarker__?: string;
};

function getHostWindow() {
  try {
    return (window.parent ?? window) as DatabaseHostWindow;
  } catch {
    return window as DatabaseHostWindow;
  }
}

function wait(milliseconds: number) {
  return new Promise(resolve => window.setTimeout(resolve, milliseconds));
}

function buildDatabaseScriptUrl() {
  return `${databaseScriptUrl}&mfrs_loader=${Date.now()}_${databaseScriptLoadSeq++}`;
}

function clearPreviousDatabaseInstance() {
  const hostWindow = getHostWindow();
  const localWindow = window as DatabaseHostWindow;
  const targets = hostWindow === localWindow ? [hostWindow] : [hostWindow, localWindow];

  for (const target of targets) {
    const targetRecord = target as DatabaseHostWindow & Record<string, unknown>;
    delete target.AutoCardUpdaterAPI;
    delete target.__mfrsDatabaseScriptMarker__;
    delete targetRecord[databaseInstanceFlag];
  }
}

async function waitForRegisteredDatabaseApi(attempts = 30, interval = 100) {
  const hostWindow = getHostWindow();
  for (let attempt = 0; attempt < attempts; attempt++) {
    const api = hostWindow.AutoCardUpdaterAPI;
    if (api && typeof api === 'object') return api;
    await wait(interval);
  }
  return null;
}

function tagDatabaseApi(api: Record<string, unknown> | null) {
  const hostWindow = getHostWindow();
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

async function loadDatabaseScript() {
  console.info(`[${databaseScriptName}] 正在加载数据库本体`);

  try {
    clearPreviousDatabaseInstance();
    await import(/* webpackIgnore: true */ buildDatabaseScriptUrl());
    tagDatabaseApi(await waitForRegisteredDatabaseApi());
    console.info(`[${databaseScriptName}] 数据库本体已加载`);
  } catch (error) {
    console.error(`[${databaseScriptName}] 数据库本体加载失败，请检查网络、酒馆助手和数据库本体版本`, error);
    throw error;
  }
}

loadDatabaseScript();
