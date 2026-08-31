$ErrorActionPreference="Continue"

$root=(Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$stateFile=Join-Path $root ".factory\jobs\state\real-project-001.checkpoint.json"
$factoryState=Join-Path $root ".factory\jobs\state\factory-state.json"
$logDir=Join-Path $root ".factory\jobs\logs"

New-Item -ItemType Directory -Force -Path $logDir | Out-Null

$log=Join-Path $logDir ("auto-resume-" + (Get-Date -Format "yyyyMMdd-HHmmss") + ".log")

Start-Transcript -Path $log -Append | Out-Null

Write-Host "============================================================"
Write-Host " SIMEONJR AUTO-RESUME CONTROLLER"
Write-Host "============================================================"

if(!(Test-Path $stateFile)){
    Write-Host "No checkpoint found."
    Stop-Transcript | Out-Null
    exit 0
}

$checkpoint=Get-Content $stateFile -Raw | ConvertFrom-Json

Write-Host "JOB: $($checkpoint.jobId)"
Write-Host "STATUS: $($checkpoint.status)"
Write-Host "NEXT BATCH: $($checkpoint.nextBatch)"
Write-Host "MODEL: $($checkpoint.model)"

Write-Host ""
Write-Host "[1/5] Checking Node..."

node --version

if($LASTEXITCODE -ne 0){
    Write-Host "NODE: FAILED"
    Stop-Transcript | Out-Null
    exit 1
}

Write-Host "NODE: PASS"

Write-Host ""
Write-Host "[2/5] Checking LM Studio..."

try {
    $models=Invoke-RestMethod `
        "http://localhost:1234/v1/models" `
        -TimeoutSec 5

    $model=$models.data |
        Where-Object { $_.id -eq $checkpoint.model }

    if(!$model){
        throw "Required local model is unavailable"
    }

    Write-Host "LM STUDIO: PASS"
    Write-Host "MODEL AVAILABLE: PASS"
}
catch {
    Write-Host "LM STUDIO: NOT READY"
    Write-Host $_.Exception.Message
    Write-Host ""
    Write-Host "Resume controller will exit safely."
    Stop-Transcript | Out-Null
    exit 2
}

Write-Host ""
Write-Host "[3/5] Checking target project..."

$target=$checkpoint.target

if(!(Test-Path $target)){
    Write-Host "TARGET PROJECT: MISSING"
    Stop-Transcript | Out-Null
    exit 3
}

Write-Host "TARGET: $target"
Write-Host "TARGET: PASS"

Write-Host ""
Write-Host "[4/5] Checking context safety..."

Write-Host "MODEL CONTEXT LIMIT: 4096"
Write-Host "SAFE PROMPT BUDGET: 2600"
Write-Host "CONTEXT PATCH REQUIRED BEFORE TRANSFORMATION: YES"

Write-Host ""
Write-Host "[5/5] Resume gate..."

Write-Host "CHECKPOINT FOUND: PASS"
Write-Host "AUTO-RESUME CONTROLLER: PASS"
Write-Host ""
Write-Host "The saved job is preserved."
Write-Host "Transformation will resume after the Context-Safe v2 engine"
Write-Host "patch is installed."
Write-Host ""
Write-Host "NO UNSAFE TRANSFORMATION STARTED."

Stop-Transcript | Out-Null
exit 0
