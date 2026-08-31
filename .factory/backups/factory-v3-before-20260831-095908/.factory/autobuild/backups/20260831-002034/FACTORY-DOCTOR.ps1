$ErrorActionPreference="Continue"
$Root=(Get-Location).Path
$Report=Join-Path $Root ".factory\engine\reports\factory-doctor.json"
New-Item -ItemType Directory -Force -Path (Split-Path $Report) | Out-Null

function Check($name,$ok,$detail){
    [PSCustomObject]@{
        check=$name
        status=if($ok){"PASS"}else{"FAIL"}
        detail=$detail
    }
}

$r=@()

$r+=Check "Project root" (Test-Path (Join-Path $Root "package.json")) "package.json"
$r+=Check "Backend" (Test-Path (Join-Path $Root "backend\server.js")) "backend/server.js"
$r+=Check "Frontend App" (Test-Path (Join-Path $Root "src\App.jsx")) "src/App.jsx"
$r+=Check "Frontend CSS" (Test-Path (Join-Path $Root "src\App.css")) "src/App.css"
$r+=Check "Frontend entry" (Test-Path (Join-Path $Root "src\main.jsx")) "src/main.jsx"
$r+=Check "Vite config" (Test-Path (Join-Path $Root "vite.config.js")) "vite.config.js"
$r+=Check "Factory engine" (Test-Path (Join-Path $Root ".factory\engine")) ".factory/engine"
$r+=Check "Roadmap" (Test-Path (Join-Path $Root ".factory\roadmap.json")) ".factory/roadmap.json"
$r+=Check "Phase 2.4 plan" (Test-Path (Join-Path $Root ".factory\engine\reports\transform-plan-2.4.json")) "transform-plan-2.4.json"
$r+=Check "LM Studio" $(
    try {
        $x=Invoke-RestMethod "http://localhost:1234/v1/models" -TimeoutSec 3
        $true
    } catch {$false}
) "http://localhost:1234/v1/models"

$pkg=Get-Content (Join-Path $Root "package.json") -Raw | ConvertFrom-Json

$r+=Check "npm build script" ([bool]$pkg.scripts.build) "package.json scripts.build"
$r+=Check "npm dev script" ([bool]$pkg.scripts.dev) "package.json scripts.dev"
$r+=Check "node_modules" (Test-Path (Join-Path $Root "node_modules")) "node_modules"

Write-Host ""
Write-Host "========================================"
Write-Host " SIMEONJR FACTORY DOCTOR"
Write-Host " FULL DIAGNOSTIC"
Write-Host "========================================"
Write-Host ""

$r | Format-Table -AutoSize

$buildLog=Join-Path $Root ".factory\engine\reports\doctor-build.log"

Write-Host ""
Write-Host "Running production build diagnostic..."
Write-Host ""

& npm.cmd run build 2>&1 | Tee-Object -FilePath $buildLog
$buildCode=$LASTEXITCODE

$r+=Check "Production build" ($buildCode -eq 0) "npm run build"

$files=Get-ChildItem $Root -File -Recurse -Force |
    Where-Object {
        $_.FullName -notlike "$Root\node_modules\*" -and
        $_.FullName -notlike "$Root\dist\*" -and
        $_.FullName -notlike "$Root\.factory\autobuild\backups\*"
    }

$r+=Check "Source scan" ($files.Count -gt 0) "$($files.Count) files inspected"

$failures=@($r | Where-Object status -eq "FAIL")

$result=[PSCustomObject]@{
    timestamp=(Get-Date).ToString("o")
    project=$Root
    totalChecks=$r.Count
    passed=(@($r|Where-Object status -eq "PASS")).Count
    failed=$failures.Count
    checks=$r
    buildLog=$buildLog
}

$result | ConvertTo-Json -Depth 10 |
    Set-Content $Report -Encoding UTF8

Write-Host ""
Write-Host "========================================"
Write-Host " DIAGNOSTIC COMPLETE"
Write-Host "========================================"
Write-Host "PASS: $($result.passed)"
Write-Host "FAIL: $($result.failed)"
Write-Host ""
Write-Host "Report:"
Write-Host $Report
Write-Host ""

if($failures.Count -eq 0){
    Write-Host "FACTORY DOCTOR: ALL CHECKS PASSED"
}else{
    Write-Host "FACTORY DOCTOR FOUND $($failures.Count) ISSUE(S)"
    $failures | Format-Table -AutoSize
}
