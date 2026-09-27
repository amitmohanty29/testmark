@echo off
setlocal enabledelayedexpansion

echo ========================================================
echo   MarkSure - OIML R-76 Platform Automated Setup
echo ========================================================
echo.

:: 1. Check Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not found in PATH!
    echo Please install Node.js v18 or later from https://nodejs.org/
    pause
    exit /b 1
)

echo [1/4] Found Node.js:
node -v
echo.

:: 2. Setup Environment Variables
echo [2/4] Checking server environment config...
if not exist "server\.env" (
    echo Creating server\.env from server\.env.example...
    copy "server\.env.example" "server\.env" >nul
    echo server\.env created successfully.
) else (
    echo server\.env already exists.
)
echo.

:: 3. Install Dependencies
echo [3/4] Installing root, server, and client dependencies...
call npm run install:all
if %errorlevel% neq 0 (
    echo [ERROR] Dependency installation encountered an error.
    pause
    exit /b 1
)
echo.

:: 4. Database Setup & Seeding
echo [4/4] Synchronizing SQLite database schema and seeding demo data...
cd server
call npx prisma db push --skip-generate
call npx tsx src/seed.ts
cd ..
echo.

echo ========================================================
echo   Setup Completed Successfully!
echo ========================================================
echo.
echo You can now start the application by running:
echo     start.bat
echo   or
echo     npm run dev
echo.
echo Client URL: http://localhost:5173
echo Server API: http://localhost:5001
echo.
echo Demo Accounts:
echo   - Admin:             admin@marksure.gov.in / Pass@123
echo   - Testing Officer:   officer.test@marksure.gov.in / Pass@123
echo   - Reviewing Officer: officer.review@marksure.gov.in / Pass@123
echo.
pause
