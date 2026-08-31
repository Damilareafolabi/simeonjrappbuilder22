param(
    [string]$ProjectRoot = (Split-Path -Parent (Split-Path -Parent $PSScriptRoot)),
    [switch]$Execute
)

$ErrorActionPreference = "Stop"

$FactoryRoot = Join-Path $ProjectRoot ".factory"
$StateRoot = Join-Path $FactoryRoot "state"
$TaskRoot = Join-Path $FactoryRoot "tasks"
$BackupRoot = Join-Path $FactoryRoot "backups"
$CheckpointRoot = Join-Path $FactoryRoot "checkpoints"
$EngineRoot = Join-Path $FactoryRoot "engine"
$ReportRoot = Join-Path $EngineRoot "reports"

$AnalysisFile = Join-Path $StateRoot "project-analysis.json"
$TaskFile = Join-Path $TaskRoot "2.4.json"

foreach ($directory in @(
    $StateRoot,
    $TaskRoot,
    $BackupRoot,
    $CheckpointRoot,
    $EngineRoot,
    $ReportRoot
)) {
    if (-not (Test-Path $directory)) {
        New-Item -ItemType Directory -Path $directory -Force | Out-Null
    }
}

Write-Host ""
Write-Host "========================================"
Write-Host " PHASE 2.4 - TRANSFORM EXISTING"
Write-Host "========================================"
Write-Host ""

# ------------------------------------------------------------
# 1. VERIFY INPUTS
# ------------------------------------------------------------

Write-Host "[1/8] Verifying persisted analysis..."

if (-not (Test-Path $AnalysisFile)) {
    throw "Project analysis not found: $AnalysisFile"
}

if (-not (Test-Path $TaskFile)) {
    throw "2.4 task definition not found: $TaskFile"
}

$Analysis = Get-Content $AnalysisFile -Raw | ConvertFrom-Json
$Task = Get-Content $TaskFile -Raw | ConvertFrom-Json

if ($Analysis.framework -ne "react") {
    throw "Unexpected framework: $($Analysis.framework)"
}

if (-not $Analysis.hasPackageJson) {
    throw "package.json is required."
}

Write-Host "✓ Analysis loaded"
Write-Host "✓ Framework: $($Analysis.framework)"
Write-Host "✓ Files detected: $($Analysis.fileCount)"

# ------------------------------------------------------------
# 2. VERIFY EXISTING PROJECT
# ------------------------------------------------------------

Write-Host ""
Write-Host "[2/8] Verifying existing project..."

$RequiredPaths = @(
    "package.json",
    "src",
    "vite.config.*"
)

foreach ($required in $RequiredPaths) {
    if ($required -eq "vite.config.*") {
        $found = Get-ChildItem -Path $ProjectRoot -Filter "vite.config.*" -File -ErrorAction SilentlyContinue
        if (-not $found) {
            throw "Vite configuration not found."
        }
    }
    elseif (-not (Test-Path (Join-Path $ProjectRoot $required))) {
        throw "Required project path missing: $required"
    }
}

Write-Host "✓ Existing React/Vite project verified"

# ------------------------------------------------------------
# 3. CREATE CHECKPOINT
# ------------------------------------------------------------

$Timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$Checkpoint = Join-Path $CheckpointRoot "transform-2.4-$Timestamp"

Write-Host ""
Write-Host "[3/8] Creating transformation checkpoint..."

New-Item -ItemType Directory -Path $Checkpoint -Force | Out-Null

$CheckpointState = @{
    taskId = "2.4"
    createdAt = (Get-Date).ToString("o")
    projectPath = $ProjectRoot
    fileCount = $Analysis.fileCount
    framework = $Analysis.framework
    executeMode = [bool]$Execute
} | ConvertTo-Json -Depth 10

$CheckpointState | Set-Content `
    (Join-Path $Checkpoint "checkpoint.json") `
    -Encoding UTF8

Write-Host "✓ Checkpoint created: $Checkpoint"

# ------------------------------------------------------------
# 4. CREATE TRANSFORMATION PLAN
# ------------------------------------------------------------

Write-Host ""
Write-Host "[4/8] Creating transformation plan..."

$SourceFiles = @()

$SourceExtensions = @(
    "*.js",
    "*.jsx",
    "*.ts",
    "*.tsx",
    "*.css",
    "*.html"
)

