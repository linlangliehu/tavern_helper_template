import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const indexPath = 'src/魔法禁书目录模拟器/index.yaml';
const planRoot = '.planning/magic-worldbook-implementation-20260908';
const patchExecutable = 'C:/Users/linlang/.vscode/extensions/openai.chatgpt-26.901.22334-win32-x64/bin/windows-x86_64/codex.exe';
const decoder = new TextDecoder('utf-8', { fatal: true });
const read = filename => decoder.decode(fs.readFileSync(filename));
const aliases = {
  GREMLIN: ['格雷姆林篇', '格雷姆林魔神篇', '魔神篇'],
  CORONZON: ['科隆尊篇', '科隆尊英国决战篇'],
  'DARK-BATTLE': ['暗部大战', '暗部抗争', '暗部内战', 'Battle Royale'],
  'MENTAL-STINGER': ['蜜蚁爱愉篇', '蜂与蚁'],
};
const receipts = [];

function apply(before, after) {
  if (before === after) return;
  const patch = `*** Begin Patch\n*** Update File: ${indexPath}\n@@\n${before.split('\n').map(line => `-${line}`).join('\n')}\n${after.split('\n').map(line => `+${line}`).join('\n')}\n*** End Patch`;
  const result = spawnSync(patchExecutable, ['--codex-run-as-apply-patch', patch], { encoding: 'utf8', windowsHide: true });
  if (result.status !== 0) throw new Error(result.stderr || result.stdout || `apply_patch failed: ${result.error}`);
}

function registration(file) {
  const filename = file.path.replace('src/魔法禁书目录模拟器/', '').replace(/\.txt$/, '');
  const name = path.posix.basename(filename);
  const keywords = [...new Set([...file.keywords, ...((file.packageId && aliases[file.packageId]) || [])])];
  if (!keywords.length || keywords.some(keyword => /[\r\n]/.test(keyword))) throw new Error(`Invalid keywords: ${file.path}`);
  return [
    `  - 名称: ${name}`,
    '    启用: true',
    '    激活策略:',
    '      类型: 绿灯',
    '      关键字:',
    ...keywords.map(keyword => `        - ${keyword}`),
    '    插入位置:',
    '      类型: 角色定义之前',
    '      顺序: 14574',
    '    激活概率: 100',
    '    递归:',
    '      不可被其他条目激活: true',
    '      不可激活其他条目: true',
    `    文件: ${filename}`,
  ].join('\n');
}

for (const worker of ['ot', 'new-testament', 'genesis', 'prehistory', 'side-stories']) {
  const manifest = JSON.parse(read(`${planRoot}/worker-${worker}.json`));
  const additions = { main: [], side: [] };
  for (const file of manifest.files) {
    if (!fs.existsSync(file.path)) throw new Error(`Missing source: ${file.path}`);
    const filename = file.path.replace('src/魔法禁书目录模拟器/', '').replace(/\.txt$/, '');
    const index = read(indexPath).replace(/\r\n/g, '\n');
    const blocks = [...index.matchAll(/^  - 名称:[^\n]*(?:\n(?!  - 名称:|- 文件夹:|\S)[^\n]*)*/gm)];
    const current = blocks.find(match => match[0].includes(`    文件: ${filename}\n`) || match[0].endsWith(`    文件: ${filename}`));
    if (current) {
      if (aliases[file.packageId]) {
        const keywords = [...new Set([...file.keywords, ...aliases[file.packageId]])];
        const updated = current[0].replace(/      关键字:\n(?:        - [^\n]*\n)+/, `      关键字:\n${keywords.map(keyword => `        - ${keyword}\n`).join('')}`);
        apply(current[0], updated);
        receipts.push({ action: 'narrow-keywords', path: file.path, packageId: file.packageId });
      }
      continue;
    }
    const section = filename.includes('/主线/') ? 'main' : 'side';
    additions[section].push(registration(file));
    receipts.push({ action: 'register', path: file.path, packageId: file.packageId });
  }
  if (additions.main.length) {
    const anchor = '  - 名称: 主线剧情导航';
    if (read(indexPath).split(anchor).length !== 2) throw new Error('Main insertion anchor is not unique');
    apply(anchor, `${additions.main.join('\n')}\n${anchor}`);
  }
  if (additions.side.length) {
    const anchor = '- 文件夹: 剧情事件/支线\n  条目:';
    if (read(indexPath).replace(/\r\n/g, '\n').split(anchor).length !== 2) throw new Error('Side insertion anchor is not unique');
    apply(anchor, `${anchor}\n${additions.side.join('\n')}`);
  }
}

console.log(JSON.stringify({ registrationsAdded: receipts.filter(item => item.action === 'register').length, keywordEntriesNarrowed: receipts.filter(item => item.action === 'narrow-keywords').length, receipts }, null, 2));
