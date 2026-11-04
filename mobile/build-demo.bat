@echo off
cd /d "%~dp0"
echo === BUILD DEMO WEB === > webbuild-demo.log
if exist dist rmdir /s /q dist
set "EXPO_PUBLIC_DEMO=1"
set "EXPO_PUBLIC_API_URL=http://localhost:8000"
set PYTHONIOENCODING=utf-8
call npx --yes expo export --platform web >> webbuild-demo.log 2>&1
call node scripts/inject-pwa.js >> webbuild-demo.log 2>&1
echo === EXITCODE %ERRORLEVEL% === >> webbuild-demo.log
