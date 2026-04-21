#!/bin/bash

# Print Spot Kiosk - Cross-Platform Setup Script
# Works on macOS, Linux, and Windows (Git Bash/WSL)

set -e  # Exit on error

echo "🖨️ Setting up Print Spot Kiosk for $(uname -s)..."

# Detect OS
OS="$(uname -s)"
IS_MAC=false
IS_LINUX=false
IS_WINDOWS=false

case "${OS}" in
    Darwin*)  IS_MAC=true ;;
    Linux*)   IS_LINUX=true ;;
    MINGW*|MSYS*|CYGWIN*) IS_WINDOWS=true ;;
esac

# Check Python
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3.10+ is required but not found"
    echo "📥 Install Python from: https://www.python.org/downloads/"
    exit 1
fi

PYTHON_VERSION=$(python3 -c 'import sys; print(f"{sys.version_info.major}.{sys.version_info.minor}")')
echo "✅ Python $PYTHON_VERSION found"

# Create virtual environment
if [ ! -d "venv" ]; then
    echo "📦 Creating virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
echo "🔧 Activating virtual environment..."
if [ -f "venv/bin/activate" ]; then
    source venv/bin/activate
elif [ -f "venv/Scripts/activate" ]; then
    source venv/Scripts/activate
else
    echo "❌ Cannot find virtual environment activation script"
    exit 1
fi

# Upgrade pip
pip install --upgrade pip

# Install Python dependencies (skip Windows-only on Mac/Linux)
echo "📥 Installing Python dependencies..."
if [ "$IS_MAC" = true ] || [ "$IS_LINUX" = true ]; then
    # Skip Windows-only packages
    pip install fastapi uvicorn httpx pydantic pydantic-settings python-dotenv pypdf pysnmp
else
    # Windows - install all
    if [ -f "requirements.txt" ]; then
        pip install -r requirements.txt
    else
        echo "⚠️ requirements.txt not found, installing core packages"
        pip install fastapi uvicorn httpx pydantic pydantic-settings python-dotenv pypdf pysnmp
    fi
fi

# Check CUPS for macOS/Linux (required for printing)
if [ "$IS_MAC" = true ] || [ "$IS_LINUX" = true ]; then
    if ! command -v lp &> /dev/null; then
        echo "⚠️ CUPS (printing system) not found"
        if [ "$IS_MAC" = true ]; then
            echo "📥 On macOS, CUPS is pre-installed. If missing, run: brew install cups"
        else
            echo "📥 On Ubuntu/Debian: sudo apt-get install cups"
            echo "📥 On RHEL/Fedora: sudo yum install cups"
            echo "📥 On Arch: sudo pacman -S cups"
        fi
    else
        echo "✅ CUPS printing system found"
    fi
fi

# Check Node.js
if ! command -v npm &> /dev/null; then
    echo "⚠️ npm not found. Frontend dependencies will not be installed."
    echo "📥 Install Node.js from: https://nodejs.org/"
else
    # Install Node.js dependencies
    echo "📦 Installing frontend dependencies..."
    if [ -d "frontend" ]; then
        cd frontend
        npm install
        cd ..
    else
        echo "⚠️ frontend directory not found"
    fi

    if [ -d "admin-frontend" ]; then
        cd admin-frontend
        npm install
        cd ..
    else
        echo "⚠️ admin-frontend directory not found"
    fi
fi

# Create necessary directories
echo "📁 Creating required directories..."
mkdir -p kiosk-server/temp_prints
mkdir -p logs

# Create .env file if it doesn't exist
if [ ! -f ".env" ]; then
    echo "📝 Creating .env template..."
    cat > .env << 'EOF'
# Kiosk Configuration
KIOSK_ID=kiosk_001
KIOSK_TOKEN=your_secret_token_here
ADMIN_PASSWORD=admin123

# Backend URLs
EC2_IP=http://localhost:8083
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key

# Printer Configuration (Windows)
PRINTER_BW="Default Printer"
PRINTER_BW_DUPLEX="Default Printer"
PRINTER_COLOR="Default Printer"
PRINTER_COLOR_DUPLEX="Default Printer"

# Printer Configuration (macOS/Linux - optional)
PRINTER_NAME=""

# Network Printer (optional)
PRINTER_IP=192.168.1.100

# Mock printer for testing
MOCK_PRINTER=False

# SumatraPDF path (Windows only)
SUMATRA_PDF_PATH=C:\Program Files\SumatraPDF\SumatraPDF.exe
EOF
    echo "⚠️ Please edit .env file with your actual configuration"
fi

