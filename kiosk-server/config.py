import os
from pathlib import Path
from typing import Optional
from dotenv import load_dotenv
from pydantic_settings import BaseSettings

# Current file location
BASE_DIR = Path(__file__).resolve().parent
# Look for .env in current and parent directory
load_dotenv() 

class Settings(BaseSettings):
    # Debug Mode
    DEBUG: bool = os.getenv("DEBUG", "False").lower() == "true"
    
    # Kiosk Identity
    KIOSK_ID: str = os.getenv("KIOSK_ID", "")
    KIOSK_TOKEN: str = os.getenv("KIOSK_TOKEN", "")
    
    # Printer Config
    PRINTER_IP: str = os.getenv("PRINTER_IP", "192.168.1.58")
    PRINTER_BW: str = os.getenv("PRINTER_BW", "HP Officejet BW")
    PRINTER_BW_DUPLEX: str = os.getenv("PRINTER_BW_DUPLEX", "HP Officejet BW Duplex")
    PRINTER_COLOR: str = os.getenv("PRINTER_COLOR", "HP Officejet Color")
    PRINTER_COLOR_DUPLEX: str = os.getenv("PRINTER_COLOR_DUPLEX", "HP Officejet Color Duplex")
    
    MOCK_PRINTER: bool = os.getenv("MOCK_PRINTER", "False").lower() == "true"
    
    # Admin Credentials
    ADMIN_PASSWORD: str = os.getenv("ADMIN_PASSWORD", "")
    
    # Supabase (for OTP Verification & Storage)
    SUPABASE_URL: str = os.getenv("SUPABASE_URL", "")
    SUPABASE_KEY: str = os.getenv("SUPABASE_ANON_KEY", "")
    
    # Backend Cloud Analytics
    ADMIN_BACKEND_URL: str = os.getenv("EC2_IP", "")
    
    # Local Storage
    TEMP_PRINTS_DIR: Path = BASE_DIR / "temp_prints"
    STATE_FILE: Path = BASE_DIR / "kiosk_state.json"
    
    # Project Metadata
    PROJECT_NAME: str = "Print Spot Kiosk"
    
    # Telegram Notifications
    TELEGRAM_BOT_TOKEN: str = os.getenv("TELEGRAM_BOT_TOKEN", "")
    TELEGRAM_CHAT_ID: str = os.getenv("TELEGRAM_CHAT_ID", "")
    
    # External Tools
    SUMATRA_PDF_PATH: str = os.getenv("SUMATRA_PDF_PATH", r"C:\Program Files\SumatraPDF\SumatraPDF.exe")

    class Config:
        case_sensitive = True

settings = Settings()

# Ensure temp directory exists
settings.TEMP_PRINTS_DIR.mkdir(exist_ok=True)
