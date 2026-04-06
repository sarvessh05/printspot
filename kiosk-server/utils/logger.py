import os
import sys
import logging
from logging.handlers import RotatingFileHandler
from pathlib import Path
from config import settings

# Ensure logs directory exists
LOG_DIR = Path(__file__).parent.parent / "logs"
LOG_DIR.mkdir(exist_ok=True)

# Standard formatter
formatter = logging.Formatter(
    fmt="%(asctime)s [%(levelname)s] (%(name)s) %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S"
)

# --- Console Handler ---
console_handler = logging.StreamHandler(sys.stdout)
console_handler.setFormatter(formatter)

# --- Rotating File Handler (Max 5MB per file, keep last 3) ---
file_handler = RotatingFileHandler(
    filename=LOG_DIR / "kiosk.log",
    maxBytes=1024 * 1024 * 5, 
    backupCount=3,
    encoding="utf-8"
)
file_handler.setFormatter(formatter)

def get_logger(name: str):
    """
    Returns a configured logger with console and file handlers.
    Used across all utility and route modules.
    """
    logger = logging.getLogger(name)
    logger.setLevel(logging.DEBUG if settings.DEBUG else logging.INFO)
    
    # Avoid duplicate handlers if logger is re-initialized
    if not logger.handlers:
        logger.addHandler(console_handler)
        logger.addHandler(file_handler)
    
    return logger

# Root logger for general server events
logger = get_logger("kiosk_server")
