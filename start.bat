@echo off
echo ========================================
echo   Curalink - AI Medical Research Assistant
echo ========================================
echo.
echo [1/3] Make sure Ollama is running...
echo       Run: ollama serve
echo       Pull model: ollama pull mistral
echo.
echo [2/3] Starting Backend (port 5000)...
start cmd /k "cd /d %~dp0backend && npm run dev"
timeout /t 3 /nobreak > nul

echo [3/3] Starting Frontend (port 5173)...
start cmd /k "cd /d %~dp0frontend && npm run dev"
timeout /t 3 /nobreak > nul

echo.
echo ✅ Curalink is starting!
echo    Frontend: http://localhost:5173
echo    Backend:  http://localhost:5000
echo.
pause
