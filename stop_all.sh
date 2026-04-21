#!/bin/bash

echo "🛑 Stopping all Print Spot Kiosk services..."

# Kill Python uvicorn processes
pkill -f "uvicorn server:app" 2>/dev/null && echo "✅ Stopped backend servers" || echo "ℹ️ No backend servers running"

# Kill Vite dev servers
pkill -f "vite" 2>/dev/null && echo "✅ Stopped frontend servers" || echo "ℹ️ No frontend servers running"

# Kill any remaining Python processes from the kiosk
pkill -f "kiosk-server" 2>/dev/null

echo "✅ All services stopped"
