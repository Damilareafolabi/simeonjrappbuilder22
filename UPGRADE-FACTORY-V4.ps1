$ErrorActionPreference="Stop"
Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host " SIMEONJR FACTORY V4 SAFE UPGRADE" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan

$Stamp=Get-Date -Format "yyyyMMdd-HHmmss"
$Backup=".factory\backups\v4-safe-$Stamp"
New-Item -ItemType Directory -Force $Backup | Out-Null

Write-Host "[1/5] Creating safety backup..." -ForegroundColor Yellow
Copy-Item ".\src\App.jsx" "$Backup\App.jsx" -Force
Copy-Item ".\src\App.css" "$Backup\App.css" -Force
Copy-Item ".\backend\server.js" "$Backup\server.js" -Force
Copy-Item ".\package.json" "$Backup\package.json" -Force

Write-Host "[2/5] Updating LM Studio model detection..." -ForegroundColor Yellow
$server=Get-Content ".\backend\server.js" -Raw

if($server -notmatch "getActiveLmModel"){
    $insert="async function getActiveLmModel(){`r`n  try{`r`n    const response=await fetch(LM_STUDIO_URL + '/v1/models');`r`n    if(!response.ok)return LM_MODEL;`r`n    const data=await response.json();`r`n    return data?.data?.[0]?.id || LM_MODEL;`r`n  }catch{return LM_MODEL;}`r`n}`r`n`r`n"
    $server=$server.Replace("async function lmChat({",$insert+"async function lmChat({")
}

$server=$server.Replace("model: LM_MODEL,","model: await getActiveLmModel(),")

Set-Content ".\backend\server.js" $server -Encoding UTF8

Write-Host "[3/5] Marking frontend V4..." -ForegroundColor Yellow
$app=Get-Content ".\src\App.jsx" -Raw

if($app -notmatch "SIMEONJR_FACTORY_V4"){
    $app=$app.Replace("function App() {","/* SIMEONJR_FACTORY_V4 */`r`nfunction App() {")
    Set-Content ".\src\App.jsx" $app -Encoding UTF8
}

Write-Host "[4/5] Validating backend..." -ForegroundColor Yellow
node --check ".\backend\server.js"
if($LASTEXITCODE -ne 0){
    throw "Backend syntax validation FAILED. Backup remains at $Backup"
}
Write-Host "      Backend syntax: PASS" -ForegroundColor Green

Write-Host "[5/5] Running production build..." -ForegroundColor Yellow
if(!(Test-Path ".\node_modules")){
    npm install
}
npm run build

if($LASTEXITCODE -ne 0){
    throw "Production build FAILED. Backup remains at $Backup"
}

Write-Host ""
Write-Host "============================================" -ForegroundColor Green
Write-Host " SIMEONJR FACTORY V4 COMPLETE" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Green
Write-Host ""
Write-Host "Backup: $Backup" -ForegroundColor Cyan
Write-Host "Backend syntax: PASS" -ForegroundColor Green
Write-Host "Frontend build: PASS" -ForegroundColor Green
Write-Host "LM Studio dynamic model detection: ENABLED" -ForegroundColor Green
Write-Host ""
