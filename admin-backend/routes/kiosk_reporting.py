from fastapi import APIRouter, HTTPException, Depends, Header
from pydantic import BaseModel
from typing import Optional
from database import supabase
import time

router = APIRouter(prefix="/api/kiosk", tags=["Kiosk Reporting"])

# Pydantic Models for requests
class HealthReport(BaseModel):
    kiosk_id: str
    kiosk_token: str
    paper: int
    ink: int
    printer_status: str

class CompletionReport(BaseModel):
    db_id: str
    kiosk_id: str
    kiosk_token: str
    paper_remaining: int
    ink_remaining: int

class FailureReport(BaseModel):
    db_id: str
    kiosk_id: str
    kiosk_token: str

# Helper to verify kiosk token
async def verify_kiosk(kiosk_id: str, kiosk_token: str):
    response = supabase.table("kiosks").select("*").eq("kiosk_id", kiosk_id).eq("token", kiosk_token).execute()
    if not response.data:
        raise HTTPException(status_code=401, detail="Invalid kiosk credentials")
    return response.data[0]

@router.post("/report-health")
async def report_health(report: HealthReport):
    """
    Kiosk sends a periodic heartbeat (health snapshot).
    """
    # 1. Verify token
    await verify_kiosk(report.kiosk_id, report.kiosk_token)
    
    # 2. Insert to kiosk_health table
    health_data = {
        "kiosk_id": report.kiosk_id,
        "paper_remaining": report.paper,
        "ink_remaining": report.ink,
        "printer_status": report.printer_status
    }
    
    response = supabase.table("kiosk_health").insert(health_data).execute()
    
    if not response.data:
        raise HTTPException(status_code=500, detail="Failed to log health data")
        
    return {"ok": True}

@router.post("/report-complete")
@router.post("/complete") # Alias for compatibility with cloud_client.py
async def report_complete(report: CompletionReport):
    """
    Kiosk signals a specific print job was successfully completed.
    """
    # 1. Verify token
    await verify_kiosk(report.kiosk_id, report.kiosk_token)
    
    # 2. Update print_orders table
    update_res = supabase.table("print_orders").update({
        "print_status": "completed",
        "kiosk_id": report.kiosk_id
    }).eq("id", report.db_id).execute()

    # 3. Also insert a health snapshot
    health_data = {
        "kiosk_id": report.kiosk_id,
        "paper_remaining": report.paper_remaining,
        "ink_remaining": report.ink_remaining,
        "printer_status": "NORMAL"
    }
    supabase.table("kiosk_health").insert(health_data).execute()

    return {"ok": True}

@router.post("/report-failed")
@router.post("/revert") # Alias for compatibility with cloud_client.py
async def report_failed(report: FailureReport):
    """
    Kiosk signals a specific print job failed.
    """
    # 1. Verify token
    await verify_kiosk(report.kiosk_id, report.kiosk_token)
    
    # 2. Update print_orders table - revert to pending
    update_res = supabase.table("print_orders").update({
        "print_status": "pending"
    }).eq("id", report.db_id).execute()

    return {"ok": True}
