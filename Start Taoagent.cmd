@echo off
setlocal
cd /d "%~dp0"
set "NODE_OPTIONS="
set "NODE_PATH="
if not exist "runtime\node.exe" (
  echo Extract the complete Taoagent Windows ZIP into a new folder first.
  pause
  exit /b 1
)
"runtime\node.exe" launcher.mjs
if errorlevel 1 pause
