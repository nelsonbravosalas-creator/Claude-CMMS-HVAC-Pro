# push-to-github.ps1 - CMMS HVAC PRO
# Ejecutar: PowerShell -ExecutionPolicy Bypass -File .\push-to-github.ps1

$REPO_URL = "https://github.com/nelsonbravosalas-creator/Claude-CMMS-HVAC-Pro.git"
$BRANCH = "main"

Write-Host "=== CMMS HVAC PRO - Push a GitHub ===" -ForegroundColor Cyan

if (-not (Test-Path ".git")) {
    Write-Host "Inicializando repositorio git..." -ForegroundColor Yellow
    git init
    git checkout -b main
}

git config user.email "nelson.bravo.salas@gmail.com"
git config user.name "Nelson Bravo"

$remotes = git remote 2>$null
if ($remotes -contains "origin") {
    git remote set-url origin $REPO_URL
} else {
    git remote add origin $REPO_URL
}

Write-Host "Agregando archivos..." -ForegroundColor Yellow
git add -A

$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm"
git commit -m "feat: backend API + schema base + migration runner + fix equipos API [$timestamp]"

Write-Host "Subiendo a GitHub..." -ForegroundColor Yellow
git push --force-with-lease origin $BRANCH

if ($LASTEXITCODE -ne 0) {
    Write-Host "Reintentando con force..." -ForegroundColor Yellow
    git push --force origin $BRANCH
}

Write-Host ""
if ($LASTEXITCODE -eq 0) {
    Write-Host "Listo. Vercel compilara automaticamente." -ForegroundColor Green
    Write-Host "GitHub  : https://github.com/nelsonbravosalas-creator/Claude-CMMS-HVAC-Pro"
    Write-Host "Vercel  : https://vercel.com/d-los-cabros-s-projects/claude-cmms-hvac-pro"
} else {
    Write-Host "Error al subir. Verifica tu acceso a GitHub." -ForegroundColor Red
}
Write-Host ""
Write-Host "Presiona Enter para cerrar..."
Read-Host
