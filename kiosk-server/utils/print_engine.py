# import asyncio
# import os
# import subprocess
# from pathlib import Path
# from typing import Dict, Optional
# from config import settings
# from .logger import get_logger

# logger = get_logger("print_engine")

# # Path to the bundled SumatraPDF or the system one
# def _get_sumatra_path() -> str:
#     path = settings.SUMATRA_PDF_PATH.strip().strip('"').strip("'")
#     if path and os.path.exists(path):
#         if path.lower().endswith('.lnk'):
#             logger.warning(f"⚠️ SUMATRA_PDF_PATH is a shortcut (.lnk): {path}")
#         return path
    
#     # Try common locations
#     common_paths = [
#         r"C:\Program Files\SumatraPDF\SumatraPDF.exe",
#         r"C:\Program Files (x86)\SumatraPDF\SumatraPDF.exe",
#         os.path.join(os.getcwd(), "SumatraPDF.exe")
#     ]
#     for p in common_paths:
#         if os.path.exists(p):
#             return p

#     logger.warning("⚠️ SumatraPDF not found. Falling back to system PATH.")
#     return "SumatraPDF.exe"

# SUMATRA_EXE = _get_sumatra_path()

# async def print_pdf(file_path: Path, options: Dict) -> bool:
#     """
#     Core engine that sends the command to the Windows printer.
#     """
#     logger.info(f"📄 Preparing print job: {file_path}")
    
#     if settings.MOCK_PRINTER:
#         logger.info(f"🎭 [MOCK PRINTER] Simulating print for: {file_path}")
#         await asyncio.sleep(2) # Simulate mechanical movement
#         return True
    
#     if not file_path.exists():
#         logger.error(f"❌ File not found for printing: {file_path}")
#         return False

#     # Extract user preferences
#     copies = int(options.get("copies", 1))
#     mode = options.get("mode", "bw") # 'bw' or 'color'
#     is_two_sided = options.get("isTwoSided", False)
#     paper_size = options.get("paperSize", "A4")
    
#     # Mapping to SumatraPDF settings
#     duplex = "duplexlong" if is_two_sided else "simplex"
#     monochrome = "monochrome" if mode == "bw" else "color"

#     # Settings string for SumatraPDF -print-settings flag
#     settings_str = f"copies={copies},{duplex},{monochrome},paper={paper_size},fit"
    
#     # Add page ranges if specified (e.g. "1-5,7")
#     page_range = options.get("pages")
#     if page_range:
#         settings_str += f",pages={page_range}"
    
#     # Determine correct printer name and strip quotes
#     if mode == "color":
#         printer_name = settings.PRINTER_COLOR_DUPLEX if is_two_sided else settings.PRINTER_COLOR
#     else:
#         printer_name = settings.PRINTER_BW_DUPLEX if is_two_sided else settings.PRINTER_BW
        
#     printer_name = printer_name.strip().strip('"').strip("'")

#     # SumatraPDF CLI command as a list
#     command = [
#         SUMATRA_EXE,
#         "-print-to", printer_name,
#         "-print-settings", settings_str,
#         "-silent",
#         str(file_path)
#     ]
    
#     # The "Windows Way" to ensure all spaces are quoted correctly
#     cmd_str = subprocess.list2cmdline(command)
    
#     logger.info(f"🚀 Using Printer: {printer_name}")
#     logger.info(f"📋 Command: {cmd_str}")

#     try:
#         # We use asyncio.to_thread with subprocess.run to bypass the Windows 
#         # NotImplementedError that occurs when Uvicorn alters the EventLoopPolicy
#         def run_cmd():
#             return subprocess.run(
#                 cmd_str,
#                 stdout=subprocess.PIPE,
#                 stderr=subprocess.PIPE,
#                 shell=True,
#                 creationflags=subprocess.CREATE_NO_WINDOW if hasattr(subprocess, 'CREATE_NO_WINDOW') else 0
#             )

#         process = await asyncio.to_thread(run_cmd)
        
