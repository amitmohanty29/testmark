# MarkSure Setup Script for PowerShell
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "  MarkSure - OIML R-76 Platform Automated Setup" -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host ""

# 1. Check Node.js
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "[ERROR] Node.js is not found in PATH! Please install Node.js v18 or later." -ForegroundColor Red
    Exit 1
}

$nodeVersion = node -v
Write-Host "[1/4] Found Node.js: $nodeVersion" -ForegroundColor Green

# 2. Check Environment Variables
Write-Host "[2/4] Checking server environment config..." -ForegroundColor Yellow
if (-not (Test-Path "server\.env")) {
    Copy-Item "server\.env.example" "server\.env"
    Write-Host "server\.env created successfully." -ForegroundColor Green
} else {
    Write-Host "server\.env already exists." -ForegroundColor Gray
}

# 3. Install Dependencies
Write-Host "[3/4] Installing dependencies across root, server, and client..." -ForegroundColor Yellow
npm run install:all
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Dependency installation failed." -ForegroundColor Red
    Exit 1
}

# 4. Database Setup & Seeding
Write-Host "[4/4] Synchronizing SQLite database schema and seeding demo data..." -ForegroundColor Yellow
Push-Location server
npx prisma db push --skip-generate
npx tsx src/seed.ts
Pop-Location

Write-Host ""
Write-Host "========================================================" -ForegroundColor Green
Write-Host "  Setup Completed Successfully!" -ForegroundColor Green
Write-Host "========================================================" -ForegroundColor Green
Write-Host "Run .\start.ps1 or npm run dev to launch the application." -ForegroundColor Cyan
