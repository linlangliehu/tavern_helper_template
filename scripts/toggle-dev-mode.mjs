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
const YAML_PATH = join(ROOT, 'src/神秘复苏模拟器/index.yaml');

// CDN 模式匹配
const CDN_PATTERN = /https:\/\/(?:(?:testingcf|cdn)\.)?jsdelivr\.net\/gh\/linlangliehu\/tavern_helper_template@[0-9a-f]{7,40}\//g;
const LOCAL_BASE = 'http://127.0.0.1:5510/';

function getCurrentMode() {
  if (!existsSync(YAML_PATH)) {
    console.error(`❌ 找不到文件: ${YAML_PATH}`);
    process.exit(1);
  }

  const content = readFileSync(YAML_PATH, 'utf-8');
  const hasCDN = CDN_PATTERN.test(content);
  const hasLocal = content.includes(LOCAL_BASE);

  if (hasLocal && !hasCDN) return 'dev';
  if (hasCDN && !hasLocal) return 'prod';
  if (hasLocal && hasCDN) return 'mixed';
  return 'unknown';
}

function enableDevMode() {
  const content = readFileSync(YAML_PATH, 'utf-8');
  const mode = getCurrentMode();

  if (mode === 'dev') {
    console.log('✅ 已经是开发模式，无需切换');
    return;
  }

  if (mode === 'mixed') {
    console.error('❌ YAML 文件同时包含 CDN 和本地链接，请手动检查');
    process.exit(1);
  }

  // 提取原始 CDN_REF（commit SHA）
  const cdnMatch = content.match(/https:\/\/(?:(?:testingcf|cdn)\.)?jsdelivr\.net\/gh\/linlangliehu\/tavern_helper_template@([0-9a-f]{7,40})\//);
  const originalRef = cdnMatch ? cdnMatch[1] : 'unknown';

  // 在文件开头添加注释记录原始 CDN_REF
  let newContent = content;
  if (!newContent.includes('# DEV_MODE_ORIGINAL_CDN_REF:')) {
    newContent = `# DEV_MODE_ORIGINAL_CDN_REF: ${originalRef}\n${newContent}`;
  }

  // 替换所有 CDN 链接为本地链接
  newContent = newContent.replace(CDN_PATTERN, LOCAL_BASE);

  writeFileSync(YAML_PATH, newContent, 'utf-8');
  console.log('\n✅ 已切换到开发模式');
  console.log(`   原始 CDN_REF: ${originalRef}`);
  console.log(`   所有资源将从 ${LOCAL_BASE} 加载\n`);
  console.log('💡 提示：');
  console.log('   1. 现在可以修改源码，pnpm watch 会自动编译');
  console.log('   2. 修改后刷新酒馆页面即可看到效果');
  console.log('   3. 开发完成后运行 "简化版：切换回生产模式" 还原 YAML\n');
}

function disableDevMode() {
  const content = readFileSync(YAML_PATH, 'utf-8');
  const mode = getCurrentMode();

  if (mode === 'prod') {
    console.log('✅ 已经是生产模式，无需切换');
    return;
  }

  if (mode === 'mixed') {
    console.error('❌ YAML 文件同时包含 CDN 和本地链接，请手动检查');
    process.exit(1);
  }

  // 读取原始 CDN_REF
  const refMatch = content.match(/# DEV_MODE_ORIGINAL_CDN_REF: ([0-9a-f]{7,40})/);
  if (!refMatch) {
    console.error('❌ 找不到原始 CDN_REF，无法还原');
    console.error('   请手动将 http://127.0.0.1:5510/ 替换为正确的 jsdelivr 链接');
    process.exit(1);
  }

  const originalRef = refMatch[1];
  const cdnBase = `https://testingcf.jsdelivr.net/gh/linlangliehu/tavern_helper_template@${originalRef}/`;

  // 替换所有本地链接为 CDN 链接
  let newContent = content.replace(new RegExp(LOCAL_BASE.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), cdnBase);

  // 移除开发模式注释
  newContent = newContent.replace(/# DEV_MODE_ORIGINAL_CDN_REF: [0-9a-f]{7,40}\n/g, '');

  writeFileSync(YAML_PATH, newContent, 'utf-8');
  console.log('\n✅ 已切换回生产模式');
  console.log(`   已还原为 CDN: ${cdnBase}\n`);
  console.log('💡 提示：');
  console.log('   1. 现在可以运行 pnpm build 打包生产版本');
  console.log('   2. 运行 pnpm verify:mfrs-gates 验证门禁');
  console.log('   3. git commit + push 发布到 GitHub\n');
}

function showStatus() {
  const mode = getCurrentMode();
  const content = readFileSync(YAML_PATH, 'utf-8');

  console.log('\n当前模式状态：\n');

  switch (mode) {
    case 'dev':
      console.log('  模式: 🔧 开发模式');
      console.log(`  资源: ${LOCAL_BASE}`);
      const refMatch = content.match(/# DEV_MODE_ORIGINAL_CDN_REF: ([0-9a-f]{7,40})/);
      if (refMatch) {
        console.log(`  原始: CDN@${refMatch[1]}`);
      }
      break;
    case 'prod':
      console.log('  模式: 📦 生产模式');
      const cdnMatch = content.match(/https:\/\/(?:(?:testingcf|cdn)\.)?jsdelivr\.net\/gh\/linlangliehu\/tavern_helper_template@([0-9a-f]{7,40})\//);
      if (cdnMatch) {
        console.log(`  资源: CDN@${cdnMatch[1]}`);
      }
      break;
    case 'mixed':
      console.log('  模式: ⚠️  混合模式（异常）');
      console.log('  YAML 文件同时包含 CDN 和本地链接');
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
