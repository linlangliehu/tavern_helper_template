#!/usr/bin/env node
/**
 * prepare-mfrs-dev-card.mjs —— 从正式 index.yaml 派生本地开发卡。
 *
 * 不永久修改正式 YAML / tavern_sync.yaml；仅在 bundle 期间临时注入配置，finally 还原。
 * 产物写入 .local/mfrs-dev/（gitignore）。
 *
 * 用法：
 *   node scripts/prepare-mfrs-dev-card.mjs
 *   node scripts/prepare-mfrs-dev-card.mjs --port 5510
 *   node scripts/prepare-mfrs-dev-card.mjs --port 5510 --push
 */
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { spawnSync } from 'node:child_process';
import {
  DEV_CARD_DIR,
  ROOT,
  ensureLocalDir,
  getWorkspaceIdentity,
  printHumanSummary,
  shortBranchName,
} from './mfrs-dev-common.mjs';

const args = process.argv.slice(2);
function hasFlag(name) {
  return args.includes(name);
}
function readArg(name, fallback = undefined) {
  const idx = args.indexOf(name);
  if (idx === -1) return fallback;
  return args[idx + 1] ?? fallback;
}

const port = Number(readArg('--port', process.env.MFRS_DEV_STATIC_PORT || '5510')) || 5510;
const doPush = hasFlag('--push');
const localBase = `http://127.0.0.1:${port}/`;
const CDN_DIST =
  /https:\/\/(?:(?:testingcf|cdn)\.)?jsdelivr\.net\/gh\/linlangliehu\/tavern_helper_template@[0-9a-f]{7,40}\//g;

const SOURCE_CARD_DIR = join(ROOT, 'src/神秘复苏模拟器');
const SOURCE_YAML = join(SOURCE_CARD_DIR, 'index.yaml');
const SOURCE_PNG = join(SOURCE_CARD_DIR, '神秘复苏模拟器.png');
const TEMP_CARD_DIR = join(DEV_CARD_DIR, '_card_src');
const TEMP_YAML = join(TEMP_CARD_DIR, 'index.yaml');
const TEMP_EXPORT = join(DEV_CARD_DIR, '_export/神秘复苏模拟器-DEV');
const OFFICIAL_SYNC = join(ROOT, 'tavern_sync.yaml');

const EXPECTED_PROJECT_SCRIPTS = 7;
const EXPECTED_SCRIPT_LIB = 8;
const EXPECTED_REGEX = 33;

function die(msg) {
  console.error(`[prepare-mfrs-dev-card] ✖ ${msg}`);
  process.exit(1);
}

function log(msg) {
  console.log(`[prepare-mfrs-dev-card] ${msg}`);
}

function countRegexIds(yamlText) {
  const ext = yamlText.match(/扩展字段:[\s\S]*$/);
  if (!ext) return 0;
  const regexSection = ext[0].match(/正则:\n([\s\S]*?)(?=\n  酒馆助手:|\n\S|$)/);
  if (!regexSection) return 0;
  return (regexSection[1].match(/^\s+id:\s*[0-9a-fA-F-]{8,}/gm) || []).length;
}

function countScriptLib(yamlText) {
  const lib = yamlText.match(/脚本库:\n([\s\S]*?)$/);
  if (!lib) return 0;
  return (lib[1].match(/^\s+-\s+名称:\s+/gm) || []).length;
}

