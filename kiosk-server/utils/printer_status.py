# import asyncio
# import subprocess
# import os
# import time
# from typing import Optional, Dict
# from config import settings
# from .logger import get_logger

# # Import these inside methods or ensure they are used carefully with threads
# try:
#     import win32print
#     import wmi
#     import pythoncom
# except ImportError:
#     win32print = None
#     wmi = None
#     pythoncom = None

# from pysnmp.hlapi.v3arch.asyncio import (
#     SnmpEngine,
#     CommunityData,
#     UdpTransportTarget,
#     ContextData,
#     ObjectType,
#     ObjectIdentity,
#     get_cmd
# )

# logger = get_logger("printer_status")

# class PrinterStatusTracker:
#     """
#     Tracks printer connectivity and health using a multi-layered check.
#     Uses asyncio.to_thread for blocking Windows-specific calls.
#     """
#     def __init__(self):
#         self.usb_fail_count = 0
#         self.last_status = "NORMAL"
#         self._cached_status = {
#             "status": "NORMAL", 
#             "is_online": True,
#             "connectivity": "UNKNOWN",
#             "snmp_code": 0,
#             "queues": {}
#         }
#         self._last_refresh = 0
#         self._check_in_progress = False
#         self._lock = asyncio.Lock()
#         self.last_queue_status = {}
#         self._wmi_client = None

#     def _sync_check_usb(self) -> dict:
#         """Blocking WMI call to be run in thread."""
#         if not wmi or not pythoncom:
#             return {}
        
#         # COM must be initialized for each thread in the pool
#         pythoncom.CoInitialize()
        
#         printers_status = {}
#         configured_names = {
#             "bw": settings.PRINTER_BW,
#             "bw_duplex": settings.PRINTER_BW_DUPLEX,
#             "color": settings.PRINTER_COLOR,
#             "color_duplex": settings.PRINTER_COLOR_DUPLEX
#         }
        
#         try:
#             logger.debug("🧵 Running WMI check in thread...")
#             # Create a localized WMI client for this thread
#             c = wmi.WMI()
#             printers = c.Win32_Printer()
            
#             for key, name in configured_names.items():
#                 p_obj = next((p for p in printers if p.Name == name), None)
#                 if not p_obj:
#                     printers_status[key] = "MISSING"
#                 else:
#                     status_code = getattr(p_obj, "PrinterStatus", 0)
#                     if status_code in [3, 4, 5]:
#                         printers_status[key] = "READY"
#                     elif status_code == 1:
#                         printers_status[key] = "PAUSED"
#                     elif status_code == 2:
#                         printers_status[key] = "ERROR"
#                     else:
#                         printers_status[key] = f"UNKNOWN({status_code})"
#             return printers_status
#         except Exception as e:
#             logger.error(f"💥 WMI Printer Check Failed: {e}")
#             return {k: "WMI_ERROR" for k in configured_names}
#         finally:
#             pythoncom.CoUninitialize()

#     async def check_usb_connected(self) -> dict:
#         return await asyncio.to_thread(self._sync_check_usb)

#     async def check_snmp_hardware_status(self) -> Dict:
#         """SNMP is already async via pysnmp-lextudio."""
#         if not settings.PRINTER_IP:
#             return {"online": True, "status": "UNKNOWN", "code": 0}

#         try:
#             snmp_engine = SnmpEngine()
#             iterator = await get_cmd(
#                 snmp_engine,
#                 CommunityData("public", mpModel=0),
#                 await UdpTransportTarget.create((settings.PRINTER_IP, 161), timeout=2.0, retries=1),
#                 ContextData(),
#                 ObjectType(ObjectIdentity("1.3.6.1.2.1.25.3.2.1.5.1")),
#             )

#             error_indication, error_status, error_index, var_binds = iterator

#             if error_indication:
#                 logger.debug("💤 SNMP Timeout. Assuming Sleep Mode.")
#                 return {"online": True, "status": "SLEEP_MODE", "code": 0}
            
#             if error_status:
#                 return {"online": True, "status": "UNKNOWN", "code": 2}

#             status_code = int(var_binds[0][1])
#             if status_code == 5:
#                 logger.warning("🚨 [SNMP] Hardware Error Detected!")
#                 return {"online": True, "status": "JAMMED", "code": 5}
            
#             return {"online": True, "status": "READY", "code": status_code}
#         except Exception as e:
#             return {"online": True, "status": "SLEEP_MODE", "code": 0}

