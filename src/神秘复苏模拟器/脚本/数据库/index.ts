const databaseScriptName = '星河璀璨·数据库';
const databaseScriptUrl = 'https://gcore.jsdelivr.net/gh/AlbusKen/shujuku@spv3.9.5/index.js';

async function loadDatabaseScript() {
  console.info(`[${databaseScriptName}] 正在加载数据库本体`);

  try {
    await import(/* webpackIgnore: true */ databaseScriptUrl);
    console.info(`[${databaseScriptName}] 数据库本体已加载`);
  } catch (error) {
    console.error(`[${databaseScriptName}] 数据库本体加载失败，请检查网络、酒馆助手和数据库本体版本`, error);
    throw error;
  }
}

loadDatabaseScript();
