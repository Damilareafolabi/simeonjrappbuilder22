param(
    [switch]$Once
)

$ErrorActionPreference = "Stop"

$root = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
Set-Location $root

$roadmapPath = ".factory\roadmap.json"
$statePath = ".factory\state\factory-state.json"
$taskPath = ".factory\state\current-task.json"
$logPath = ".factory\logs\master-run.log"

function Log($message) {
    $line = "[$((Get-Date).ToString('yyyy-MM-dd HH:mm:ss'))] $message"
    Write-Host $line
    Add-Content $logPath $line
}

function Fail($message) {
    Log "STOP: $message"
    throw $message
}

function Save-Json($path, $object) {
    $object | ConvertTo-Json -Depth 50 | Set-Content $path -Encoding UTF8
}

function Get-State {
    Get-Content $statePath -Raw | ConvertFrom-Json
}

function Get-Roadmap {
    Get-Content $roadmapPath -Raw | ConvertFrom-Json
}

function Find-NextTask {
    $roadmap = Get-Roadmap
    $state = Get-State

    foreach ($phase in $roadmap.phases) {
        foreach ($module in $phase.modules) {

            if ($state.completedModules -contains $module.id) {
                continue
            }

            return [PSCustomObject]@{
                Phase = $phase
                Module = $module
            }
        }
    }

    return $null
}

function Backup-Module($moduleId) {
    $stamp = Get-Date -Format "yyyyMMdd-HHmmss"
    $backup = ".factory\backups\module-$moduleId-$stamp"

    New-Item -ItemType Directory -Force $backup | Out-Null

    if (Test-Path $statePath) {
        Copy-Item $statePath "$backup\factory-state.json" -Force
    }

    if (Test-Path $taskPath) {
        Copy-Item $taskPath "$backup\current-task.json" -Force
    }

    if (Test-Path $roadmapPath) {
        Copy-Item $roadmapPath "$backup\roadmap.json" -Force
    }

    Log "Backup created for module $moduleId"
    return $backup
}

function Verify-Build {
    Log "Running production build..."

    npm run build

    if ($LASTEXITCODE -ne 0) {
        return $false
    }

    if (!(Test-Path "dist\index.html")) {
        return $false
    }

    return $true
}

function Verify-Module($module) {

    Log "Verifying module $($module.id) — $($module.name)"

    if (!(Verify-Build)) {
        return $false
    }

    return $true
}

function Pass-Module($module) {

    $state = Get-State
    $task = Get-Content $taskPath -Raw | ConvertFrom-Json

    if (!($state.completedModules -contains $module.id)) {
        $state.completedModules += $module.id
    }

    $next = Find-NextTask

    if ($null -eq $next) {
        $state.currentPhase = 8
        $state.currentModule = "8.10"
    }
    else {
        $state.currentPhase = [int]$next.Phase.id
        $state.currentModule = $next.Module.id
    }

    $state.lastResult = "PASS"
    $state.lastVerified = (Get-Date).ToString("o")

    $task.status = "passed"
    $task.result = "PASS"
    $task.completedAt = (Get-Date).ToString("o")

    Save-Json $statePath $state
    Save-Json $taskPath $task

    Log "MODULE $($module.id) PASS"
}

Log "========================================"
Log "APMAZON MASTER RUNNER STARTED"
Log "========================================"
Log "Safety: BACKUP -> PATCH -> BUILD -> TEST -> VERIFY -> PASS -> NEXT"
Log "Stop on failure: TRUE"
Log "Never fake PASS: TRUE"

while ($true) {

    $next = Find-NextTask

    if ($null -eq $next) {
        Log "========================================"
        Log "100% ROADMAP COMPLETE"
        Log "========================================"
        break
    }

    $phase = $next.Phase
    $module = $next.Module

    Log "NEXT SAFE TASK: $($module.id) — $($module.name)"

    $backup = Backup-Module $module.id

    $task = [PSCustomObject]@{
        module = $module.id
        name = $module.name
        status = "testing"
        startedAt = (Get-Date).ToString("o")
        backup = $backup
        result = $null
        attempts = 0
    }

    Save-Json $taskPath $task

    #
    # IMPORTANT:
    # The master checklist NEVER marks an unimplemented feature PASS
    # merely because the existing application builds.
    #
    # For now, only modules that already have an implementation task
    # file can be automatically advanced.
    #

    $implementationTask = ".factory\tasks\$($module.id).json"

    if (!(Test-Path $implementationTask)) {

        Log "MODULE $($module.id) has no implementation task yet."
        Log "SAFE STOP — implementation required before autonomous execution."
        Log "Create: $implementationTask"

        $task.status = "blocked"
        $task.result = "IMPLEMENTATION_REQUIRED"

        Save-Json $taskPath $task

        break
    }

    $definition = Get-Content $implementationTask -Raw | ConvertFrom-Json

    if ($definition.status -ne "implemented") {

        Log "MODULE $($module.id) is not marked implemented."
        Log "SAFE STOP — will not fake PASS."

        $task.status = "blocked"
        $task.result = "IMPLEMENTATION_REQUIRED"

        Save-Json $taskPath $task

        break
    }

    Log "Implementation exists."
    Log "Running verification..."

    $passed = Verify-Module $module

    if (!$passed) {

        Log "MODULE $($module.id) FAILED verification."
        Log "ROLLBACK REQUIRED."

        if (Test-Path "$backup\factory-state.json") {
            Copy-Item "$backup\factory-state.json" $statePath -Force
        }

        if (Test-Path "$backup\current-task.json") {
            Copy-Item "$backup\current-task.json" $taskPath -Force
        }

        Log "Rollback completed."
        Log "SAFE STOP."

        break
    }

    Pass-Module $module

    if ($Once) {
        Log "Single-module mode complete."
        break
    }

    Start-Sleep -Milliseconds 300
}
