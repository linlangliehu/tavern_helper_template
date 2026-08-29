const fs = require('fs');
const p = require('path');
const y = require(p.join('D:\\project\\tavern_helper_template', 'node_modules', 'js-yaml'));
try {
  const d = y.load(fs.readFileSync('D:\\project\\tavern_helper_template\\src\\魔法禁书目录模拟器\\index.yaml', 'utf8'));
  console.log('YAML_OK');
  console.log('世界书:', d.世界书.length, '条');
  console.log('正则:', d.正则.length, '条');
  const r = d.正则.find(x => x['正则名称'] && x['正则名称'].includes('渲染魔法禁书目录开局页'));
  console.log('开局正则:', r ? '找到' : '未找到');
  console.log('查找:', r ? r['查找表达式'].substring(0, 50) : '');
  console.log('替换为长度:', r ? String(r['替换为']).length : 0);
  console.log('仅格式显示:', r ? r['作用于']['仅格式显示'] : null);
} catch (e) {
  console.log('YAML_ERR:', e.message, e.mark ? '@line' + e.mark.line : '');
}
