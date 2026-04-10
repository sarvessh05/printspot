import asyncio
import os
import subprocess
from pathlib import Path
from typing import Dict, Optional
from config import settings
from .logger import get_logger

logger = get_logger("print_engine")

# Path to the bundled SumatraPDF or the system one
def _get_sumatra_path() -> str:
    path = settings.SUMATRA_PDF_PATH
    if path and os.path.exists(path):
        if path.lower().endswith('.lnk'):
            logger.warning("⚠️ SUMATRA_PDF_PATH is a shortcut (.lnk). This might fail. Please use the direct .exe path.")
        return path
    
    # Try common locations
    common_paths = [
        r"C:\Program Files\SumatraPDF\SumatraPDF.exe",
        r"C:\Program Files (x86)\SumatraPDF\SumatraPDF.exe",
        os.path.join(os.getcwd(), "SumatraPDF.exe")
    ]
    for p in common_paths:
        if os.path.exists(p):
            return p

    logger.warning("⚠️ SumatraPDF not found. Falling back to system PATH.")
    return "SumatraPDF.exe"

SUMATRA_EXE = _get_sumatra_path()

async def print_pdf(file_path: Path, options: Dict) -> bool:
    """
    Core engine that sends the command to the Windows printer.
    """
    logger.info(f"📄 Preparing print job: {file_path}")
    
    if settings.MOCK_PRINTER:
        logger.info(f"🎭 [MOCK PRINTER] Simulating print for: {file_path}")
        await asyncio.sleep(2) # Simulate mechanical movement
        return True
    
    if not file_path.exists():
        logger.error(f"❌ File not found for printing: {file_path}")
        return False

    # Extract user preferences
    copies = int(options.get("copies", 1))
    mode = options.get("mode", "bw") # 'bw' or 'color'
    is_two_sided = options.get("isTwoSided", False)
    paper_size = options.get("paperSize", "A4")
    
    # Mapping to SumatraPDF settings
    duplex = "duplexlong" if is_two_sided else "simplex"
    monochrome = "monochrome" if mode == "bw" else "color"

    # Settings string for SumatraPDF -print-settings flag
    settings_str = f"copies={copies},{duplex},{monochrome},paper={paper_size},fit"
    
    # Add page ranges if specified (e.g. "1-5,7")
    page_range = options.get("pages")
    if page_range:
        settings_str += f",pages={page_range}"
    
    # Determine correct printer name
    if mode == "color":
        printer_name = settings.PRINTER_COLOR_DUPLEX if is_two_sided else settings.PRINTER_COLOR
    else:
        printer_name = settings.PRINTER_BW_DUPLEX if is_two_sided else settings.PRINTER_BW

    # SumatraPDF CLI command as a list
    command = [
        SUMATRA_EXE,
        "-print-to", printer_name,
        "-print-settings", settings_str,
        "-silent",
        str(file_path)
    ]
    
    logger.info(f"🚀 Using Printer: {printer_name}")
    logger.info(f"📋 Command: {' '.join(command)}")

    try:
        # Pass the list directly to exec - no shell quoting issues
        process = await asyncio.create_subprocess_exec(
            *command,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE
        )
        stdout, stderr = await process.communicate()
        
        if process.returncode != 0:
            err_msg = stderr.decode().strip()
            logger.error(f"❌ Windows Print Error (Code {process.returncode}): {err_msg}")
            return False
        
        logger.info(f"✅ Job sent to spooler successfully.")
        return True
    except FileNotFoundError:
        logger.error(f"❌ SumatraPDF Execution Failed: The system cannot find the file specified: {SUMATRA_EXE}")
        return False
    except Exception as e:
        logger.error(f"💥 Critical engine failure: {str(e)}")
        return False
