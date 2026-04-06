from fastapi import FastAPI, HTTPException, Request, Depends
from fastapi.middleware.cors import CORSMiddleware
from config import settings
import time
import uvicorn

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

@app.get("/")
@app.get("/health")
async def health_check():
    """Confirms the Cloud Backend is reachable."""
    return {
        "status": "online",
        "timestamp": time.time(),
        "service": settings.PROJECT_NAME
    }

# Mocked Routes for initial project setup ---------------------------------

@app.get("/api/v1/kiosks")
async def list_all_kiosks():
    """Will fetch live heartbeats from Supabase."""
    return [
        {"kiosk_id": "KIOSK-001", "status": "ONLINE", "location": "Pune Camp", "last_ping": time.time()},
        {"kiosk_id": "KIOSK-002", "status": "OFFLINE", "location": "Mumbai Metro", "last_ping": time.time() - 3600}
    ]

# ------------------------------------------------------------------------

if __name__ == "__main__":
    print(f"🚀 [CLOUD ADMIN] Starting on port {settings.PORT}...")
    uvicorn.run("server:app", host="0.0.0.0", port=settings.PORT, reload=True)
