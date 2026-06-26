@echo off
title ICA Weekly Report Application
echo.
echo  =============================================
echo   ICA Weekly Report Application
echo  =============================================
echo.
echo  Starting server on http://localhost:5000
echo  Opening browser...
echo.
echo  Press Ctrl+C to stop the server.
echo.

:: Load .env if it exists
if exist backend\.env (
  for /f "usebackq tokens=1,* delims==" %%a in ("backend\.env") do (
    if not "%%a"=="" if not "%%a:~0,1%"=="#" set %%a=%%b
  )
)

set NODE_ENV=production
cd /d "%~dp0"
start "" "http://localhost:5000"
node backend/server.js
pause
