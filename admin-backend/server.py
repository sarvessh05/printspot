from fastapi import FastAPI, HTTPException, Request, Depends
from fastapi.middleware.cors import CORSMiddleware
from config import settings
import time
import uvicorn

from routes.kiosk_reporting import router as kiosk_reporting_router
from routes.analytics import router as analytics_router
from routes.order_creation import router as order_creation_router
from routes.settings import router as settings_router
from routes.payments import router as payments_router
from routes.logs_collector import router as logs_router

# In dev: docs_url="/docs". In prod: None (disabled).
app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    docs_url="/docs" if settings.DEBUG else None,
    redoc_url=None,
)

# CORS Configuration
allowed_origins = settings.allowed_origins_list

# Hardcoded safety fallbacks for production
prod_domains = ["https://www.theprintspot.in", "https://theprintspot.in"]
for domain in prod_domains:
    if domain not in allowed_origins:
        allowed_origins.append(domain)

# Strip any accidental wildcards if specific domains are present
if len(allowed_origins) > 1 and "*" in allowed_origins:
    allowed_origins = [o for o in allowed_origins if o != "*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register Routers
app.include_router(kiosk_reporting_router)
app.include_router(analytics_router)
app.include_router(order_creation_router)
app.include_router(settings_router)
app.include_router(payments_router)
app.include_router(logs_router)

@app.get("/")
@app.get("/health")
async def health_check():
    """Confirms the Cloud Backend is reachable."""
    return {
        "status": "online",
        "timestamp": time.time(),
        "service": settings.PROJECT_NAME
    }

# Cleaned up mocks for Phase 7 implementation

if __name__ == "__main__":
    print(f"🚀 [CLOUD ADMIN] Starting on port {settings.PORT}...")
    uvicorn.run("server:app", host="0.0.0.0", port=settings.PORT, reload=True)