foreach ($pattern in $SourceExtensions) {
    $SourceFiles += Get-ChildItem `
        -Path $ProjectRoot `
        -Recurse `
        -File `
        -Filter $pattern `
        -ErrorAction SilentlyContinue |
        Where-Object {
            $_.FullName -notlike "$FactoryRoot*" -and
            $_.FullName -notlike "*\node_modules\*" -and
            $_.FullName -notlike "*\dist\*"
        }
}

$SourceFiles = $SourceFiles |
    Sort-Object FullName -Unique

$Plan = @{
    taskId = "2.4"
    generatedAt = (Get-Date).ToString("o")
    projectPath = $ProjectRoot
    framework = $Analysis.framework
    analyzedFileCount = $Analysis.fileCount
    sourceFileCount = $SourceFiles.Count
    executeMode = [bool]$Execute
    transformationPolicy = @{
        preserveExisting = $true
        noRebuildFromScratch = $true
        backupBeforeModification = $true
        buildAfterModification = $true
        rollbackOnFailure = $true
    }
    files = @(
        $SourceFiles | ForEach-Object {
            [PSCustomObject]@{
                path = $_.FullName.Substring($ProjectRoot.Length + 1)
                extension = $_.Extension
                size = $_.Length
                approved = $false
            }
        }
    )
}

$PlanFile = Join-Path $ReportRoot "transform-plan-2.4.json"

$Plan | ConvertTo-Json -Depth 20 |
    Set-Content $PlanFile -Encoding UTF8

Write-Host "✓ Transformation plan created"
Write-Host "✓ Candidate source files: $($SourceFiles.Count)"

# ------------------------------------------------------------
# 5. SAFE MODE / EXECUTION GATE
# ------------------------------------------------------------

Write-Host ""
Write-Host "[5/8] Checking transformation execution gate..."

if (-not $Execute) {

    Write-Host ""
    Write-Host "----------------------------------------"
    Write-Host " SAFE PLAN MODE"
    Write-Host "----------------------------------------"
    Write-Host "No application files were modified."
    Write-Host ""
    Write-Host "Transformation plan:"
    Write-Host $PlanFile
    Write-Host ""
    Write-Host "To execute an approved transformation,"
    Write-Host "the engine must be called with:"
    Write-Host ""
    Write-Host "  -Execute"
    Write-Host ""
    Write-Host "SAFE GATE PASSED"
    Write-Host "----------------------------------------"

    $Result = @{
        taskId = "2.4"
        status = "planned"
        safeGate = "passed"
        executed = $false
        modified = $false
        generatedAt = (Get-Date).ToString("o")
        planFile = $PlanFile
        checkpoint = $Checkpoint
    }

    $ResultFile = Join-Path $ReportRoot "transform-result-2.4.json"

    $Result | ConvertTo-Json -Depth 20 |
        Set-Content $ResultFile -Encoding UTF8

    exit 0
}

# ------------------------------------------------------------
# 6. BACKUP BEFORE TRANSFORMATION
# ------------------------------------------------------------

Write-Host ""
Write-Host "[6/8] Creating transformation backup..."

$BackupPath = Join-Path $BackupRoot "module-2.4-$Timestamp"

New-Item -ItemType Directory -Path $BackupPath -Force | Out-Null

foreach ($file in $SourceFiles) {

    $relative = $file.FullName.Substring($ProjectRoot.Length + 1)
    $destination = Join-Path $BackupPath $relative
    $destinationDirectory = Split-Path $destination -Parent

    if (-not (Test-Path $destinationDirectory)) {
        New-Item `
            -ItemType Directory `
            -Path $destinationDirectory `
            -Force | Out-Null
    }

    Copy-Item `
        -LiteralPath $file.FullName `
        -Destination $destination `
        -Force
}

Write-Host "✓ Backup created: $BackupPath"

# ------------------------------------------------------------
# 7. TRANSFORMATION PLACEHOLDER
# ------------------------------------------------------------

Write-Host ""
Write-Host "[7/8] Applying approved transformations..."

$ApprovedFiles = @(
    $Plan.files |
    Where-Object { $_.approved -eq $true }
)

if ($ApprovedFiles.Count -eq 0) {

    Write-Host "✓ No files approved for transformation."
    Write-Host "✓ Existing application left unchanged."

}
else {

    foreach ($approved in $ApprovedFiles) {

        $target = Join-Path $ProjectRoot $approved.path

        if (-not (Test-Path $target)) {
            throw "Approved transformation target disappeared: $target"
        }

        # Actual transformation operations will be inserted here
        # only after an explicit transformation specification exists.

        Write-Host "✓ Verified transformation target: $($approved.path)"
    }
}

# ------------------------------------------------------------
# 8. BUILD + VERIFY
# ------------------------------------------------------------

Write-Host ""
Write-Host "[8/8] Running production verification..."

Push-Location $ProjectRoot

try {

    if (-not (Test-Path "package.json")) {
        throw "package.json missing before verification."
    }

    npm run build

    if ($LASTEXITCODE -ne 0) {
        throw "Production build failed."
    }

}
catch {

    Write-Host ""
    Write-Host "TRANSFORMATION FAILED"
    Write-Host "Initiating rollback..."

    Pop-Location

    if (Test-Path $BackupPath) {

        foreach ($backupFile in Get-ChildItem `
            -Path $BackupPath `
            -Recurse `
            -File) {

            $relative = $backupFile.FullName.Substring($BackupPath.Length + 1)
            $target = Join-Path $ProjectRoot $relative
            $targetDirectory = Split-Path $target -Parent

            if (-not (Test-Path $targetDirectory)) {
                New-Item `
                    -ItemType Directory `
                    -Path $targetDirectory `
                    -Force | Out-Null
            }

            Copy-Item `
                -LiteralPath $backupFile.FullName `
                -Destination $target `
                -Force
        }

        Write-Host "✓ Rollback completed"
    }

    throw
}

Pop-Location

$FinalResult = @{
    taskId = "2.4"
    status = "passed"
    safeGate = "passed"
    executed = $true
    modified = ($ApprovedFiles.Count -gt 0)
    approvedFileCount = $ApprovedFiles.Count
    backup = $BackupPath
    checkpoint = $Checkpoint
    build = "passed"
    completedAt = (Get-Date).ToString("o")
}

$FinalResultFile = Join-Path $ReportRoot "transform-result-2.4.json"

$FinalResult | ConvertTo-Json -Depth 20 |
    Set-Content $FinalResultFile -Encoding UTF8

Write-Host ""
Write-Host "========================================"
Write-Host " PHASE 2.4 PASSED"
Write-Host "========================================"
Write-Host "Transformation verification complete."
Write-Host "Existing application remains buildable."
Write-Host ""
