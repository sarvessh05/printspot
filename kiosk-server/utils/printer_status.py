import asyncio
import subprocess
import os
import time
from typing import Optional, Dict
from config import settings
from .logger import get_logger

# Import these inside methods or ensure they are used carefully with threads
try:
    import win32print
    import wmi
except ImportError:
    win32print = None
    wmi = None

from pysnmp.hlapi.v3arch.asyncio import (
    SnmpEngine,
    CommunityData,
    UdpTransportTarget,
    ContextData,
    ObjectType,
    ObjectIdentity,
    getCmd as get_cmd
)

logger = get_logger("printer_status")

class PrinterStatusTracker:
    """
    Tracks printer connectivity and health using a multi-layered check.
    Uses asyncio.to_thread for blocking Windows-specific calls.
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

    def _sync_check_usb(self) -> dict:
        """Blocking WMI call to be run in thread."""
        if not wmi:
            return {}
        printers_status = {}
        configured_names = {
            "bw": settings.PRINTER_BW,
            "bw_duplex": settings.PRINTER_BW_DUPLEX,
            "color": settings.PRINTER_COLOR,
            "color_duplex": settings.PRINTER_COLOR_DUPLEX
        }
        
        try:
            if not self._wmi_client:
                self._wmi_client = wmi.WMI()
            
            printers = self._wmi_client.Win32_Printer()
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
            self._wmi_client = None # Reset on failure
            return {k: "WMI_ERROR" for k in configured_names}

    async def check_usb_connected(self) -> dict:
        return await asyncio.to_thread(self._sync_check_usb)

    async def check_snmp_hardware_status(self) -> Dict:
        """SNMP is already async via pysnmp-lextudio."""
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
            return {"online": True, "status": "SLEEP_MODE", "code": 0}

    def _sync_ping(self) -> bool:
        if not settings.PRINTER_IP: return False
        try:
            # Use a faster ping on Windows
            params = ["ping", "-n", "1", "-w", "1000", settings.PRINTER_IP]
            result = subprocess.run(params, capture_output=True, text=True)
            output = result.stdout.lower()
            return "reply from" in output and "unreachable" not in output
        except:
            return False

    async def check_ip_ping(self) -> bool:
        return await asyncio.to_thread(self._sync_ping)

    def _sync_check_spooler(self) -> str:
        cmd = 'powershell -Command "Get-PrintJob -PrinterName \'*HP*\' | Where-Object { $_.JobStatus -match \'Error|Jam|Blocked|Paused\' }"'
        try:
            result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
            return "JAMMED" if result.stdout.strip() else "NORMAL"
        except:
            return "NORMAL"

    async def check_spooler_queue_powershell(self) -> str:
        return await asyncio.to_thread(self._sync_check_spooler)

    async def get_comprehensive_status(self, force: bool = False) -> Dict:
        """
        Non-blocking status checker. Uses lock to prevent concurrent heavy checks.
        """
        # frescas cache check (2s)
        if not force and (time.time() - self._last_refresh < 2):
            return self._cached_status

        if self._lock.locked():
            return self._cached_status

        async with self._lock:
            # Re-check cache
            if not force and (time.time() - self._last_refresh < 2):
                return self._cached_status

            # Start checks
            snmp_result = await self.check_snmp_hardware_status()
            ps_status = await self.check_spooler_queue_powershell()
            queue_status = await self.check_usb_connected()
            
            is_usb_online = any(status == "READY" for status in queue_status.values())
            
            # If all are missing, we might be on network or IP
            is_online = is_usb_online
            connectivity = "USB"
            
            if not is_usb_online:
                self.usb_fail_count += 1
                if self.usb_fail_count >= 3: # Lowered threshold
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
            
            # Final check via win32print if possible
            if is_online and win32print and system_status == "NORMAL":
                def _check_win32_status():
                    try:
                        name = win32print.GetDefaultPrinter()
                        h = win32print.OpenPrinter(name)
                        info = win32print.GetPrinter(h, 2)
                        win32print.ClosePrinter(h)
                        if info['Status'] & 0x00000008: return "JAMMED"
                        return "NORMAL"
                    except: return "NORMAL"
                system_status = await asyncio.to_thread(_check_win32_status)

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

# Global instance for shared status tracking
printer_tracker = PrinterStatusTracker()
