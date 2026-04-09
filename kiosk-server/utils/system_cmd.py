import os
import subprocess
from .logger import get_logger

logger = get_logger("system_cmd")

def shutdown_machine():
    """Executes a clean system shutdown."""
    logger.warning("🚨 SYSTEM SHUTDOWN INITIATED")
    try:
        # /s = shutdown, /f = force, /t 10 = 10 second delay
        subprocess.run(["shutdown", "/s", "/f", "/t", "10"], check=True)
        return True
    except Exception as e:
        logger.error(f"Failed to execute shutdown: {e}")
        return False

def restart_machine():
    """Executes a clean system restart."""
    logger.warning("🔄 SYSTEM RESTART INITIATED")
    try:
        # /r = restart
        subprocess.run(["shutdown", "/r", "/f", "/t", "10"], check=True)
        return True
    except Exception as e:
        logger.error(f"Failed to execute restart: {e}")
        return False

def restart_kiosk_app():
    """Attempts to restart the kiosk application (if managed by a process manager or task scheduler)."""
    logger.info("♻️ RESTARTING KIOSK APP...")
    # This usually involves killing the current process and letting the restarter handle it
    # Or sending a signal
    os._exit(0) 
