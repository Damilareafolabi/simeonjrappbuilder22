function Get-FactoryState {
    $path = ".factory\state\factory-state.json"

    if (!(Test-Path $path)) {
        throw "Factory state missing."
    }

    Get-Content $path -Raw | ConvertFrom-Json
}

function Get-TaskQueue {
    $path = ".factory\engine\tasks\phase-1.json"

    if (!(Test-Path $path)) {
        throw "Task queue missing."
    }

    Get-Content $path -Raw | ConvertFrom-Json
}

function Test-DependenciesPassed($task, $state) {

    foreach ($dependency in $task.dependencies) {

        if ($state.completedModules -notcontains $dependency) {
            return $false
        }
    }

    return $true
}

function Get-NextTask {

    $state = Get-FactoryState
    $tasks = Get-TaskQueue

    $candidates = @()

    foreach ($task in $tasks) {

        if ($task.status -ne "pending") {
            continue
        }

        if (Test-DependenciesPassed $task $state) {
            $candidates += $task
        }
    }

    if ($candidates.Count -eq 0) {
        return $null
    }

    return $candidates |
        Sort-Object priority |
        Select-Object -First 1
}

function Set-PlannerSelection($task) {

    $enginePath = ".factory\engine\engine.json"

    $engine = Get-Content $enginePath -Raw |
        ConvertFrom-Json

    $engine.execution.currentTask = $task.id
    $engine.execution.running = $false
    $engine.execution.attempt = 0

    $engine.planner = @{
        lastSelection = $task.id
        selectedAt = (Get-Date).ToString("o")
    }

    $engine |
        ConvertTo-Json -Depth 20 |
        Set-Content $enginePath -Encoding UTF8
}

$next = Get-NextTask

if ($null -eq $next) {
    throw "No safe pending task found."
}

Set-PlannerSelection $next

Write-Host "NEXT SAFE TASK:" -ForegroundColor Cyan
Write-Host "$($next.id) — $($next.name)" -ForegroundColor Green
Write-Host "Priority: $($next.priority)" -ForegroundColor Gray
