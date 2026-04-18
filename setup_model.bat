@echo off
echo ========================================
echo   CuraLink - Ollama Model Setup
echo ========================================
echo.
echo [1/3] Pulling llama3:8b model (~4.7GB)...
echo This may take 10-15 minutes on first run.
echo.
"C:\Users\sachi\AppData\Local\Programs\Ollama\ollama.exe" pull llama3:8b
echo.
echo [2/3] Creating custom CuraLink model...
"C:\Users\sachi\AppData\Local\Programs\Ollama\ollama.exe" create curalink -f Modelfile
echo.
echo [3/3] Starting Ollama server...
start "" "C:\Users\sachi\AppData\Local\Programs\Ollama\ollama.exe" serve
echo.
echo Done! CuraLink model ready.
echo Backend will auto-detect: llama3:8b or curalink
pause
