$ErrorActionPreference = "Stop"
$root = (Get-Location).Path
$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$backup = Join-Path $root ".factory\backups\factory-v3-before-$stamp"

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host " SIMEONJR FACTORY V3 UPGRADE" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan

Write-Host "[1/8] Creating safety backup..." -ForegroundColor Yellow
New-Item -ItemType Directory -Force -Path $backup | Out-Null

foreach ($folder in @("src","backend",".factory")) {
    $source = Join-Path $root $folder
    if (Test-Path $source) {
        Copy-Item $source (Join-Path $backup $folder) -Recurse -Force -ErrorAction SilentlyContinue
    }
}

Write-Host "      Backup: $backup" -ForegroundColor Green

Write-Host "[2/8] Creating Factory architecture..." -ForegroundColor Yellow

foreach ($dir in @(
    "src\components\factory",
    "src\data",
    "src\services",
    ".factory\capabilities",
    ".factory\profiles",
    ".factory\engine",
    ".factory\reports"
)) {
    New-Item -ItemType Directory -Force -Path (Join-Path $root $dir) | Out-Null
}

Write-Host "[3/8] Installing capability registry..." -ForegroundColor Yellow

'{
  "version": "3.0.0",
  "capabilities": [
    "authentication","authorization","database","crud","api",
    "realtime","websockets","file-storage","search","notifications",
    "analytics","charts","payments","subscriptions","multi-tenancy",
    "admin","audit-logs","ai","documents","forms","workflow",
    "automation","reporting","responsive-ui","pwa","testing",
    "production-build","auto-repair"
  ]
}' | Set-Content ".factory\capabilities\registry.json" -Encoding UTF8

Write-Host "[4/8] Installing 30+ application profiles..." -ForegroundColor Yellow

'{
  "profiles": [
    "SaaS","CRM","ERP","E-commerce","Marketplace","Social Network",
    "Messaging","Trading","Finance","Analytics","Research","Survey",
    "Data Collection","LMS","Education","Healthcare","Booking",
    "Inventory","POS","Accounting","HR","Recruitment","Logistics",
    "Real Estate","CMS","Media","AI Assistant","Knowledge Base",
    "Document Platform","Project Management","Task Management",
    "Customer Portal","Membership","Community","Digital Suite",
    "Admin Platform","Developer Platform"
  ]
}' | Set-Content ".factory\profiles\application-profiles.json" -Encoding UTF8

Write-Host "[5/8] Installing factory configuration..." -ForegroundColor Yellow

'{
  "factory": "SimeonJr App Factory",
  "version": "3.0.0",
  "localFirst": true,
  "ai": {
    "provider": "LM Studio",
    "server": "http://127.0.0.1:1234",
    "autoDetectModel": true
  },
  "workspace": {
    "generatedDirectory": "generated",
    "projectsDirectory": "projects"
  },
  "safety": {
    "backupBeforeTransform": true,
    "projectIsolation": true,
    "protectFactory": true,
    "verifyBuildBeforeComplete": true
  },
  "preview": {
    "enabled": true,
    "devices": ["phone","tablet","laptop","desktop"]
  }
}' | Set-Content ".factory\factory-v3.json" -Encoding UTF8

Write-Host "[6/8] Installing factory services..." -ForegroundColor Yellow

@'
export async function factoryHealth() {
  const r = await fetch("http://127.0.0.1:8787/api/health");
  return r.json();
}

export async function aiStatus() {
  const r = await fetch("http://127.0.0.1:8787/api/ai/status");
  return r.json();
}

export async function buildApplication(prompt) {
  const r = await fetch("http://127.0.0.1:8787/api/ai/build", {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({prompt})
  });

  const data = await r.json();

  if (!r.ok || !data.ok) {
    throw new Error(data.error || "Factory build failed");
  }

  return data;
}

export async function getGeneratedFiles() {
  const r = await fetch("http://127.0.0.1:8787/api/generated/files");
  return r.json();
}
'@ | Set-Content "src\services\factoryApi.js" -Encoding UTF8

@'
export const DEVICE_PRESETS = {
  phone: { label: "Phone", width: 390, height: 844 },
  tablet: { label: "Tablet", width: 768, height: 1024 },
  laptop: { label: "Laptop", width: 1440, height: 900 },
  desktop: { label: "Desktop", width: 1920, height: 1080 }
};
'@ | Set-Content "src\services\devicePresets.js" -Encoding UTF8

Write-Host "[7/8] Validating existing factory..." -ForegroundColor Yellow

if (!(Test-Path ".\backend\server.js")) { throw "backend/server.js missing" }
if (!(Test-Path ".\src\App.jsx")) { throw "src/App.jsx missing" }

node --check ".\backend\server.js"

if ($LASTEXITCODE -ne 0) {
    throw "Backend syntax check failed"
}

Write-Host "      Backend syntax: PASS" -ForegroundColor Green
Write-Host "      App.jsx: FOUND" -ForegroundColor Green

Write-Host "[8/8] Running frontend build..." -ForegroundColor Yellow

npm run build

if ($LASTEXITCODE -ne 0) {
    Write-Host "FRONTEND BUILD FAILED" -ForegroundColor Red
    Write-Host "Backup: $backup" -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host " FACTORY V3 FOUNDATION INSTALLED" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Backup: $backup" -ForegroundColor Yellow
Write-Host ""
Write-Host "Factory foundation: READY" -ForegroundColor Green
Write-Host "30+ app profiles: READY" -ForegroundColor Green
Write-Host "Capability registry: READY" -ForegroundColor Green
Write-Host "Device presets: READY" -ForegroundColor Green
Write-Host "Existing backend: PRESERVED" -ForegroundColor Green
Write-Host "Existing generated projects: PRESERVED" -ForegroundColor Green
Write-Host ""
