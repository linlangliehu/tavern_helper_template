const databaseScriptName = 'spv3.9.5·数据库';
// 自托管 fork（vendor/shujuku-sp-fork/index.js，已把库默认提示词的 AM 编码改为 SP）。
// 指向 vendor 资源提交 14a556d 的不可变快照；后续若再改 fork，需同步更新此哈希并重新 build。
const databaseScriptUrl = 'https://gcore.jsdelivr.net/gh/linlangliehu/tavern_helper_template@14a556d26212c4ab086cdfd45f1b3362941deb22/vendor/shujuku-sp-fork/index.js';

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
