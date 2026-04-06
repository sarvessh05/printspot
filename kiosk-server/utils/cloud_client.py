import httpx
import asyncio
from config import settings
from .logger import get_logger
from .state import get_kiosk_state

logger = get_logger("cloud_client")

class CloudClient:
    """
    Handles background communication with the Admin Dashboard (Supabase).
    Reports health, heartbeats, and order completion stats.
    """
    def __init__(self):
        self.supabase_url = settings.SUPABASE_URL
        self.supabase_key = settings.SUPABASE_SERVICE_KEY
        self.kiosk_id = settings.KIOSK_ID
        self.kiosk_token = settings.VITE_KIOSK_TOKEN

    async def report_health(self, hardware_status: str = "NORMAL"):
        """
        Periodically updates the 'kiosk_health' table in Supabase.
        Includes ink, paper metrics and current hardware status.
        """
        if not self.supabase_url or not self.supabase_key:
            logger.warning("☁️ Supabase config missing. Health report skipped.")
            return

        state = await get_kiosk_state()
        
        # URL for the kiosk_health upsert
        target_url = f"{self.supabase_url}/rest/v1/kiosk_health"
        
        headers = {
            "apikey": self.supabase_key,
            "Authorization": f"Bearer {self.supabase_key}",
            "Content-Type": "application/json",
            "Prefer": "resolution=merge-duplicates" # Upsert on conflict (if id is kiosk_id)
        }

        # ID management for heath: we use kiosk_id as the unique tracker
        payload = {
            "kiosk_id": self.kiosk_id,
            "paper_left": state.get("paper", 0),
            "ink_left": state.get("ink", 0),
            "machine_status": hardware_status,
            "last_heartbeat": "now()"
        }

        try:
            async with httpx.AsyncClient(timeout=10) as client:
                # PostgREST upsert (check if we should use PATCH or POST)
                # For health updates, we usually PATCH or POST with upsert prefer
                response = await client.post(target_url, json=payload, headers=headers)
                
                if response.status_code in [200, 201]:
                    logger.info("☁️ Heartbeat: Cloud Dashboard Health Updated.")
                else:
                    logger.error(f"❌ Cloud Report Failed: {response.status_code} - {response.text}")
        except Exception as e:
            logger.error(f"💥 Failed to reach Supabase Cloud: {e}")

    async def complete_job_stats(self, db_id: str, status: str = "completed"):
        """
        Updates the final print_status of an order in the database.
        """
        target_url = f"{self.supabase_url}/rest/v1/print_orders?db_id=eq.{db_id}"
        
        headers = {
            "apikey": self.supabase_key,
            "Authorization": f"Bearer {self.supabase_key}",
            "Content-Type": "application/json"
        }

        payload = {
            "print_status": status,
            "kiosk_id": self.kiosk_id
        }

        try:
            async with httpx.AsyncClient(timeout=10) as client:
                response = await client.patch(target_url, json=payload, headers=headers)
                if response.status_code == 204: # Success for PATCH usually returns 204
                     logger.info(f"✅ Cloud Order {db_id} marked as {status}.")
                else:
                     logger.error(f"❌ Order Update Failed: {response.text}")
        except Exception as e:
            logger.error(f"💥 Order cloud sync failure: {e}")

# Global instance
cloud = CloudClient()
