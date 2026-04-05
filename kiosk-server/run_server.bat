@echo off
setlocal
cd /d "%~dp0"

echo Starting Kiosk Server...
.\venv\Scripts\python -m uvicorn server:app --host 0.0.0.0 --port 5000 --reload --log-level info

pause
