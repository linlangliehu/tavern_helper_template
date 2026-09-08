#!/usr/bin/env node
/**
 * toggle-dev-mode.mjs —— 在开发模式和生产模式之间切换
 *
 * 开发模式：将两张角色卡 index.yaml 中的 jsdelivr CDN 链接替换为 http://127.0.0.1:5510/
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
const YAML_PATHS = [join(ROOT, 'src/神秘复苏模拟器/index.yaml'), join(ROOT, 'src/魔法禁书目录模拟器/index.yaml')];

// CDN 模式匹配
const CDN_REF_PATTERN =
  /https:\/\/(?:(?:testingcf|cdn)\.)?jsdelivr\.net\/gh\/linlangliehu\/tavern_helper_template@([0-9a-f]{7,40})\//;
const CDN_PATTERN = new RegExp(CDN_REF_PATTERN.source, 'g');
const LOCAL_BASE = 'http://127.0.0.1:5510/';
const DEV_MARKER_PATTERN = /^# DEV_MODE_ORIGINAL_CDN_REF:([^\r\n]*)(?:\r?\n)?/gm;
const DEV_MARKER_REF_PATTERN = /^# DEV_MODE_ORIGINAL_CDN_REF: ([0-9a-f]{7,40})\r?$/m;

function getCurrentMode() {
  const modes = YAML_PATHS.map(p => {
    if (!existsSync(p)) return 'missing';
    const content = readFileSync(p, 'utf-8');
    const hasCDN = CDN_REF_PATTERN.test(content);
    const hasLocal = content.includes(LOCAL_BASE);
    if (hasLocal && !hasCDN) return 'dev';
    if (hasCDN && !hasLocal) return 'prod';
    if (hasLocal && hasCDN) return 'mixed';
    return 'unknown';
  });
  // 所有卡一致时返回该模式，否则返回 mixed
  const first = modes[0];
  if (modes.every(m => m === first)) return first;
  return 'mixed';
}

function enableDevMode() {
  const updates = [];
  const failures = [];
  const refs = [];
  for (const YAML_PATH of YAML_PATHS) {
    if (!existsSync(YAML_PATH)) {
      failures.push(`文件不存在: ${YAML_PATH}`);
      continue;
    }
    const content = readFileSync(YAML_PATH, 'utf-8');
    const markerMatch = content.match(DEV_MARKER_REF_PATTERN);
    const cdnMatch = content.match(CDN_REF_PATTERN);
    const originalRef = markerMatch?.[1] ?? cdnMatch?.[1];
    if (!originalRef) {
      failures.push(`${YAML_PATH.split('/').pop()}: 找不到可还原的 CDN_REF，未切换`);
      continue;
    }
    refs.push(`${YAML_PATH.split('/').pop()}: ${originalRef}`);
    let newContent = content.replace(DEV_MARKER_PATTERN, '');
    newContent = `# DEV_MODE_ORIGINAL_CDN_REF: ${originalRef}\n${newContent}`;
    newContent = newContent.replace(CDN_PATTERN, LOCAL_BASE);
    updates.push({ yamlPath: YAML_PATH, content: newContent });
  }
  if (failures.length > 0) {
    failures.forEach(failure => console.error(`❌ ${failure}`));
    process.exitCode = 1;
    return;
  }
  for (const update of updates) {
    writeFileSync(update.yamlPath, update.content, 'utf-8');
  }
  console.log('\n✅ 已切换到开发模式');
  console.log(`   原始 CDN_REF:`);
  refs.forEach(r => console.log(`     ${r}`));
  console.log(`   所有资源将从 ${LOCAL_BASE} 加载\n`);
  console.log('💡 提示：');
  console.log('   1. 现在可以修改源码，pnpm watch 会自动编译');
  console.log('   2. 修改后刷新酒馆页面即可看到效果');
  console.log('   3. 开发完成后运行「结束开发环境」任务停止 watch/5510 并还原 YAML\n');
}

function disableDevMode() {
  const updates = [];
  const failures = [];
  const restored = [];
  for (const YAML_PATH of YAML_PATHS) {
    if (!existsSync(YAML_PATH)) {
      failures.push(`文件不存在: ${YAML_PATH}`);
      continue;
    }
    const content = readFileSync(YAML_PATH, 'utf-8');
    const hasMarker = DEV_MARKER_PATTERN.test(content);
    DEV_MARKER_PATTERN.lastIndex = 0;
    const hasLocal = content.includes(LOCAL_BASE);
    const hasCDN = CDN_REF_PATTERN.test(content);
    let newContent = content;
    let restoredRef = null;

    if (hasLocal) {
      const refMatch = content.match(DEV_MARKER_REF_PATTERN);
      if (!refMatch) {
        failures.push(`${YAML_PATH.split('/').pop()}: 开发模式标记缺少有效 CDN_REF，无法还原`);
        continue;
      }
      restoredRef = refMatch[1];
      const cdnBase = `https://testingcf.jsdelivr.net/gh/linlangliehu/tavern_helper_template@${restoredRef}/`;
      const localPattern = new RegExp(LOCAL_BASE.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
      newContent = newContent.replace(localPattern, cdnBase);
    } else if (!hasCDN) {
      failures.push(`${YAML_PATH.split('/').pop()}: 未找到本地开发链接，也未找到生产 CDN 链接`);
      continue;
    }

    if (hasMarker) {
      newContent = newContent.replace(DEV_MARKER_PATTERN, '');
      if (!restoredRef) {
        const refMatch = content.match(DEV_MARKER_REF_PATTERN);
        restoredRef = refMatch?.[1] ?? null;
      }
    }
    updates.push({ yamlPath: YAML_PATH, content: newContent });
    if (restoredRef) restored.push(`${YAML_PATH.split('/').pop()}: CDN@${restoredRef}`);
  }
  if (failures.length > 0) {
    failures.forEach(failure => console.error(`❌ ${failure}`));
    process.exitCode = 1;
    return;
  }
  for (const update of updates) {
    writeFileSync(update.yamlPath, update.content, 'utf-8');
  }
  console.log('\n✅ 已切换回生产模式');
  console.log(`   已还原：`);
  restored.forEach(r => console.log(`     ${r}`));
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
        const refMatch = content.match(DEV_MARKER_REF_PATTERN);
        if (refMatch) console.log(`     ${YAML_PATH.split('/').pop()}: 原始 CDN@${refMatch[1]}`);
      }
      break;
    case 'prod':
      console.log('  模式: 📦 生产模式');
      for (const YAML_PATH of YAML_PATHS) {
        if (!existsSync(YAML_PATH)) continue;
        const content = readFileSync(YAML_PATH, 'utf-8');
        const cdnMatch = content.match(
          /https:\/\/(?:(?:testingcf|cdn)\.)?jsdelivr\.net\/gh\/linlangliehu\/tavern_helper_template@([0-9a-f]{7,40})\//,
        );
        if (cdnMatch) console.log(`     ${YAML_PATH.split('/').pop()}: CDN@${cdnMatch[1]}`);
      }
      break;
    case 'mixed':
      console.log('  模式: ⚠️  混合模式（各卡不一致或单卡混合）');
      for (const YAML_PATH of YAML_PATHS) {
        if (!existsSync(YAML_PATH)) continue;
        const content = readFileSync(YAML_PATH, 'utf-8');
        const hasCDN = CDN_REF_PATTERN.test(content);
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
