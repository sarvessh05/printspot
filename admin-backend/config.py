# import os
# from pydantic_settings import BaseSettings
# from dotenv import load_dotenv
# from typing import List

# load_dotenv()

# class Settings(BaseSettings):
#     # Core API Config
#     PROJECT_NAME: str = "Print Spot Cloud Admin"
#     VERSION: str = "1.0.0"
#     API_V1_STR: str = "/api/v1"
#     PORT: int = 8080

#     # Dev vs Production mode — set DEBUG=False in production .env
#     # When False: Swagger /docs is disabled, CORS is restricted
#     DEBUG: bool = os.getenv("DEBUG", "True").lower() == "true"

#     # CORS Origins — set to your Vercel domain in production
#     # Example: ALLOWED_ORIGINS=https://theprintspot.in,https://www.theprintspot.in
#     ALLOWED_ORIGINS: str = os.getenv("ALLOWED_ORIGINS", "*")
    
#     @property
#     def allowed_origins_list(self) -> List[str]:
#         return [o.strip() for o in self.ALLOWED_ORIGINS.split(",")]

    
#     # Security Parameters
#     # Header key used for admin authentication: X-Admin-Password
#     ADMIN_MASTER_PASSWORD: str = os.getenv("ADMIN_MASTER_PASSWORD", "admin_secret_987")
    
#     # Supabase Credentials
#     # MUST be the Service Role Key for full DB access during management tasks
#     SUPABASE_URL: str = os.getenv("SUPABASE_URL", "")
#     SUPABASE_SERVICE_ROLE_KEY: str = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")

#     # Razorpay Credentials (for Phase 9 payment security)
#     RAZORPAY_KEY_ID: str = os.getenv("RAZORPAY_KEY_ID", "")
#     RAZORPAY_KEY_SECRET: str = os.getenv("RAZORPAY_KEY_SECRET", "")

#     class Config:
#         case_sensitive = True

# settings = Settings()


import os
from pydantic_settings import BaseSettings
from dotenv import load_dotenv
from typing import List

load_dotenv()

class Settings(BaseSettings):
    # Core API Config
    PROJECT_NAME: str = "Print Spot Cloud Admin"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    PORT: int = 8080

    # Dev vs Production mode — set DEBUG=False in production .env
    # When False: Swagger /docs is disabled, CORS is restricted
    DEBUG: bool = os.getenv("DEBUG", "True").lower() == "true"

    # CORS Origins — set to your Vercel domain in production
    # Example: ALLOWED_ORIGINS=https://theprintspot.in,https://www.theprintspot.in
    ALLOWED_ORIGINS: str = os.getenv("ALLOWED_ORIGINS", "*")
    
    @property
    def allowed_origins_list(self) -> List[str]:
        return [o.strip() for o in self.ALLOWED_ORIGINS.split(",")]

    
    # Security Parameters
    # Header key used for admin authentication: X-Admin-Password
    ADMIN_MASTER_PASSWORD: str = os.getenv("ADMIN_MASTER_PASSWORD", "admin_secret_987")
    
    # Supabase Credentials
    # MUST be the Service Role Key for full DB access during management tasks
    SUPABASE_URL: str = os.getenv("SUPABASE_URL", "")
    SUPABASE_SERVICE_ROLE_KEY: str = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
    
    # Add ANON key for cleanup function
    SUPABASE_ANON_KEY: str = os.getenv("SUPABASE_ANON_KEY", "")

    # Razorpay Credentials (for Phase 9 payment security)
    RAZORPAY_KEY_ID: str = os.getenv("RAZORPAY_KEY_ID", "")
    RAZORPAY_KEY_SECRET: str = os.getenv("RAZORPAY_KEY_SECRET", "")
    
    # Admin password for routes
    ADMIN_PASSWORD: str = os.getenv("ADMIN_PASSWORD", "admin123")
    
    # EC2/IP for backend
    EC2_IP: str = os.getenv("EC2_IP", "http://localhost:8083")

    class Config:
        case_sensitive = True

settings = Settings()
print(f"✅ Settings loaded: DEBUG={settings.DEBUG}")
print(f"✅ Supabase URL: {settings.SUPABASE_URL[:50] if settings.SUPABASE_URL else 'Not set'}")
