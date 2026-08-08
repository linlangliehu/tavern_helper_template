# 强制清理开发环境残留
# 用途：当 Shift+F5 / 结束开发环境任务未能干净关闭（9225 调试 Chrome 残留、端口被占用）时，一键清理。
# 用法：
#   pwsh scripts/force-stop-dev.ps1
#   # 或在 VS Code 终端运行
#   powershell -ExecutionPolicy Bypass -File scripts/force-stop-dev.ps1
#
# 清理顺序：
#   1. 调用项目官方 stop-dev-environment.mjs（停 watch/5510 + 还原 YAML 到生产模式）
#   2. 强制结束占用 9225 的残留调试 Chrome（对 5510/6620/6621 做同样兜底）
#   3. 等待端口释放
#   4. 最终确认所有端口已空闲，提示可以按 F5 重新启动
#
# 注意：
#   - 本脚本只结束占用指定端口且命令行含 remote-debugging-port=9225 的 Chrome 进程，
#     不会误杀你的日常 Chrome（它们不监听 9225）。
#   - 如果 YAML 仍处于开发模式，脚本会尝试用 toggle-dev-mode.mjs --disable 还原。
#   - 脚本不会提交、推送或丢弃任何 Git 改动。

[CmdletBinding()]
param(
    [switch]$SkipDevEnvStop  # 跳过 stop-dev-environment.mjs（仅清端口）
)

$ErrorActionPreference = 'Stop'
$ROOT = Split-Path -Parent $PSScriptRoot
Set-Location $ROOT

$ports = 5510, 6620, 6621, 9225

function Get-PortOwner {
    param([int]$Port)
    $conn = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue |
        Select-Object -First 1
    if (-not $conn) { return $null }
    return $conn.OwningProcess
}

function Stop-ProcessOnPort {
    param([int]$Port, [switch]$ChromeOnly)
    $pid_ = Get-PortOwner -Port $Port
    if (-not $pid_) { return $false }

    $shouldKill = $true
    if ($ChromeOnly) {
        # 仅当是 chrome.exe 且命令行含 9225 时才结束（保护日常 Chrome）
        $proc = Get-CimInstance Win32_Process -Filter "ProcessId=$pid_" -ErrorAction SilentlyContinue
        $shouldKill = ($proc.Name -eq 'chrome.exe') -and
                      ($proc.CommandLine -like '*remote-debugging-port=9225*')
    }

    if ($shouldKill) {
        Write-Host ("  端口 {0} 被 PID {1} 占用，强制结束..." -f $Port, $pid_) -ForegroundColor Yellow
        Stop-Process -Id $pid_ -Force -ErrorAction SilentlyContinue
        return $true
    }
    return $false
}

# ---------------------------------------------------------------------------
# 1. 调用项目官方 stop-dev-environment.mjs（停 watch/5510 + 还原 YAML）
# ---------------------------------------------------------------------------
if (-not $SkipDevEnvStop) {
    if (Test-Path (Join-Path $ROOT 'scripts/stop-dev-environment.mjs')) {
        Write-Host "[1/4] 运行 stop-dev-environment.mjs（停 watch/5510 + 还原 YAML）..." -ForegroundColor Cyan
        & node scripts/stop-dev-environment.mjs
        if ($LASTEXITCODE -ne 0) {
            Write-Host "  stop-dev-environment.mjs 退出码非零（$LASTEXITCODE），继续清理端口..." -ForegroundColor Yellow
        }
    } else {
        Write-Host "[1/4] 未找到 stop-dev-environment.mjs，跳过。" -ForegroundColor DarkGray
    }
} else {
    Write-Host "[1/4] 跳过 stop-dev-environment.mjs（-SkipDevEnvStop）" -ForegroundColor DarkGray
}

# ---------------------------------------------------------------------------
# 2. 确认 YAML 已恢复生产模式，否则尝试还原
# ---------------------------------------------------------------------------
Write-Host "[2/4] 检查 YAML 模式..." -ForegroundColor Cyan
$status = & node scripts/toggle-dev-mode.mjs --status 2>$null
if ($LASTEXITCODE -eq 0 -and $status -match '开发模式') {
    Write-Host "  YAML 仍处于开发模式，尝试还原..." -ForegroundColor Yellow
    & node scripts/toggle-dev-mode.mjs --disable
} else {
    Write-Host "  YAML 已是生产模式（或无法检测），无需还原。" -ForegroundColor DarkGray
}

# ---------------------------------------------------------------------------
# 3. 强制清理残留端口（9225 只杀调试 Chrome，其他端口全清）
# ---------------------------------------------------------------------------
Write-Host "[3/4] 清理残留端口..." -ForegroundColor Cyan

# 9225：只杀独立 profile 的调试 Chrome（保护日常 Chrome）
$killed9225 = Stop-ProcessOnPort -Port 9225 -ChromeOnly

# 5510 / 6620 / 6621：全清（这些端口正常情况下只被本项目占用）
foreach ($p in 5510, 6620, 6621) {
    [void](Stop-ProcessOnPort -Port $p)
}

# ---------------------------------------------------------------------------
# 4. 等待端口释放并最终确认
# ---------------------------------------------------------------------------
Write-Host "[4/4] 等待端口释放..." -ForegroundColor Cyan
Start-Sleep -Seconds 2

$remaining = @()
foreach ($p in $ports) {
    $owner = Get-PortOwner -Port $p
    if ($owner) {
        $remaining += [PSCustomObject]@{ Port = $p; OwningProcess = $owner }
    }
}

if ($remaining.Count -gt 0) {
    Write-Host ""
    Write-Host "⚠️ 仍有端口被占用，需要手动检查：" -ForegroundColor Red
    $remaining | Format-Table -AutoSize
    Write-Host "手动结束示例：" -ForegroundColor Yellow
    foreach ($r in $remaining) {
        Write-Host ("  Stop-Process -Id {0} -Force" -f $r.OwningProcess)
    }
} else {
    Write-Host ""
    Write-Host "✅ 所有端口已释放，可以按 F5 重新启动开发环境" -ForegroundColor Green
}
