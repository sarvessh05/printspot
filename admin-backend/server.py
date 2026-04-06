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

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    docs_url="/docs"
)

# CORS: Allow React Admin Panel to communicate
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Tighten this in production!
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
