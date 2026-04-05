import os
from pathlib import Path
from dotenv import load_dotenv
from pydantic_settings import BaseSettings

# Load .env file
load_dotenv()

class Settings(BaseSettings):
    # Kiosk Identity
    KIOSK_ID: str = os.getenv("VITE_KIOSK_ID", "KIOSK_PUNE_001")
    KIOSK_TOKEN: str = os.getenv("VITE_KIOSK_TOKEN", "printspot_super_secret_123")
    
    # Printer Config
    PRINTER_IP: str = os.getenv("PRINTER_IP", "192.168.1.58")
    
    # Admin Credentials
    ADMIN_PASSWORD: str = os.getenv("ADMIN_PASSWORD", "sahil123")
    
    # Supabase (for OTP Verification & Storage)
    SUPABASE_URL: str = os.getenv("VITE_SUPABASE_URL", "https://vgzsgmkvhgmlubrjvffd.supabase.co")
    SUPABASE_KEY: str = os.getenv("VITE_SUPABASE_ANON_KEY", "")
    
    # Backend Cloud Analytics
    ADMIN_BACKEND_URL: str = os.getenv("VITE_EC2_IP", "http://13.127.171.226:8080")
    
    # Local Storage
    BASE_DIR: Path = Path(__file__).resolve().parent
    TEMP_PRINTS_DIR: Path = BASE_DIR / "temp_prints"
    STATE_FILE: Path = BASE_DIR / "kiosk_state.json"
    
    # External Tools
    SUMATRA_PDF_PATH: str = r"C:\Program Files\SumatraPDF\SumatraPDF.exe"

    class Config:
        env_file = ".env"
        case_sensitive = True

settings = Settings()

# Ensure temp directory exists
settings.TEMP_PRINTS_DIR.mkdir(exist_ok=True)
