from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from typing import Optional, List
import random
import string
import time
import razorpay
from database import supabase
from config import settings

router = APIRouter(prefix="/api/orders", tags=["Order Creation"])

class OrderItem(BaseModel):
    file_name: str
    file_url: str
    copies: int = Field(default=1, ge=1)
    mode: str = Field(default="bw")
    is_two_sided: bool = Field(default=False)
    print_range: str = Field(default="All Pages")
    total_pages: int = Field(default=1, ge=1)
    total_amount: int
    unique_name: str
    color_pages: Optional[str] = None
    paper_size: str = Field(default="a4")

from routes.payments import client as razorpay_client

class BatchOrderRequest(BaseModel):
    items: List[OrderItem]
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str
    total_grand_amount: int

class OrderCreateRequest(BaseModel):
    file_name: str
    file_url: str
    copies: int = Field(default=1, ge=1)
    mode: str = Field(default="bw")
    is_two_sided: bool = Field(default=False)
    print_range: str = Field(default="All Pages")
    total_pages: int = Field(default=1, ge=1)
    total_amount: int
    payment_id: str
    unique_name: str
    color_pages: Optional[str] = None
    paper_size: str = Field(default="a4")

def generate_otp():
    """Generates a secure 6-digit OTP."""
    return "".join(random.choices(string.digits, k=6))

@router.post("/create")
async def create_order(order: OrderCreateRequest):
    """Securely creates a single print order."""
    try:
        otp = generate_otp()
        order_data = {
            "file_name": order.file_name,
            "file_url": order.file_url,
            "copies": order.copies,
            "mode": order.mode,
            "is_two_sided": order.is_two_sided,
            "print_range": order.print_range,
            "total_pages": order.total_pages,
            "total_amount": order.total_amount,
            "otp": otp,
            "payment_status": "paid",
            "payment_id": order.payment_id,
            "unique_name": order.unique_name,
            "color_pages": order.color_pages,
            "paper_size": order.paper_size,
            "print_status": "pending"
        }
        response = supabase.table("print_orders").insert([order_data]).execute()
        if not response.data:
            raise HTTPException(status_code=500, detail="Failed to record order")
        return {"success": True, "otp": otp}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/create-batch")
async def create_batch_order(request: BatchOrderRequest):
    """
    Creates multiple print orders sharing a SINGLE OTP.
    This enables multi-file printing sessions on the Kiosk.
    """
    try:
        # 1. Verify Payment Signature
        params_dict = {
            'razorpay_order_id': request.razorpay_order_id,
            'razorpay_payment_id': request.razorpay_payment_id,
            'razorpay_signature': request.razorpay_signature
        }
        razorpay_client.utility.verify_payment_signature(params_dict)
        
        # 2. Proceed with database record creation
        otp = generate_otp()
        batch_data = []
        
        for item in request.items:
            batch_data.append({
                "file_name": item.file_name,
                "file_url": item.file_url,
                "copies": item.copies,
                "mode": item.mode,
                "is_two_sided": item.is_two_sided,
                "print_range": item.print_range,
                "total_pages": item.total_pages,
                "total_amount": item.total_amount,
                "otp": otp,
                "payment_status": "paid",
                "payment_id": request.razorpay_payment_id,
                "unique_name": item.unique_name,
                "color_pages": item.color_pages,
                "paper_size": item.paper_size,
                "print_status": "pending"
            })
        
        response = supabase.table("print_orders").insert(batch_data).execute()
        return {
            "success": True,
            "otp": otp,
            "total_items": len(response.data) if response.data else 0
        }
        
    except razorpay.errors.SignatureVerificationError:
         raise HTTPException(status_code=401, detail="CRITICAL: Invalid Payment Signature Attempt!")
    except Exception as e:
        print(f"Batch Error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/verify-otp/{otp}")
async def verify_otp(otp: str):
    """Verifies OTP and returns associated print items."""
    try:
        response = supabase.table("print_orders").select("*").eq("otp", otp).eq("print_status", "pending").execute()
        if not response.data:
            raise HTTPException(status_code=404, detail="Invalid or already used OTP")
        
        items = []
        for row in response.data:
            items.append({
                "db_id": row["id"],
                "name": row["file_name"],
                "downloadUrl": row["file_url"],
                "copies": row["copies"],
                "mode": row["mode"],
                "isTwoSided": row["is_two_sided"],
                "paperSize": row.get("paper_size", "A4"),
                "printRange": row["print_range"],
                "colorPages": row.get("color_pages"),
                "totalPages": row["total_pages"]
            })
            
        return {"items": items}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/mark-completed/{otp}")
async def mark_completed(otp: str):
    """Marks all orders in a batch as completed."""
    try:
        supabase.table("print_orders").update({"print_status": "completed"}).eq("otp", otp).execute()
        return {"success": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
