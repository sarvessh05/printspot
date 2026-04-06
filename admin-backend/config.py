import os
from pydantic_settings import BaseSettings
from dotenv import load_dotenv

load_dotenv()

class Settings(BaseSettings):
    # Core API Config
    PROJECT_NAME: str = "Print Spot Cloud Admin"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    PORT: int = 8080
    
    # Security Parameters
    # Header key used for admin authentication: X-Admin-Password
    ADMIN_MASTER_PASSWORD: str = os.getenv("ADMIN_MASTER_PASSWORD", "admin_secret_987")
    
    # Supabase Credentials
    # MUST be the Service Role Key for full DB access during management tasks
    SUPABASE_URL: str = os.getenv("SUPABASE_URL", "")
    SUPABASE_SERVICE_ROLE_KEY: str = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")

    # Razorpay Credentials (for Phase 9 payment security)
    RAZORPAY_KEY_ID: str = os.getenv("RAZORPAY_KEY_ID", "")
    RAZORPAY_KEY_SECRET: str = os.getenv("RAZORPAY_KEY_SECRET", "")

    class Config:
        case_sensitive = True

settings = Settings()
