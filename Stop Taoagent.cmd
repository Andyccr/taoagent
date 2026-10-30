@echo off
setlocal
cd /d "%~dp0"
set "NODE_OPTIONS="
set "NODE_PATH="
echo Stop this Taoagent service? Running work will be interrupted and queued messages paused.
choice /C YN /N /M "Press Y to stop, or N to keep it running: "
if errorlevel 2 exit /b 0
"runtime\node.exe" launcher.mjs --stop
if errorlevel 1 pause
