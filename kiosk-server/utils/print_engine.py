import asyncio
import os
import subprocess
from pathlib import Path
from typing import Dict, Optional
from config import settings
from .logger import get_logger

logger = get_logger("print_engine")

# Path to the bundled SumatraPDF or the system one
# In a real environment, we'd bundle this alongside the server or point to it via PATH
SUMATRA_EXE = settings.SUMATRA_PDF_PATH

async def print_pdf(file_path: Path, options: Dict) -> bool:
    """
    Core engine that sends the command to the Windows printer.
    Uses SumatraPDF CLI for robust, silent, headless printing.
    """
    logger.info(f"📄 Preparing print job: {file_path}")
    
    if settings.MOCK_PRINTER:
        logger.info(f"🎭 [MOCK PRINTER] Simulating print for: {file_path}")
        await asyncio.sleep(2) # Simulate mechanical movement
        return True
    
    if not file_path.exists():
        logger.error(f"❌ File not found for printing: {file_path}")
        return False

    # Extract user preferences from the PrintJob model
    copies = int(options.get("copies", 1))
    mode = options.get("mode", "bw") # 'bw' or 'color'
    is_two_sided = options.get("isTwoSided", False)
    # Mapping to SumatraPDF's duplex settings
    duplex = "duplexlong" if is_two_sided else "simplex"
    # Mono chrome mapping for Sumatra
    monochrome = "monochrome" if mode == "bw" else "color"

    # Settings string for SumatraPDF -print-settings flag
    # Format: "copies=1,duplexlong,monochrome,pages=1-10"
    settings_str = f"copies={copies},{duplex},{monochrome},paper=A4,fit"
    
    # Add page ranges if specified (e.g. "1-5,7")
    page_range = options.get("pages")
    if page_range:
        settings_str += f",pages={page_range}"
    
    # Determine correct printer name based on requirements
    if mode == "color":
        if is_two_sided:
            printer_name = settings.PRINTER_COLOR_DUPLEX
        else:
            printer_name = settings.PRINTER_COLOR
    else: # default to bw
        if is_two_sided:
            printer_name = settings.PRINTER_BW_DUPLEX
        else:
            printer_name = settings.PRINTER_BW

    # SumatraPDF CLI - print-to command requires -print-to "Printer Name"
    # Sumatra expects the flag then the quoted name
    command = [
        f'"{SUMATRA_EXE}"',
        f'-print-to "{printer_name}"',
        f'-print-settings "{settings_str}"',
        "-silent",
        f'"{str(file_path)}"'
    ]
    
    cmd_str = " ".join(command)
    logger.info(f"🚀 Using Printer: {printer_name}")
    logger.info(f"📋 Command: {cmd_str}")

    try:
        # Create subprocess and wait for completion
        process = await asyncio.create_subprocess_shell(
            cmd_str,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE
        )
        stdout, stderr = await process.communicate()
        
        if process.returncode != 0:
            logger.error(f"❌ Windows Print Error: {stderr.decode()}")
            return False
        
        logger.info(f"✅ Job sent to spooler successfully.")
        return True
    except Exception as e:
        logger.error(f"💥 Critical engine failure: {e}")
        return False
