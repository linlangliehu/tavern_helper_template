#!/usr/bin/env node
/**
 * 生成「β 本地验收」开发卡 PNG：脚本库 dist 指 http://127.0.0.1:5500/dist/...
 * 不改发布版；临时改开发版 index.yaml → bundle → 复制 PNG → 还原 yaml。
 *
 * 用法：
 *   node scripts/prepare-mfrs-beta-local-test.mjs
 * 前置：pnpm build；本机 5500 提供仓库根静态目录。
 */
import { copyFileSync, existsSync, readFileSync, writeFileSync, mkdirSync, unlinkSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const ROOT = resolve(fileURLToPath(import.meta.url), '../..');
const YAML = join(ROOT, 'src/神秘复苏模拟器/index.yaml');
const BUNDLE_PNG = join(ROOT, 'src/神秘复苏模拟器/神秘复苏模拟器.png');
const OUT_DIR = join(ROOT, 'docs/mfrs-redesign-phase0/local-test');
const OUT_PNG = join(OUT_DIR, '神秘复苏模拟器-β本地验收.png');
const LOCAL = 'http://127.0.0.1:5500/';
const CDN_DIST = /https:\/\/(?:(?:testingcf|cdn)\.)?jsdelivr\.net\/gh\/linlangliehu\/tavern_helper_template@[0-9a-f]{7,40}\//g;

function die(msg) {
  console.error(`[beta-local-test] ✖ ${msg}`);
  process.exit(1);
}

function log(msg) {
  console.log(`[beta-local-test] ${msg}`);
}

if (!existsSync(YAML)) die(`missing ${YAML}`);
if (!existsSync(join(ROOT, 'dist/神秘复苏模拟器/脚本/消息内面板/index.js'))) {
  die('missing dist message panel — run pnpm build first');
}

const original = readFileSync(YAML, 'utf8');
const patched = original
  .replace(CDN_DIST, LOCAL)
  .replace(/^版本:\s*.+$/m, "版本: 'β-local-dist'");

if (patched === original) {
  log('warn: no CDN dist URL replaced (already local or unexpected format)');
}

const backup = `${YAML}.beta-local-bak`;
writeFileSync(backup, original, 'utf8');
writeFileSync(YAML, patched, 'utf8');
log('patched index.yaml → localhost:5500 for dist scripts');

try {
  const r = spawnSync(process.execPath, ['tavern_sync.mjs', 'bundle', '神秘复苏模拟器'], {
    cwd: ROOT,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  if (r.stdout) process.stdout.write(r.stdout);
  if (r.stderr) process.stderr.write(r.stderr);
  if (r.status !== 0) die(`bundle failed (exit ${r.status})`);

  if (!existsSync(BUNDLE_PNG)) die(`bundle output missing: ${BUNDLE_PNG}`);
  mkdirSync(OUT_DIR, { recursive: true });
  copyFileSync(BUNDLE_PNG, OUT_PNG);
  log(`test card written: ${OUT_PNG}`);
  log('Import this PNG in SillyTavern. Keep http://127.0.0.1:5500 serving the repo root.');
} finally {
  writeFileSync(YAML, original, 'utf8');
  try {
    unlinkSync(backup);
  } catch {
    // ignore
  }
  log('restored src/神秘复苏模拟器/index.yaml (no localhost left in repo yaml)');
}
