import httpx
import asyncio
from config import settings
from .logger import get_logger

logger = get_logger("notifications")

class TelegramNotifier:
    """
    Asynchronous Telegram Alerting for Kiosk-Level Events.
    Critical errors, Paper Low, Jam, and Daily/Per-Job Stats.
    """
    def __init__(self):
        self.bot_token = settings.TELEGRAM_BOT_TOKEN
        self.chat_id = settings.TELEGRAM_CHAT_ID
        self.base_url = f"https://api.telegram.org/bot{self.bot_token}/sendMessage"

    async def send_alert(self, message: str):
        """
        Send a one-off alert message to the configured Admin Chat.
        """
        if not self.bot_token or not self.chat_id:
            logger.warning("🔔 Telegram config missing. Alert skipped.")
            return

        payload = {
            "chat_id": self.chat_id,
            "text": f"🚨 [KIOSK ALERT: {settings.KIOSK_ID}]\n\n{message}",
            "parse_mode": "HTML"
        }

        try:
            async with httpx.AsyncClient(timeout=10) as client:
                response = await client.post(self.base_url, json=payload)
                if response.status_code == 200:
                    logger.info("✅ Telegram alert sent successfully.")
                else:
                    logger.error(f"❌ Telegram API Error: {response.text}")
        except Exception as e:
            logger.error(f"💥 Failed to reach Telegram API: {e}")

    async def send_order_report(self, otp: str, amount: int, pages: int):
        """
        Send a formatted order success notification.
        """
        msg = (
            f"✅ <b>Order Completed!</b>\n"
            f"━━━━━━━━━━━━━━━━━━\n"
            f"🔹 <b>OTP:</b> <code>{otp}</code>\n"
            f"🔹 <b>Revenue:</b> ₹{amount}\n"
            f"🔹 <b>Pages:</b> {pages}\n"
            f"🔹 <b>Kiosk:</b> {settings.KIOSK_ID}"
        )
        await self.send_alert(msg)

# Global Notifier instance
notifier = TelegramNotifier()
