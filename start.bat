@echo off
setlocal

echo ========================================================
echo   MarkSure - OIML R-76 Digital Verification Platform
echo ========================================================
echo.
echo Starting Backend Server on http://localhost:5001 ...
echo Starting Frontend Client on http://localhost:5173 ...
echo.

:: Launch default browser to client URL after 3 seconds in background
start "" /b powershell -Command "Start-Sleep -Seconds 3; Start-Process 'http://localhost:5173'"

:: Run dev servers concurrently
call npm run dev
