@echo off
setlocal

set "ROOT=%~dp0"
set "BACKEND=%ROOT%pudong-medical-platform\backend"
set "FRONTEND=%ROOT%medical-gis-front"

if not exist "%BACKEND%\package.json" (
    echo Backend project not found: %BACKEND%
    pause
    exit /b 1
)

if not exist "%FRONTEND%\package.json" (
    echo Frontend project not found: %FRONTEND%
    pause
    exit /b 1
)

start "Medical Platform Backend" /D "%BACKEND%" cmd /k "npm run start"
start "Medical Platform Frontend" /D "%FRONTEND%" cmd /k "npm run dev"

timeout /t 3 /nobreak >nul
start "" "http://localhost:5173"

endlocal