function extractProjectScriptUrls(yamlText) {
  const urls = [];
  const re = /load(?:Local)?Module\(\s*'[^']*'\s*,\s*'([^']+)'\s*\)/g;
  let m;
  while ((m = re.exec(yamlText)) !== null) {
    urls.push(m[1]);
  }
  return urls;
}

function validateDerived(yamlText) {
  const projectUrls = extractProjectScriptUrls(yamlText);
  // CDN 路径可能是 percent-encoded 中文；只校验 host/port/dist 前缀
  const localProject = projectUrls.filter(
    url => url.startsWith(`${localBase}dist/`) || url.startsWith(`${localBase}dist%2F`),
  );
  const cdnProject = projectUrls.filter(url => /jsdelivr\.net\/gh\/linlangliehu\//.test(url));
  const magvarOk = /MagicalAstrogy\/MagVarUpdate@0\.171\.0\/artifact\/bundle\.js/.test(yamlText);
  const scriptLibItems = countScriptLib(yamlText);
  const regexCount = countRegexIds(yamlText);

  const errors = [];
  if (localProject.length !== EXPECTED_PROJECT_SCRIPTS) {
    errors.push(
      `expected ${EXPECTED_PROJECT_SCRIPTS} local project script URLs, got ${localProject.length}; sample=${projectUrls[0] || 'none'}`,
    );
  }
  if (cdnProject.length !== 0) {
    errors.push(`project scripts still point to CDN: ${cdnProject.length}`);
  }
  if (!magvarOk) {
    errors.push('mvu MagVarUpdate CDN pin missing or changed');
  }
  if (scriptLibItems !== EXPECTED_SCRIPT_LIB) {
    errors.push(`expected ${EXPECTED_SCRIPT_LIB} script library items, got ${scriptLibItems}`);
  }
  if (regexCount !== EXPECTED_REGEX) {
    errors.push(`expected ${EXPECTED_REGEX} regex ids, got ${regexCount}`);
  }

  return {
    ok: errors.length === 0,
    errors,
    stats: {
      localProject: localProject.length,
      cdnProject: cdnProject.length,
      scriptLibItems,
      regexCount,
      magvarOk,
      sampleUrls: localProject.slice(0, 3),
    },
  };
}

function copyCardTree() {
  rmSync(TEMP_CARD_DIR, { recursive: true, force: true });
  mkdirSync(TEMP_CARD_DIR, { recursive: true });
  mkdirSync(dirname(TEMP_EXPORT), { recursive: true });

  if (process.platform === 'win32') {
    const r = spawnSync(
      'robocopy',
      [SOURCE_CARD_DIR, TEMP_CARD_DIR, '/E', '/NFL', '/NDL', '/NJH', '/NJS', '/NP', '/XF', '*.png'],
      { windowsHide: true, encoding: 'utf8' },
    );
    if ((r.status ?? 1) >= 8) {
      die(`robocopy failed (exit ${r.status}): ${r.stderr || r.stdout || ''}`);
    }
  } else {
    const r = spawnSync('cp', ['-R', `${SOURCE_CARD_DIR}/.`, TEMP_CARD_DIR], { encoding: 'utf8' });
    if (r.status !== 0) die(`cp failed: ${r.stderr || r.stdout || ''}`);
  }

  if (!existsSync(SOURCE_PNG)) die(`missing avatar ${SOURCE_PNG}`);
  copyFileSync(SOURCE_PNG, join(TEMP_CARD_DIR, '神秘复苏模拟器.png'));
}

function deriveYaml(identity, branchShort, version, cardName) {
  const original = readFileSync(SOURCE_YAML, 'utf8');
  let patched = original.replace(CDN_DIST, localBase);
  if (patched === original) {
    log('warn: no CDN dist URL replaced (already local or unexpected format)');
  }

  patched = patched.replace(/^版本:\s*.+$/m, `版本: '${version}'`);
  patched = patched.replace(
    /^备注:\s*.*$/m,
    `备注: '本地开发卡 · 不可发布 · worktree=${identity.workspace} · branch=${identity.branch} · commit=${identity.commit} · static=${localBase}'`,
  );
  patched = patched.replace(
    /角色描述:\s*\|-\s*\n/,
    `角色描述: |-\n  【本地开发卡 · 不可发布】\n  名称: ${cardName}\n  版本: ${version}\n  静态服务: ${localBase}\n  源码: ${identity.workspace}\n\n`,
  );

  return patched;
}

function withTempSyncConfig(branchShort, fn) {
  if (!existsSync(OFFICIAL_SYNC)) die(`missing ${OFFICIAL_SYNC}`);
  const official = readFileSync(OFFICIAL_SYNC, 'utf8');
  const backup = `${OFFICIAL_SYNC}.dev-card-bak`;
  const injected = `${official.trimEnd()}
  神秘复苏模拟器-DEV:
    类型: 角色卡
    酒馆中的名称: 神秘复苏模拟器 · DEV · ${branchShort}
    本地文件路径: ${TEMP_CARD_DIR.replace(/\\/g, '/')}/index
    导出文件路径: ${TEMP_EXPORT.replace(/\\/g, '/')}
`;
  writeFileSync(backup, official, 'utf8');
  writeFileSync(OFFICIAL_SYNC, injected, 'utf8');
  try {
    return fn();
  } finally {
    writeFileSync(OFFICIAL_SYNC, official, 'utf8');
    try {
      rmSync(backup, { force: true });
    } catch {
      // ignore
    }
  }
}

function runTavernSync(mode) {
  const cmdArgs =
    mode === 'push'
      ? ['tavern_sync.mjs', 'push', '神秘复苏模拟器-DEV']
      : ['tavern_sync.mjs', 'bundle', '神秘复苏模拟器-DEV'];
  const r = spawnSync(process.execPath, cmdArgs, {
    cwd: ROOT,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  if (r.stdout) process.stdout.write(r.stdout);
  if (r.stderr) process.stderr.write(r.stderr);
  if (r.status !== 0) die(`${mode} failed (exit ${r.status})`);
}

function findBundledPng() {
  const candidates = [
    `${TEMP_EXPORT}.png`,
    TEMP_EXPORT,
    join(DEV_CARD_DIR, '_export', '神秘复苏模拟器-DEV.png'),
  ];
  for (const p of candidates) {
    if (existsSync(p) && p.endsWith('.png')) return p;
    if (existsSync(`${p}.png`)) return `${p}.png`;
  }
  const exportDir = join(DEV_CARD_DIR, '_export');
  if (existsSync(exportDir)) {
    const pngs = readdirSync(exportDir).filter(f => f.endsWith('.png'));
    if (pngs[0]) return join(exportDir, pngs[0]);
  }
  const near = join(TEMP_CARD_DIR, '神秘复苏模拟器-DEV.png');
  if (existsSync(near)) return near;
  return null;
}

function main() {
  if (!existsSync(SOURCE_YAML)) die(`missing ${SOURCE_YAML}`);

  const identity = getWorkspaceIdentity(ROOT);
  const branchShort = shortBranchName(identity.branch);
  const version = `dev-${branchShort}-${identity.commit}`;
  const cardName = `神秘复苏模拟器 · DEV · ${branchShort}`;
  const outPng = join(DEV_CARD_DIR, `神秘复苏模拟器-DEV-${branchShort}.png`);
  const outYaml = join(DEV_CARD_DIR, `神秘复苏模拟器-DEV-${branchShort}.yaml`);

  ensureLocalDir();
  copyCardTree();

  const patched = deriveYaml(identity, branchShort, version, cardName);
  writeFileSync(TEMP_YAML, patched, 'utf8');
  writeFileSync(outYaml, patched, 'utf8');

  const validation = validateDerived(patched);
  if (!validation.ok) {
    die(`derived card validation failed:\n- ${validation.errors.join('\n- ')}`);
  }

  const formalNow = readFileSync(SOURCE_YAML, 'utf8');
  if (formalNow.includes(localBase)) {
    die('formal index.yaml unexpectedly contains localhost; abort');
  }

  withTempSyncConfig(branchShort, () => {
    runTavernSync(doPush ? 'push' : 'bundle');
  });

  if (readFileSync(SOURCE_YAML, 'utf8').includes(localBase)) {
    die('formal index.yaml polluted after bundle; manual restore required');
  }
  if (readFileSync(OFFICIAL_SYNC, 'utf8').includes('神秘复苏模拟器-DEV')) {
    die('tavern_sync.yaml still contains DEV config; manual restore required');
  }

  const found = findBundledPng();
  if (!found) {
    die(`bundle output missing under ${join(DEV_CARD_DIR, '_export')}`);
  }
  copyFileSync(found, outPng);

  printHumanSummary('dev card ready', [
    `name: ${cardName}`,
    `version: ${version}`,
    `png: ${outPng}`,
    `yaml: ${outYaml}`,
    `static: ${localBase}`,
    `scripts local: ${validation.stats.localProject}/${EXPECTED_PROJECT_SCRIPTS}`,
    `script lib: ${validation.stats.scriptLibItems}/${EXPECTED_SCRIPT_LIB}`,
    `regex ids: ${validation.stats.regexCount}/${EXPECTED_REGEX}`,
    doPush ? 'push: done (independent DEV card name)' : 'push: skipped (use --push or import PNG manually)',
  ]);
  log('Keep mfrs-dev-server serving this worktree root while testing.');
  log('Do not publish this card. Formal index.yaml and tavern_sync.yaml remain unchanged.');
}

try {
  main();
} catch (error) {
  die(error?.message || String(error));
}