from fastapi import APIRouter, HTTPException, Body
from config import settings
from utils.state import get_kiosk_state, save_kiosk_state
from utils.cloud_client import cloud
from utils.printer_status import printer_tracker
from utils.logger import get_logger
import os
import subprocess

logger = get_logger("admin_route")
router = APIRouter()

@router.get("/api/printer-status")
async def get_printer_status():
    """
    Returns the current cached health of the system for both Frontend and Heartbeat.
    Matches global_printer_status from server.js.
    """
    status_info = await printer_tracker.get_comprehensive_status()
    # We maintain the "JAMMED" / "OFFLINE" / "NORMAL" string response
    return {"status": status_info["status"]}

@router.get("/admin/reset-jam")
async def reset_jam_state():
    """
    Forcefully overrides the JAMMED status to NORMAL.
    Useful for clearing the kiosk lock screen remotely.
    """
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
    """
    Triggers a 100% shutdown of the Windows machine.
    Equivalent to server.js's shutdown /s /t 0 logic.
    """
    if password != settings.ADMIN_PASSWORD:
        raise HTTPException(status_code=401, detail="Unauthorized")

    logger.critical("🚨 KIOSK SHUTDOWN INITIATED VIA REMOTE COMMAND.")
    
    # We do a subprocess popen so it doesn't block the HTTP response
    subprocess.Popen(["shutdown", "/s", "/t", "0"], shell=True)
    
    return {"success": True, "message": "Shutting down system..."}
