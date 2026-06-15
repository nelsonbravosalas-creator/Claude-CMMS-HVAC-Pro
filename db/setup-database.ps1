# CMMS HVAC PRO — Setup inicial de la base de datos Neon
# Ejecutar desde PowerShell en la raiz del proyecto:
# cd "C:\Users\The Pirata\Documents\Google Drive\APPS\CLAUDE CODE - HVAC PRO"
# .\db\setup-database.ps1

$ROOT = Split-Path -Parent $PSScriptRoot
$EnvFile = Join-Path $ROOT ".env.local"

Write-Host ""
Write-Host "=== CMMS HVAC PRO — Setup Base de Datos ===" -ForegroundColor Cyan
Write-Host ""

# Verificar .env.local
if (-not (Test-Path $EnvFile)) {
    Write-Host "No se encontro el archivo .env.local" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Ingresa tu DATABASE_URL de Neon:"
    Write-Host "(La encuentras en https://console.neon.tech -> Connection string)"
    Write-Host ""
    $dbUrl = Read-Host "DATABASE_URL"

    if ([string]::IsNullOrWhiteSpace($dbUrl)) {
        Write-Host "No ingresaste una URL. Proceso cancelado." -ForegroundColor Red
        exit 1
    }

    # Generar JWT_SECRET aleatorio
    $jwtSecret = -join ((1..48) | ForEach-Object { [char](Get-Random -Min 65 -Max 91) })

    # Crear .env.local
    @"
DATABASE_URL=$dbUrl
JWT_SECRET=$jwtSecret
"@ | Set-Content -Path $EnvFile -Encoding UTF8

    Write-Host ""
    Write-Host ".env.local creado." -ForegroundColor Green
}

# Instalar dependencias de la raiz
Write-Host ""
Write-Host "Instalando dependencias..." -ForegroundColor Yellow
Set-Location $ROOT
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "Error en npm install" -ForegroundColor Red
    exit 1
}

# Ejecutar migraciones
Write-Host ""
Write-Host "Aplicando migraciones..." -ForegroundColor Yellow
node db/run-migrations.js
if ($LASTEXITCODE -ne 0) {
    Write-Host "Las migraciones fallaron. Revisa el error." -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "=== Base de datos inicializada con exito ===" -ForegroundColor Green
Write-Host ""
Write-Host "Credenciales de prueba:" -ForegroundColor Cyan
Write-Host "  Admin   : admin@demo.com     / Admin1234!"
Write-Host "  Tecnico : tecnico@demo.com   / Tecnico123!"
Write-Host ""
Write-Host "Ahora debes configurar en Vercel las variables de entorno." -ForegroundColor Yellow
Write-Host "Ve a: https://vercel.com/d-los-cabros-s-projects/claude-cmms-hvac-pro/settings/environment-variables"
Write-Host ""
Write-Host "Agrega:"
Write-Host "  DATABASE_URL  = (el mismo que en .env.local)"
Write-Host "  JWT_SECRET    = (el mismo que en .env.local)"
Write-Host "  VITE_API_URL  = https://claude-cmms-hvac-pro.vercel.app"
Write-Host ""
