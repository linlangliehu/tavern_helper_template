const databaseScriptName = 'spv3.9.5·数据库';
// 自托管 fork（vendor/shujuku-sp-fork/index.js，已把库默认提示词的 AM 编码改为 SP）。
// __RESOURCE_HASH__ 必须在 vendor 资源提交并推送后，替换为该资源提交的完整 commit 哈希再 build。
const databaseScriptUrl = 'https://gcore.jsdelivr.net/gh/linlangliehu/tavern_helper_template@__RESOURCE_HASH__/vendor/shujuku-sp-fork/index.js';

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
