#!/usr/bin/env node
/**
 * mfrs-dev-session.mjs —— 写入/清理实时开发会话锁。
 *
 * 用法：
 *   node scripts/mfrs-dev-session.mjs acquire --static-port 5510
 *   node scripts/mfrs-dev-session.mjs release
 *   node scripts/mfrs-dev-session.mjs status
 */
import {
  PORT_HMR,
  PORT_SYNC,
  ROOT,
  SESSION_LOCK_PATH,
  clearSessionLock,
  getWorkspaceIdentity,
  isProcessAlive,
  printHumanSummary,
  readSessionLock,
  sameWorkspace,
  writeSessionLock,
} from './mfrs-dev-common.mjs';

const [command, ...rest] = process.argv.slice(2);

function readArg(name, fallback = undefined) {
  const idx = rest.indexOf(name);
  if (idx === -1) return fallback;
  return rest[idx + 1] ?? fallback;
}

function die(msg, code = 1) {
  console.error(`[mfrs-dev-session] ✖ ${msg}`);
  process.exit(code);
}

function acquire() {
  const identity = getWorkspaceIdentity(ROOT);
  const existing = readSessionLock();
  if (existing) {
    const alive = isProcessAlive(existing.pid);
    if (!sameWorkspace(existing.workspace, identity.workspace) && alive) {
      die(
        `another worktree holds the lock: ${existing.workspace} @ ${existing.branch} (${existing.commit}) pid=${existing.pid}`,
        4,
      );
    }
    if (!alive) {
      clearSessionLock();
    }
  }

  const staticPort = Number(readArg('--static-port', process.env.MFRS_DEV_STATIC_PORT || '5510')) || 5510;
  const session = {
    workspace: identity.workspace,
    branch: identity.branch,
    commit: identity.commit,
    commitFull: identity.commitFull,
    pid: process.pid,
    ports: {
      static: staticPort,
      sync: PORT_SYNC,
      hmr: PORT_HMR,
    },
    startedAt: new Date().toISOString(),
  };
  writeSessionLock(session);
  console.log(JSON.stringify(session, null, 2));
  printHumanSummary('session lock acquired', [
    `path: ${SESSION_LOCK_PATH}`,
    `workspace: ${session.workspace}`,
    `branch: ${session.branch}`,
    `commit: ${session.commit}`,
    `static: ${session.ports.static}`,
  ]);
}

function release() {
  const identity = getWorkspaceIdentity(ROOT);
  const existing = readSessionLock();
  if (!existing) {
    printHumanSummary('session lock already absent', [`path: ${SESSION_LOCK_PATH}`]);
    return;
  }
  if (!sameWorkspace(existing.workspace, identity.workspace)) {
    die(
      `refusing to release foreign lock: ${existing.workspace} @ ${existing.branch} (${existing.commit})`,
      4,
    );
  }
  clearSessionLock({ onlyIfWorkspace: identity.workspace });
  printHumanSummary('session lock released', [
    `path: ${SESSION_LOCK_PATH}`,
    `workspace: ${identity.workspace}`,
  ]);
}

function status() {
  const identity = getWorkspaceIdentity(ROOT);
  const existing = readSessionLock();
  const payload = {
    identity,
    lockPath: SESSION_LOCK_PATH,
    lock: existing,
    lockAlive: existing ? isProcessAlive(existing.pid) : false,
    ownedByCurrent: existing ? sameWorkspace(existing.workspace, identity.workspace) : false,
  };
  console.log(JSON.stringify(payload, null, 2));
}

if (command === 'acquire') acquire();
else if (command === 'release') release();
else if (command === 'status') status();
else {
  console.error('Usage: node scripts/mfrs-dev-session.mjs <acquire|release|status> [--static-port N]');
  process.exit(1);
}
