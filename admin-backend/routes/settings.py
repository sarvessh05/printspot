from fastapi import APIRouter, HTTPException, Depends, Header
from pydantic import BaseModel
from database import supabase
from config import settings

router = APIRouter(prefix="/api/settings", tags=["Platform Settings"])

class PricingUpdate(BaseModel):
    bw: int
    color: int
    double_sided_discount: int

def verify_admin(x_admin_password: str = Header(None)):
    if x_admin_password != settings.ADMIN_MASTER_PASSWORD:
        raise HTTPException(status_code=401, detail="Unauthorized")
    return True

@router.get("/pricing")
async def get_pricing():
    """Fetches the current platform pricing."""
    try:
        response = supabase.table("platform_settings").select("*").eq("key", "pricing").execute()
        if not response.data:
            return {"bw": 2, "color": 10, "double_sided_discount": 0}
        return response.data[0]["value"]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/pricing")
async def update_pricing(pricing: PricingUpdate, admin: bool = Depends(verify_admin)):
    """Updates the platform pricing (Admin only)."""
    try:
        response = supabase.table("platform_settings").upsert({
            "key": "pricing",
            "value": pricing.dict()
        }).execute()
        return {"success": True, "data": response.data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/kiosk-status")
async def get_kiosk_status():
    """Fetches the real-time health and heartbeat data of all active kiosks."""
    try:
        # Fetch data from kiosk_health table (heartbeat collector)
        response = supabase.table("kiosk_health").select("*").execute()
        return response.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
