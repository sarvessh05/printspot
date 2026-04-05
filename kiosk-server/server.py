import os
import uvicorn
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from config import settings

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifecycle events for the FastAPI server."""
    # This is where we'll start the Watchman loop in Phase 6
    print("Kiosk Server starting up...")
    yield
    print("Kiosk Server shutting down...")

app = FastAPI(
    title="PrintKro Kiosk Server",
    version="2.0.0",
    lifespan=lifespan
)

# Enable CORS for local development (Frontend is usually on 5173, Backend on 5000)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Routes inclusion (Phases 4-5) ---
# When routers are ready, add them here
# from .routes import print_route, admin_route
# app.include_router(print_route.router)

@app.get("/api/health")
async def health_check():
    """Simple diagnostic endpoint."""
    return {"status": "ok", "kiosk_id": settings.KIOSK_ID}

# --- Static File Serving (React Production Build) ---
# Note: Ensure the 'dist' folder exists after building the frontend
DIST_PATH = os.path.normpath(os.path.join(os.path.dirname(__file__), "dist"))
if os.path.exists(DIST_PATH):
    app.mount("/", StaticFiles(directory=DIST_PATH, html=True), name="static")

    @app.exception_handler(404)
    async def not_found_handler(request, exc):
        """Catch-all for SPA routing (React Router)."""
        return FileResponse(os.path.join(DIST_PATH, "index.html"))
else:
    @app.get("/")
    async def root():
        return {"message": "Kiosk Server is running, but no 'dist/' folder found for frontend serving."}

if __name__ == "__main__":
    uvicorn.run("server:app", host="0.0.0.0", port=5000, reload=True)
