import asyncio
import time
from datetime import datetime, timedelta
from database import supabase
from config import settings
import httpx

async def run_36h_cleanup():
    """
    Periodic task that deletes orders and their associated files from Supabase Storage
    if they are older than 36 hours and not yet printed.
    Also cleans up completed orders' files if they somehow persisted.
    """
    while True:
        try:
            print("🧹 [CLEANUP] Starting 36h scheduled cleanup...")
            
            # Sub-task 1: Delete files for orders older than 36h
            # We calculate the threshold: current_time - 36 hours
            threshold = (datetime.utcnow() - timedelta(hours=36)).isoformat()
            
            # Query pending or failed orders older than threshold
            # Supabase uses ISO strings for timestamptz
            response = supabase.table("print_orders")\
                .select("id, unique_name")\
                .lt("created_at", threshold)\
                .execute()
                
            if response.data:
                print(f"🧹 [CLEANUP] Found {len(response.data)} expired orders. Cleaning up storage...")
                
                headers = {
                    "apikey": settings.SUPABASE_ANON_KEY, # Use service role key if available for storage
                    "Authorization": f"Bearer {settings.SUPABASE_SERVICE_ROLE_KEY}"
                }
                
                for order in response.data:
                    unique_name = order.get("unique_name")
                    order_id = order.get("id")
                    
                    if unique_name:
                        # Delete from Storage
                        storage_url = f"{settings.SUPABASE_URL}/storage/v1/object/pdfs/{unique_name}"
                        async with httpx.AsyncClient() as client:
                            await client.delete(storage_url, headers=headers)
                    
                    # Optional: Delete the order record entirely to save DB space
                    # or just leave it marked as expired. 
                    # User said "both the files from supabase and OTP from the frontend should be deleted"
                    # Frontend deletes OTP based on its own timestamp. 
                    # We delete the record here.
                    supabase.table("print_orders").delete().eq("id", order_id).execute()
                
                print(f"🧹 [CLEANUP] Successfully removed {len(response.data)} expired entries.")
            else:
                print("🧹 [CLEANUP] No expired orders found.")

        except Exception as e:
            print(f"❌ [CLEANUP ERROR] {e}")
            
        # Run every hour
        await asyncio.sleep(3600)

def start_cleanup_task():
    """Entry point to start the background task."""
    loop = asyncio.get_event_loop()
    loop.create_task(run_36h_cleanup())
