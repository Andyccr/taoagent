@echo off
setlocal
cd /d "%~dp0"
set "NODE_OPTIONS="
set "NODE_PATH="
"runtime\node.exe" launcher.mjs --check
pause
