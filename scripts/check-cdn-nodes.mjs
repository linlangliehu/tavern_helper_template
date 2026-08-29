// 检查 jsdelivr 各节点 dist 脚本是否已更新到新版
const nodes = ['testingcf', 'gcore', 'fastly', 'quantil', 'cdn'];
const file = '消息内面板/index.js';
const ts = Date.now();
(async () => {
  for (const n of nodes) {
    const url = `https://${n}.jsdelivr.net/gh/linlangliehu/tavern_helper_template@mfrs-magic-v1/dist/魔法禁书目录模拟器/脚本/${encodeURIComponent(file)}?c=${ts}`;
    try {
      const r = await fetch(url, { cache: 'no-store' });
      const t = await r.text();
      console.log(`${n}: status=${r.status} len=${t.length} 新版=${t.includes('能力效果')} 旧版=${t.includes('副作用或代价')} age=${r.headers.get('age')} cf=${r.headers.get('cf-cache-status')}`);
    } catch (e) {
      console.log(`${n}: ERR ${e.message}`);
    }
  }
})();
