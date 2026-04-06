from fastapi import APIRouter, HTTPException, Depends, Header, Query
from pydantic import BaseModel
from typing import Optional, List
from database import supabase
from config import settings
from datetime import datetime, timedelta
import time

router = APIRouter(prefix="/api/admin", tags=["Admin Analytics"])

# Auth Dependency
async def admin_auth(x_admin_password: str = Header(None, alias="X-Admin-Password")):
    if not x_admin_password or x_admin_password != settings.ADMIN_MASTER_PASSWORD:
        raise HTTPException(status_code=401, detail="Unauthorized")
    return True

# Pydantic Models
class KioskAddRequest(BaseModel):
    kiosk_id: str
    name: str
    location: str
    token: str

@router.get("/overview", dependencies=[Depends(admin_auth)])
async def get_overview():
    """
    7.5 Global Stats Overview
    """
    # 1. Total and Today's Stats from print_orders
    # Using UTC for consistent DB comparison
    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0).isoformat()
    
    # All time stats
    all_time_res = supabase.table("print_orders").select("total_amount").eq("print_status", "completed").execute()
    total_revenue_alltime = sum(row.get("total_amount", 0) for row in all_time_res.data)
    
    # Today's stats
    today_res = supabase.table("print_orders").select("total_amount").eq("print_status", "completed").gte("created_at", today_start).execute()
    total_revenue_today = sum(row.get("total_amount", 0) for row in today_res.data)
    total_orders_today = len(today_res.data)
    
    # 2. Kiosk numbers
    kiosks_res = supabase.table("kiosks").select("id, is_active").execute()
    total_kiosks = len(kiosks_res.data)
    active_kiosks = len([k for k in kiosks_res.data if k.get("is_active")])
    
    return {
        "total_revenue_today": total_revenue_today,
        "total_orders_today": total_orders_today,
        "total_revenue_alltime": total_revenue_alltime,
        "active_kiosks": active_kiosks,
        "total_kiosks": total_kiosks
    }

@router.get("/kiosks", dependencies=[Depends(admin_auth)])
async def list_kiosks():
    """
    7.6 List all kiosks with live status
    """
    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0).isoformat()
    
    # Get all kiosks
    kiosks = supabase.table("kiosks").select("*").execute().data
    
    # Get latest health for each kiosk
    # Note: In a production app, we'd use a single query or a view. 
    # For now, we'll fetch latest snapshots.
    enriched_kiosks = []
    for k in kiosks:
        k_id = k["kiosk_id"]
        
        # Latest health
        health = supabase.table("kiosk_health").select("*").eq("kiosk_id", k_id).order("timestamp", desc=True).limit(1).execute().data
        latest_health = health[0] if health else {}
        
        # Today's revenue and orders
        orders_today = supabase.table("print_orders").select("total_amount").eq("kiosk_id", k_id).eq("print_status", "completed").gte("created_at", today_start).execute().data
        
        enriched_kiosks.append({
            "kiosk_id": k_id,
            "name": k["name"],
            "location": k["location"],
            "paper": latest_health.get("paper_remaining", 0),
            "ink": latest_health.get("ink_remaining", 0),
            "printer_status": latest_health.get("printer_status", "UNKNOWN"),
            "last_seen": latest_health.get("timestamp"),
            "revenue_today": sum(o["total_amount"] for o in orders_today),
            "orders_today": len(orders_today)
        })
        
    return enriched_kiosks

@router.get("/kiosk/{kiosk_id}", dependencies=[Depends(admin_auth)])
async def get_kiosk_details(kiosk_id: str):
    """
    7.7 Individual machine deep dive
    """
    # 1. Kiosk Info
    kiosk_res = supabase.table("kiosks").select("*").eq("kiosk_id", kiosk_id).single().execute()
    if not kiosk_res.data:
        raise HTTPException(status_code=404, detail="Kiosk not found")
    
    kiosk_info = kiosk_res.data
    
    # 2. Revenue by day (last 30 days)
    thirty_days_ago = (datetime.utcnow() - timedelta(days=30)).isoformat()
    # Note: Complex aggregation is better in SQL, but we'll do basic fetch
    recent_orders = supabase.table("print_orders").select("created_at, total_amount, mode").eq("kiosk_id", kiosk_id).eq("print_status", "completed").gte("created_at", thirty_days_ago).execute().data
    
    revenue_by_day = {}
    orders_by_mode = {"bw": 0, "color": 0}
    
    for order in recent_orders:
        date_str = order["created_at"][:10] # YYYY-MM-DD
        revenue_by_day[date_str] = int(revenue_by_day.get(date_str, 0) + order["total_amount"])
        mode = order["mode"]
        if mode in orders_by_mode:
            orders_by_mode[mode] += 1
            
    # 3. Paper/ink history (last 24 hours)
    one_day_ago = (datetime.utcnow() - timedelta(hours=24)).isoformat()
    health_history = supabase.table("kiosk_health").select("*").eq("kiosk_id", kiosk_id).gte("timestamp", one_day_ago).order("timestamp", desc=False).execute().data
    
    # 4. Recent 20 orders
    recent_20 = supabase.table("print_orders").select("*").eq("kiosk_id", kiosk_id).order("created_at", desc=True).limit(20).execute().data
    
    return {
        "kiosk_info": kiosk_info,
        "revenue_by_day": revenue_by_day,
        "orders_by_mode": orders_by_mode,
        "health_history": health_history,
        "recent_orders": recent_20
    }

@router.get("/orders", dependencies=[Depends(admin_auth)])
async def get_all_orders(
    kiosk_id: Optional[str] = Query(None),
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(20, le=100)
):
    """
    7.8 Paginated orders across all machines
    """
    offset = (page - 1) * limit
    
    query = supabase.table("print_orders").select("*", count="exact")
    
    if kiosk_id:
        query = query.eq("kiosk_id", kiosk_id)
    if status:
        query = query.eq("print_status", status)
    if date_from:
        query = query.gte("created_at", date_from)
    if date_to:
        query = query.lte("created_at", date_to)
        
    res = query.order("created_at", desc=True).range(offset, offset + limit - 1).execute()
    
    return {
        "orders": res.data,
        "total_count": res.count,
        "page": page,
        "total_pages": (res.count + limit - 1) // limit if res.count else 0
    }

@router.post("/kiosks/add", dependencies=[Depends(admin_auth)])
async def add_kiosk(kiosk: KioskAddRequest):
    """
    7.9 Register a new kiosk
    """
    data = {
        "kiosk_id": kiosk.kiosk_id,
        "name": kiosk.name,
        "location": kiosk.location,
        "token": kiosk.token,
        "is_active": True
    }
    
    res = supabase.table("kiosks").insert(data).execute()
    
    if not res.data:
        raise HTTPException(status_code=500, detail="Failed to add kiosk")
        
    return {"success": True, "kiosk": res.data[0]}