#         if process.returncode != 0:
#             err_msg = process.stderr.decode().strip()
#             logger.error(f"❌ Windows Print Error (Code {process.returncode}): {err_msg}")
            
#             # If SumatraPDF complains about the printer name, list what Windows actually sees
#             if "no such printer" in err_msg.lower():
#                 logger.error("🔍 Mismatch detected! Listing installed printers according to Windows:")
#                 try:
#                     def get_printers():
#                         ps_cmd = "Get-Printer | Select-Object Name | ConvertTo-Json"
#                         return subprocess.run(["powershell", "-NoProfile", "-Command", ps_cmd], capture_output=True, text=True)
                    
#                     ps_proc = await asyncio.to_thread(get_printers)
#                     import json
#                     printers = json.loads(ps_proc.stdout)
                    
#                     if isinstance(printers, list):
#                         printer_names = [p.get("Name") for p in printers]
#                     else:
#                         printer_names = [printers.get("Name")]
                        
#                     for name in printer_names:
#                         logger.error(f"   -> '{name}'")
#                 except Exception as e:
#                     logger.error(f"   (Failed to fetch printer list: {e})")
                    
#             return False
        
#         logger.info(f"✅ Job sent to spooler successfully.")
#         return True
#     except FileNotFoundError:
#         logger.error(f"❌ SumatraPDF Execution Failed: The system cannot find the file specified: {SUMATRA_EXE}")
#         return False
#     except Exception:
#         import traceback
#         logger.error(f"💥 Critical engine failure:\n{traceback.format_exc()}")
#         return False


# import asyncio
# import os
# import subprocess
# import platform
# import sys
# from pathlib import Path
# from typing import Dict, Optional
# from config import settings
# from .logger import get_logger

# logger = get_logger("print_engine")

# # Detect operating system
# OS_TYPE = platform.system()
# IS_WINDOWS = OS_TYPE == "Windows"
# IS_MAC = OS_TYPE == "Darwin"
# IS_LINUX = OS_TYPE == "Linux"

# def _get_sumatra_path() -> Optional[str]:
#     """Get SumatraPDF path (Windows only)"""
#     if not IS_WINDOWS:
#         return None
    
#     path = settings.SUMATRA_PDF_PATH.strip().strip('"').strip("'")
#     if path and os.path.exists(path):
#         if path.lower().endswith('.lnk'):
#             logger.warning(f"⚠️ SUMATRA_PDF_PATH is a shortcut (.lnk): {path}")
#         return path
    
#     # Try common locations
#     common_paths = [
#         r"C:\Program Files\SumatraPDF\SumatraPDF.exe",
#         r"C:\Program Files (x86)\SumatraPDF\SumatraPDF.exe",
#         os.path.join(os.getcwd(), "SumatraPDF.exe")
#     ]
#     for p in common_paths:
#         if os.path.exists(p):
#             return p

#     logger.warning("⚠️ SumatraPDF not found. Falling back to system PATH.")
#     return "SumatraPDF.exe"

# SUMATRA_EXE = _get_sumatra_path() if IS_WINDOWS else None

# async def print_pdf_mac_linux(pdf_path: Path, printer_name: str, options: Dict) -> bool:
#     """Print using CUPS/lpr on macOS and Linux"""
#     try:
#         copies = int(options.get("copies", 1))
#         is_two_sided = options.get("isTwoSided", False)
        
#         # Build lpr command
#         cmd = ['lpr']
        
#         # Add printer if specified
#         if printer_name and printer_name != "default":
#             cmd.extend(['-P', printer_name])
        
#         # Add copies
#         if copies > 1:
#             cmd.extend(['-#', str(copies)])
        
#         # Add duplex settings
#         if is_two_sided:
#             if IS_MAC:
#                 cmd.extend(['-o', 'sides=two-sided-long-edge'])
#             else:  # Linux
#                 cmd.extend(['-o', 'sides=two-sided-long-edge'])
        
#         # Add page range if specified
#         page_range = options.get("pages")
#         if page_range and page_range.lower() not in ["all", ""]:
#             cmd.extend(['-o', f'page-ranges={page_range}'])
        
