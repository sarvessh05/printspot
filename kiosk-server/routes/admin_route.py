from fastapi import APIRouter, HTTPException, Body
from config import settings
from utils.state import get_kiosk_state, save_kiosk_state
from utils.cloud_client import cloud
from utils.printer_status import printer_tracker
from utils.logger import get_logger
from utils.system_cmd import shutdown_machine, restart_machine, restart_kiosk_app
import os

logger = get_logger("admin_route")
router = APIRouter()

@router.get("/printer-status")
async def get_printer_status():
    """
    Returns the current cached health of the system for both Frontend and Heartbeat.
    Matches global_printer_status from server.js.
    """
    status_info = await printer_tracker.get_comprehensive_status()
    # We maintain the "JAMMED" / "OFFLINE" / "NORMAL" string response
    return {"status": status_info["status"]}

@router.post("/admin/reset-jam")
async def reset_jam_state(password: str = Body(..., embed=True)):
    """
    Forcefully overrides the JAMMED status to NORMAL.
    Requires admin password to prevent unauthorized kiosk unlocking.
    """
    if password != settings.ADMIN_PASSWORD:
        raise HTTPException(status_code=401, detail="Unauthorized")
    printer_tracker.last_status = "NORMAL"
    logger.info("🛠️ Forcefully Reset JAM status to NORMAL via Admin Panel.")
    return {"success": True, "message": "Status reset to NORMAL"}

@router.post("/admin/reset")
async def reset_counters(
    password: str = Body(..., embed=True),
    paper: bool = Body(False, embed=True),
    ink: bool = Body(False, embed=True)
):
    """
    Resets the local paper/ink counters to their full state.
    Matches server.js logic but uses correct VITE_ADMIN_PASSWORD.
    """
    if password != settings.ADMIN_PASSWORD:
        logger.warning(f"❌ Unauthorized Reset Attempt: Wrong Password '{password}'")
        raise HTTPException(status_code=401, detail="Unauthorized")

    current_state = await get_kiosk_state()
    if paper: current_state["paper"] = 500
    if ink: current_state["ink"] = 6000
    
    await save_kiosk_state(current_state)
    
    # Immediately report the fresh health snapshot
    await cloud.report_health(hardware_status="NORMAL")
    
    logger.info("🛠️ Admin Counters Reset Successful.")
    return {"success": True, "state": current_state}

@router.post("/admin/shutdown")
async def shutdown_system(password: str = Body(..., embed=True)):
    """Triggers a clean system shutdown."""
    if password != settings.ADMIN_PASSWORD:
        raise HTTPException(status_code=401, detail="Unauthorized")
    
    success = shutdown_machine()
    return {"success": success, "message": "System is shutting down..." if success else "Failed to shutdown"}

@router.post("/admin/restart")
async def restart_system(password: str = Body(..., embed=True)):
    """Triggers a clean system restart."""
    if password != settings.ADMIN_PASSWORD:
        raise HTTPException(status_code=401, detail="Unauthorized")
    
    success = restart_machine()
    return {"success": success, "message": "System is restarting..." if success else "Failed to restart"}

@router.post("/admin/restart-app")
async def restart_application(password: str = Body(..., embed=True)):
    """Restarts the kiosk application process."""
    if password != settings.ADMIN_PASSWORD:
        raise HTTPException(status_code=401, detail="Unauthorized")
    
    restart_kiosk_app()
    return {"success": True, "message": "Application restart requested"}
