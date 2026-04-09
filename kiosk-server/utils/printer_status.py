import asyncio
import subprocess
import win32print
import wmi
from typing import Optional, Dict
from config import settings
from .logger import get_logger
from pysnmp.hlapi.asyncio import (
    SnmpEngine,
    CommunityData,
    UdpTransportTarget,
    ContextData,
    ObjectType,
    ObjectIdentity,
    getCmd
)

logger = get_logger("printer_status")

# Initialize WMI for Windows HW queries
_wmi_client = wmi.WMI()

class PrinterStatusTracker:
    """
    Tracks printer connectivity and health using a multi-layered check.
    Primary: USB (WMI/Win32)
    Secondary: SNMP Hardware Check (Tray khuli/Jam)
    Fallback: IP Ping (after 5 fails)
    Status: Windows Spooler Queue
    """
    def __init__(self):
        self.usb_fail_count = 0
        self.last_status = "NORMAL"
        self._cached_status = {"status": "NORMAL", "is_online": True}
        self._last_refresh = 0
        self._lock = asyncio.Lock()
        self.c = _wmi_client
        self.last_check = 0
        self.cached_status = {}
        self.last_queue_status = {}

    async def check_usb_connected(self) -> dict:
        """
        Specific check for all 4 configured printer queues.
        Returns a dictionary of status for each printer.
        """
        printers_status = {}
        configured_names = {
            "bw": settings.PRINTER_BW,
            "bw_duplex": settings.PRINTER_BW_DUPLEX,
            "color": settings.PRINTER_COLOR,
            "color_duplex": settings.PRINTER_COLOR_DUPLEX
        }
        
        try:
            printers = self.c.Win32_Printer()
            for key, name in configured_names.items():
                # Find matching printer object
                p_obj = next((p for p in printers if p.Name == name), None)
                if not p_obj:
                    printers_status[key] = "MISSING"
                else:
                    # Status mapping: 3=Ready, 4=Printing, 5=Warming up, 1=Paused, 2=Error
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

    async def check_snmp_hardware_status(self) -> Dict:
        """
        Uses SNMP (OID: 1.3.6.1.2.1.25.3.2.1.5.1) to check for hardware issues
        matching server.js logic.
        """
        if not settings.PRINTER_IP:
            return {"online": True, "status": "UNKNOWN", "code": 0}

        try:
            # SNMP GET request for hrDeviceStatus
            snmp_engine = SnmpEngine()
            iterator = await getCmd(
                snmp_engine,
                CommunityData("public", mpModel=0),
                await UdpTransportTarget.create((settings.PRINTER_IP, 161), timeout=2.0, retries=1),
                ContextData(),
                ObjectType(ObjectIdentity("1.3.6.1.2.1.25.3.2.1.5.1")),
            )

            error_indication, error_status, error_index, var_binds = iterator

            if error_indication:
                # MATLAB SO RAHA HAI (Sleep Mode) - server.js behavior
                logger.info("💤 SNMP Timeout. Printer Deep Sleep mein hai. READY maan lete hain.")
                return {"online": True, "status": "SLEEP_MODE", "code": 0}
            
            if error_status:
                logger.warning(f"SNMP Error response: {error_status.prettyPrint()}")
                return {"online": True, "status": "UNKNOWN", "code": 2}

            # Extract status code (should be integer)
            status_code = int(var_binds[0][1])
            
            if status_code == 5:
                # 5 = Error (usually Paper Jam or Tray Open)
                logger.warning("🚨 [SNMP] Hardware Error Detected! Possible Jam or Tray Open.")
                return {"online": True, "status": "JAMMED", "code": 5}
            
            return {"online": True, "status": "READY", "code": status_code}

        except Exception as e:
            logger.debug(f"SNMP Check Exception (ignored/falling back): {e}")
            return {"online": True, "status": "SLEEP_MODE", "code": 0}

    async def check_ip_ping(self) -> bool:
        """
        Standard fallback check to see if the printer is alive on the network.
        """
        if not settings.PRINTER_IP:
            return False
            
        logger.info(f"💾 Fallback Ping starting for {settings.PRINTER_IP}...")
        try:
            process = await asyncio.create_subprocess_exec(
                "ping", "-n", "1", "-w", "2000", settings.PRINTER_IP,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE
            )
            stdout, _ = await process.communicate()
            output = stdout.decode().lower()
            
            if "timed out" in output or "unreachable" in output:
                return False
            return True
        except Exception as e:
            logger.error(f"Ping failed: {e}")
            return False

    async def check_spooler_queue_powershell(self) -> str:
        """
        Uses PowerShell to check for any print jobs with Error or Jam status.
        Matches the 'Test 3' logic from server.js.
        """
        cmd = 'powershell -Command "Get-PrintJob -PrinterName \'*HP*\' | Where-Object { $_.JobStatus -match \'Error|Jam|Blocked|Paused\' }"'
        try:
            process = await asyncio.create_subprocess_shell(
                cmd,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE
            )
            stdout, _ = await process.communicate()
            output = stdout.decode().strip()
            return "JAMMED" if output else "NORMAL"
        except Exception as e:
            logger.debug(f"PowerShell Job check failed: {e}")
            return "NORMAL"

    async def get_comprehensive_status(self, force: bool = False) -> Dict:
        """
        Main logic matching server.js. Uses cache unless forced or expired.
        """
        import time
        current_time = time.time()
        
        # Use cache if fresh (2s) and not forced
        if not force and (current_time - self._last_refresh < 2):
            return self._cached_status

        async with self._lock:
            # Re-check cache after getting lock
            if not force and (current_time - self._last_refresh < 2):
                return self._cached_status

            # Step 1: Real-time SNMP Hardware Status
            snmp_result = await self.check_snmp_hardware_status()
            
            # Step 2: PowerShell Queue check (for errors/jams in the spooler)
            ps_status = await self.check_spooler_queue_powershell()
            
            # Step 3: Physical USB / Ping Check
            queue_status = await self.check_usb_connected()
            is_usb_online = all(status == "READY" for status in queue_status.values())
            
            # Trigger Alerts for Specific Queue Drops
            from .notifications import notifier
            for key, status in queue_status.items():
                last_s = self.last_queue_status.get(key)
                if last_s == "READY" and status != "READY":
                    # Queue dropped!
                    alert_msg = f"⚠️ <b>Printer Queue Drop!</b>\nQueue: <code>{key}</code>\nCurrent Status: <b>{status}</b>"
                    asyncio.create_task(notifier.send_alert(alert_msg))
                elif last_s and last_s != "READY" and status == "READY":
                    # Queue recovered
                    alert_msg = f"✅ <b>Printer Queue Recovered!</b>\nQueue: <code>{key}</code>"
                    asyncio.create_task(notifier.send_alert(alert_msg))
            
            self.last_queue_status = queue_status
            
            is_online = is_usb_online
            connectivity = "USB"
            
            if not is_usb_online:
                self.usb_fail_count += 1
                if self.usb_fail_count >= 5:
                    is_ip_online = await self.check_ip_ping()
                    is_online = is_ip_online
                    connectivity = "NETWORK" if is_ip_online else "NONE"
            else:
                self.usb_fail_count = 0

            # Step 4: Final Status Compilation
            system_status = "NORMAL"
            if snmp_result["status"] == "JAMMED" or ps_status == "JAMMED":
                system_status = "JAMMED"
            elif not is_online:
                system_status = "OFFLINE"
            else:
                # WMI/Win32 fallback for local Jams
                try:
                    default_printer = win32print.GetDefaultPrinter()
                    handle = win32print.OpenPrinter(default_printer)
                    info = win32print.GetPrinter(handle, 2)
                    win32print.ClosePrinter(handle)
                    
                    if info['Status'] & 0x00000008:
                        system_status = "JAMMED"
                    elif info['Status'] & 0x00000100:
                        system_status = "USER_INTERVENTION"
                except:
                    pass

            result = {
                "is_online": is_online,
                "connectivity": connectivity,
                "status": system_status,
                "snmp_code": snmp_result["code"],
                "queues": queue_status
            }
            # Update cache
            self._cached_status = result
            self._last_refresh = time.time()
            
            logger.info(f"📊 Status Check Complete: {result}")
            return result

# Global instance for shared status tracking
printer_tracker = PrinterStatusTracker()