# Create run script for Mac/Linux
if [ "$IS_MAC" = true ] || [ "$IS_LINUX" = true ]; then
    if [ ! -f "run_all.sh" ]; then
        echo "🚀 Creating run_all.sh script..."
        
        if [ "$IS_MAC" = true ]; then
            # macOS version with Terminal.app
            cat > run_all.sh << 'EOF'
#!/bin/bash

echo "🚀 Starting Print Spot Kiosk System on macOS..."

ROOT_DIR=$(pwd)

# Function to check if a port is in use
check_port() {
    lsof -i:$1 > /dev/null 2>&1
    return $?
}

# Check if ports are available
for port in 8083 5000 5173 5174; do
    if check_port $port; then
        echo "⚠️ Port $port is already in use"
        read -p "Continue anyway? (y/n) " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    fi
done

# Start Cloud Admin API
osascript -e "tell application \"Terminal\" to do script \"cd '$ROOT_DIR/admin-backend' && source ../venv/bin/activate && python -m uvicorn server:app --host 0.0.0.0 --port 8083 --reload\""

sleep 2

# Start Kiosk Server
osascript -e "tell application \"Terminal\" to do script \"cd '$ROOT_DIR/kiosk-server' && source ../venv/bin/activate && python -m uvicorn server:app --host 0.0.0.0 --port 5000 --reload\""

sleep 2

# Start Kiosk Frontend
osascript -e "tell application \"Terminal\" to do script \"cd '$ROOT_DIR/frontend' && npm run dev -- --port 5173\""

sleep 2

# Start Admin Frontend
osascript -e "tell application \"Terminal\" to do script \"cd '$ROOT_DIR/admin-frontend' && npm run dev -- --port 5174\""

echo ""
echo "✅ All services started!"
echo "📱 Kiosk Frontend: http://localhost:5173"
echo "👑 Admin Panel: http://localhost:5174"
echo "🖨️ Kiosk Server API: http://localhost:5000"
echo "☁️ Cloud Admin API: http://localhost:8083"
echo ""
echo "⚠️ Do not close the terminal windows!"
EOF
        else
            # Linux version with gnome-terminal or tmux
            cat > run_all.sh << 'EOF'
#!/bin/bash

echo "🚀 Starting Print Spot Kiosk System on Linux..."

ROOT_DIR=$(pwd)

# Function to check if a port is in use
check_port() {
    if command -v lsof &> /dev/null; then
        lsof -i:$1 > /dev/null 2>&1
        return $?
    else
        netstat -tuln 2>/dev/null | grep -q ":$1 "
        return $?
    fi
}

# Check if ports are available
for port in 8083 5000 5173 5174; do
    if check_port $port; then
        echo "⚠️ Port $port is already in use"
        read -p "Continue anyway? (y/n) " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    fi
done

# Detect terminal emulator
if command -v gnome-terminal &> /dev/null; then
    TERMINAL_CMD="gnome-terminal --tab -- bash -c"
elif command -v konsole &> /dev/null; then
    TERMINAL_CMD="konsole --new-tab -e bash -c"
elif command -v xfce4-terminal &> /dev/null; then
    TERMINAL_CMD="xfce4-terminal --tab -- bash -c"
elif command -v tmux &> /dev/null; then
    # Use tmux if available
    if ! tmux has-session -t printspot 2>/dev/null; then
        tmux new-session -d -s printspot
    fi
    
    tmux new-window -t printspot -n "cloud-api" "cd '$ROOT_DIR/admin-backend' && source ../venv/bin/activate && python -m uvicorn server:app --host 0.0.0.0 --port 8083 --reload; read -p 'Press Enter to close'"
    tmux new-window -t printspot -n "kiosk-server" "cd '$ROOT_DIR/kiosk-server' && source ../venv/bin/activate && python -m uvicorn server:app --host 0.0.0.0 --port 5000 --reload; read -p 'Press Enter to close'"
    tmux new-window -t printspot -n "frontend" "cd '$ROOT_DIR/frontend' && npm run dev -- --port 5173; read -p 'Press Enter to close'"
    tmux new-window -t printspot -n "admin-frontend" "cd '$ROOT_DIR/admin-frontend' && npm run dev -- --port 5174; read -p 'Press Enter to close'"
    
    echo "✅ All services started in tmux session 'printspot'"
    echo "📱 Kiosk Frontend: http://localhost:5173"
    echo "👑 Admin Panel: http://localhost:5174"
    echo "🖨️ Kiosk Server API: http://localhost:5000"
    echo "☁️ Cloud Admin API: http://localhost:8083"
    echo ""
    echo "To view: tmux attach -t printspot"
    echo "To detach: Ctrl+B, then D"
    exit 0
