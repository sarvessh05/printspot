@echo off
setlocal
cd /d "%~dp0"

echo 🚀 Launching PrintSpot Kiosk (Self-Healing Mode)...
echo ===============================================

:: 🛡️ 1. SETUP CLOUD BACKEND
echo [*] Checking Cloud Backend (admin-backend)...
if not exist "admin-backend\venv" (
    echo [!] venv missing. Creating now and installing deps...
    cd admin-backend ; python -m venv venv ; .\venv\Scripts\python -m pip install -r requirements.txt && cd ..
)

:: 🛡️ 2. SETUP KIOSK HARDWARE SERVER
echo [*] Checking Hardware Server (kiosk-server)...
if not exist "kiosk-server\venv" (
    echo [!] venv missing. Creating now and installing deps...
    cd kiosk-server && python -m venv venv && .\venv\Scripts\python -m pip install -r requirements.txt && cd ..
)

:: 🛡️ 3. CHECK FRONTENDS (NODE)
echo [*] Checking Frontends...
if not exist "frontend\node_modules" (
    echo [!] frontend/node_modules missing. Running npm install...
    cd frontend && npm install && cd ..
)
if not exist "admin-frontend\node_modules" (
    echo [!] admin-frontend/node_modules missing. Running npm install...
    cd admin-frontend && npm install && cd ..
)

:: 🛡️ 4. CHECK SUMATRA PDF (IMPORTANT)
echo [*] Checking for SumatraPDF Printer Engine...
if not exist "C:\Program Files\SumatraPDF\SumatraPDF.exe" (
    echo [WARNING] 🔴 SumatraPDF.exe is NOT found in C:\Program Files\SumatraPDF\
    echo [!] Action: Please install SumatraPDF (64-bit) from the official site.
    echo [!] Download: https://www.sumatrapdfreader.org/download-free-pdf-viewer
    echo (You can still run other services, but printing will fail)
    pause
)

echo ===============================================
echo ✅ DEPENDENCIES VERIFIED! STARTING SERVICES...
echo ===============================================

:: Launching in separate windows
start "Cloud API [8083]" cmd /k "cd admin-backend && .\venv\Scripts\python -m uvicorn server:app --host 0.0.0.0 --port 8083"
start "Hardware Kiosk [5000]" cmd /k "cd kiosk-server ; .\venv\Scripts\python -m uvicorn server:app --host 0.0.0.0 --port 5000"
start "Kiosk UI [5173]" cmd /k "cd frontend && npm run dev -- --port 5173"
start "Admin Panel [5174]" cmd /k "cd admin-frontend && npm run dev -- --port 5174"

echo =====================================
echo [*] Kiosk UI: http://localhost:5173/kiosk
echo [*] Dashboard: http://localhost:5174
echo =====================================
echo ALL SYSTEMS GO! 🚀
pause
