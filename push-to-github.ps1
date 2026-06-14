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

if (-not (Test-Path ".gitignore")) {
    $gitignoreContent = "node_modules/`ndist/`n.env`n.env.local`n*.log`n~$*"
    Set-Content -Path ".gitignore" -Value $gitignoreContent -Encoding utf8
}

Write-Host "Agregando archivos..." -ForegroundColor Yellow
git add -A

$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm"
git commit -m "feat: Sprint 1 completo - Router v7 + Auth + Shell + Vercel config ($timestamp)"

Write-Host "Subiendo a GitHub..." -ForegroundColor Yellow
git push --force-with-lease origin $BRANCH

Write-Host ""
Write-Host "Listo. Revisa: https://github.com/nelsonbravosalas-creator/Claude-CMMS-HVAC-Pro" -ForegroundColor Green
Write-Host ""
Write-Host "Presiona Enter para cerrar..."
Read-Host
