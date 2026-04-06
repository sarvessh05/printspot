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
    KIOSK_ID: str = os.getenv("VITE_KIOSK_ID", "")
    KIOSK_TOKEN: str = os.getenv("VITE_KIOSK_TOKEN", "")
    
    # Printer Config
    PRINTER_IP: str = os.getenv("PRINTER_IP", "")
    TARGET_PRINTER: Optional[str] = os.getenv("TARGET_PRINTER", None)
    
    # Admin Credentials
    ADMIN_PASSWORD: str = os.getenv("VITE_ADMIN_PASSWORD", "")
    
    # Supabase (for OTP Verification & Storage)
    SUPABASE_URL: str = os.getenv("VITE_SUPABASE_URL", "")
    SUPABASE_KEY: str = os.getenv("VITE_SUPABASE_ANON_KEY", "")
    
    # Backend Cloud Analytics
    ADMIN_BACKEND_URL: str = os.getenv("VITE_EC2_IP", "")
    
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
