# MarkSure Start Script for PowerShell
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "  MarkSure - Launching Development Servers" -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "Server: http://localhost:5001" -ForegroundColor Yellow
Write-Host "Client: http://localhost:5173" -ForegroundColor Yellow
Write-Host ""

Start-Job -ScriptBlock {
    Start-Sleep -Seconds 3
    Start-Process "http://localhost:5173"
} | Out-Null

npm run dev
