$ErrorActionPreference = "Continue"
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $Root

$AutoRoot   = Join-Path $Root ".factory\autobuild"
$BackupRoot = Join-Path $AutoRoot "backups"
$ReportRoot = Join-Path $AutoRoot "reports"

New-Item -ItemType Directory -Force -Path $AutoRoot,$BackupRoot,$ReportRoot | Out-Null

$StateFile = Join-Path $AutoRoot "state.json"
$LogFile   = Join-Path $ReportRoot "autobuild.log"

function Log($Message) {
    $line = "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') | $Message"
    Write-Host $line
    Add-Content -LiteralPath $LogFile -Value $line -Encoding UTF8
}

function Set-State($Status,$Phase,$Progress,$Message) {
    @{
        status=$Status
        phase=$Phase
        progress=$Progress
        message=$Message
        timestamp=(Get-Date).ToString("o")
    } | ConvertTo-Json -Depth 10 |
        Set-Content -LiteralPath $StateFile -Encoding UTF8
}

function Relative-Path($FullPath) {
    return $FullPath.Substring($Root.Length).TrimStart("\")
}

function Is-Excluded($RelativePath) {
    $p = $RelativePath.Replace("/","\").TrimStart(".\")

    return (
        $p -like ".factory\*" -or
        $p -like "node_modules\*" -or
        $p -like "dist\*" -or
        $p -like "src-before-v2\*" -or
        $p -like "generated\*" -or
        $p -like "projects\*"
    )
}

function Is-Protected($RelativePath) {
    $p = $RelativePath.Replace("/","\").TrimStart(".\")

    return (
        $p -like ".factory\*" -or
        $p -like "node_modules\*" -or
        $p -like "dist\*" -or
        $p -like "src-before-v2\*"
    )
}

function Is-Active($RelativePath) {
    $p = $RelativePath.Replace("/","\").TrimStart(".\")

    if (Is-Protected $p) {
        return $false
    }

    return (
        $p -like "src\*" -or
        $p -like "backend\*" -or
        $p -eq "vite.config.js" -or
        $p -eq "index.html"
    )
}

function Backup-Project {

    $stamp = Get-Date -Format "yyyyMMdd-HHmmss"
    $destination = Join-Path $BackupRoot $stamp

    New-Item -ItemType Directory -Force -Path $destination | Out-Null

    Log "Creating transactional backup..."

    Get-ChildItem -LiteralPath $Root -File -Recurse -Force |
        Where-Object {
            $relative = Relative-Path $_.FullName
            -not (Is-Excluded $relative)
        } |
        ForEach-Object {

            $relative = Relative-Path $_.FullName
            $target = Join-Path $destination $relative
            $parent = Split-Path -Parent $target

            if (-not (Test-Path $parent)) {
                New-Item -ItemType Directory -Force -Path $parent | Out-Null
            }

            Copy-Item -LiteralPath $_.FullName -Destination $target -Force
        }

    Log "Backup complete: $destination"

    return $destination
}

function Restore-Backup($BackupPath) {

    Log "Starting rollback..."

    Get-ChildItem -LiteralPath $BackupPath -File -Recurse -Force |
        ForEach-Object {

            $relative = $_.FullName.Substring($BackupPath.Length).TrimStart("\")
            $target = Join-Path $Root $relative

            if (-not (Is-Protected $relative)) {

                $parent = Split-Path -Parent $target

                if (-not (Test-Path $parent)) {
                    New-Item -ItemType Directory -Force -Path $parent | Out-Null
                }

                Copy-Item -LiteralPath $_.FullName -Destination $target -Force
            }
        }

    Log "Rollback complete."
}

function Invoke-NpmBuild {

    Log "========================================"
    Log "RUNNING npm run build"
    Log "========================================"

    $buildLog = Join-Path $ReportRoot "build-last.log"

    if (Test-Path $buildLog) {
        Remove-Item $buildLog -Force
    }

    & npm.cmd run build 2>&1 |
        Tee-Object -FilePath $buildLog -Append |
        ForEach-Object {
            Write-Host $_
            Add-Content -LiteralPath $LogFile -Value $_ -Encoding UTF8
        }

    return $LASTEXITCODE
}

function Find-RepairEngine {

    $candidates = @(
        ".factory\engine\repair.js",
        ".factory\engine\autonomous-repair.js",
        ".factory\engine\repair-engine.js",
        ".factory\engine\repair\index.js",
        "backend\repair.js",
        "backend\autonomous-repair.js"
    )

    foreach ($candidate in $candidates) {
        $path = Join-Path $Root $candidate

        if (Test-Path $path) {
            return $path
        }
    }

    return $null
}

Write-Host ""
Write-Host "========================================"
Write-Host " SIMEONJR FACTORY"
Write-Host " AUTONOMOUS BUILD CONTROLLER"
Write-Host "========================================"
Write-Host ""

Set-State "running" "inspection" 5 "Inspecting Factory"

Log "[1/9] Inspecting project"

$packagePath = Join-Path $Root "package.json"

if (-not (Test-Path $packagePath)) {
    Log "FATAL: package.json not found."
    Set-State "failed" "inspection" 5 "package.json missing"
    exit 1
}

$package = Get-Content -LiteralPath $packagePath -Raw |
    ConvertFrom-Json

if (-not $package.scripts.build) {
    Log "FATAL: package.json has no build script."
    Set-State "failed" "inspection" 5 "npm build script missing"
    exit 1
}

$planPath = Join-Path $Root ".factory\engine\reports\transform-plan-2.4.json"

if (Test-Path $planPath) {
    Log "Phase 2.4 plan detected."
}

Set-State "running" "inspection" 10 "Project inspection complete"

Log "[2/9] Classifying files"

$allFiles = @(
    Get-ChildItem -LiteralPath $Root -File -Recurse -Force |
    ForEach-Object {
        $relative = Relative-Path $_.FullName

        [PSCustomObject]@{
            path=$relative
            active=(Is-Active $relative)
            protected=(Is-Protected $relative)
        }
    }
)

$activeFiles = @($allFiles | Where-Object active)
$protectedFiles = @($allFiles | Where-Object protected)

Log "Active files detected: $($activeFiles.Count)"
Log "Protected files detected: $($protectedFiles.Count)"

Set-State "running" "classification" 20 "File classification complete"

Log "[3/9] Creating safety backup"

$backup = Backup-Project

Set-State "running" "backup" 30 "Safety backup complete"

Log "[4/9] Checking dependencies"

if (-not (Test-Path (Join-Path $Root "node_modules"))) {

    Log "node_modules missing."
    Log "Installing dependencies..."

    & npm.cmd install 2>&1 |
        Tee-Object -FilePath (Join-Path $ReportRoot "npm-install.log") -Append

    if ($LASTEXITCODE -ne 0) {

        Log "npm install FAILED."
        Restore-Backup $backup

        Set-State "failed" "dependencies" 35 "Dependency installation failed"
        exit 1
    }
}

Set-State "running" "dependencies" 40 "Dependencies ready"

Log "[5/9] Inspecting existing Factory engines"

$repairEngine = Find-RepairEngine

if ($repairEngine) {
    Log "Repair engine detected: $repairEngine"
} else {
    Log "No standalone repair executable detected."
    Log "Existing backend repair APIs remain untouched."
}

Set-State "running" "engine" 50 "Factory engines inspected"

Log "[6/9] Running production build"

$buildCode = Invoke-NpmBuild

if ($buildCode -ne 0) {

    Log ""
    Log "!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!"
    Log " BUILD FAILED"
    Log "!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!"

    Set-State "repairing" "repair" 60 "Production build failed"

    if ($repairEngine) {

        Log "Starting existing repair engine..."

        & node.exe $repairEngine 2>&1 |
            Tee-Object -FilePath (Join-Path $ReportRoot "repair.log") -Append

        $repairCode = $LASTEXITCODE

        if ($repairCode -eq 0) {
            Log "Repair engine completed successfully."
        } else {
            Log "Repair engine returned code $repairCode."
        }

    } else {
        Log "No standalone repair engine available."
        Log "No unsafe automatic source rewrite will be invented."
    }

    Log "[7/9] Rebuilding after repair attempt"

    $buildCode = Invoke-NpmBuild
}

if ($buildCode -ne 0) {

    Log ""
    Log "!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!"
    Log " BUILD FAILED AFTER REPAIR"
    Log " STARTING ROLLBACK"
    Log "!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!"

    Set-State "rollback" "rollback" 75 "Build failed; restoring backup"

    Restore-Backup $backup

    $failureReport = @{
        status="FAILED"
        phase="2.4"
        build="FAILED"
        rollback="COMPLETED"
        backup=$backup
        buildLog=(Join-Path $ReportRoot "build-last.log")
        timestamp=(Get-Date).ToString("o")
    }

    $failureReport |
        ConvertTo-Json -Depth 10 |
        Set-Content (Join-Path $ReportRoot "autobuild-final.json") -Encoding UTF8

    Set-State "failed" "rollback" 75 "Original project restored"

    Write-Host ""
    Write-Host "========================================"
    Write-Host " AUTOBUILD STOPPED SAFELY"
    Write-Host " ORIGINAL PROJECT RESTORED"
    Write-Host "========================================"
    Write-Host ""

    exit 1
}

Set-State "running" "build" 80 "Production build passed"

Log "[8/9] Verifying production output"

$distPath = Join-Path $Root "dist"

if (-not (Test-Path $distPath)) {

    Log "BUILD COMMAND PASSED BUT dist WAS NOT FOUND."
    Log "Treating verification as FAILED."

    Restore-Backup $backup

    Set-State "failed" "verification" 85 "Production output missing"
    exit 1
}

$distFiles = @(Get-ChildItem -LiteralPath $distPath -File -Recurse -Force)

if ($distFiles.Count -eq 0) {

    Log "dist exists but contains no files."
    Restore-Backup $backup

    Set-State "failed" "verification" 85 "Production output empty"
    exit 1
}

Log "Production output verified: $($distFiles.Count) files."

Set-State "running" "verification" 90 "Build output verified"

Log "[9/9] Writing final report"

$finalReport = @{
    status="PASSED"
    phase="2.4"
    progress=100
    build="PASSED"
    verification="PASSED"
    rollbackOnFailure=$true
    backup=$backup
    activeFileCount=$activeFiles.Count
    protectedFileCount=$protectedFiles.Count
    protectedRoots=@(
        ".factory",
        "node_modules",
        "dist",
        "src-before-v2"
    )
    specialRoots=@(
        "generated",
        "projects"
    )
    activeRoots=@(
        "src",
        "backend",
        "vite.config.js",
        "index.html"
    )
    timestamp=(Get-Date).ToString("o")
}

$finalReport |
    ConvertTo-Json -Depth 10 |
    Set-Content (Join-Path $ReportRoot "autobuild-final.json") -Encoding UTF8

Set-State "passed" "complete" 100 "Autonomous build verification passed"

Write-Host ""
Write-Host "========================================"
Write-Host " SIMEONJR FACTORY"
Write-Host " AUTOBUILD PASSED"
Write-Host "========================================"
Write-Host ""
Write-Host "100% BUILD VERIFIED"
Write-Host "Backup: $backup"
Write-Host ""
Write-Host "Starting Vite development server..."

if ($package.scripts.dev) {

    Start-Process powershell.exe `
        -ArgumentList "-NoExit","-Command","Set-Location '$Root'; npm run dev"

    Start-Sleep -Seconds 4

    foreach ($port in @(5173,3000,4173)) {

        try {

            $response = Invoke-WebRequest `
                -Uri "http://localhost:$port" `
                -UseBasicParsing `
                -TimeoutSec 2

            if ($response.StatusCode -ge 200 -and $response.StatusCode -lt 500) {

                Log "Vite detected at http://localhost:$port"

                Start-Process "http://localhost:$port"

                break
            }

        } catch {}
    }

} else {

    Log "No npm dev script found. Vite was not launched."
}

Write-Host ""
Write-Host "========================================"
Write-Host " FACTORY VERIFICATION COMPLETE"
Write-Host "========================================"