#     def _sync_ping(self) -> bool:
#         if not settings.PRINTER_IP: return False
#         try:
#             # Use a faster ping on Windows
#             params = ["ping", "-n", "1", "-w", "1000", settings.PRINTER_IP]
#             result = subprocess.run(params, capture_output=True, text=True)
#             output = result.stdout.lower()
#             return "reply from" in output and "unreachable" not in output
#         except:
#             return False

#     async def check_ip_ping(self) -> bool:
#         return await asyncio.to_thread(self._sync_ping)

#     def _sync_check_spooler(self) -> str:
#         cmd = 'powershell -Command "Get-PrintJob -PrinterName \'*HP*\' | Where-Object { $_.JobStatus -match \'Error|Jam|Blocked|Paused\' }"'
#         try:
#             result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
#             return "JAMMED" if result.stdout.strip() else "NORMAL"
#         except:
#             return "NORMAL"

#     async def check_spooler_queue_powershell(self) -> str:
#         return await asyncio.to_thread(self._sync_check_spooler)

#     async def get_comprehensive_status(self, force: bool = False) -> Dict:
#         """
#         Non-blocking status checker. Uses lock to prevent concurrent heavy checks.
#         """
#         # frescas cache check (2s)
#         if not force and (time.time() - self._last_refresh < 2):
#             return self._cached_status

#         if self._lock.locked():
#             return self._cached_status

#         async with self._lock:
#             # Re-check cache
#             if not force and (time.time() - self._last_refresh < 2):
#                 return self._cached_status

#             # Start checks
#             snmp_result = await self.check_snmp_hardware_status()
#             ps_status = await self.check_spooler_queue_powershell()
#             queue_status = await self.check_usb_connected()
            
#             is_usb_online = any(status == "READY" for status in queue_status.values())
            
#             # If all are missing, we might be on network or IP
#             is_online = is_usb_online
#             connectivity = "USB"
            
#             if not is_usb_online:
#                 self.usb_fail_count += 1
#                 if self.usb_fail_count >= 3: # Lowered threshold
#                     is_ip_online = await self.check_ip_ping()
#                     is_online = is_ip_online
#                     connectivity = "NETWORK" if is_ip_online else "NONE"
#             else:
#                 self.usb_fail_count = 0

#             system_status = "NORMAL"
#             if snmp_result["status"] == "JAMMED" or ps_status == "JAMMED":
#                 system_status = "JAMMED"
#             elif not is_online:
#                 system_status = "OFFLINE"
            
#             # Final check via win32print if possible
#             if is_online and win32print and system_status == "NORMAL":
#                 def _check_win32_status():
#                     if pythoncom: pythoncom.CoInitialize()
#                     try:
#                         name = win32print.GetDefaultPrinter()
#                         h = win32print.OpenPrinter(name)
#                         info = win32print.GetPrinter(h, 2)
#                         win32print.ClosePrinter(h)
#                         if info['Status'] & 0x00000008: return "JAMMED"
#                         return "NORMAL"
#                     except: return "NORMAL"
#                     finally:
#                         if pythoncom: pythoncom.CoUninitialize()
#                 system_status = await asyncio.to_thread(_check_win32_status)

#             result = {
#                 "is_online": is_online,
#                 "connectivity": connectivity,
#                 "status": system_status,
#                 "snmp_code": snmp_result["code"],
#                 "queues": queue_status
#             }
            
#             self._cached_status = result
#             self._last_refresh = time.time()
#             return result

# # Global instance for shared status tracking
# printer_tracker = PrinterStatusTracker()


# import asyncio
# import subprocess
# import platform
# import time
# from typing import Optional, Dict
# from config import settings
# from .logger import get_logger

# logger = get_logger("printer_status")
# OS_TYPE = platform.system()
# IS_WINDOWS = OS_TYPE == "Windows"

# class PrinterStatusTracker:
#     """
#     Cross-platform printer status tracker
#     """
#     def __init__(self):
#         self.last_status = "NORMAL"
#         self._cached_status = {
#             "status": "NORMAL", 
#             "is_online": True,
#             "connectivity": "UNKNOWN",
#             "queues": {}
#         }
#         self._last_refresh = 0
#         self._check_in_progress = False
#         self._lock = asyncio.Lock()
    
#     async def check_printer_status_unix(self) -> dict:
#         """Check printer status on macOS/Linux using lpstat"""
#         printers_status = {}
#         configured_names = ["bw", "color"]
        
#         try:
#             # Get printer status
#             process = await asyncio.create_subprocess_exec(
#                 'lpstat', '-p',
#                 stdout=asyncio.subprocess.PIPE,
#                 stderr=asyncio.subprocess.PIPE
#             )
#             stdout, _ = await process.communicate()
            
