#!/usr/bin/env node
/**
 * mfrs-dev-preflight.mjs —— 实时开发启动前只读预检。
 *
 * 退出码：
 *   0 全部通过
 *   1 当前 workspace 不是有效 git worktree / 身份异常
 *   2 端口冲突且占用者不属于当前 worktree
 *   3 依赖缺失（node_modules 为空）
 *   4 其他 worktree 持有会话锁
 */
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import {
  DEFAULT_STATIC_PORTS,
  DIST_PANEL_JS,
  PORT_HMR,
  PORT_SYNC,
  ROOT,
  SESSION_LOCK_PATH,
  clearSessionLock,
  describePort,
  getWorkspaceIdentity,
  isProcessAlive,
  pathExistsNonEmpty,
  printHumanSummary,
  readSessionLock,
  sameWorkspace,
} from './mfrs-dev-common.mjs';

const EXIT = {
  OK: 0,
  WORKSPACE: 1,
  PORT: 2,
  DEPS: 3,
  LOCK: 4,
};

function fail(code, summary, details = {}) {
  const payload = {
    ok: false,
    exitCode: code,
    summary,
    ...details,
  };
  console.log(JSON.stringify(payload, null, 2));
  printHumanSummary('preflight FAILED', [summary, `exitCode=${code}`]);
  process.exit(code);
}

async function main() {
  let identity;
  try {
    identity = getWorkspaceIdentity(ROOT);
  } catch (error) {
    fail(EXIT.WORKSPACE, `not a git worktree: ${error?.message || error}`);
  }

  if (!sameWorkspace(identity.workspace, ROOT.replace(/\\/g, '/'))) {
    fail(EXIT.WORKSPACE, 'git toplevel does not match script ROOT', { identity, root: ROOT });
  }

  const nodeModules = join(ROOT, 'node_modules');
  if (!pathExistsNonEmpty(nodeModules)) {
    fail(EXIT.DEPS, 'node_modules missing or empty; run pnpm install in this worktree', {
      identity,
      nodeModules,
    });
  }

  const lock = readSessionLock();
  if (lock) {
    const lockAlive = isProcessAlive(lock.pid);
    if (!sameWorkspace(lock.workspace, identity.workspace)) {
      if (lockAlive) {
        fail(EXIT.LOCK, 'another worktree holds the mfrs-dev session lock', {
          identity,
          lock,
          lockPath: SESSION_LOCK_PATH,
          hint: 'Stop the other worktree dev session first. Preflight will not kill processes.',
        });
      }
      // stale foreign lock
      clearSessionLock();
    } else if (!lockAlive) {
      clearSessionLock({ onlyIfWorkspace: identity.workspace });
    }
  }

  const portsToCheck = [PORT_SYNC, PORT_HMR, ...DEFAULT_STATIC_PORTS];
  const portReports = [];
  for (const port of portsToCheck) {
    portReports.push(await describePort(port));
  }

  const conflicts = [];
  for (const report of portReports) {
    if (report.free) continue;
    if (report.identity && sameWorkspace(report.identity.workspace, identity.workspace)) {
      continue;
    }
    // 6620/6621 may be occupied by current or foreign watch; only hard-fail when identity proves foreign.
    if (report.identity && !sameWorkspace(report.identity.workspace, identity.workspace)) {
      conflicts.push(report);
    } else if ([...DEFAULT_STATIC_PORTS].includes(report.port) && report.identity == null) {
      // unknown static occupant: warn but allow auto port bump by server
      continue;
    } else if ((report.port === PORT_SYNC || report.port === PORT_HMR) && report.identity == null) {
      // unknown watch/sync occupant: report as conflict so user decides
      conflicts.push(report);
    }
  }

  if (conflicts.length > 0) {
    fail(EXIT.PORT, 'port conflict detected; occupant does not belong to current worktree', {
      identity,
      conflicts,
      hint: 'Do not auto-kill. Stop the conflicting watch/static server manually, then retry.',
    });
  }

  const distExists = existsSync(DIST_PANEL_JS);
  const refreshedLock = readSessionLock();
  const payload = {
    ok: true,
    exitCode: EXIT.OK,
    identity,
    deps: { nodeModules: true },
    ports: portReports,
    sessionLock: refreshedLock,
    dist: {
      messagePanel: distExists,
      note: distExists
        ? 'dist present (may still be stale until watch compiles this worktree)'
        : 'dist missing; allowed on first start, watch will create it',
    },
    invariants: [
      'source worktree == watch cwd == dist owner == static server root == Network loader origin',
    ],
  };

  console.log(JSON.stringify(payload, null, 2));
  printHumanSummary('preflight OK', [
    `workspace: ${identity.workspace}`,
    `branch: ${identity.branch}`,
    `commit: ${identity.commit}`,
    `node_modules: present`,
    `dist message panel: ${distExists ? 'present' : 'missing (first start ok)'}`,
    `session lock: ${refreshedLock ? 'current worktree' : 'none'}`,
    `ports free/owned-by-self: ${portReports.filter(p => p.free || (p.identity && sameWorkspace(p.identity.workspace, identity.workspace))).length}/${portReports.length}`,
  ]);
}

main().catch(error => {
  fail(EXIT.WORKSPACE, error?.message || String(error));
});
