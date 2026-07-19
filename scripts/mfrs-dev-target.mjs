#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { basename, isAbsolute, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const launcherRoot = resolve(fileURLToPath(import.meta.url), '../..');
const targetFile = join(launcherRoot, '.local/mfrs-dev-target.json');
const args = process.argv.slice(2);
const printTarget = args[0] === '--print-target';
const scriptArg = printTarget ? null : args.shift();

function fail(message, code = 1) {
  console.error(`[mfrs-dev-target] ${message}`);
  process.exit(code);
}

function readConfiguredTarget() {
  if (process.env.MFRS_DEV_TARGET) return process.env.MFRS_DEV_TARGET;
  if (!existsSync(targetFile)) return launcherRoot;
  try {
    const configured = JSON.parse(readFileSync(targetFile, 'utf8'))?.workspace;
    return configured || launcherRoot;
  } catch (error) {
    fail(`invalid target file ${targetFile}: ${error.message}`, 2);
  }
}

const configuredTarget = readConfiguredTarget();
const targetRoot = resolve(isAbsolute(configuredTarget) ? configuredTarget : join(launcherRoot, configuredTarget));
const gitFile = join(targetRoot, '.git');

if (!existsSync(gitFile)) fail(`target is not a Git worktree: ${targetRoot}`, 2);

if (printTarget) {
  console.log(targetRoot.replace(/\\/g, '/'));
  process.exit(0);
}

if (!scriptArg) fail('usage: node scripts/mfrs-dev-target.mjs <script> [...args]');
const targetScript = resolve(targetRoot, scriptArg);
if (!existsSync(targetScript)) fail(`target script does not exist: ${targetScript}`, 2);

console.log(`[mfrs-dev-target] launcher: ${launcherRoot.replace(/\\/g, '/')}`);
console.log(`[mfrs-dev-target] target:   ${targetRoot.replace(/\\/g, '/')}`);
console.log(`[mfrs-dev-target] command:  node ${targetScript.replace(/\\/g, '/')} ${args.join(' ')}`.trimEnd());

const child = spawn(process.execPath, [targetScript, ...args], {
  cwd: targetRoot,
  env: { ...process.env, MFRS_DEV_TARGET_ROOT: targetRoot },
  stdio: 'inherit',
  windowsHide: false,
});
const registerProcess = basename(targetScript) !== 'mfrs-dev-stop.mjs';
const processFile = registerProcess ? join(targetRoot, '.local/mfrs-dev-processes', `${child.pid}.json`) : null;
if (processFile) {
  mkdirSync(join(targetRoot, '.local/mfrs-dev-processes'), { recursive: true });
  writeFileSync(
    processFile,
    `${JSON.stringify(
      {
        pid: child.pid,
        parentPid: process.pid,
        launcherRoot: launcherRoot.replace(/\\/g, '/'),
        workspace: targetRoot.replace(/\\/g, '/'),
        script: basename(targetScript),
        args,
        startedAt: new Date().toISOString(),
      },
      null,
      2,
    )}\n`,
    'utf8',
  );
}

const forward = signal => {
  if (!child.killed) child.kill(signal);
};
process.once('SIGINT', () => forward('SIGINT'));
process.once('SIGTERM', () => forward('SIGTERM'));
child.once('error', error => fail(`failed to start target command: ${error.message}`));
child.once('exit', (code, signal) => {
  if (processFile) rmSync(processFile, { force: true });
  process.exitCode = code ?? (signal ? 1 : 0);
});