#         # Add the file
#         cmd.append(str(pdf_path))
        
#         logger.info(f"🖨️ Running: {' '.join(cmd)}")
        
#         # Execute print command
#         process = await asyncio.create_subprocess_exec(
#             *cmd,
#             stdout=asyncio.subprocess.PIPE,
#             stderr=asyncio.subprocess.PIPE
#         )
        
#         stdout, stderr = await process.communicate()
        
#         if process.returncode != 0:
#             error_msg = stderr.decode() if stderr else "Unknown error"
#             logger.error(f"❌ Print failed: {error_msg}")
#             return False
        
#         logger.info(f"✅ Print job sent successfully")
#         return True
        
#     except FileNotFoundError:
#         logger.error("❌ lpr command not found. Please install CUPS:")
#         if IS_MAC:
#             logger.error("   macOS: Already installed by default")
#         else:
#             logger.error("   Linux: sudo apt-get install cups cups-client")
#         return False
#     except Exception as e:
#         logger.error(f"❌ Print error: {e}")
#         return False

# async def print_pdf_windows(pdf_path: Path, printer_name: str, options: Dict) -> bool:
#     """Print using SumatraPDF on Windows"""
#     if not SUMATRA_EXE:
#         logger.error("❌ SumatraPDF not found for Windows printing")
#         return False
    
#     # Extract user preferences
#     copies = int(options.get("copies", 1))
#     mode = options.get("mode", "bw")
#     is_two_sided = options.get("isTwoSided", False)
#     paper_size = options.get("paperSize", "A4")
    
#     # Mapping to SumatraPDF settings
#     duplex = "duplexlong" if is_two_sided else "simplex"
#     monochrome = "monochrome" if mode == "bw" else "color"
    
#     # Settings string for SumatraPDF -print-settings flag
#     settings_str = f"copies={copies},{duplex},{monochrome},paper={paper_size},fit"
    
#     # Add page ranges if specified
#     page_range = options.get("pages")
#     if page_range and page_range.lower() not in ["all", ""]:
#         settings_str += f",pages={page_range}"
    
#     # Clean printer name
#     printer_name = printer_name.strip().strip('"').strip("'")
    
#     # Build command
#     command = [
#         SUMATRA_EXE,
#         "-print-to", printer_name,
#         "-print-settings", settings_str,
#         "-silent",
#         str(pdf_path)
#     ]
    
#     cmd_str = subprocess.list2cmdline(command)
#     logger.info(f"📋 Command: {cmd_str}")
    
#     try:
#         def run_cmd():
#             return subprocess.run(
#                 cmd_str,
#                 stdout=subprocess.PIPE,
#                 stderr=subprocess.PIPE,
#                 shell=True,
#                 creationflags=subprocess.CREATE_NO_WINDOW if hasattr(subprocess, 'CREATE_NO_WINDOW') else 0
#             )
        
#         process = await asyncio.to_thread(run_cmd)
        
#         if process.returncode != 0:
#             err_msg = process.stderr.decode().strip()
#             logger.error(f"❌ Windows Print Error (Code {process.returncode}): {err_msg}")
            
#             if "no such printer" in err_msg.lower():
#                 logger.error("🔍 Printer not found! Available printers:")
#                 await list_windows_printers()
#             return False
        
#         logger.info(f"✅ Job sent to spooler successfully")
#         return True
        
#     except FileNotFoundError:
#         logger.error(f"❌ SumatraPDF not found: {SUMATRA_EXE}")
#         return False
#     except Exception as e:
#         logger.error(f"💥 Critical engine failure: {e}")
#         return False

# async def print_pdf_web(pdf_path: Path, options: Dict) -> bool:
#     """Web-based printing for mobile/iOS browsers"""
#     logger.info(f"🌐 Web printing requested for: {pdf_path}")
    
#     # For web, we return a download URL instead
#     # The frontend will handle printing via browser's print dialog
#     return True

