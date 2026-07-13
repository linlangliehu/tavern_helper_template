#!/usr/bin/env node
/* eslint-disable import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { isAbsolute, relative, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { CDN_REF } from './mfrs-release-constants.mjs';

const ROOT = resolve(fileURLToPath(import.meta.url), '../..');
const DEFAULT_DIST_DIR = 'dist/神秘复苏模拟器';
const DEFAULT_REMOTE = 'origin';

const log = message => console.log(`[verify-mfrs-dist-freshness] ${message}`);

function fail(message) {
  throw new Error(message);
}

function parseArgs(argv) {
  const options = {
    ref: '',
    remote: DEFAULT_REMOTE,
    distDir: DEFAULT_DIST_DIR,
    selfTest: false,
    noBuild: false,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--ref') options.ref = argv[++index] || '';
    else if (arg === '--remote') options.remote = argv[++index] || '';
    else if (arg === '--dist-dir') options.distDir = argv[++index] || '';
    else if (arg === '--self-test') options.selfTest = true;
    else if (arg === '--no-build') options.noBuild = true;
    else fail(`未知参数: ${arg}`);
  }
  // P0（BF6）：未显式传 --ref 时默认对齐 publish-card 单真源 CDN_REF，
  // 使 `pnpm verify:mfrs-dist-freshness` 裸跑/CI 可只读校验，而非在参数阶段报错。
  if (!options.ref && !options.selfTest) options.ref = CDN_REF;
  return options;
}

function normalizeDistPath(distDir) {
  const absolute = resolve(ROOT, distDir);
  const pathspec = relative(ROOT, absolute).replaceAll('\\', '/');
  if (!pathspec || pathspec === '.' || isAbsolute(pathspec) || pathspec.startsWith('../')) {
    fail(`dist 路径必须位于仓库内: ${distDir}`);
  }
  return { absolute, pathspec };
}

function validateOptions(options) {
  if (!/^[0-9a-f]{7,40}$/i.test(options.ref)) fail('--ref 必须是 7–40 位十六进制 commit SHA');
  if (!/^[A-Za-z0-9._-]+$/.test(options.remote)) fail(`非法 remote 名称: ${options.remote}`);
  return normalizeDistPath(options.distDir);
}

function runGit(args, { allowStatus = [] } = {}) {
  const result = spawnSync('git', ['-c', 'core.quotePath=false', ...args], {
    cwd: ROOT,
    encoding: 'utf8',
    env: { ...process.env, GIT_TERMINAL_PROMPT: '0' },
    shell: false,
    timeout: 120_000,
  });
  if (result.error) fail(`git ${args.join(' ')} 执行失败: ${result.error.message}`);
  const accepted = result.status === 0 || allowStatus.includes(result.status);
  if (!accepted) {
    const detail = String(result.stderr || result.stdout || '').trim();
    fail(`git ${args.join(' ')} 退出码 ${result.status}${detail ? `: ${detail}` : ''}`);
  }
  return result;
}

function gitText(args) {
  return String(runGit(args).stdout || '').trim();
}

function ensureCleanDist(pathspec, stage) {
  const status = gitText(['status', '--porcelain=v1', '--untracked-files=all', '--', pathspec]);
  if (status) fail(`${stage} dist 工作树不干净，请先 production build 并提交:\n${status}`);
}

function ensurePinnedDistMatches(commit, pathspec) {
  const result = runGit(['diff', '--quiet', commit, '--', pathspec], { allowStatus: [1] });
  if (result.status === 1) {
    fail(`CDN_REF ${commit.slice(0, 12)} 中的 ${pathspec} 与当前已提交 dist 不一致；请先提交 dist，再把 CDN_REF 指向该提交`);
  }
}

function runProductionBuild() {
  log('运行 pnpm build（webpack production）验证当前源码产物...');
  const npmExecPath = process.env.npm_execpath;
  const command = npmExecPath && existsSync(npmExecPath)
    ? { file: process.execPath, args: [npmExecPath, 'build'] }
    : process.platform === 'win32'
      ? { file: 'cmd.exe', args: ['/d', '/s', '/c', 'pnpm build'] }
      : { file: 'pnpm', args: ['build'] };
  const result = spawnSync(command.file, command.args, {
    cwd: ROOT,
    env: process.env,
    stdio: 'inherit',
    shell: false,
  });
  if (result.error) fail(`pnpm build 启动失败: ${result.error.message}`);
  if (result.status !== 0) fail(`pnpm build 退出码 ${result.status}`);
}

function verify(options) {
  const { absolute, pathspec } = validateOptions(options);
  if (!existsSync(absolute)) fail(`dist 目录不存在: ${pathspec}`);
  if (!gitText(['ls-files', '--', pathspec])) fail(`dist 目录没有受 Git 跟踪的文件: ${pathspec}`);

  const commit = gitText(['rev-parse', '--verify', `${options.ref}^{commit}`]);
  log(`CDN_REF 本地 commit 存在: ${commit}`);

  log(`同步 ${options.remote} 远端引用...`);
  runGit(['fetch', '--quiet', '--prune', options.remote]);
  const containingRefs = gitText([
    'for-each-ref',
    '--format=%(refname:short)',
    '--contains',
    commit,
    `refs/remotes/${options.remote}/`,
  ])
    .split(/\r?\n/)
    .map(value => value.trim())
    .filter(value => value && value !== `${options.remote}/HEAD`);
  if (containingRefs.length === 0) {
    fail(`CDN_REF ${commit.slice(0, 12)} 尚未推送到 ${options.remote} 的任何分支`);
  }
  log(`CDN_REF 已在远端可达: ${containingRefs.join(', ')}`);

  ensureCleanDist(pathspec, '构建前');
  ensurePinnedDistMatches(commit, pathspec);
  if (options.noBuild) {
    log(`只读模式（--no-build）：跳过 production build；已校验 ${pathspec} == CDN_REF 提交 dist`);
    return;
  }
  runProductionBuild();
  ensureCleanDist(pathspec, 'production build 后');
  ensurePinnedDistMatches(commit, pathspec);
  log(`通过：${pathspec} 与 CDN_REF 及当前 production 源构建产物一致`);
}

function runSelfTest() {
  assert.deepEqual(parseArgs(['--ref', 'abcdef1']), {
    ref: 'abcdef1',
    remote: DEFAULT_REMOTE,
    distDir: DEFAULT_DIST_DIR,
    selfTest: false,
    noBuild: false,
  });
  // P0：裸跑（无 --ref）默认回退 CDN_REF；--no-build 只读开关
  assert.equal(parseArgs([]).ref, CDN_REF);
  assert.equal(parseArgs(['--no-build']).noBuild, true);
  assert.equal(normalizeDistPath(DEFAULT_DIST_DIR).pathspec, DEFAULT_DIST_DIR);
  assert.throws(() => normalizeDistPath('../outside'), /仓库内/);
  assert.throws(() => validateOptions({ ref: 'main', remote: 'origin', distDir: DEFAULT_DIST_DIR }), /commit SHA/);
  assert.throws(() => validateOptions({ ref: 'abcdef1', remote: '../origin', distDir: DEFAULT_DIST_DIR }), /remote/);
  assert.throws(() => parseArgs(['--unknown']), /未知参数/);
  log('self-test passed（参数、SHA/remote/path 边界）');
}

try {
  const options = parseArgs(process.argv.slice(2));
  if (options.selfTest) runSelfTest();
  else verify(options);
} catch (error) {
  console.error(`[verify-mfrs-dist-freshness] failed: ${error?.message || String(error)}`);
  process.exitCode = 1;
}
