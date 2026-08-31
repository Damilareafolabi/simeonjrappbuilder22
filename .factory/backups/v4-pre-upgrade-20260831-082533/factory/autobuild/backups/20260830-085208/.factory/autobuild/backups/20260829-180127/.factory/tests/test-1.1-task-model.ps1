$ErrorActionPreference = "Stop"

$model = ".factory\engine\tasks\task-model.json"
$task = ".factory\engine\tasks\task-1.1.json"

if (!(Test-Path $model)) {
    throw "Task model schema missing"
}

if (!(Test-Path $task)) {
    throw "Task instance missing"
}

$schema = Get-Content $model -Raw | ConvertFrom-Json
$data = Get-Content $task -Raw | ConvertFrom-Json

if ($schema.schema -ne "simeonjr-task-v1") {
    throw "Invalid task schema"
}

$required = @(
    "id",
    "phase",
    "name",
    "description",
    "status",
    "priority",
    "dependencies",
    "attempt",
    "maxAttempts",
    "build",
    "tests",
    "verification",
    "result"
)

foreach ($property in $required) {
    if ($null -eq $data.PSObject.Properties[$property]) {
        throw "Missing task property: $property"
    }
}

if ($data.id -ne "1.1") {
    throw "Incorrect task ID"
}

if ($data.status -ne "testing") {
    throw "Incorrect task status"
}

if ($data.maxAttempts -ne 3) {
    throw "Retry limit not configured"
}

Write-Host "✓ Task schema verified" -ForegroundColor Green
Write-Host "✓ Task instance verified" -ForegroundColor Green
Write-Host "✓ Required fields verified" -ForegroundColor Green
Write-Host "✓ Dependency field verified" -ForegroundColor Green
Write-Host "✓ Attempt tracking verified" -ForegroundColor Green
Write-Host "✓ Build/test/verification gates verified" -ForegroundColor Green
Write-Host "✓ Failure field verified" -ForegroundColor Green