# async def list_windows_printers():
#     """List available printers on Windows"""
#     try:
#         import win32print
#         printers = win32print.EnumPrinters(win32print.PRINTER_ENUM_LOCAL | win32print.PRINTER_ENUM_CONNECTIONS)
#         for printer in printers:
#             logger.info(f"   -> {printer[2]}")
#     except:
#         try:
#             result = subprocess.run(['wmic', 'printer', 'get', 'name'], capture_output=True, text=True)
#             for line in result.stdout.split('\n')[1:]:
#                 if line.strip():
#                     logger.info(f"   -> {line.strip()}")
#         except:
#             logger.error("   Could not list printers")

# async def list_unix_printers():
#     """List available printers on macOS/Linux"""
#     try:
#         process = await asyncio.create_subprocess_exec(
#             'lpstat', '-p',
#             stdout=asyncio.subprocess.PIPE,
#             stderr=asyncio.subprocess.PIPE
#         )
#         stdout, _ = await process.communicate()
        
#         for line in stdout.decode().split('\n'):
#             if 'printer' in line:
#                 # Parse "printer HP_LaserJet is idle"
#                 parts = line.split()
#                 if len(parts) > 1:
#                     logger.info(f"   -> {parts[1]}")
#     except:
#         logger.error("   Could not list printers (lpstat not found)")

# async def print_pdf(file_path: Path, options: Dict) -> bool:
#     """
#     Cross-platform printing engine
#     """
#     logger.info(f"📄 Preparing print job: {file_path} on {OS_TYPE}")
    
#     if settings.MOCK_PRINTER:
#         logger.info(f"🎭 [MOCK PRINTER] Simulating print for: {file_path}")
#         await asyncio.sleep(2)
#         return True
    
#     if not file_path.exists():
#         logger.error(f"❌ File not found for printing: {file_path}")
#         return False
    
#     # Get printer name based on mode
#     mode = options.get("mode", "bw")
#     is_two_sided = options.get("isTwoSided", False)
    
#     if IS_WINDOWS:
#         if mode == "color":
#             printer_name = settings.PRINTER_COLOR_DUPLEX if is_two_sided else settings.PRINTER_COLOR
#         else:
#             printer_name = settings.PRINTER_BW_DUPLEX if is_two_sided else settings.PRINTER_BW
        
#         printer_name = printer_name.strip().strip('"').strip("'")
#         return await print_pdf_windows(file_path, printer_name, options)
    
#     elif IS_MAC or IS_LINUX:
#         # For Unix-like systems, use CUPS
#         printer_name = settings.PRINTER_NAME if hasattr(settings, 'PRINTER_NAME') else "default"
#         return await print_pdf_mac_linux(file_path, printer_name, options)
    
#     else:
#         # Web/mobile fallback
#         return await print_pdf_web(file_path, options)

# async def get_available_printers() -> list:
#     """Get list of available printers across platforms"""
#     printers = []
    
#     if IS_WINDOWS:
#         try:
#             import win32print
#             for printer in win32print.EnumPrinters(win32print.PRINTER_ENUM_LOCAL | win32print.PRINTER_ENUM_CONNECTIONS):
#                 printers.append(printer[2])
#         except:
#             pass
    
#     elif IS_MAC or IS_LINUX:
#         try:
#             process = await asyncio.create_subprocess_exec(
#                 'lpstat', '-p',
#                 stdout=asyncio.subprocess.PIPE,
#                 stderr=asyncio.subprocess.PIPE
#             )
#             stdout, _ = await process.communicate()
            
#             for line in stdout.decode().split('\n'):
#                 if 'printer' in line:
#                     parts = line.split()
#                     if len(parts) > 1:
#                         printers.append(parts[1])
#         except:
#             pass
    
#     return printers

import asyncio
import os
import subprocess
import platform
import sys
from pathlib import Path
from typing import Dict, Optional
from config import settings
from .logger import get_logger

logger = get_logger("print_engine")

# Platform detection
SYSTEM = platform.system()
IS_WINDOWS = SYSTEM == "Windows"
IS_MAC = SYSTEM == "Darwin"
IS_LINUX = SYSTEM == "Linux"

