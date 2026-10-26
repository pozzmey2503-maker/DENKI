@echo off
title DenKi Local Dev Server
cd /d "%~dp0"
python serve.py 3000 %*
pause
