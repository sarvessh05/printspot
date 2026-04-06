import os
import uvicorn
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from config import settings

from routes import print_route, admin_route
from background.watchman import watchman_loop
import asyncio

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifecycle events for the FastAPI server."""
    print("KIOSK STARTING UP...")
    # Start the Watchman background task
    watchman_task = asyncio.create_task(watchman_loop())
    yield
    # Cleanup
    watchman_task.cancel()
    print("🛑 Kiosk Server shutting down...")

app = FastAPI(
    title="PrintKro Kiosk Server",
    version="2.0.0",
    lifespan=lifespan
)

# Enable CORS for local development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Routes inclusion ---
app.include_router(print_route.router)
app.include_router(admin_route.router)

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