#             output = stdout.decode().lower()
            
#             for key in configured_names:
#                 if key in output:
#                     if "idle" in output:
#                         printers_status[key] = "READY"
#                     elif "printing" in output:
#                         printers_status[key] = "BUSY"
#                     elif "disabled" in output or "paused" in output:
#                         printers_status[key] = "PAUSED"
#                     else:
#                         printers_status[key] = "READY"
#                 else:
#                     printers_status[key] = "MISSING"
            
#             return printers_status
            
#         except Exception as e:
#             logger.error(f"Failed to check printer status: {e}")
#             return {k: "UNKNOWN" for k in configured_names}
    
#     async def check_printer_status_windows(self) -> dict:
#         """Check printer status on Windows using PowerShell"""
#         printers_status = {}
#         configured_names = {
#             "bw": settings.PRINTER_BW,
#             "color": settings.PRINTER_COLOR
#         }
        
#         try:
#             ps_command = """
#             $printers = Get-Printer | Select-Object Name, PrinterStatus, JobCount
#             $printers | ConvertTo-Json
#             """
            
#             process = await asyncio.create_subprocess_exec(
#                 'powershell', '-NoProfile', '-Command', ps_command,
#                 stdout=asyncio.subprocess.PIPE,
#                 stderr=asyncio.subprocess.PIPE
#             )
#             stdout, _ = await process.communicate()
            
#             import json
#             printer_data = json.loads(stdout.decode())
            
#             if not isinstance(printer_data, list):
#                 printer_data = [printer_data]
            
#             for key, name in configured_names.items():
#                 printer = next((p for p in printer_data if p.get('Name') == name), None)
#                 if not printer:
#                     printers_status[key] = "MISSING"
#                 else:
#                     status = printer.get('PrinterStatus', 0)
#                     if status in [0, 1, 3]:  # Ready, Idle, Printing
#                         printers_status[key] = "READY"
#                     elif status == 4:  # Paused
#                         printers_status[key] = "PAUSED"
#                     elif status == 5:  # Error
#                         printers_status[key] = "ERROR"
#                     else:
#                         printers_status[key] = "READY"
            
#             return printers_status
            
#         except Exception as e:
#             logger.error(f"Failed to check Windows printers: {e}")
#             return {k: "UNKNOWN" for k in configured_names}
    
#     async def check_ip_ping(self) -> bool:
#         """Check if printer is reachable via network"""
#         if not hasattr(settings, 'PRINTER_IP') or not settings.PRINTER_IP:
#             return True
        
#         try:
#             param = '-n' if IS_WINDOWS else '-c'
#             timeout = '-w' if IS_WINDOWS else '-W'
            
#             process = await asyncio.create_subprocess_exec(
#                 'ping', param, '1', timeout, '1000', settings.PRINTER_IP,
#                 stdout=asyncio.subprocess.PIPE,
#                 stderr=asyncio.subprocess.PIPE
#             )
#             stdout, _ = await process.communicate()
            
#             output = stdout.decode().lower()
#             if IS_WINDOWS:
#                 return "reply from" in output and "unreachable" not in output
#             else:
#                 return "1 packets received" in output or "1 received" in output
                
#         except Exception as e:
#             logger.debug(f"Ping failed: {e}")
#             return False
    
#     async def get_comprehensive_status(self, force: bool = False) -> Dict:
#         """Get comprehensive printer status"""
#         if not force and (time.time() - self._last_refresh < 2):
#             return self._cached_status
        
#         if self._lock.locked():
#             return self._cached_status
        
#         async with self._lock:
#             if not force and (time.time() - self._last_refresh < 2):
#                 return self._cached_status
            
#             # Get printer status based on OS
#             if IS_WINDOWS:
#                 queue_status = await self.check_printer_status_windows()
#             else:
#                 queue_status = await self.check_printer_status_unix()
            
#             is_online = any(status == "READY" for status in queue_status.values())
            
#             # Check network connectivity if printers appear offline
#             if not is_online and hasattr(settings, 'PRINTER_IP'):
#                 is_online = await self.check_ip_ping()
#                 connectivity = "NETWORK" if is_online else "NONE"
#             else:
#                 connectivity = "USB" if is_online else "UNKNOWN"
            
#             system_status = "NORMAL"
#             if not is_online:
#                 system_status = "OFFLINE"
#             elif any(status == "PAUSED" for status in queue_status.values()):
#                 system_status = "PAUSED"
#             elif any(status == "ERROR" for status in queue_status.values()):
#                 system_status = "ERROR"
            
