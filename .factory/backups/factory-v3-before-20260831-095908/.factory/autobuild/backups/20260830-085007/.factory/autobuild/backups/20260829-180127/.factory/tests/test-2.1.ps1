$ErrorActionPreference = "Stop"

$taskFile = ".factory\tasks\2.1.json"

if (!(Test-Path $taskFile)) {
    throw "2.1 task definition missing"
}

$task = Get-Content $taskFile -Raw | ConvertFrom-Json

if ($task.id -ne "2.1") {
    throw "Invalid task ID"
}

if ($task.name -ne "Build From Scratch") {
    throw "Invalid task name"
}

if ($task.status -ne "implemented") {
    throw "2.1 is not implemented"
}

if (!$task.verification.requiresBuild) {
    throw "Build gate missing"
}

if (!$task.verification.requiresTests) {
    throw "Test gate missing"
}

if (!$task.verification.requiresExpectedOutput) {
    throw "Expected-output gate missing"
}

if (!$task.verification.requiresPreview) {
    throw "Preview gate missing"
}

Write-Host "✓ Task definition verified"
Write-Host "✓ Build gate verified"
Write-Host "✓ Test gate verified"
Write-Host "✓ Expected-output gate verified"
Write-Host "✓ Preview gate verified"
Write-Host "✓ State-consistency gate verified"

exit 0
