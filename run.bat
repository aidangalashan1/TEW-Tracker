@echo off
title TEW Tracker
cd /d "%~dp0"

if not defined TEW_API_PORT set TEW_API_PORT=8567

:: Kill any lingering process on the API port so we can start fresh
for /f "tokens=5" %%p in ('netstat -ano ^| findstr ":%TEW_API_PORT% "') do (
  if not "%%p"=="0" taskkill /F /PID %%p >nul 2>&1
)
timeout /t 1 /nobreak >nul

:: Check if production build exists
if exist "dist-python\main\main.exe" if exist "dist\index.html" goto prod
goto dev

:prod
echo Building frontend...
call npm run build:react
if %errorlevel% neq 0 (
  echo Frontend build failed! Check for errors above.
  pause
  exit /b 1
)
echo.
echo Starting TEW Tracker (production mode)...
echo.
:: Clear Electron cache from previous run
if exist "%LOCALAPPDATA%\TEW Tracker\Cache" rmdir /s /q "%LOCALAPPDATA%\TEW Tracker\Cache" >nul 2>&1
if exist "%LOCALAPPDATA%\TEW Tracker\GPUCache" rmdir /s /q "%LOCALAPPDATA%\TEW Tracker\GPUCache" >nul 2>&1
if not exist "node_modules\" (
  echo Installing dependencies...
  call npm install
  echo.
)
start "TEW Tracker - Python Backend" /B /MIN python python/main.py
if %errorlevel% neq 0 (
  start "TEW Tracker - Python Backend" /B /MIN "dist-python\main\main.exe"
)
echo Waiting for backend...
:wait
timeout /t 1 /nobreak >nul
powershell -Command "try { (Invoke-WebRequest -Uri 'http://127.0.0.1:%TEW_API_PORT%/api/health' -UseBasicParsing).StatusCode -eq 200 } catch { $false }" >nul 2>&1 && goto launch
goto wait
:launch
if exist "node_modules\.bin\electron.cmd" (
  cmd /c "set TEW_PROD=1 && npx electron ."
) else (
  echo Electron not found. Opening in browser instead...
  start http://127.0.0.1:5173
)
goto end

:dev
echo Installing dependencies if needed...
if not exist "node_modules\" call npm install
echo.
npm run dev
goto end

:end
pause
