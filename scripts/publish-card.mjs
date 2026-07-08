#!/usr/bin/env node
/**
 * publish-card.mjs —— 一键把"开发版角色卡"镜像到"发布版"并打包成可分发 PNG。
 *
 * 做的事：
 *   1. 把开发版的若干数据目录（世界书/、第一条消息/、对话示例/、系统提示词/）镜像到发布版
 *      （删除 → 重新复制，确保开发版删过的文件也会从发布版消失）
 *   2. 把指定附属文件（如头像 PNG）复制到发布版
 *   3. 把开发版 index.yaml 复制到发布版，并按规则把 localhost / 127.0.0.1
 *      以及已有 jsdelivr 旧 hash/cache 链接替换为当前 CDN 链接
 *   4. 调 `node tavern_sync.mjs bundle <配置名>` 生成最终可分发 PNG
 *
 * 用法：
 *   pnpm publish-card                  # 同步并打包所有卡
 *   pnpm publish-card 神秘复苏模拟器   # 只处理指定卡（按 syncName 匹配）
 *   pnpm publish-card --no-bundle      # 只镜像，不调 tavern_sync bundle
 *   pnpm publish-card --dry-run        # 只打印将要做的事，不动文件
 */

import { existsSync, rmSync, cpSync, readFileSync, writeFileSync, mkdirSync, readdirSync, statSync, copyFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

// ─────────────────────────────── 配置 ───────────────────────────────
// 仓库标识：用于把开发版的 localhost 或旧 jsdelivr 链接替换为当前 CDN 链接
// 如换了 fork 主、改了仓库名，只需要改这一处
const REPO = 'linlangliehu/tavern_helper_template';
const CDN_REF = '8b3ea67';  // bot bundle，v8.5.12 消息内面板最终渲染兜底（v8.5.13 纯世界书改动沿用）
const CDN = `https://testingcf.jsdelivr.net/gh/${REPO}@${CDN_REF}/`;
const CDN_CACHE_VERSION = 'phase164-4-0-final-baseline-6-28-p5-4-hotfix13-mvu-v8513';

const escapeRegExp = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// 把任意 http(s)://localhost(:port)/ 或 http(s)://127.0.0.1(:port)/ 替换为 CDN
const LOCALHOST_PATTERN = /https?:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?\//g;
const REPO_PATTERN = escapeRegExp(REPO);
const JSDELIVR_REPO_BASE_PATTERN = `https://(?:(?:testingcf|cdn)\\.)?jsdelivr\\.net/gh/${REPO_PATTERN}@[^/'"\\s]+/`;
const EXISTING_CDN_PATTERN = new RegExp(JSDELIVR_REPO_BASE_PATTERN, 'g');
const CURRENT_CDN_DIST_ENTRY_PATTERN = new RegExp(
  `(${escapeRegExp(CDN)}dist/[^'"\\s]+?/index\\.(?:js|html))(?:\\?v=[^'"\\s]+)?`,
  'g',
);
const MAGVAR_BUNDLE_PATTERN = /(https:\/\/(?:(?:testingcf|cdn)\.)?jsdelivr\.net\/gh\/MagicalAstrogy\/MagVarUpdate\/artifact\/bundle\.js)(?:\?v=[^'"\s]+)?/g;

const cards = [
  {
    syncName: '神秘复苏模拟器发布版',              // 对应 tavern_sync.yaml 中的配置名
    devDir: 'src/神秘复苏模拟器',                  // 源（开发版）
    pubDir: 'src/神秘复苏模拟器发布版',            // 目标（发布版）
    yamlFile: 'index.yaml',
    syncDirs: ['第一条消息', '系统提示词', '对话示例', '世界书', '数据库'],
    syncFiles: ['神秘复苏模拟器.png'],            // 头像图
    urlReplacements: [
      { from: LOCALHOST_PATTERN, to: CDN },
      { from: EXISTING_CDN_PATTERN, to: CDN },
    ],
    releaseVersion: '8.5.13',
  },
];

// ─────────────────────────────── 工具 ───────────────────────────────
const ROOT = resolve(fileURLToPath(import.meta.url), '../..');
const args = process.argv.slice(2);
const flags = new Set(args.filter(a => a.startsWith('--')));
const targets = args.filter(a => !a.startsWith('--'));
const NO_BUNDLE = flags.has('--no-bundle');
const DRY_RUN = flags.has('--dry-run');

const log = msg => console.log(`[publish-card] ${msg}`);
const die = msg => { console.error(`[publish-card] ✖ ${msg}`); process.exit(1); };

function countFiles(dir) {
  let n = 0;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) n += countFiles(join(dir, entry.name));
    else n += 1;
  }
  return n;
}

function humanSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function mirrorDir(src, dst) {
  if (DRY_RUN) return countFiles(src);
  // Windows 下 fs.cpSync 在大目录 + 中文路径场景会栈溢出（Node 24 已知问题）。
  // 用 robocopy /MIR 替代：自带"镜像"语义（源里没有的会从目标删除），且对大量文件稳定。
  if (process.platform === 'win32') {
    const r = spawnSync(
      'robocopy',
      [src, dst, '/MIR', '/NJH', '/NJS', '/NDL', '/NP', '/NFL'],
      { stdio: 'ignore' },
    );
    // robocopy 退出码 0–7 都算成功（0=无变化, 1=有复制, 2=删除多余, 4-7=warnings）；>=8 才是失败。
    if (r.status === null || r.status >= 8) die(`robocopy 失败，退出码 ${r.status}`);
  } else {
    if (existsSync(dst)) rmSync(dst, { recursive: true, force: true });
    cpSync(src, dst, { recursive: true });
  }
  return countFiles(dst);
}

function copyFile(src, dst) {
  if (DRY_RUN) return statSync(src).size;
  copyFileSync(src, dst);
  return statSync(dst).size;
}

function replaceAndCount(content, pattern, replacer) {
  let count = 0;
  const next = content.replace(pattern, (...args) => {
    count += 1;
    return typeof replacer === 'function' ? replacer(...args) : replacer;
  });
  return { next, count };
}

function syncYaml(srcYaml, dstYaml, replacements, releaseVersion) {
  const content = readFileSync(srcYaml, 'utf8');
  let next = content;
  let count = 0;
  for (const { from, to } of replacements) {
    const result = replaceAndCount(next, from, to);
    next = result.next;
    count += result.count;
  }

  const projectCacheResult = replaceAndCount(
    next,
    CURRENT_CDN_DIST_ENTRY_PATTERN,
    (_match, entryUrl) => `${entryUrl}?v=${CDN_CACHE_VERSION}`,
  );
  next = projectCacheResult.next;
  count += projectCacheResult.count;

  const magvarCacheResult = replaceAndCount(
    next,
    MAGVAR_BUNDLE_PATTERN,
    (_match, entryUrl) => `${entryUrl}?v=${CDN_CACHE_VERSION}`,
  );
  next = magvarCacheResult.next;
  count += magvarCacheResult.count;

  if (releaseVersion) {
    next = next.replace(/^版本:\s*['"][^'"]+['"]\s*$/m, `版本: '${releaseVersion}'`);
  }
  if (!DRY_RUN) writeFileSync(dstYaml, next, 'utf8');
  return { totalReplaced: count, bytes: Buffer.byteLength(next, 'utf8') };
}

function runBundle(syncName) {
  if (DRY_RUN) {
    log(`(dry-run) 跳过 tavern_sync.mjs bundle ${syncName}`);
    return;
  }
  log(`运行 node tavern_sync.mjs bundle ${syncName} ...`);
  const r = spawnSync('node', ['tavern_sync.mjs', 'bundle', syncName], {
    stdio: 'inherit',
    cwd: ROOT,
    shell: false,
  });
  if (r.status !== 0) die(`tavern_sync 退出码 ${r.status}`);
}

// ─────────────────────────────── 主流程 ───────────────────────────────
const pickedCards = targets.length === 0
  ? cards
  : cards.filter(c => targets.some(t => c.syncName === t || c.syncName.startsWith(t)));

if (pickedCards.length === 0) {
  die(`没有匹配的卡。可用配置名: ${cards.map(c => c.syncName).join(', ')}`);
}

if (DRY_RUN) log('** DRY RUN（不会改文件） **');

for (const card of pickedCards) {
  log(`────── 处理 ${card.syncName} ──────`);
  const devDir = resolve(ROOT, card.devDir);
  const pubDir = resolve(ROOT, card.pubDir);

  if (!existsSync(devDir)) die(`开发版目录不存在: ${devDir}`);
  if (!DRY_RUN && !existsSync(pubDir)) mkdirSync(pubDir, { recursive: true });

  for (const d of card.syncDirs) {
    const src = join(devDir, d);
    if (!existsSync(src)) { log(`  - 跳过不存在的目录 ${d}/`); continue; }
    const count = mirrorDir(src, join(pubDir, d));
    log(`  ✓ 镜像目录 ${d}/ (${count} 个文件)`);
  }

  for (const f of card.syncFiles) {
    const src = join(devDir, f);
    if (!existsSync(src)) { log(`  - 跳过不存在的文件 ${f}`); continue; }
    const size = copyFile(src, join(pubDir, f));
    log(`  ✓ 同步文件 ${f} (${humanSize(size)})`);
  }

  const srcYaml = join(devDir, card.yamlFile);
  const dstYaml = join(pubDir, card.yamlFile);
  if (!existsSync(srcYaml)) die(`开发版 yaml 不存在: ${srcYaml}`);
  const { totalReplaced } = syncYaml(srcYaml, dstYaml, card.urlReplacements, card.releaseVersion);
  const versionNote = card.releaseVersion ? `，保留版本 ${card.releaseVersion}` : '';
  log(`  ✓ 同步 ${card.yamlFile} 并替换 ${totalReplaced} 处链接${versionNote}`);

  if (!NO_BUNDLE) runBundle(card.syncName);
}

log('');
log(DRY_RUN ? '✓ DRY RUN 结束（未改任何文件）' : '✅ 完成');
if (!NO_BUNDLE && !DRY_RUN) {
  for (const card of pickedCards) {
    log(`   分发文件: ${card.pubDir}/${card.syncName}.png`);
  }
}
