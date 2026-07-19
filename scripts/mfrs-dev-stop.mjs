#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ROOT, clearSessionLock, isProcessAlive, sameWorkspace } from './mfrs-dev-common.mjs';

const root = resolve(fileURLToPath(import.meta.url), '../..');
const processDir = join(root, '.local/mfrs-dev-processes');
const normalizedRoot = root.replace(/\\/g, '/');

function stopProcessTree(pid) {
  if (process.platform === 'win32') {
    return spawnSync('taskkill', ['/PID', String(pid), '/T', '/F'], {
      encoding: 'utf8',
      windowsHide: true,
    });
  }
  try {
    process.kill(pid, 'SIGTERM');
    return { status: 0, stdout: '', stderr: '' };
  } catch (error) {
    return { status: 1, stdout: '', stderr: error.message };
  }
}

const stopped = [];
const stale = [];
const refused = [];
if (existsSync(processDir)) {
  for (const name of readdirSync(processDir).filter(name => name.endsWith('.json'))) {
    const path = join(processDir, name);
    let entry;
    try {
      entry = JSON.parse(readFileSync(path, 'utf8'));
    } catch {
      stale.push(name);
      rmSync(path, { force: true });
      continue;
    }
    const pid = Number(entry.pid);
    if (!sameWorkspace(entry.workspace, normalizedRoot) || !Number.isInteger(pid) || pid <= 0 || pid === process.pid) {
      refused.push(name);
      continue;
    }
    if (!isProcessAlive(pid)) {
      stale.push(pid);
      rmSync(path, { force: true });
      continue;
    }
    const result = stopProcessTree(pid);
    if (result.status === 0) {
      stopped.push({ pid, script: entry.script });
      rmSync(path, { force: true });
    } else {
      refused.push(`${pid}: ${(result.stderr || result.stdout || '').trim()}`);
    }
  }
}

clearSessionLock({ onlyIfWorkspace: ROOT });
console.log(JSON.stringify({ workspace: normalizedRoot, stopped, stale, refused }, null, 2));
if (refused.length > 0) process.exitCode = 1;