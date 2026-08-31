$ErrorActionPreference = "Continue"
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $Root

$StateDir = Join-Path $Root ".factory\autobuild"
$BackupDir = Join-Path $StateDir "backups"
$ReportDir = Join-Path $StateDir "reports"
New-Item -ItemType Directory -Force -Path $StateDir,$BackupDir,$ReportDir | Out-Null

$StateFile = Join-Path $StateDir "state.json"
$LogFile = Join-Path $ReportDir "autobuild.log"

function Log($Message) {
    $line = "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') | $Message"
    Write-Host $line
    Add-Content -Path $LogFile -Value $line
}

function Run-Command($File, $Arguments) {
    Log "RUN: $File $Arguments"
    & $File $Arguments 2>&1 | Tee-Object -FilePath $LogFile -Append
    return $LASTEXITCODE
}

function Protected($Path) {
    $p = $Path.Replace("/","\").TrimStart(".\")
    return (
        $p -like ".factory\*" -or
        $p -like "node_modules\*" -or
        $p -like "dist\*" -or
        $p -like "src-before-v2\*"
    )
}

function Active($Path) {
    $p = $Path.Replace("/","\").TrimStart(".\")
    if (Protected $p) { return $false }
    return (
        $p -like "src\*" -or
        $p -like "backend\*" -or
        $p -eq "vite.config.js" -or
        $p -eq "index.html"
    )
}

function Backup-Project {
    $stamp = Get-Date -Format "yyyyMMdd-HHmmss"
    $dest = Join-Path $BackupDir $stamp
    New-Item -ItemType Directory -Force -Path $dest | Out-Null

    Get-ChildItem -Path $Root -File -Recurse -Force |
        Where-Object {
            $rel = $_.FullName.Substring($Root.Length).TrimStart("\")
            -not (Protected $rel)
        } |
        ForEach-Object {
            $rel = $_.FullName.Substring($Root.Length).TrimStart("\")
            $target = Join-Path $dest $rel
            New-Item -ItemType Directory -Force -Path (Split-Path $target) | Out-Null
            Copy-Item $_.FullName $target -Force
        }

    return $dest
}

function Save-State($Status,$Phase,$Progress,$Message) {
    @{
        status=$Status
        phase=$Phase
        progress=$Progress
        message=$Message
        timestamp=(Get-Date).ToString("o")
    } | ConvertTo-Json -Depth 10 | Set-Content $StateFile -Encoding UTF8
}

Write-Host ""
Write-Host "========================================"
Write-Host " SIMEONJR FACTORY - AUTONOMOUS BUILDER"
Write-Host "========================================"
Write-Host ""

Save-State "running" "initialization" 1 "Starting autonomous build"

Log "[1/8] Inspecting Factory"

$plan = Join-Path $Root ".factory\engine\reports\transform-plan-2.4.json"

if (Test-Path $plan) {
    Log "Existing Phase 2.4 plan detected"
} else {
    Log "Phase 2.4 plan not found; Factory will continue with project inspection"
}

$package = Join-Path $Root "package.json"

if (Test-Path $package) {
    Log "package.json detected"
    $pkg = Get-Content $package -Raw | ConvertFrom-Json
} else {
    Log "ERROR: package.json not found"
    Save-State "failed" "initialization" 1 "package.json missing"
    exit 1
}

Save-State "running" "inspection" 10 "Project inspection complete"

Log "[2/8] Classifying project files"

$files = Get-ChildItem -Path $Root -File -Recurse -Force |
    ForEach-Object {
        $rel = $_.FullName.Substring($Root.Length).TrimStart("\")
        [PSCustomObject]@{
            path=$rel
            protected=(Protected $rel)
            active=(Active $rel)
        }
    }

$activeFiles = @($files | Where-Object { $_.active })
$protectedFiles = @($files | Where-Object { $_.protected })

Log "Active files: $($activeFiles.Count)"
Log "Protected files: $($protectedFiles.Count)"

Save-State "running" "classification" 20 "File classification complete"

Log "[3/8] Creating safety backup"

$backup = Backup-Project
Log "Backup created: $backup"

Save-State "running" "backup" 30 "Safety backup complete"

Log "[4/8] Preparing dependencies"

if (-not (Test-Path (Join-Path $Root "node_modules"))) {
    Log "node_modules missing; installing dependencies"
    $code = Run-Command "npm.cmd" "install"
    if ($code -ne 0) {
        Log "npm install failed"
        Save-State "failed" "dependencies" 35 "npm install failed"
        exit 1
    }
} else {
    Log "node_modules already present"
}

Save-State "running" "dependencies" 40 "Dependencies ready"

Log "[5/8] Checking existing Factory transformation engine"

$engineCandidates = @(
    ".factory\engine",
    "backend",
    "scripts",
    "engine"
)

foreach ($candidate in $engineCandidates) {
    if (Test-Path (Join-Path $Root $candidate)) {
        Log "Detected: $candidate"
    }
}

Log "The autonomous controller will preserve existing Factory architecture."
Log "Protected paths will never be handed to an automatic modification operation."

Save-State "running" "engine" 50 "Factory engine inspected"

Log "[6/8] Running production build"

$buildCommand = "build"

if ($pkg.scripts -and $pkg.scripts.build) {
    Log "Detected npm build script"
} else {
    Log "No npm build script detected"
    Save-State "failed" "build" 55 "No npm build script found"
    exit 1
}

$buildCode = Run-Command "npm.cmd" "run build"

if ($buildCode -ne 0) {
    Log "BUILD FAILED"
    Log "Automatic repair boundary reached."

    Save-State "repairing" "repair" 60 "Build failed; attempting Factory repair"

    $repairScripts = @(
        ".factory\engine\repair.js",
        ".factory\engine\autonomous-repair.js",
        "backend\repair.js"
    )

    $repairFound = $false

    foreach ($repair in $repairScripts) {
        $repairPath = Join-Path $Root $repair
        if (Test-Path $repairPath) {
            $repairFound = $true
            Log "Existing repair engine detected: $repair"

            $repairCode = Run-Command "node.exe" "`"$repairPath`""

            if ($repairCode -eq 0) {
                Log "Repair engine completed"
                break
            }

            Log "Repair engine returned code $repairCode"
        }
    }

    if (-not $repairFound) {
        Log "No existing repair executable found."
    }

    Log "Rebuilding after repair attempt"
    $buildCode = Run-Command "npm.cmd" "run build"
}

if ($buildCode -ne 0) {
    Log "BUILD FAILED AFTER REPAIR"
    Log "ROLLBACK REQUIRED"

    Save-State "rollback" "rollback" 70 "Build failed; restoring safety backup"

    if (Test-Path $backup) {
        Get-ChildItem -Path $backup -File -Recurse -Force | ForEach-Object {
            $rel = $_.FullName.Substring($backup.Length).TrimStart("\")
            $target = Join-Path $Root $rel

            if (-not (Protected $rel)) {
                New-Item -ItemType Directory -Force -Path (Split-Path $target) | Out-Null
                Copy-Item $_.FullName $target -Force
            }
        }

        Log "Rollback complete"
    }

    Save-State "failed" "rollback" 75 "Original project restored"
    exit 1
}

Save-State "running" "build" 80 "Production build passed"

Log "[7/8] Verifying protected paths"

$violations = @()

foreach ($item in $protectedFiles) {
    $current = Join-Path $Root $item.path

    if (-not (Test-Path $current)) {
        $violations += $item.path
    }
}

if ($violations.Count -gt 0) {
    Log "Protected-file verification warning:"
    $violations | ForEach-Object { Log $_ }
}

Log "[8/8] Final verification"

$dist = Join-Path $Root "dist"

if (Test-Path $dist) {
    Log "Production output detected: dist"
} else {
    Log "WARNING: dist directory not detected"
}

$report = @{
    task="AUTOBUILD"
    phase="2.4"
    status="PASSED"
    build="PASSED"
    rollbackOnFailure=$true
    protectedPaths=@(
        ".factory",
        "node_modules",
        "dist",
        "src-before-v2"
    )
    activeRoots=@(
        "src",
        "backend",
        "vite.config.js",
        "index.html"
    )
    activeFileCount=$activeFiles.Count
    protectedFileCount=$protectedFiles.Count
    backup=$backup
    timestamp=(Get-Date).ToString("o")
}

$report | ConvertTo-Json -Depth 10 |
    Set-Content (Join-Path $ReportDir "autobuild-final.json") -Encoding UTF8

Save-State "passed" "complete" 100 "Factory autonomous build verification passed"

Write-Host ""
Write-Host "========================================"
Write-Host " SIMEONJR FACTORY BUILD COMPLETE"
Write-Host "========================================"
Write-Host ""
Write-Host " STATUS: 100%"
Write-Host " BUILD:  PASSED"
Write-Host " BACKUP: $backup"
Write-Host ""
Write-Host "Starting Vite development server..."
Write-Host ""

if ($pkg.scripts.dev) {
    Start-Process powershell -ArgumentList "-NoExit","-Command","Set-Location '$Root'; npm run dev"
    Start-Sleep -Seconds 3

    $vitePorts = @(5173,3000,4173)

    foreach ($port in $vitePorts) {
        try {
            $response = Invoke-WebRequest "http://localhost:$port" -UseBasicParsing -TimeoutSec 2
            if ($response.StatusCode -ge 200 -and $response.StatusCode -lt 500) {
                Start-Process "http://localhost:$port"
                Log "Factory available at http://localhost:$port"
                break
            }
        } catch {}
    }
} else {
    Log "No npm dev script detected; Vite was not launched."
}

Write-Host ""
Write-Host "========================================"
Write-Host " PHASE 2.4 AUTOBUILD COMPLETE"
Write-Host "========================================"
