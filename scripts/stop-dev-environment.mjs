#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const TOGGLE_SCRIPT = join(ROOT, 'scripts', 'toggle-dev-mode.mjs');

function stopWindowsProcesses() {
  const escapedRoot = ROOT.replaceAll("'", "''");
  const script = `
$root = '${escapedRoot}'
$currentPid = ${process.pid}
$targetIds = [System.Collections.Generic.HashSet[int]]::new()

# 停止当前仓库的 webpack watch
$watchTargets = Get-CimInstance Win32_Process -Filter "Name='node.exe'" -ErrorAction SilentlyContinue |
  Where-Object {
    $_.ProcessId -ne $currentPid -and
    $_.CommandLine -like "*$root*" -and
    $_.CommandLine -like '*webpack*--watch*'
  }
foreach ($target in $watchTargets) {
  [void]$targetIds.Add([int]$target.ProcessId)
}

# 停止 5510 上的项目静态服务：必须是 node 进程，且其 cwd 属于当前仓库
$staticServer = Get-NetTCPConnection -LocalAddress 127.0.0.1 -LocalPort 5510 -State Listen -ErrorAction SilentlyContinue |
  Select-Object -First 1
if ($staticServer -and $staticServer.OwningProcess -ne $currentPid) {
  $sp = Get-CimInstance Win32_Process -Filter "ProcessId=$($staticServer.OwningProcess)" -ErrorAction SilentlyContinue
  if ($sp -and $sp.CommandLine -like '*mfrs-dev-server-simple.mjs*') {
    try {
      $cwd = (Get-Process -Id $sp.ProcessId -ErrorAction Stop).Path | Split-Path
    } catch {
      $cwd = $null
    }
    if ($cwd -and ($cwd -like "*$root*" -or $cwd -eq $root)) {
      [void]$targetIds.Add([int]$staticServer.OwningProcess)
    }
  }
}

foreach ($targetId in $targetIds) {
  Stop-Process -Id $targetId -Force -ErrorAction SilentlyContinue
  Write-Output ("stopped:" + $targetId)
}
exit 0
`;

  const result = spawnSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', script], {
    cwd: ROOT,
    encoding: 'utf8',
  });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(result.stderr || `PowerShell 退出码 ${result.status}`);

  return String(result.stdout || '')
    .split(/\r?\n/u)
    .filter(line => line.startsWith('stopped:')).length;
}

function restoreProductionMode() {
  const result = spawnSync(process.execPath, [TOGGLE_SCRIPT, '--disable'], {
    cwd: ROOT,
    stdio: 'inherit',
  });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`切换回生产模式失败（退出码 ${result.status}）`);
}

try {
  if (process.platform !== 'win32') {
    throw new Error('当前结束脚本仅支持本项目使用的 Windows 开发环境');
  }

  const stopped = stopWindowsProcesses();
  restoreProductionMode();
  console.log(`\n开发环境已结束：停止 ${stopped} 个 watch/静态服务进程，YAML 已恢复生产模式。`);
} catch (error) {
  console.error(`\n结束开发环境失败：${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
}
