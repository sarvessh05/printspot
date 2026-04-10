
Function Write-Header($text) {
    Write-Host "`n===============================================" -ForegroundColor Cyan
    Write-Host " 🚀 $text" -ForegroundColor White -BackgroundColor DarkCyan
    Write-Host "===============================================`n" -ForegroundColor Cyan
}

Function Ensure-EnvFile {
    $envPath = Join-Path $PSScriptRoot ".env"
    if (!(Test-Path $envPath)) {
        Write-Host "⚠️  Root .env file is missing!" -ForegroundColor Yellow
        $url = Read-Host "Enter Supabase URL (e.g. https://xyz.supabase.co)"
        $anon = Read-Host "Enter Supabase Anon Key"
        $service = Read-Host "Enter Supabase Service/Anon Key (for backend)"
        $rzp_id = Read-Host "Enter Razorpay Key ID"
        $rzp_sec = Read-Host "Enter Razorpay Key Secret"
        $tg_bot = Read-Host "Enter Telegram Bot Token"
        $tg_chat = Read-Host "Enter Telegram Chat ID"
        $printer_name = Read-Host "Enter Windows Printer Name (e.g. HP LaserJet 1020)"
        $printer_ip = Read-Host "Enter Printer IP (for health status)"

        $content = @"
# Global .env Source of Truth
VITE_SUPABASE_URL=$url
VITE_SUPABASE_ANON_KEY=$anon
SUPABASE_SERVICE_KEY=$service
VITE_KIOSK_ID=KIOSK_PUNE_001
VITE_KIOSK_TOKEN=printspot_secret_123
VITE_ADMIN_PASSWORD=Sahil@123
VITE_RAZORPAY_KEY_ID=$rzp_id
RAZORPAY_KEY_SECRET=$rzp_sec
VITE_EC2_IP=http://localhost:8083
VITE_KIOSK_SERVER_IP=http://localhost:5000
TELEGRAM_BOT_TOKEN=$tg_bot
TELEGRAM_CHAT_ID=$tg_chat
PRINTER_IP=$printer_ip
TARGET_PRINTER=$printer_name
"@
        $content | Out-File -FilePath $envPath -Encoding utf8
        Write-Host "✅ Created root .env file." -ForegroundColor Green
    }
}

Function Sync-EnvFiles {
    $rootEnv = Join-Path $PSScriptRoot ".env"
    $modernEnv = Join-Path $PSScriptRoot "modern\.env"
    $backendEnv = Join-Path $PSScriptRoot "admin-backend\.env"
    $kioskEnv = Join-Path $PSScriptRoot "kiosk-server\.env"

    Write-Host "[*] Syncing sub-project .env files..." -ForegroundColor Gray
    Copy-Item $rootEnv $modernEnv -Force
    Copy-Item $rootEnv $backendEnv -Force
    
    # Kiosk Server needs specific formatting for its Python Config
    # But usually just copying the whole thing is fine if config.py reads it
    Copy-Item $rootEnv $kioskEnv -Force
    Write-Host "✅ Env files synchronized." -ForegroundColor Green
}

Write-Header "PRINTSPOT: KIOSK SETUP & RUN"

# 1. Env Check
Ensure-EnvFile
Sync-EnvFiles

# 2. Setup Venvs
Write-Host "`n[*] Verifying Python Virtual Environments..." -ForegroundColor Cyan
$rootVenv = Join-Path $PSScriptRoot "venv\Scripts\python.exe"
$backendVenv = Join-Path $PSScriptRoot "admin-backend\venv\Scripts\python.exe"
$kioskServerVenv = Join-Path $PSScriptRoot "kiosk-server\venv\Scripts\python.exe"

# If root venv exists, we use it for both. Otherwise look for local ones.
if (Test-Path $rootVenv) {
    $pythonApi = $rootVenv
    $pythonKiosk = $rootVenv
    Write-Host "✅ Using root virtual environment." -ForegroundColor Green
} else {
    Write-Host "[!] Root venv not found, checking sub-directories..." -ForegroundColor Gray
    if (!(Test-Path $backendVenv)) {
        Write-Host "[!] Creating venv for admin-backend..."
        cd admin-backend ; python -m venv venv ; .\venv\Scripts\python -m pip install -r requirements.txt ; cd ..
    }
    if (!(Test-Path $kioskServerVenv)) {
        Write-Host "[!] Creating venv for kiosk-server..."
        cd kiosk-server ; python -m venv venv ; .\venv\Scripts\python -m pip install -r requirements.txt ; cd ..
    }
    $pythonApi = $backendVenv
    $pythonKiosk = $kioskServerVenv
}

# 3. Setup Node Modules
if (!(Test-Path "frontend\node_modules")) {
    Write-Host "[!] Installing Node modules for Frontend..."
    cd frontend ; npm install ; cd ..
}
if (!(Test-Path "admin-frontend\node_modules")) {
    Write-Host "[!] Installing Node modules for Admin Frontend..."
    cd admin-frontend ; npm install ; cd ..
}

# 4. SumatraPDF Check
if (!(Test-Path "C:\Program Files\SumatraPDF\SumatraPDF.exe")) {
    Write-Host "`n[WARNING] 🔴 SumatraPDF.exe NOT FOUND in C:\Program Files\SumatraPDF\" -ForegroundColor Red
    Write-Host "The system will run, but physical printing will fail." -ForegroundColor Gray
}

# 5. Launch Services
Write-Header "STARTING ALL SERVICES"

# Start Backend
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd admin-backend; title 'BACKEND-API'; & '$pythonApi' -m uvicorn server:app --host 0.0.0.0 --port 8083 --reload"
# Start Kiosk Server
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd kiosk-server; title 'KIOSK-SERVER'; & '$pythonKiosk' -m uvicorn server:app --host 0.0.0.0 --port 5000 --reload"
# Start Frontend
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd frontend; title 'KIOSK-UI'; npm run dev -- --port 8080"
# Start Admin Frontend
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd admin-frontend; title 'ADMIN-DASHBOARD'; npm run dev -- --port 5173"

Write-Host "`n🚀 ALL SYSTEMS LAUNCHED!" -ForegroundColor Green
Write-Host "----------------------------------" -ForegroundColor Cyan
Write-Host "Admin API:      http://localhost:8083"
Write-Host "Kiosk API:      http://localhost:5000"
Write-Host "Kiosk UI:       http://localhost:8080/kiosk"
Write-Host "Admin Panel:    http://localhost:5173"
Write-Host "----------------------------------" -ForegroundColor Cyan
Write-Host "Keep these windows open to keep the kiosk running." -ForegroundColor Gray