else
    echo "⚠️ No supported terminal emulator found. Starting in background..."
    
    # Fallback: run in background with nohup
    cd "$ROOT_DIR/admin-backend" && source ../venv/bin/activate && nohup python -m uvicorn server:app --host 0.0.0.0 --port 8083 > ../logs/admin-api.log 2>&1 &
    cd "$ROOT_DIR/kiosk-server" && source ../venv/bin/activate && nohup python -m uvicorn server:app --host 0.0.0.0 --port 5000 > ../logs/kiosk-server.log 2>&1 &
    cd "$ROOT_DIR/frontend" && nohup npm run dev -- --port 5173 > ../logs/frontend.log 2>&1 &
    cd "$ROOT_DIR/admin-frontend" && nohup npm run dev -- --port 5174 > ../logs/admin-frontend.log 2>&1 &
    
    echo "✅ All services started in background"
    echo "📱 Kiosk Frontend: http://localhost:5173"
    echo "👑 Admin Panel: http://localhost:5174"
    echo "🖨️ Kiosk Server API: http://localhost:5000"
    echo "☁️ Cloud Admin API: http://localhost:8083"
    echo ""
    echo "To stop: pkill -f uvicorn && pkill -f vite"
    exit 0
fi

# Start services in separate terminal windows
$TERMINAL_CMD "cd '$ROOT_DIR/admin-backend' && source ../venv/bin/activate && python -m uvicorn server:app --host 0.0.0.0 --port 8083 --reload; exec bash" &
sleep 2

$TERMINAL_CMD "cd '$ROOT_DIR/kiosk-server' && source ../venv/bin/activate && python -m uvicorn server:app --host 0.0.0.0 --port 5000 --reload; exec bash" &
sleep 2

$TERMINAL_CMD "cd '$ROOT_DIR/frontend' && npm run dev -- --port 5173; exec bash" &
sleep 2

$TERMINAL_CMD "cd '$ROOT_DIR/admin-frontend' && npm run dev -- --port 5174; exec bash" &

echo ""
echo "✅ All services started!"
echo "📱 Kiosk Frontend: http://localhost:5173"
echo "👑 Admin Panel: http://localhost:5174"
echo "🖨️ Kiosk Server API: http://localhost:5000"
echo "☁️ Cloud Admin API: http://localhost:8083"
echo ""
echo "⚠️ Do not close the terminal windows!"
EOF
        fi
        
        chmod +x run_all.sh
    fi
fi

# Create stop script
if [ ! -f "stop_all.sh" ] && { [ "$IS_MAC" = true ] || [ "$IS_LINUX" = true ]; }; then
    echo "🛑 Creating stop_all.sh script..."
    cat > stop_all.sh << 'EOF'
#!/bin/bash

echo "🛑 Stopping all Print Spot Kiosk services..."

# Kill Python uvicorn processes
pkill -f "uvicorn server:app" 2>/dev/null && echo "✅ Stopped backend servers" || echo "ℹ️ No backend servers running"

# Kill Vite dev servers
pkill -f "vite" 2>/dev/null && echo "✅ Stopped frontend servers" || echo "ℹ️ No frontend servers running"

# Kill any remaining Python processes from the kiosk
pkill -f "kiosk-server" 2>/dev/null

echo "✅ All services stopped"
EOF
    chmod +x stop_all.sh
fi

echo ""
echo "✅ Setup complete!"
echo ""
echo "📋 Next steps:"
echo "1. Edit .env file with your configuration"
echo "   nano .env  # or use any text editor"
echo ""
echo "2. Run the system:"
if [ "$IS_MAC" = true ]; then
    echo "   ./run_all.sh"
elif [ "$IS_LINUX" = true ]; then
    echo "   ./run_all.sh"
    echo ""
    echo "   For tmux users:"
    echo "   tmux attach -t printspot  # to view all services"
else
    echo "   run_all.bat"
fi
echo ""
echo "3. Stop the system:"
if [ "$IS_MAC" = true ] || [ "$IS_LINUX" = true ]; then
    echo "   ./stop_all.sh"
else
    echo "   Press Ctrl+C in each terminal window"
fi
echo ""
echo "Or manually start services:"
echo "  source venv/bin/activate"
echo "  cd admin-backend && python -m uvicorn server:app --port 8083"
echo "  cd kiosk-server && python -m uvicorn server:app --port 5000"
echo "  cd frontend && npm run dev -- --port 5173"
echo "  cd admin-frontend && npm run dev -- --port 5174"