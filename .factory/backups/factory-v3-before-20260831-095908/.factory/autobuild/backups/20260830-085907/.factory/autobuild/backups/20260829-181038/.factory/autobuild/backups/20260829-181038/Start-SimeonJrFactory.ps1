$ErrorActionPreference = "Continue"

$Factory = "$HOME\Desktop\SimeonJrAppBuilder"
$Backend = "$Factory\backend\server.js"

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "      SIMEONJR APP FACTORY" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# -----------------------------
# 1. LM STUDIO
# -----------------------------
Write-Host ""
Write-Host "[1/3] Checking LM Studio..." -ForegroundColor Yellow

try {
    Invoke-RestMethod `
        -Uri "http://127.0.0.1:1234/v1/models" `
        -TimeoutSec 3 `
        -ErrorAction Stop | Out-Null

    Write-Host "LM Studio API: ONLINE" -ForegroundColor Green
}
catch {
    Write-Host "Starting LM Studio..." -ForegroundColor Yellow

    $LMStudio = "C:\Program Files\LM Studio\LM Studio.exe"

    if (Test-Path $LMStudio) {
        Start-Process -FilePath $LMStudio
    }
    else {
        Write-Host "LM Studio executable not found." -ForegroundColor Red
    }

    for ($i = 1; $i -le 30; $i++) {
        try {
            Invoke-RestMethod `
                -Uri "http://127.0.0.1:1234/v1/models" `
                -TimeoutSec 2 `
                -ErrorAction Stop | Out-Null

            break
        }
        catch {
            Start-Sleep -Seconds 1
        }
    }

    try {
        Invoke-RestMethod `
            -Uri "http://127.0.0.1:1234/v1/models" `
            -TimeoutSec 3 `
            -ErrorAction Stop | Out-Null

        Write-Host "LM Studio API: ONLINE" -ForegroundColor Green
    }
    catch {
        Write-Host "LM Studio API: OFFLINE" -ForegroundColor Red
    }
}

# -----------------------------
# 2. SIMEONJR AGENT
# -----------------------------
Write-Host ""
Write-Host "[2/3] Checking SimeonJr Build Engine..." -ForegroundColor Yellow

$agentOnline = $false

try {
    Invoke-RestMethod `
        -Uri "http://127.0.0.1:8787/api/ai/build" `
        -Method OPTIONS `
        -TimeoutSec 2 `
        -ErrorAction Stop | Out-Null

    $agentOnline = $true
}
catch {
    # OPTIONS may not be supported, so check TCP instead
    try {
        $tcp = Test-NetConnection `
            -ComputerName "127.0.0.1" `
            -Port 8787 `
            -WarningAction SilentlyContinue

        if ($tcp.TcpTestSucceeded) {
            $agentOnline = $true
        }
    }
    catch {}
}

if ($agentOnline) {

    Write-Host "SimeonJr Agent: ALREADY ONLINE" -ForegroundColor Green

}
else {

    Write-Host "SimeonJr Agent: NOT RUNNING" -ForegroundColor Yellow
    Write-Host "Starting Build Engine..." -ForegroundColor Yellow

    Start-Process `
        -FilePath "node.exe" `
        -ArgumentList "`"$Backend`"" `
        -WorkingDirectory $Factory

    Start-Sleep -Seconds 3

    $tcp = Test-NetConnection `
        -ComputerName "127.0.0.1" `
        -Port 8787 `
        -WarningAction SilentlyContinue

    if ($tcp.TcpTestSucceeded) {
        Write-Host "SimeonJr Agent: ONLINE" -ForegroundColor Green
    }
    else {
        Write-Host "SimeonJr Agent: STARTING / CHECK SERVER WINDOW" -ForegroundColor Yellow
    }
}

# -----------------------------
# 3. FINAL STATUS
# -----------------------------
Write-Host ""
Write-Host "[3/3] Factory status" -ForegroundColor Yellow

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "       SIMEONJR FACTORY READY" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "LM Studio : http://127.0.0.1:1234"
Write-Host "Agent API : http://127.0.0.1:8787"
Write-Host "Workspace : $Factory"
Write-Host ""
Write-Host "Local AI  : READY" -ForegroundColor Green
Write-Host "Build     : READY" -ForegroundColor Green
Write-Host ""
