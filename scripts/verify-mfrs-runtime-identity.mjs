#!/usr/bin/env node
/**
 * verify-mfrs-runtime-identity.mjs —— 通过 CDP 校验真页 bundle 身份。
 *
 * 用法：
 *   node scripts/verify-mfrs-runtime-identity.mjs
 *   node scripts/verify-mfrs-runtime-identity.mjs --expect-mode development
 *   node scripts/verify-mfrs-runtime-identity.mjs --expect-commit 1221807
 */
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { getWorkspaceIdentity, printHumanSummary, ROOT } from './mfrs-dev-common.mjs';

const args = process.argv.slice(2);
function readArg(name, fallback = undefined) {
  const idx = args.indexOf(name);
  if (idx === -1) return fallback;
  return args[idx + 1] ?? fallback;
}

const identity = getWorkspaceIdentity(ROOT);
const expectMode = readArg('--expect-mode', 'development');
const expectCommit = readArg('--expect-commit', identity.commit);
const expectBranch = readArg('--expect-branch', identity.branch);
const requiredEntries = (
  readArg(
    '--entries',
    'hotfix-generation-ended-listeners,变量结构,界面美化,固定状态栏,数据库,数据库前端,消息内面板',
  ) || ''
)
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

const expression = `(() => {
  const host = (() => { try { return window.parent ?? window; } catch { return window; } })();
  return {
    builds: host.__mfrsRuntimeBuilds__ || null,
    resourceUrls: host.__mfrsScriptResourceUrls__ || null,
    href: location.href,
  };
})()`;

function die(msg, extra) {
  console.error(`[verify-mfrs-runtime-identity] ✖ ${msg}`);
  if (extra) console.error(JSON.stringify(extra, null, 2));
  process.exit(1);
}

function cdpEvaluate(expr) {
  const script = join(ROOT, 'scripts/cdp-evaluate.mjs');
  const r = spawnSync(process.execPath, [script, '--target-url', '8000', expr], {
    cwd: ROOT,
    encoding: 'utf8',
  });
  if (r.status !== 0) {
    die(`cdp-evaluate failed (exit ${r.status})`, {
      stdout: r.stdout,
      stderr: r.stderr,
    });
  }
  try {
    return JSON.parse(r.stdout || 'null');
  } catch (error) {
    die(`failed to parse cdp output: ${error?.message || error}`, { stdout: r.stdout });
  }
}

const payload = cdpEvaluate(expression);
if (!payload || !payload.builds || typeof payload.builds !== 'object') {
  die('window.__mfrsRuntimeBuilds__ missing; page is not loading identity-marked bundles', payload);
}

const builds = payload.builds;
const present = Object.keys(builds);
const missing = requiredEntries.filter(name => !present.includes(name));
const errors = [];

if (missing.length) {
  errors.push(`missing entries: ${missing.join(', ')}`);
}

const commits = new Set();
const modes = new Set();
for (const name of present) {
  const item = builds[name] || {};
  commits.add(String(item.commit || ''));
  modes.add(String(item.mode || ''));
  if (expectMode && item.mode !== expectMode) {
    errors.push(`${name}: mode=${item.mode} expected ${expectMode}`);
  }
  if (expectCommit && item.commit !== expectCommit) {
    errors.push(`${name}: commit=${item.commit} expected ${expectCommit}`);
  }
  if (expectMode === 'development' && expectBranch && item.branch && item.branch !== expectBranch) {
    errors.push(`${name}: branch=${item.branch} expected ${expectBranch}`);
  }
}

if (commits.size > 1) {
  errors.push(`entry commits are not identical: ${[...commits].join(', ')}`);
}
if (modes.size > 1) {
  errors.push(`entry modes are not identical: ${[...modes].join(', ')}`);
}

const result = {
  ok: errors.length === 0,
  expect: { mode: expectMode, commit: expectCommit, branch: expectBranch },
  present,
  missing,
  commits: [...commits],
  modes: [...modes],
  builds,
  resourceUrls: payload.resourceUrls,
  href: payload.href,
  errors,
};

console.log(JSON.stringify(result, null, 2));

if (!result.ok) {
  printHumanSummary('runtime identity FAILED', errors);
  process.exit(1);
}

printHumanSummary('runtime identity OK', [
  `entries: ${present.length}`,
  `mode: ${[...modes].join(',')}`,
  `commit: ${[...commits].join(',')}`,
  `href: ${payload.href}`,
]);
