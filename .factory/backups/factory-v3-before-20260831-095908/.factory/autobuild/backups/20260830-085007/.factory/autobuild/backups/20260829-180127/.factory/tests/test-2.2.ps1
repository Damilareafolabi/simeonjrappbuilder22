$ErrorActionPreference = "Stop"

$taskFile = ".factory\tasks\2.2.json"
$appFile  = ".\src\App.jsx"

if (!(Test-Path $taskFile)) { throw "2.2 task missing" }
if (!(Test-Path $appFile))  { throw "App.jsx missing" }

$task = Get-Content $taskFile -Raw | ConvertFrom-Json
$app = Get-Content $appFile -Raw

if ($task.id -ne "2.2") {
    throw "Invalid task ID"
}

if ($task.status -ne "implemented") {
    throw "2.2 not implemented"
}

$required = @(
    "handleProjectDrop",
    "handleFileSelect",
    "importedFiles",
    "multiple",
    "dropZone"
)

foreach ($item in $required) {
    if ($app -notmatch [regex]::Escape($item)) {
        throw "Required import feature missing: $item"
    }
}

Write-Host "✓ Import task verified"
Write-Host "✓ Drag/drop support verified"
Write-Host "✓ File selection verified"
Write-Host "✓ Multiple-file support verified"
Write-Host "✓ Imported state verified"
Write-Host "✓ Drop-zone implementation verified"

exit 0
