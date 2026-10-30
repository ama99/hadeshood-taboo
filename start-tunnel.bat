@echo off
title HadesHood Taboo - Server & Cloudflare Tunnel
cd /d "%~dp0"

echo ========================================================
echo   1. Starting HadesHood Taboo Server on port 5173...
echo ========================================================
start "HadesHood Taboo Server" cmd /k "npm run dev"

timeout /t 3 /nobreak >nul

echo ========================================================
echo   2. Starting Cloudflare HTTPS Tunnel...
echo   IMPORTANT: Every time you run this file, Cloudflare
echo   creates a NEW random .trycloudflare.com link!
echo   Look for the box below with your new link:
echo ========================================================
if exist "C:\Program Files (x86)\cloudflared\cloudflared.exe" (
    "C:\Program Files (x86)\cloudflared\cloudflared.exe" tunnel --url http://localhost:5173
) else if exist "C:\Program Files\cloudflared\cloudflared.exe" (
    "C:\Program Files\cloudflared\cloudflared.exe" tunnel --url http://localhost:5173
) else (
    cloudflared tunnel --url http://localhost:5173
)
pause
