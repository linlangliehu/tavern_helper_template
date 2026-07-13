/**
 * 【废弃 stub · 勿接入】
 * 发布/开发卡脚本库第 7 项 URL 指向 `脚本/数据库前端/index.js`（完整实现）。
 * 本目录仅为历史瘦壳，无任何入口引用；请勿改脚本库名称去加载本文件。
 *
 * 为神秘复苏模拟器提供专用数据库操作入口和面板
 * 依赖 `spv3.9.5·数据库` 本体，不替代原数据库脚本
 */

import templateData from '../../数据库/神秘复苏表格SQL_v1.json';

interface PanelState {
  templateLoaded: boolean;
  tableCount: number;
  lastRefresh: string;
  error: string | null;
}

let panelState: PanelState = {
  templateLoaded: false,
  tableCount: 0,
  lastRefresh: '未刷新',
  error: null
};

/**
 * 检查数据库 API 是否可用
 */
function checkDatabaseAPI(): boolean {
  if (typeof window === 'undefined') return false;
  const api = (window as any).AutoCardUpdaterAPI;
  return api && typeof api.getTableTemplate === 'function';
}

/**
 * 检查当前是否已加载神秘复苏 14 表模板
 */
async function checkTemplateStatus(): Promise<void> {
  if (!checkDatabaseAPI()) {
    panelState.error = '数据库 API 未加载';
    return;
  }

  try {
    const api = (window as any).AutoCardUpdaterAPI;
    const template = await api.getTableTemplate();

    if (!template || !template.sheets) {
      panelState.templateLoaded = false;
      panelState.tableCount = 0;
      return;
    }

    // 检查是否包含神秘复苏专用表
    const sheetNames = Object.keys(template.sheets);
    const mysteryTables = ['全局状态', '玩家状态', '灵异事件', '厉鬼档案', '线索', '驾驭厉鬼', '收录档案', '收录规律'];
    const hasMysteryTables = mysteryTables.every(name => sheetNames.includes(name));

    panelState.templateLoaded = hasMysteryTables;
    panelState.tableCount = sheetNames.length;
    panelState.lastRefresh = new Date().toLocaleTimeString('zh-CN');
  } catch (err) {
    panelState.error = `模板检查失败: ${err}`;
    console.error('[神秘复苏数据库前端] 模板检查失败', err);
  }
}

/**
 * 导入神秘复苏 14 表模板
 */
async function importMysteryTemplate(): Promise<boolean> {
  if (!checkDatabaseAPI()) {
    console.error('[神秘复苏数据库前端] 数据库 API 未加载');
    panelState.error = '数据库 API 未加载';
    return false;
  }

  try {
    const api = (window as any).AutoCardUpdaterAPI;
    await api.importTemplateFromData(templateData);

    console.log('[神秘复苏数据库前端] 神秘复苏 14 表模板导入成功');
    await checkTemplateStatus();
    return true;
  } catch (err) {
    console.error('[神秘复苏数据库前端] 模板导入失败', err);
    panelState.error = `模板导入失败: ${err}`;
    return false;
  }
}

/**
 * 打开数据库可视化编辑器
 */
function openVisualizer(): void {
  if (!checkDatabaseAPI()) {
    console.error('[神秘复苏数据库前端] 数据库 API 未加载');
    return;
  }

  try {
    const api = (window as any).AutoCardUpdaterAPI;
    api.openVisualizer();
    console.log('[神秘复苏数据库前端] 已打开数据库编辑器');
  } catch (err) {
    console.error('[神秘复苏数据库前端] 打开编辑器失败', err);
  }
}

/**
 * 刷新数据库和世界书
 */
async function refreshDatabase(): Promise<void> {
  if (!checkDatabaseAPI()) {
    console.error('[神秘复苏数据库前端] 数据库 API 未加载');
    return;
  }

  try {
    const api = (window as any).AutoCardUpdaterAPI;
    await api.refreshDataAndWorldbook();
    await checkTemplateStatus();
    console.log('[神秘复苏数据库前端] 数据库已刷新');
  } catch (err) {
    console.error('[神秘复苏数据库前端] 刷新失败', err);
  }
}

/**
 * 导出当前表格数据为 JSON
 */
async function exportCurrentData(tableName: string): Promise<any> {
  if (!checkDatabaseAPI()) {
    console.error('[神秘复苏数据库前端] 数据库 API 未加载');
    return null;
  }

  try {
    const api = (window as any).AutoCardUpdaterAPI;
    const data = await api.exportTableAsJson(tableName);
    console.log(`[神秘复苏数据库前端] 已导出 ${tableName} 表数据`);
    return data;
  } catch (err) {
    console.error(`[神秘复苏数据库前端] 导出 ${tableName} 失败`, err);
    return null;
  }
}

/**
 * 检查线索表锁定状态
 */
async function checkClueLocks(): Promise<void> {
  if (!checkDatabaseAPI()) {
    console.error('[神秘复苏数据库前端] 数据库 API 未加载');
    return;
  }

  try {
    const api = (window as any).AutoCardUpdaterAPI;
    const lockState = await api.getTableLockState('线索');
    console.log('[神秘复苏数据库前端] 线索表锁定状态:', lockState);
  } catch (err) {
    console.error('[神秘复苏数据库前端] 检查锁定状态失败', err);
  }
}

/**
 * 初始化神秘复苏数据库前端
 */
async function initMysteryDatabaseFrontend(): Promise<void> {
  console.log('[神秘复苏数据库前端] 正在初始化...');

  // 等待数据库 API 加载
  let retries = 0;
  while (!checkDatabaseAPI() && retries < 10) {
    await new Promise(resolve => setTimeout(resolve, 500));
    retries++;
  }

  if (!checkDatabaseAPI()) {
    console.warn('[神秘复苏数据库前端] 数据库 API 未加载，前端功能不可用');
    panelState.error = '数据库 API 未加载';
    return;
  }

  // 检查模板状态
  await checkTemplateStatus();

  // 暴露全局接口
  (window as any).MysteryDatabaseFrontend = {
    checkTemplateStatus,
    importMysteryTemplate,
    openVisualizer,
    refreshDatabase,
    exportCurrentData,
    checkClueLocks,
    getPanelState: () => ({ ...panelState })
  };

  console.log('[神秘复苏数据库前端] 初始化完成');
  console.log('[神秘复苏数据库前端] 模板状态:', panelState.templateLoaded ? '已加载' : '未加载');
  console.log('[神秘复苏数据库前端] 表数量:', panelState.tableCount);
}

// 自动初始化
initMysteryDatabaseFrontend().catch(err => {
  console.error('[神秘复苏数据库前端] 初始化失败', err);
});
