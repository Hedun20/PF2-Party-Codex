@echo off
setlocal
cd /d "%~dp0\.."

if not exist node_modules (
  echo Installing PF2 Party Codex dependencies...
  call npm.cmd install
  if errorlevel 1 (
    echo Dependency install failed.
    pause
    exit /b 1
  )
)

echo Building PF2 Party Codex frontend...
call npm.cmd run build
if errorlevel 1 (
  echo Build failed.
  pause
  exit /b 1
)

echo Starting PF2 Party Codex server...
echo Local URL: http://localhost:3050
echo LAN URL will be printed by the server after startup.
start "PF2 Party Codex Server" cmd.exe /k "cd /d %cd% && npm.cmd run start --workspace apps/server"

timeout /t 3 /nobreak >nul
start "" http://localhost:3050

echo Browser opened. Keep the server window running while you play.
pause
