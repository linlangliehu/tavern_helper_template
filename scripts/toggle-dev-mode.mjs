#!/usr/bin/env node
/**
 * toggle-dev-mode.mjs —— 在开发模式和生产模式之间切换
 * 
 * 开发模式：将 src/神秘复苏模拟器/index.yaml 中的 jsdelivr CDN 链接替换为 http://127.0.0.1:5510/
 * 生产模式：将本地链接还原为 jsdelivr CDN 链接
 * 
 * 用法：
 *   node scripts/toggle-dev-mode.mjs --enable   # 切换到开发模式
 *   node scripts/toggle-dev-mode.mjs --disable  # 切换回生产模式
 *   node scripts/toggle-dev-mode.mjs --status   # 查看当前模式
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const ROOT = join(__dirname, '..');
const YAML_PATHS = [
  join(ROOT, 'src/神秘复苏模拟器/index.yaml'),
  join(ROOT, 'src/魔法禁书目录模拟器/index.yaml'),
];

// CDN 模式匹配
const CDN_PATTERN = /https:\/\/(?:(?:testingcf|cdn)\.)?jsdelivr\.net\/gh\/linlangliehu\/tavern_helper_template@[0-9a-f]{7,40}\//g;
const LOCAL_BASE = 'http://127.0.0.1:5510/';

function getCurrentMode() {
  const modes = YAML_PATHS.map((p) => {
    if (!existsSync(p)) return 'missing';
    const content = readFileSync(p, 'utf-8');
    const hasCDN = /https:\/\/(?:(?:testingcf|cdn)\.)?jsdelivr\.net\/gh\/linlangliehu\/tavern_helper_template@[0-9a-f]{7,40}\//.test(content);
    const hasLocal = content.includes(LOCAL_BASE);
    if (hasLocal && !hasCDN) return 'dev';
    if (hasCDN && !hasLocal) return 'prod';
    if (hasLocal && hasCDN) return 'mixed';
    return 'unknown';
  });
  // 所有卡一致时返回该模式，否则返回 mixed
  const first = modes[0];
  if (modes.every((m) => m === first)) return first;
  return 'mixed';
}

function enableDevMode() {
  const mode = getCurrentMode();
  if (mode === 'dev') {
    console.log('✅ 已经是开发模式，无需切换');
    return;
  }
  // mixed 模式（各卡不一致）逐卡处理，不退出
  const refs = [];
  for (const YAML_PATH of YAML_PATHS) {
    if (!existsSync(YAML_PATH)) {
      console.warn(`⚠️  跳过不存在的文件: ${YAML_PATH}`);
      continue;
    }
    const content = readFileSync(YAML_PATH, 'utf-8');
    const cdnMatch = content.match(/https:\/\/(?:(?:testingcf|cdn)\.)?jsdelivr\.net\/gh\/linlangliehu\/tavern_helper_template@([0-9a-f]{7,40})\//);
    const originalRef = cdnMatch ? cdnMatch[1] : 'unknown';
    refs.push(`${YAML_PATH.split('/').pop()}: ${originalRef}`);
    let newContent = content;
    if (!newContent.includes('# DEV_MODE_ORIGINAL_CDN_REF:')) {
      newContent = `# DEV_MODE_ORIGINAL_CDN_REF: ${originalRef}\n${newContent}`;
    }
    newContent = newContent.replace(CDN_PATTERN, LOCAL_BASE);
    writeFileSync(YAML_PATH, newContent, 'utf-8');
  }
  console.log('\n✅ 已切换到开发模式');
  console.log(`   原始 CDN_REF:`);
  refs.forEach((r) => console.log(`     ${r}`));
  console.log(`   所有资源将从 ${LOCAL_BASE} 加载\n`);
  console.log('💡 提示：');
  console.log('   1. 现在可以修改源码，pnpm watch 会自动编译');
  console.log('   2. 修改后刷新酒馆页面即可看到效果');
  console.log('   3. 开发完成后运行「结束开发环境」任务停止 watch/5510 并还原 YAML\n');
}

function disableDevMode() {
  const mode = getCurrentMode();
  if (mode === 'prod') {
    console.log('✅ 已经是生产模式，无需切换');
    return;
  }
  // mixed 模式（各卡不一致）逐卡处理，不退出
  const restored = [];
  for (const YAML_PATH of YAML_PATHS) {
    if (!existsSync(YAML_PATH)) continue;
    const content = readFileSync(YAML_PATH, 'utf-8');
    const refMatch = content.match(/# DEV_MODE_ORIGINAL_CDN_REF: ([0-9a-f]{7,40})/);
    if (!refMatch) {
      console.error(`❌ ${YAML_PATH} 找不到原始 CDN_REF，无法还原`);
      continue;
    }
    const originalRef = refMatch[1];
    const cdnBase = `https://testingcf.jsdelivr.net/gh/linlangliehu/tavern_helper_template@${originalRef}/`;
    let newContent = content.replace(new RegExp(LOCAL_BASE.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), cdnBase);
    newContent = newContent.replace(/# DEV_MODE_ORIGINAL_CDN_REF: [0-9a-f]{7,40}\n/g, '');
    writeFileSync(YAML_PATH, newContent, 'utf-8');
    restored.push(`${YAML_PATH.split('/').pop()}: CDN@${originalRef}`);
  }
  console.log('\n✅ 已切换回生产模式');
  console.log(`   已还原：`);
  restored.forEach((r) => console.log(`     ${r}`));
  console.log('');
  console.log('💡 提示：');
  console.log('   1. 日常结束请运行「结束开发环境」任务停止 watch 和 5510');
  console.log('   2. 发布阶段 1 运行 pnpm verify:mfrs-source-gates');
  console.log('   3. 推送源码后等待 CI bot bundle，再更新 CDN_REF 并运行 publish-card\n');
}

function showStatus() {
  const mode = getCurrentMode();
  console.log('\n当前模式状态：\n');
  switch (mode) {
    case 'dev':
      console.log('  模式: 🔧 开发模式');
      console.log(`  资源: ${LOCAL_BASE}`);
      for (const YAML_PATH of YAML_PATHS) {
        if (!existsSync(YAML_PATH)) continue;
        const content = readFileSync(YAML_PATH, 'utf-8');
        const refMatch = content.match(/# DEV_MODE_ORIGINAL_CDN_REF: ([0-9a-f]{7,40})/);
        if (refMatch) console.log(`     ${YAML_PATH.split('/').pop()}: 原始 CDN@${refMatch[1]}`);
      }
      break;
    case 'prod':
      console.log('  模式: 📦 生产模式');
      for (const YAML_PATH of YAML_PATHS) {
        if (!existsSync(YAML_PATH)) continue;
        const content = readFileSync(YAML_PATH, 'utf-8');
        const cdnMatch = content.match(/https:\/\/(?:(?:testingcf|cdn)\.)?jsdelivr\.net\/gh\/linlangliehu\/tavern_helper_template@([0-9a-f]{7,40})\//);
        if (cdnMatch) console.log(`     ${YAML_PATH.split('/').pop()}: CDN@${cdnMatch[1]}`);
      }
      break;
    case 'mixed':
      console.log('  模式: ⚠️  混合模式（各卡不一致或单卡混合）');
      for (const YAML_PATH of YAML_PATHS) {
        if (!existsSync(YAML_PATH)) continue;
        const content = readFileSync(YAML_PATH, 'utf-8');
        const hasCDN = CDN_PATTERN.test(content);
        const hasLocal = content.includes(LOCAL_BASE);
        const tag = hasLocal && hasCDN ? 'CDN+本地' : hasLocal ? '本地' : hasCDN ? 'CDN' : '未知';
        console.log(`     ${YAML_PATH.split('/').pop()}: ${tag}`);
      }
      break;
    default:
      console.log('  模式: ❓ 未知');
  }
  console.log('');
}

// 主逻辑
const args = process.argv.slice(2);
const command = args[0];

switch (command) {
  case '--enable':
    enableDevMode();
    break;
  case '--disable':
    disableDevMode();
    break;
  case '--status':
    showStatus();
    break;
  default:
    console.log('用法：');
    console.log('  node scripts/toggle-dev-mode.mjs --enable   # 切换到开发模式');
    console.log('  node scripts/toggle-dev-mode.mjs --disable  # 切换回生产模式');
    console.log('  node scripts/toggle-dev-mode.mjs --status   # 查看当前模式');
    process.exit(1);
}
