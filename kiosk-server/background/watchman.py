import asyncio
from utils.printer_status import printer_tracker
from utils.cloud_client import cloud
from utils.logger import get_logger

logger = get_logger("watchman")

async def watchman_loop():
    """
    Continuous background loop that monitors hardware every 3s 
    and sends a cloud heartbeat every 30s.
    Matches the setInterval logic from server.js.
    """
    logger.info("[WATCHMAN] Watchman started. Monitoring hardware...")
    
    heartbeat_counter = 0
    
    while True:
        try:
            # 1. Refresh global hardware status (cached for routes)
            status_info = await printer_tracker.get_comprehensive_status(force=True)
            
            # 2. Handle 30-second Cloud Heartbeat
            heartbeat_counter += 3
            if heartbeat_counter >= 30:
                logger.info(f"(HEARTBEAT) Sending heartbeat to Cloud. Status: {status_info['status']}")
                await cloud.report_health(hardware_status=status_info["status"])
                heartbeat_counter = 0
                
        except Exception as e:
            logger.error(f"⚠️ Watchman Loop Error: {e}")
            
        await asyncio.sleep(3)
