import sys
import os
from pathlib import Path

# Add kiosk-server to path
sys.path.append(os.path.join(os.getcwd(), 'kiosk-server'))

try:
    from config import settings
    print(f"✅ Config loaded. KIOSK_ID: {settings.KIOSK_ID}")
    print(f"✅ Printer IP: {settings.PRINTER_IP}")
    
    import fastapi
    print(f"✅ FastAPI version: {fastapi.__version__}")
    
    from routes import print_route
    print("✅ print_route imported.")
    
    from server import app
    print("✅ server:app initialized.")
    
except Exception as e:
    print(f"❌ Error: {e}")
    import traceback
    traceback.print_exc()
