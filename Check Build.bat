@echo off
setlocal
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\project-tools.ps1" -Action Build %*
exit /b %ERRORLEVEL%
