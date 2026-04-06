import os
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

URL = os.getenv("SUPABASE_URL")
KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

print(f"Connecting to {URL}...")
try:
    supabase: Client = create_client(URL, KEY)
    res = supabase.table("platform_settings").select("*").execute()
    print(f"SUCCESS! Found: {res.data}")
except Exception as e:
    print(f"ERROR: {e}")
