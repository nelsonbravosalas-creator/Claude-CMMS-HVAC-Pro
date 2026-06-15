@echo off
cd /d "%~dp0"
echo.
echo === CMMS HVAC PRO - Push a GitHub ===
echo.
PowerShell -ExecutionPolicy Bypass -File .\push-to-github.ps1
pause
