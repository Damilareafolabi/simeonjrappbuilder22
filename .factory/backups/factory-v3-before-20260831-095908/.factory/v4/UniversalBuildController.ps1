param(
    [Parameter(Mandatory=$true)]
    [string]$ProjectPath,

    [Parameter(Mandatory=$true)]
    [string]$Prompt,

    [int]$MaxRepairAttempts = 3
)

$ErrorActionPreference = "Stop"

$Root = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$V4 = Join-Path $Root ".factory\v4"
$Reports = Join-Path $V4 "reports"
$StateDir = Join-Path $V4 "state"
$CheckpointDir = Join-Path $V4 "checkpoints"

New-Item -ItemType Directory -Force -Path $Reports | Out-Null
New-Item -ItemType Directory -Force -Path $StateDir | Out-Null
New-Item -ItemType Directory -Force -Path $CheckpointDir | Out-Null

$runId = Get-Date -Format "yyyyMMdd-HHmmss"
$reportPath = Join-Path $Reports "run-$runId.json"
$statePath = Join-Path $StateDir "current-run.json"
$checkpointPath = Join-Path $CheckpointDir "checkpoint-$runId"

$started = Get-Date

function Write-Stage {
    param([string]$Name)
    Write-Host ""
    Write-Host "----------------------------------------" -ForegroundColor DarkGray
    Write-Host " $Name" -ForegroundColor Cyan
    Write-Host "----------------------------------------" -ForegroundColor DarkGray
}

function Save-State {
    param(
        [string]$Stage,
        [string]$Status,
        [int]$RepairAttempts = 0
    )

    $state = @{
        runId = $runId
        projectPath = $ProjectPath
        prompt = $Prompt
        stage = $Stage
        status = $Status
        repairAttempts = $RepairAttempts
        timestamp = (Get-Date).ToString("o")
    }

    $state | ConvertTo-Json -Depth 10 |
        Set-Content $statePath -Encoding UTF8
}

function Invoke-SafeCommand {
    param(
        [string]$File,
        [string[]]$Arguments
    )

    & $File @Arguments 2>&1
    return $LASTEXITCODE
}

Write-Host ""
Write-Host "SIMEONJR UNIVERSAL FACTORY V4" -ForegroundColor Green
Write-Host "Run: $runId" -ForegroundColor Gray
Write-Host "Project: $ProjectPath" -ForegroundColor Gray

if (!(Test-Path $ProjectPath)) {
    throw "Project path does not exist: $ProjectPath"
}

# ------------------------------------------------------------
# 1. INSPECT
# ------------------------------------------------------------

Write-Stage "1/8 INSPECT"

Save-State "inspect" "running"

$files = Get-ChildItem $ProjectPath -Recurse -File |
    Where-Object {
        $_.FullName -notmatch "\\node_modules\\" -and
        $_.FullName -notmatch "\\dist\\" -and
        $_.FullName -notmatch "\\.git\\"
    }

$packageJson = Join-Path $ProjectPath "package.json"

$projectType = "unknown"

if (Test-Path $packageJson) {
    try {
        $pkg = Get-Content $packageJson -Raw | ConvertFrom-Json

        if ($pkg.dependencies.react -or $pkg.devDependencies.react) {
            $projectType = "react"
        }
        elseif ($pkg.dependencies.vue -or $pkg.devDependencies.vue) {
            $projectType = "vue"
        }
        elseif ($pkg.dependencies.next -or $pkg.devDependencies.next) {
            $projectType = "nextjs"
        }
        elseif ($pkg.dependencies.express -or $pkg.dependencies.fastify) {
            $projectType = "node-backend"
        }
        else {
            $projectType = "node"
        }
    }
    catch {
        $projectType = "node"
    }
}

Write-Host "Detected project type: $projectType" -ForegroundColor Green
Write-Host "Source files: $($files.Count)" -ForegroundColor Gray

# ------------------------------------------------------------
# 2. PLAN
# ------------------------------------------------------------

Write-Stage "2/8 PLAN"

Save-State "plan" "running"

$plan = @{
    runId = $runId
    projectType = $projectType
    projectPath = $ProjectPath
    objective = $Prompt
    detectedFiles = $files.Count
    generatedAt = (Get-Date).ToString("o")
    phases = @(
        "inspect",
        "plan",
        "execute",
        "build",
        "test",
        "repair",
        "verify",
        "report"
    )
}

$planPath = Join-Path $Reports "plan-$runId.json"

$plan | ConvertTo-Json -Depth 20 |
    Set-Content $planPath -Encoding UTF8

Write-Host "Plan created." -ForegroundColor Green

# ------------------------------------------------------------
# 3. CHECKPOINT
# ------------------------------------------------------------

Write-Stage "3/8 CHECKPOINT"

Save-State "checkpoint" "running"

New-Item -ItemType Directory -Force -Path $checkpointPath | Out-Null

