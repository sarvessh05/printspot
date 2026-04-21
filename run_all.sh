#!/bin/bash

echo "🚀 Starting Print Spot Kiosk..."

ROOT_DIR=$(pwd)

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "❌ Virtual environment not found. Run ./setup.sh first"
    exit 1
fi

# Open Terminal 1 - Cloud Admin API
osascript -e "tell application \"Terminal\" to do script \"cd '$ROOT_DIR/admin-backend' && source ../venv/bin/activate && python -m uvicorn server:app --host 0.0.0.0 --port 8083 --reload\""

sleep 2

# Open Terminal 2 - Kiosk Server
osascript -e "tell application \"Terminal\" to do script \"cd '$ROOT_DIR/kiosk-server' && source ../venv/bin/activate && python -m uvicorn server:app --host 0.0.0.0 --port 5000 --reload\""

sleep 2

# Open Terminal 3 - Kiosk Frontend
osascript -e "tell application \"Terminal\" to do script \"cd '$ROOT_DIR/frontend' && npm run dev -- --port 5173\""

sleep 2

# Open Terminal 4 - Admin Frontend
osascript -e "tell application \"Terminal\" to do script \"cd '$ROOT_DIR/admin-frontend' && npm run dev -- --port 5174\""

echo ""
echo "✅ All services started!"
echo "📱 Open: http://localhost:5173 (Kiosk)"
echo "👑 Open: http://localhost:5174 (Admin)"
echo "🖨️ Kiosk API: http://localhost:5000"
echo "☁️ Admin API: http://localhost:8083"
echo ""
echo "⚠️ Keep all terminal windows open!"
