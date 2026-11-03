@echo off
setlocal
cd /d "%~dp0"

if not exist node_modules (
  echo Installazione dipendenze...
  call npm install
  if errorlevel 1 (
    echo Installazione fallita.
    pause
    exit /b 1
  )
)

start "AULA Tool Server" cmd /c "npm run dev"
timeout /t 3 >nul

if exist "C:\Program Files\Google\Chrome\Application\chrome.exe" (
  start "" "C:\Program Files\Google\Chrome\Application\chrome.exe" "http://127.0.0.1:5199"
) else (
  start "" "http://127.0.0.1:5199"
)

endlocal
