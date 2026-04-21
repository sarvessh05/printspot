# import os
# import subprocess
# from .logger import get_logger

# logger = get_logger("system_cmd")

# def shutdown_machine():
#     """Executes a clean system shutdown."""
#     logger.warning("🚨 SYSTEM SHUTDOWN INITIATED")
#     try:
#         # /s = shutdown, /f = force, /t 10 = 10 second delay
#         subprocess.run(["shutdown", "/s", "/f", "/t", "10"], check=True)
#         return True
#     except Exception as e:
#         logger.error(f"Failed to execute shutdown: {e}")
#         return False

# def restart_machine():
#     """Executes a clean system restart."""
#     logger.warning("🔄 SYSTEM RESTART INITIATED")
#     try:
#         # /r = restart
#         subprocess.run(["shutdown", "/r", "/f", "/t", "10"], check=True)
#         return True
#     except Exception as e:
#         logger.error(f"Failed to execute restart: {e}")
#         return False

# def restart_kiosk_app():
#     """Attempts to restart the kiosk application (if managed by a process manager or task scheduler)."""
#     logger.info("♻️ RESTARTING KIOSK APP...")
#     # This usually involves killing the current process and letting the restarter handle it
#     # Or sending a signal
#     os._exit(0) 


import os
import subprocess
import platform
from .logger import get_logger

logger = get_logger("system_cmd")
SYSTEM = platform.system()
IS_WINDOWS = SYSTEM == "Windows"
IS_MAC = SYSTEM == "Darwin"
IS_LINUX = SYSTEM == "Linux"

def shutdown_machine():
    """Executes a clean system shutdown (cross-platform)."""
    logger.warning("🚨 SYSTEM SHUTDOWN INITIATED")
    try:
        if IS_WINDOWS:
            subprocess.run(["shutdown", "/s", "/f", "/t", "10"], check=True)
        elif IS_MAC or IS_LINUX:
            subprocess.run(["shutdown", "-h", "+1"], check=True)
        else:
            logger.error(f"Shutdown not supported on {SYSTEM}")
            return False
        return True
    except Exception as e:
        logger.error(f"Failed to execute shutdown: {e}")
        return False

def restart_machine():
    """Executes a clean system restart (cross-platform)."""
    logger.warning("🔄 SYSTEM RESTART INITIATED")
    try:
        if IS_WINDOWS:
            subprocess.run(["shutdown", "/r", "/f", "/t", "10"], check=True)
        elif IS_MAC or IS_LINUX:
            subprocess.run(["shutdown", "-r", "+1"], check=True)
        else:
            logger.error(f"Restart not supported on {SYSTEM}")
            return False
        return True
    except Exception as e:
        logger.error(f"Failed to execute restart: {e}")
        return False

def restart_kiosk_app():
    """Restart the kiosk application (cross-platform)."""
    logger.info("♻️ RESTARTING KIOSK APP...")
    os._exit(0)