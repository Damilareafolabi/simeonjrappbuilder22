param(
    [string]$ProjectPath = "."
)

$ErrorActionPreference = "Stop"

$ProjectPath = (Resolve-Path $ProjectPath).Path
$output = Join-Path $ProjectPath ".factory\state\project-analysis.json"

$excluded = @(
    "node_modules",
    ".git",
    "dist",
    ".factory"
)

$files = Get-ChildItem $ProjectPath -File -Recurse |
    Where-Object {
        $relative = $_.FullName.Substring($ProjectPath.Length).TrimStart("\")
        $parts = $relative -split "\\"
        -not ($parts | Where-Object { $excluded -contains $_ })
    }

$extensions = @{}

foreach ($file in $files) {
    $ext = $file.Extension.ToLower()

    if ([string]::IsNullOrWhiteSpace($ext)) {
        $ext = "[no-extension]"
    }

    if ($extensions.ContainsKey($ext)) {
        $extensions[$ext]++
    }
    else {
        $extensions[$ext] = 1
    }
}

$packageJson = Test-Path (Join-Path $ProjectPath "package.json")
$viteConfig = (
    (Test-Path (Join-Path $ProjectPath "vite.config.js")) -or
    (Test-Path (Join-Path $ProjectPath "vite.config.ts")) -or
    (Test-Path (Join-Path $ProjectPath "vite.config.mjs"))
)

$srcDirectory = Test-Path (Join-Path $ProjectPath "src")
$backendDirectory = Test-Path (Join-Path $ProjectPath "backend")

$framework = "unknown"

if ($packageJson) {
    try {
        $pkg = Get-Content (Join-Path $ProjectPath "package.json") -Raw |
            ConvertFrom-Json

        $deps = @()

        if ($pkg.dependencies) {
            $deps += $pkg.dependencies.PSObject.Properties.Name
        }

        if ($pkg.devDependencies) {
            $deps += $pkg.devDependencies.PSObject.Properties.Name
        }

        if ($deps -contains "react") {
            $framework = "react"
        }
        elseif ($deps -contains "vue") {
            $framework = "vue"
        }
        elseif ($deps -contains "@angular/core") {
            $framework = "angular"
        }
        elseif ($deps -contains "svelte") {
            $framework = "svelte"
        }
    }
    catch {
        $framework = "node-compatible"
    }
}

$result = [PSCustomObject]@{
    analyzedAt = (Get-Date).ToString("o")
    projectPath = $ProjectPath
    fileCount = $files.Count
    framework = $framework
    hasPackageJson = $packageJson
    hasViteConfig = $viteConfig
    hasSrcDirectory = $srcDirectory
    hasBackendDirectory = $backendDirectory
    extensions = $extensions
    analysisVersion = "1.0"
}

$result | ConvertTo-Json -Depth 20 |
    Set-Content $output -Encoding UTF8

Write-Host "✓ Project analysis generated"
Write-Host "✓ Files detected: $($files.Count)"
Write-Host "✓ Framework detected: $framework"
Write-Host "✓ Analysis persisted: $output"