def _get_print_command() -> dict:
    """Get platform-specific print command configuration"""
    if IS_WINDOWS:
        return {
            "cmd": _get_sumatra_path(),
            "args_template": ["-print-to", "{printer}", "-print-settings", "{settings}", "-silent", "{file}"],
            "use_shell": True
        }
    elif IS_MAC:
        return {
            "cmd": "lpr",
            "args_template": ["-P", "{printer}", "-o", "{settings}", "{file}"],
            "use_shell": False
        }
    elif IS_LINUX:
        return {
            "cmd": "lp",
            "args_template": ["-d", "{printer}", "-o", "{settings}", "{file}"],
            "use_shell": False
        }
    else:
        # Fallback for other Unix-like systems
        return {
            "cmd": "lp",
            "args_template": ["-d", "{printer}", "-o", "{settings}", "{file}"],
            "use_shell": False
        }

def _get_sumatra_path() -> str:
    """Get SumatraPDF path (Windows only)"""
    if not IS_WINDOWS:
        return ""

    path = settings.SUMATRA_PDF_PATH.strip().strip('"').strip("'")
    if path and os.path.exists(path):
        if path.lower().endswith('.lnk'):
            logger.warning(f"⚠️ SUMATRA_PDF_PATH is a shortcut (.lnk): {path}")
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

def _convert_print_settings(options: Dict) -> str:
    """Convert options to platform-specific print settings string"""
    copies = int(options.get("copies", 1))
    mode = options.get("mode", "bw")
    is_two_sided = options.get("isTwoSided", False)
    paper_size = options.get("paperSize", "A4")
    
    if IS_WINDOWS:
        duplex = "duplexlong" if is_two_sided else "simplex"
        monochrome = "monochrome" if mode == "bw" else "color"
        settings_str = f"copies={copies},{duplex},{monochrome},paper={paper_size},fit"
        
        # Add page ranges if specified
        page_range = options.get("pages")
        if page_range:
            settings_str += f",pages={page_range}"
        return settings_str
    
    elif IS_MAC or IS_LINUX:
        # CUPS options format
        options_list = [
            f"copies={copies}",
            "sides=two-sided-long-edge" if is_two_sided else "sides=one-sided",
            f"ColorModel={'Gray' if mode == 'bw' else 'RGB'}",
            f"PageSize={paper_size}",
            "fit-to-page"
        ]
        
        page_range = options.get("pages")
        if page_range:
            options_list.append(f"page-ranges={page_range}")
        
        return ",".join(options_list)
    
    return ""

