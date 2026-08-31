@echo off
setlocal
cd /d "C:\Users\LUMEN GLOB AL\Desktop\SimeonJrAppBuilder"

echo ============================================================
echo SIMEONJR FACTORY AUTO-RESUME
echo ============================================================
echo.
echo Checking saved factory state...

if not exist ".factory\jobs\state\real-project-001.checkpoint.json" (
    echo No resumable job found.
    exit /b 0
)

echo Resumable job detected.
echo Starting SimeonJr resume controller...
echo.

powershell.exe -NoProfile -ExecutionPolicy Bypass -File ".factory\engine\Resume-SimeonJr.ps1"

echo.
echo SimeonJr resume controller finished.
