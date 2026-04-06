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
        self.supabase_key = settings.SUPABASE_KEY
        self.kiosk_id = settings.KIOSK_ID
        self.kiosk_token = settings.KIOSK_TOKEN

    async def report_health(self, hardware_status: str = "NORMAL"):
        """
        Periodically updates the 'kiosk_health' table in Supabase.
        Includes ink, paper metrics and current hardware status.
        """
        if not self.supabase_url or not self.supabase_key:
            logger.warning("☁️ Supabase config missing. Health report skipped.")
            return

        state = await get_kiosk_state()
        
        # 1. Supabase Report
        target_url = f"{self.supabase_url}/rest/v1/kiosk_health"
        headers = {
            "apikey": self.supabase_key,
            "Authorization": f"Bearer {self.supabase_key}",
            "Content-Type": "application/json",
            "Prefer": "resolution=merge-duplicates"
        }
        payload = {
            "kiosk_id": self.kiosk_id,
            "paper_left": state.get("paper", 0),
            "ink_left": state.get("ink", 0),
            "machine_status": hardware_status,
            "last_heartbeat": "now()"
        }

        try:
            async with httpx.AsyncClient(timeout=10) as client:
                await client.post(target_url, json=payload, headers=headers)
                logger.info("☁️ Heartbeat: Cloud Dashboard Health Updated.")
        except Exception as e:
            logger.error(f"💥 Failed to reach Supabase Cloud: {e}")

        # 2. Optional: Report to EC2 Admin Panel if exists
        if settings.ADMIN_BACKEND_URL:
            try:
                ec2_url = f"{settings.ADMIN_BACKEND_URL}/api/kiosk/report-health"
                async with httpx.AsyncClient(timeout=5) as client:
                    await client.post(ec2_url, json={
                        "kiosk_id": self.kiosk_id,
                        "kiosk_token": self.kiosk_token,
                        "paper": state.get("paper", 0),
                        "ink": state.get("ink", 0),
                        "printer_status": hardware_status
                    })
            except:
                pass

    async def complete_job_stats(self, db_id: str, paper_used: int = 1):
        """
        Signals completion to both Supabase (Database) and EC2 (Analytics Dashboard).
        """
        # 1. Update Supabase Database
        target_url = f"{self.supabase_url}/rest/v1/print_orders?db_id=eq.{db_id}"
        headers = {
            "apikey": self.supabase_key,
            "Authorization": f"Bearer {self.supabase_key}",
            "Content-Type": "application/json"
        }
        payload = {"print_status": "completed", "kiosk_id": self.kiosk_id}

        try:
            async with httpx.AsyncClient(timeout=10) as client:
                await client.patch(target_url, json=payload, headers=headers)
                logger.info(f"✅ Supabase Order {db_id} marked as completed.")
        except Exception as e:
            logger.error(f"💥 Supabase Job Completion Update Fail: {e}")

        # 2. Update EC2 Analytics Dashboard (matching server.js)
        if settings.ADMIN_BACKEND_URL:
            ec2_url = f"{settings.ADMIN_BACKEND_URL}/api/kiosk/complete"
            ec2_payload = {
                "db_id": db_id,
                "kiosk_id": self.kiosk_id,
                "kiosk_token": self.kiosk_token,
                "paper_remaining": (await get_kiosk_state()).get("paper", 0),
                "ink_remaining": (await get_kiosk_state()).get("ink", 0)
            }
            try:
                async with httpx.AsyncClient(timeout=10) as client:
                    await client.post(ec2_url, json=ec2_payload)
                    logger.info(f"☁️ EC2 Cloud Dashboard Sync (Completed) - Job {db_id}")
            except Exception as e:
                 logger.debug(f"EC2 Sync failed (dashboard may be down): {e}")

    async def revert_job(self, db_id: str):
        """
        Reverts an OTP to pending status if a print fails, allowing the customer to try again.
        Matches Node's revertOtpOnEC2.
        """
        # 1. Supabase Revert
        target_url = f"{self.supabase_url}/rest/v1/print_orders?db_id=eq.{db_id}"
        headers = {
            "apikey": self.supabase_key,
            "Authorization": f"Bearer {self.supabase_key}",
            "Content-Type": "application/json"
        }
        payload = {"print_status": "pending"}

        try:
             async with httpx.AsyncClient(timeout=10) as client:
                await client.patch(target_url, json=payload, headers=headers)
                logger.info(f"✅ Supabase OTP Reverted for job {db_id}")
        except Exception as e:
            logger.error(f"💥 Supabase Job Revert Fail: {e}")

        # 2. EC2 Revert (matching server.js)
        if settings.ADMIN_BACKEND_URL:
            ec2_url = f"{settings.ADMIN_BACKEND_URL}/api/kiosk/revert"
            try:
                async with httpx.AsyncClient(timeout=10) as client:
                    await client.post(ec2_url, json={
                        "db_id": db_id,
                        "kiosk_id": self.kiosk_id,
                        "kiosk_token": self.kiosk_token
                    })
                    logger.info(f"✅ EC2 OTP Reverted for job {db_id}")
            except Exception as e:
                 logger.debug(f"EC2 Revert failed: {e}")

# Global instance
cloud = CloudClient()