#             result = {
#                 "is_online": is_online,
#                 "connectivity": connectivity,
#                 "status": system_status,
#                 "queues": queue_status
#             }
            
#             self._cached_status = result
#             self._last_refresh = time.time()
#             return result

# # Global instance
# printer_tracker = PrinterStatusTracker()

import asyncio
import subprocess
import os
import time
import platform
from typing import Optional, Dict
from config import settings
from .logger import get_logger

logger = get_logger("printer_status")
SYSTEM = platform.system()
IS_WINDOWS = SYSTEM == "Windows"

# Conditional imports for Windows-only libraries
if IS_WINDOWS:
    try:
        import win32print
        import wmi
        import pythoncom
    except ImportError:
        win32print = None
        wmi = None
        pythoncom = None
        logger.warning("Windows printing libraries not available")
else:
    win32print = None
    wmi = None
    pythoncom = None

# SNMP library is cross-platform
try:
    from pysnmp.hlapi.v3arch.asyncio import (
        SnmpEngine,
        CommunityData,
        UdpTransportTarget,
        ContextData,
        ObjectType,
        ObjectIdentity,
        get_cmd
    )
except ImportError:
    logger.warning("pysnmp not available, SNMP monitoring disabled")

class PrinterStatusTracker:
    """
    Tracks printer connectivity and health across platforms.
    Uses platform-specific methods for Windows, macOS, and Linux.
    """
    def __init__(self):
        self.usb_fail_count = 0
        self.last_status = "NORMAL"
        self._cached_status = {
            "status": "NORMAL", 
            "is_online": True,
            "connectivity": "UNKNOWN",
            "snmp_code": 0,
            "queues": {}
        }
        self._last_refresh = 0
        self._check_in_progress = False
        self._lock = asyncio.Lock()
        self.last_queue_status = {}
        self._wmi_client = None

    def _sync_check_usb_windows(self) -> dict:
        """Blocking WMI call for Windows (to be run in thread)."""
        if not IS_WINDOWS or not wmi or not pythoncom:
            return {}
        
        pythoncom.CoInitialize()
        
        printers_status = {}
        configured_names = {
            "bw": settings.PRINTER_BW,
            "bw_duplex": settings.PRINTER_BW_DUPLEX,
            "color": settings.PRINTER_COLOR,
            "color_duplex": settings.PRINTER_COLOR_DUPLEX
        }
        
        try:
            logger.debug("🧵 Running WMI check in thread...")
            c = wmi.WMI()
            printers = c.Win32_Printer()
            
            for key, name in configured_names.items():
                p_obj = next((p for p in printers if p.Name == name), None)
                if not p_obj:
                    printers_status[key] = "MISSING"
                else:
                    status_code = getattr(p_obj, "PrinterStatus", 0)
                    if status_code in [3, 4, 5]:
                        printers_status[key] = "READY"
                    elif status_code == 1:
                        printers_status[key] = "PAUSED"
                    elif status_code == 2:
                        printers_status[key] = "ERROR"
                    else:
                        printers_status[key] = f"UNKNOWN({status_code})"
            return printers_status
        except Exception as e:
            logger.error(f"💥 WMI Printer Check Failed: {e}")
            return {k: "WMI_ERROR" for k in configured_names}
        finally:
            pythoncom.CoUninitialize()

    def _sync_check_printers_unix(self) -> dict:
        """Check printers on macOS/Linux using lpstat"""
        printers_status = {}
        configured_names = {
            "bw": settings.PRINTER_BW,
            "bw_duplex": settings.PRINTER_BW_DUPLEX,
            "color": settings.PRINTER_COLOR,
            "color_duplex": settings.PRINTER_COLOR_DUPLEX
        }
        
        try:
            # Get printer status using lpstat
            result = subprocess.run(['lpstat', '-p'], capture_output=True, text=True)
            
            for key, name in configured_names.items():
                # Check if printer exists in output
                if name in result.stdout:
                    # Parse status (simplified for cross-platform)
                    if 'idle' in result.stdout:
                        printers_status[key] = "READY"
                    elif 'disabled' in result.stdout or 'paused' in result.stdout:
                        printers_status[key] = "PAUSED"
                    else:
                        printers_status[key] = "READY"
                else:
                    printers_status[key] = "MISSING"
            
            return printers_status
        except Exception as e:
            logger.error(f"Failed to check printers on {SYSTEM}: {e}")
            return {k: "UNKNOWN" for k in configured_names}

    async def check_usb_connected(self) -> dict:
        """Platform-agnostic printer connectivity check"""
        if IS_WINDOWS:
            return await asyncio.to_thread(self._sync_check_usb_windows)
        else:
            return await asyncio.to_thread(self._sync_check_printers_unix)

    async def check_snmp_hardware_status(self) -> Dict:
        """SNMP check (works on all platforms)"""
        if not settings.PRINTER_IP:
            return {"online": True, "status": "UNKNOWN", "code": 0}

        try:
            snmp_engine = SnmpEngine()
            iterator = await get_cmd(
                snmp_engine,
                CommunityData("public", mpModel=0),
                await UdpTransportTarget.create((settings.PRINTER_IP, 161), timeout=2.0, retries=1),
                ContextData(),
                ObjectType(ObjectIdentity("1.3.6.1.2.1.25.3.2.1.5.1")),
            )

            error_indication, error_status, error_index, var_binds = iterator

            if error_indication:
                logger.debug("💤 SNMP Timeout. Assuming Sleep Mode.")
                return {"online": True, "status": "SLEEP_MODE", "code": 0}
            
            if error_status:
                return {"online": True, "status": "UNKNOWN", "code": 2}

            status_code = int(var_binds[0][1])
            if status_code == 5:
                logger.warning("🚨 [SNMP] Hardware Error Detected!")
                return {"online": True, "status": "JAMMED", "code": 5}
            
            return {"online": True, "status": "READY", "code": status_code}
        except Exception as e:
            logger.debug(f"SNMP check failed: {e}")
            return {"online": True, "status": "SLEEP_MODE", "code": 0}

    def _sync_ping(self) -> bool:
        """Cross-platform ping check"""
        if not settings.PRINTER_IP:
            return False
        
        try:
            # Platform-specific ping parameters
            if IS_WINDOWS:
                params = ["ping", "-n", "1", "-w", "1000", settings.PRINTER_IP]
            else:
                # macOS/Linux
                params = ["ping", "-c", "1", "-W", "1", settings.PRINTER_IP]
            
            result = subprocess.run(params, capture_output=True, text=True)
            output = result.stdout.lower()
            
            if IS_WINDOWS:
                return "reply from" in output and "unreachable" not in output
            else:
                return "1 received" in output or "1 packets received" in output
        except:
            return False

    async def check_ip_ping(self) -> bool:
        return await asyncio.to_thread(self._sync_ping)

    async def check_spooler_queue(self) -> str:
        """Check printer queue for errors (cross-platform)"""
        try:
            if IS_WINDOWS:
                cmd = 'powershell -Command "Get-PrintJob -PrinterName \'*\' | Where-Object { $_.JobStatus -match \'Error|Jam|Blocked|Paused\' }"'
            else:
                # macOS/Linux - check CUPS queue
                cmd = 'lpstat -o | grep -E "Error|Jam|Blocked|Paused" || true'
            
            result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
            return "JAMMED" if result.stdout.strip() else "NORMAL"
        except:
            return "NORMAL"

    async def get_comprehensive_status(self, force: bool = False) -> Dict:
        """
        Non-blocking status checker for all platforms.
        """
        # Cache check (2 seconds)
        if not force and (time.time() - self._last_refresh < 2):
            return self._cached_status

        if self._lock.locked():
            return self._cached_status

        async with self._lock:
            if not force and (time.time() - self._last_refresh < 2):
                return self._cached_status

            # Start checks
            snmp_result = await self.check_snmp_hardware_status()
            ps_status = await self.check_spooler_queue()
            queue_status = await self.check_usb_connected()
            
            is_usb_online = any(status == "READY" for status in queue_status.values())
            
            # Determine connectivity
            is_online = is_usb_online
            connectivity = "USB"
            
            if not is_usb_online:
                self.usb_fail_count += 1
                if self.usb_fail_count >= 3:
                    is_ip_online = await self.check_ip_ping()
                    is_online = is_ip_online
                    connectivity = "NETWORK" if is_ip_online else "NONE"
            else:
                self.usb_fail_count = 0

            system_status = "NORMAL"
            if snmp_result["status"] == "JAMMED" or ps_status == "JAMMED":
                system_status = "JAMMED"
            elif not is_online:
                system_status = "OFFLINE"

            result = {
                "is_online": is_online,
                "connectivity": connectivity,
                "status": system_status,
                "snmp_code": snmp_result["code"],
                "queues": queue_status
            }
            
            self._cached_status = result
            self._last_refresh = time.time()
            return result

# Global instance
printer_tracker = PrinterStatusTracker()