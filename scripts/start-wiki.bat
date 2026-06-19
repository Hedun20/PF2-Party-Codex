@echo off
setlocal
cd /d "%~dp0\.."

if not exist node_modules (
  echo Installing PF2 Party Codex dependencies...
  call npm install
)

echo Starting PF2 Party Codex...
echo Local URL: http://localhost:3050
echo LAN URL will be printed by the server after startup.
start "" http://localhost:3050
call npm run build
call npm run start
