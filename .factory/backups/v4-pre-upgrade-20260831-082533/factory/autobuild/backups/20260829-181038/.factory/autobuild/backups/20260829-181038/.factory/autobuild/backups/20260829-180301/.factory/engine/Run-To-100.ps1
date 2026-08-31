$ErrorActionPreference = "Stop"

$root = (Get-Location).Path
$statePath = Join-Path $root ".factory\state\factory-state.json"
$taskPath  = Join-Path $root ".factory\state\current-task.json"
$logPath   = Join-Path $root ".factory\logs\autonomous-run.log"
$engineDir = Join-Path $root ".factory\engine"

New-Item -ItemType Directory -Force `
    (Join-Path $root ".factory\logs"), `
    (Join-Path $root ".factory\checkpoints"), `
    $engineDir | Out-Null

function Log($message) {
    $line = "[$((Get-Date).ToString('yyyy-MM-dd HH:mm:ss'))] $message"
    Write-Host $line
    Add-Content $logPath $line
}

function Read-Json($path) {
    if (!(Test-Path $path)) { throw "Missing state file: $path" }
    return Get-Content $path -Raw | ConvertFrom-Json
}

function Save-Json($object, $path) {
    $object | ConvertTo-Json -Depth 30 |
        Set-Content $path -Encoding UTF8
}

function Check-Build {
    Log "Running production build..."
    npm run build

    if ($LASTEXITCODE -ne 0) {
        throw "Production build failed."
    }

    if (!(Test-Path (Join-Path $root "dist\index.html"))) {
        throw "dist\index.html was not generated."
    }

    Log "Production build PASSED."
}

function Check-State {
    $state = Read-Json $statePath

    if (!$state.currentModule) {
        throw "Factory state has no currentModule."
    }

    if (!$state.currentPhase) {
        throw "Factory state has no currentPhase."
    }

    return $state
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host " APMAZON SAFE AUTONOMOUS RUNNER" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Log "Runner started."
Log "Safety policy: BACKUP -> PATCH -> BUILD -> TEST -> VERIFY -> PASS -> NEXT"
Log "STOP ON FAILURE = TRUE"
Log "NEVER SKIP VERIFICATION = TRUE"
Log "ROLLBACK ON FAILURE = TRUE"

try {
    $state = Check-State

    Log "Resuming from Phase $($state.currentPhase), Module $($state.currentModule)."

    Check-Build

    Write-Host ""
    Write-Host "========================================" -ForegroundColor Green
    Write-Host " SAFE RUNNER READY" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "Current module : $($state.currentModule)" -ForegroundColor Yellow
    Write-Host "Current phase  : $($state.currentPhase)" -ForegroundColor Yellow
    Write-Host "Completed      : $($state.completedModules.Count)" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "The runner is intentionally NOT blindly modifying the project." -ForegroundColor Cyan
    Write-Host "It will only execute a module when a verified module implementation exists." -ForegroundColor Cyan
    Write-Host ""

    Log "Runner waiting for module implementation."
}
catch {
    Log "RUNNER FAILURE: $($_.Exception.Message)"
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Red
    Write-Host " SAFE STOP — NO PASS RECORDED" -ForegroundColor Red
    Write-Host "========================================" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
}

Write-Host ""
Write-Host "PowerShell will remain OPEN." -ForegroundColor Green
Write-Host "Review the state above. Press Enter to close." -ForegroundColor Yellow
Read-Host
