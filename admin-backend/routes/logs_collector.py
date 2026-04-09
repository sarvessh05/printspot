from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
from database import supabase
from datetime import datetime

router = APIRouter(prefix="/api/logs", tags=["Kiosk Logging"])

class KioskLogEntry(BaseModel):
    kiosk_id: str
    level: str # INFO, WARN, ERROR, CRITICAL
    source: str # watchman, print_engine, etc.
    message: str
    timestamp: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None

@router.post("/collect")
async def collect_logs(logs: List[KioskLogEntry]):
    """
    Ingests audit logs from Kiosks into the Supabase 'kiosk_logs' table.
    """
    try:
        log_data = []
        for log in logs:
            log_data.append({
                "kiosk_id": log.kiosk_id,
                "level": log.level,
                "source": log.source,
                "message": log.message,
                "metadata": log.metadata,
                "created_at": log.timestamp or datetime.utcnow().isoformat()
            })
            
        if log_data:
            supabase.table("kiosk_logs").insert(log_data).execute()
        
        return {"status": "success", "count": len(log_data)}
    except Exception as e:
        # We don't want to break the kiosk if logging fails
        print(f"Log Collection Error: {e}")
        return {"status": "partial_failure", "error": str(e)}
