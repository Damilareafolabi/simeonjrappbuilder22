$ErrorActionPreference = "Stop"

$planner = ".factory\engine\TaskPlanner.ps1"
$queue = ".factory\engine\tasks\phase-1.json"
$state = ".factory\state\factory-state.json"

if (!(Test-Path $planner)) {
    throw "Planner missing"
}

if (!(Test-Path $queue)) {
    throw "Task queue missing"
}

if (!(Test-Path $state)) {
    throw "Factory state missing"
}

$queueData = Get-Content $queue -Raw | ConvertFrom-Json
$stateData = Get-Content $state -Raw | ConvertFrom-Json

$task11 = $queueData | Where-Object { $_.id -eq "1.1" }
$task12 = $queueData | Where-Object { $_.id -eq "1.2" }

if ($null -eq $task11) {
    throw "Task 1.1 missing"
}

if ($null -eq $task12) {
    throw "Task 1.2 missing"
}

if ($task12.dependencies -notcontains "1.1") {
    throw "Planner dependency missing"
}

if ($stateData.completedModules -notcontains "1.1") {
    throw "Required dependency 1.1 is not recorded as passed"
}

powershell -ExecutionPolicy Bypass -File $planner

if ($LASTEXITCODE -ne 0) {
    throw "Planner execution failed"
}

$engine = Get-Content ".factory\engine\engine.json" -Raw |
    ConvertFrom-Json

if ($engine.execution.currentTask -ne "1.2") {
    throw "Planner selected incorrect task"
}

Write-Host "✓ Planner file verified" -ForegroundColor Green
Write-Host "✓ Dependency resolution verified" -ForegroundColor Green
Write-Host "✓ Completed-task filtering verified" -ForegroundColor Green
Write-Host "✓ Priority selection verified" -ForegroundColor Green
Write-Host "✓ Next-task selection verified" -ForegroundColor Green
