import asyncio
import subprocess
import win32print
import wmi
from typing import Optional, Dict
from config import settings
from .logger import get_logger

logger = get_logger("printer_status")

# Initialize WMI for Windows HW queries
_wmi_client = wmi.WMI()

class PrinterStatusTracker:
    """
    Tracks printer connectivity and health using a multi-layered check.
    Primary: USB (WMI/Win32)
    Fallback: IP Ping (after 5 fails)
    Status: Windows Spooler Queue
    """
    def __init__(self):
        self.usb_fail_count = 0
        self.last_status = "UNKNOWN"
        self._lock = asyncio.Lock()

    async def check_usb_connected(self) -> bool:
        """
        Uses WMI to check if ANY printer matching the configured name is connected via USB.
        """
        try:
            # Query Win32_Printer for local printers
            printers = _wmi_client.Win32_Printer()
            for p in printers:
                # Look for 'USB' in PortName or Name
                if "HP" in p.Name or "HP" in p.PortName:
                    # Actually check if it's currently connected and ready
                    # Status code 3 = Idle (Online), 4 = Printing, 5 = WarminUp
                    if p.PrinterStatus in [3, 4, 5]:
                        return True
            return False
        except Exception as e:
            logger.error(f"Error querying WMI: {e}")
            return False

    async def check_ip_ping(self) -> bool:
        """
        Standard fallback check to see if the printer is alive on the network.
        """
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

    async def get_comprehensive_status(self) -> Dict:
        """
        Main logic:
        1. Try USB check.
        2. If 5 consecutive USB fails, use IP Ping.
        3. Poll Windows Queue for Job Jam/Errors.
        """
        async with self._lock:
            # Step 1: Physical USB Check
            is_usb_online = await self.check_usb_connected()
            
            if is_usb_online:
                self.usb_fail_count = 0
                connectivity = "USB"
                online = True
            else:
                self.usb_fail_count += 1
                logger.warning(f"❌ USB check failed ({self.usb_fail_count}/5)")
                
                # Step 2: Fallback to IP if USB persists failing
                if self.usb_fail_count >= 5:
                    logger.info("🔄 5 USB fails reached. Pivoting to Network Ping fallback...")
                    is_ip_online = await self.check_ip_ping()
                    if is_ip_online:
                        connectivity = "NETWORK"
                        online = True
                    else:
                        connectivity = "NONE"
                        online = False
                else:
                    connectivity = "USB_RETREIVE" # Still trying USB
                    online = False

            # Step 3: Check Spooler for Errors (if online)
            system_status = "NORMAL"
            if online:
                try:
                    # Get info from Windows Spooler
                    printer_name = win32print.GetDefaultPrinter()
                    handle = win32print.OpenPrinter(printer_name)
                    info = win32print.GetPrinter(handle, 2)
                    win32print.ClosePrinter(handle)
                    
                    # Check for Job Status or specific printer flags
                    # 0x00000002 = PRINTER_STATUS_PAUSED, 0x00000008 = PRINTER_STATUS_PAPER_JAM
                    if info['Status'] & 0x00000008:
                        system_status = "JAMMED"
                    elif info['Status'] & 0x00000100: # USER_INTERVENTION
                        system_status = "USER_INTERVENTION"
                    elif info['Status'] & 0x00000001: # PAUSED
                        system_status = "PAUSED"
                except Exception as e:
                    logger.debug(f"Spooler check fail: {e}")
            else:
                system_status = "OFFLINE"

            result = {
                "is_online": online,
                "connectivity": connectivity,
                "status": system_status,
                "usb_fails": self.usb_fail_count
            }
            logger.info(f"📊 Status Check: {result}")
            return result

# Global singleton to track state across requests
tracker = PrinterStatusTracker()
