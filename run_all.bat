@echo off
setlocal
cd /d "%~dp0"

echo 🚀 Launching PrintSpot Kiosk (Self-Healing Mode)...
echo ===============================================

:: 🛡️ 1. SETUP PYTHON (Flexible Venv)
echo [*] Checking Python Environments...
set PYTHON_API=""
set PYTHON_KIOSK=""

if exist "venv\Scripts\python.exe" (
    echo [✅] Using root virtual environment.
    set PYTHON_API="%~dp0venv\Scripts\python.exe"
    set PYTHON_KIOSK="%~dp0venv\Scripts\python.exe"
) else (
    echo [!] Root venv missing. Checking local folder venvs...
    if not exist "admin-backend\venv" (
        echo [!] admin-backend venv missing. Creating...
        cd admin-backend && python -m venv venv && .\venv\Scripts\python -m pip install -r requirements.txt && cd ..
    )
    if not exist "kiosk-server\venv" (
        echo [!] kiosk-server venv missing. Creating...
        cd kiosk-server && python -m venv venv && .\venv\Scripts\python -m pip install -r requirements.txt && cd ..
    )
    set PYTHON_API="%~dp0admin-backend\venv\Scripts\python.exe"
    set PYTHON_KIOSK="%~dp0kiosk-server\venv\Scripts\python.exe"
)

:: 🛡️ 2. CHECK FRONTENDS (NODE)
echo [*] Checking Node Modules...
if not exist "frontend\node_modules" (
    echo [!] frontend/node_modules missing. Running npm install...
    cd frontend && npm install && cd ..
)
if not exist "admin-frontend\node_modules" (
    echo [!] admin-frontend/node_modules missing. Running npm install...
    cd admin-frontend && npm install && cd ..
)

:: 🛡️ 3. CHECK SUMATRA PDF
echo [*] Checking for SumatraPDF Printer Engine...
if not exist "C:\Program Files\SumatraPDF\SumatraPDF.exe" (
    echo [WARNING] 🔴 SumatraPDF.exe NOT FOUND!
    echo Physical printing will fail. Please install 64-bit SumatraPDF.
    pause
)

echo ===============================================
echo ✅ DEPENDENCIES VERIFIED! STARTING SERVICES...
echo ===============================================

:: Launching in separate windows
start "Cloud API [8083]" cmd /k "cd admin-backend && %PYTHON_API% -m uvicorn server:app --host 0.0.0.0 --port 8083 --reload"
start "Hardware Kiosk [5000]" cmd /k "cd kiosk-server && %PYTHON_KIOSK% -m uvicorn server:app --host 0.0.0.0 --port 5000 --reload"
start "Kiosk UI [8080]" cmd /k "cd frontend && npm run dev -- --port 8080"
start "Admin Panel [5173]" cmd /k "cd admin-frontend && npm run dev -- --port 5173"

echo =====================================
echo [*] Kiosk UI:    http://localhost:8080/kiosk
echo [*] Admin Panel: http://localhost:5173
echo =====================================
echo SYSTEM READY FOR DEMO! 🚀
pause
