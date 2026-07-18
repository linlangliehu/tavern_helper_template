#!/usr/bin/env node
/**
 * mfrs-dev-common.mjs —— 本地实时开发流程共享工具。
 * 供 preflight / dev-server / prepare-dev-card / session lock / identity 校验复用。
 */
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import net from 'node:net';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = resolve(fileURLToPath(import.meta.url), '../..');
export const LOCAL_DIR = join(ROOT, '.local');
export const SESSION_LOCK_PATH = join(LOCAL_DIR, 'mfrs-dev-session.json');
export const DEV_CARD_DIR = join(LOCAL_DIR, 'mfrs-dev');
export const DEFAULT_STATIC_PORTS = [5510, 5511, 5512, 5513, 5514];
export const PORT_SYNC = 6620;
export const PORT_HMR = 6621;
export const PORT_TAVERN = 8000;
export const PORT_CDP = 9222;
export const DIST_PANEL_JS = join(ROOT, 'dist/神秘复苏模拟器/脚本/消息内面板/index.js');
export const DIST_DB_FRONTEND_JS = join(ROOT, 'dist/神秘复苏模拟器/脚本/数据库前端/index.js');

export function ensureLocalDir() {
  mkdirSync(LOCAL_DIR, { recursive: true });
  mkdirSync(DEV_CARD_DIR, { recursive: true });
}

export function runGit(args, { cwd = ROOT, allowFail = false } = {}) {
  const result = spawnSync('git', args, {
    cwd,
    encoding: 'utf8',
    windowsHide: true,
  });
  if (result.status !== 0) {
    if (allowFail) return '';
    const detail = (result.stderr || result.stdout || '').trim();
    throw new Error(`git ${args.join(' ')} failed: ${detail || `exit ${result.status}`}`);
  }
  return (result.stdout || '').trim();
}

export function getWorkspaceIdentity(cwd = ROOT) {
  const workspace = runGit(['rev-parse', '--show-toplevel'], { cwd });
  const branch = runGit(['rev-parse', '--abbrev-ref', 'HEAD'], { cwd });
  const commit = runGit(['rev-parse', '--short', 'HEAD'], { cwd });
  const commitFull = runGit(['rev-parse', 'HEAD'], { cwd });
  return {
    workspace: workspace.replace(/\\/g, '/'),
    branch,
    commit,
    commitFull,
    pid: process.pid,
  };
}

export function shortBranchName(branch) {
  return String(branch || 'unknown')
    .replace(/^worktree-/, '')
    .replace(/[^A-Za-z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48) || 'unknown';
}

export function isProcessAlive(pid) {
  if (!pid || !Number.isFinite(Number(pid))) return false;
  try {
    process.kill(Number(pid), 0);
    return true;
  } catch {
    return false;
  }
}

export function readSessionLock() {
  if (!existsSync(SESSION_LOCK_PATH)) return null;
  try {
    return JSON.parse(readFileSync(SESSION_LOCK_PATH, 'utf8'));
  } catch {
    return null;
  }
}

export function writeSessionLock(session) {
  ensureLocalDir();
  writeFileSync(SESSION_LOCK_PATH, `${JSON.stringify(session, null, 2)}\n`, 'utf8');
}

export function clearSessionLock({ onlyIfWorkspace } = {}) {
  const current = readSessionLock();
  if (!current) return false;
  if (onlyIfWorkspace) {
    const a = String(current.workspace || '').replace(/\\/g, '/').toLowerCase();
    const b = String(onlyIfWorkspace || '').replace(/\\/g, '/').toLowerCase();
    if (a !== b) return false;
  }
  rmSync(SESSION_LOCK_PATH, { force: true });
  return true;
}

export function isPortFree(port, host = '127.0.0.1') {
  return new Promise(resolvePort => {
    const server = net.createServer();
    server.unref();
    server.once('error', () => resolvePort(false));
    server.once('listening', () => {
      server.close(() => resolvePort(true));
    });
    server.listen(port, host);
  });
}

export async function findFreePort(candidates = DEFAULT_STATIC_PORTS) {
  for (const port of candidates) {
    if (await isPortFree(port)) return port;
  }
  return null;
}

export async function probeIdentity(port) {
  try {
    const res = await fetch(`http://127.0.0.1:${port}/__mfrs_dev_identity`, {
      signal: AbortSignal.timeout(800),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function describePort(port) {
  const free = await isPortFree(port);
  if (free) {
    return { port, free: true, identity: null };
  }
  const identity = await probeIdentity(port);
  return { port, free: false, identity };
}

export function pathExistsNonEmpty(dir) {
  if (!existsSync(dir)) return false;
  try {
    return readdirSync(dir).length > 0;
  } catch {
    return false;
  }
}

export function sameWorkspace(a, b) {
  return String(a || '').replace(/\\/g, '/').toLowerCase() === String(b || '').replace(/\\/g, '/').toLowerCase();
}

export function printHumanSummary(title, lines) {
  console.log(`[mfrs-dev] ${title}`);
  for (const line of lines) {
    console.log(`[mfrs-dev]   ${line}`);
  }
}