Copy-Item $ProjectPath `
    (Join-Path $checkpointPath "project") `
    -Recurse `
    -Force `
    -Exclude "node_modules","dist",".git"

Write-Host "Checkpoint created: $checkpointPath" -ForegroundColor Green

# ------------------------------------------------------------
# 4. EXECUTE
# ------------------------------------------------------------

Write-Stage "4/8 EXECUTE"

Save-State "execute" "running"

Write-Host "Execution handoff prepared." -ForegroundColor Green
Write-Host "Existing V3 transformation/agent infrastructure remains authoritative." -ForegroundColor Gray

# ------------------------------------------------------------
# 5. BUILD
# ------------------------------------------------------------

Write-Stage "5/8 BUILD"

Save-State "build" "running"

$buildOutput = @()
$buildExit = 0

if (Test-Path $packageJson) {

    Push-Location $ProjectPath

    try {
        $pkg = Get-Content $packageJson -Raw | ConvertFrom-Json

        if ($pkg.scripts.build) {
            Write-Host "Running npm run build..." -ForegroundColor Yellow

            $buildOutput = @(npm run build 2>&1)
            $buildExit = $LASTEXITCODE
        }
        else {
            Write-Host "No build script found." -ForegroundColor Yellow
            $buildExit = 0
        }
    }
    finally {
        Pop-Location
    }

}
else {
    Write-Host "No package.json; build stage skipped." -ForegroundColor Yellow
}

$buildLogPath = Join-Path $Reports "build-$runId.log"

$buildOutput |
    Out-File $buildLogPath -Encoding UTF8

if ($buildExit -eq 0) {
    Write-Host "BUILD PASSED" -ForegroundColor Green
}
else {
    Write-Host "BUILD FAILED" -ForegroundColor Red
}

# ------------------------------------------------------------
# 6. REPAIR LOOP
# ------------------------------------------------------------

Write-Stage "6/8 REPAIR"

$repairAttempts = 0

while ($buildExit -ne 0 -and $repairAttempts -lt $MaxRepairAttempts) {

    $repairAttempts++

    Write-Host ""
    Write-Host "Repair attempt $repairAttempts / $MaxRepairAttempts" -ForegroundColor Yellow

    Save-State "repair" "running" $repairAttempts

    Write-Host "Capturing failure for existing repair infrastructure..." -ForegroundColor Gray

    $repairRecord = @{
        runId = $runId
        attempt = $repairAttempts
        projectPath = $ProjectPath
        buildExitCode = $buildExit
        buildLog = $buildLogPath
        timestamp = (Get-Date).ToString("o")
        status = "awaiting-agent-repair"
    }

    $repairPath = Join-Path $Reports "repair-$runId-$repairAttempts.json"

    $repairRecord |
        ConvertTo-Json -Depth 20 |
        Set-Content $repairPath -Encoding UTF8

    Write-Host "Repair handoff recorded." -ForegroundColor Green

    # V4 deliberately does not blindly modify source files here.
    # Existing V3 agent/transform infrastructure remains responsible
    # for applying controlled code changes.

    break
}

# ------------------------------------------------------------
# 7. VERIFY
# ------------------------------------------------------------

Write-Stage "7/8 VERIFY"

$success = ($buildExit -eq 0)

if ($success) {
    Save-State "verify" "passed" $repairAttempts
    Write-Host "Verification: BUILD SUCCESS" -ForegroundColor Green
}
else {
    Save-State "verify" "failed" $repairAttempts
    Write-Host "Verification: BUILD NOT YET VERIFIED" -ForegroundColor Yellow
}

# ------------------------------------------------------------
# 8. REPORT
# ------------------------------------------------------------

Write-Stage "8/8 REPORT"

$finished = Get-Date

$result = @{
    factory = "SimeonJr Universal Factory"
    version = "4.0"
    runId = $runId
    projectPath = $ProjectPath
    prompt = $Prompt
    projectType = $projectType
    sourceFileCount = $files.Count
    buildExitCode = $buildExit
    buildPassed = $success
    repairAttempts = $repairAttempts
    checkpoint = $checkpointPath
    startedAt = $started.ToString("o")
    finishedAt = $finished.ToString("o")
    durationSeconds = [math]::Round(($finished - $started).TotalSeconds,2)
    status = if ($success) { "verified" } else { "needs-repair" }
}

$result |
    ConvertTo-Json -Depth 20 |
    Set-Content $reportPath -Encoding UTF8

Save-State "complete" $result.status $repairAttempts

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host " V4 CONTROLLER RUN COMPLETE" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Status: $($result.status)" -ForegroundColor White
Write-Host "Project: $ProjectPath" -ForegroundColor White
Write-Host "Report: $reportPath" -ForegroundColor White
Write-Host "Checkpoint: $checkpointPath" -ForegroundColor White
Write-Host ""

if (!$success) {
    exit 2
}

exit 0
