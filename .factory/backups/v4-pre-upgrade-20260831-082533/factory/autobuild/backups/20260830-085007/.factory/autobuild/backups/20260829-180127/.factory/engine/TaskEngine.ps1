function Get-FactoryState {
    $path = ".factory\state\factory-state.json"

    if (!(Test-Path $path)) {
        throw "Factory state missing."
    }

    return Get-Content $path -Raw | ConvertFrom-Json
}

function Get-TaskQueue {
    $path = ".factory\engine\tasks\phase-1.json"

    if (!(Test-Path $path)) {
        throw "Task queue missing."
    }

    return Get-Content $path -Raw | ConvertFrom-Json
}

function Get-NextSafeTask {
    $tasks = Get-TaskQueue
    $state = Get-FactoryState

    foreach ($task in $tasks) {
        if ($task.status -ne "pending") {
            continue
        }

        $dependenciesPassed = $true

        foreach ($dependency in $task.dependencies) {
            if ($state.completedModules -notcontains $dependency) {
                $dependenciesPassed = $false
                break
            }
        }

        if ($dependenciesPassed) {
            return $task
        }
    }

    return $null
}

function Save-EngineState($state) {
    $state |
        ConvertTo-Json -Depth 20 |
        Set-Content ".factory\engine\engine.json" -Encoding UTF8
}

$next = Get-NextSafeTask

if ($null -eq $next) {
    Write-Host "No safe task available." -ForegroundColor Yellow
    exit 1
}

Write-Host "NEXT SAFE TASK:" -ForegroundColor Cyan
Write-Host "$($next.id) — $($next.name)" -ForegroundColor Green

$engine = Get-Content ".factory\engine\engine.json" -Raw |
    ConvertFrom-Json

$engine.execution.currentTask = $next.id
$engine.execution.running = $false
$engine.execution.attempt = 0

Save-EngineState $engine