async def print_pdf(file_path: Path, options: Dict) -> bool:
    """
    Core engine that sends print command to the system printer.
    Works on Windows, macOS, and Linux.
    """
    logger.info(f"📄 Preparing print job on {SYSTEM}: {file_path}")
    
    if settings.MOCK_PRINTER:
        logger.info(f"🎭 [MOCK PRINTER] Simulating print for: {file_path}")
        await asyncio.sleep(2)  # Simulate mechanical movement
        return True
    
    if not file_path.exists():
        logger.error(f"❌ File not found for printing: {file_path}")
        return False

    # Get platform-specific print configuration
    print_config = _get_print_command()
    
    # Get printer name based on settings
    copies = int(options.get("copies", 1))
    mode = options.get("mode", "bw")
    is_two_sided = options.get("isTwoSided", False)
    
    if IS_WINDOWS:
        if mode == "color":
            printer_name = settings.PRINTER_COLOR_DUPLEX if is_two_sided else settings.PRINTER_COLOR
        else:
            printer_name = settings.PRINTER_BW_DUPLEX if is_two_sided else settings.PRINTER_BW
        printer_name = printer_name.strip().strip('"').strip("'")
    else:
        # For macOS/Linux, use default printer or specified one
        printer_name = settings.PRINTER_NAME if hasattr(settings, 'PRINTER_NAME') else None
    
    # Convert print settings
    settings_str = _convert_print_settings(options)
    
    # Build command
    if IS_WINDOWS:
        cmd_str = print_config["cmd"]
        args = [arg.format(printer=printer_name, settings=settings_str, file=str(file_path)) 
                for arg in print_config["args_template"]]
        command = [cmd_str] + args
        cmd_to_run = subprocess.list2cmdline(command)
        use_shell = True
    else:
        # macOS/Linux
        command = [print_config["cmd"]]
        for arg in print_config["args_template"]:
            command.append(arg.format(printer=printer_name if printer_name else "", 
                                     settings=settings_str, 
                                     file=str(file_path)))
        # Filter out empty strings
        command = [c for c in command if c]
        cmd_to_run = command
        use_shell = False
    
    logger.info(f"🚀 Using Printer: {printer_name if printer_name else 'default'}")
    logger.info(f"📋 Command: {cmd_to_run if isinstance(cmd_to_run, str) else ' '.join(cmd_to_run)}")

    try:
        def run_cmd():
            if use_shell:
                return subprocess.run(
                    cmd_to_run,
                    stdout=subprocess.PIPE,
                    stderr=subprocess.PIPE,
                    shell=True,
                    creationflags=subprocess.CREATE_NO_WINDOW if IS_WINDOWS and hasattr(subprocess, 'CREATE_NO_WINDOW') else 0
                )
            else:
                return subprocess.run(
                    cmd_to_run,
                    stdout=subprocess.PIPE,
                    stderr=subprocess.PIPE,
                    shell=False
                )

        process = await asyncio.to_thread(run_cmd)
        
        if process.returncode != 0:
            err_msg = process.stderr.decode().strip()
            logger.error(f"❌ Print Error on {SYSTEM} (Code {process.returncode}): {err_msg}")
            
            # Provide helpful error messages
            if "no such printer" in err_msg.lower() or "invalid printer" in err_msg.lower():
                logger.error(f"🔍 Printer '{printer_name}' not found. Available printers:")
                await _list_available_printers()
            elif "not found" in err_msg.lower() and IS_MAC:
                logger.error("💡 Tip: Make sure printer is added in System Settings > Printers & Scanners")
            elif IS_LINUX and "lp: " in err_msg:
                logger.error("💡 Tip: Install CUPS and configure printer: sudo apt-get install cups")
                
            return False
        
        logger.info(f"✅ Print job sent successfully to spooler on {SYSTEM}")
        return True
        
    except FileNotFoundError as e:
        if IS_WINDOWS:
            logger.error(f"❌ SumatraPDF Execution Failed: {e}")
            logger.error("💡 Download SumatraPDF from: https://www.sumatrapdfreader.org/download-free-pdf-viewer")
        elif IS_MAC:
            logger.error(f"❌ lpr command not found. Make sure CUPS is installed.")
        elif IS_LINUX:
            logger.error(f"❌ lp command not found. Install CUPS: sudo apt-get install cups")
        return False
    except Exception as e:
        import traceback
        logger.error(f"💥 Critical engine failure:\n{traceback.format_exc()}")
        return False

async def _list_available_printers():
    """List available printers for debugging"""
    try:
        if IS_WINDOWS:
            def get_printers():
                ps_cmd = "Get-Printer | Select-Object Name | ConvertTo-Json"
                result = subprocess.run(["powershell", "-NoProfile", "-Command", ps_cmd], 
                                      capture_output=True, text=True)
                return result
            proc = await asyncio.to_thread(get_printers)
            import json
            printers = json.loads(proc.stdout)
            if isinstance(printers, list):
                for p in printers:
                    logger.error(f"   -> '{p.get('Name')}'")
            else:
                logger.error(f"   -> '{printers.get('Name')}'")
        else:
            # macOS/Linux
            cmd = "lpstat -p" if IS_MAC or IS_LINUX else "lpstat -p"
            result = subprocess.run(cmd.split(), capture_output=True, text=True)
            for line in result.stdout.split('\n'):
                if line.strip():
                    logger.error(f"   -> {line.strip()}")
    except Exception as e:
        logger.error(f"   (Failed to fetch printer list: {e})")