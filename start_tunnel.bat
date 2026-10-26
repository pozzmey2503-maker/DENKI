@echo off
title DenKi HTTPS Tunnel Dev Server (iOS Safari OTA Ready)
cd /d "%~dp0"
echo ========================================================
echo  Starting DenKi Dev Server with Cloudflare HTTPS Tunnel
echo  (Required for iOS Safari itms-services OTA installs)
echo ========================================================
python serve.py 3000 --tunnel
pause
