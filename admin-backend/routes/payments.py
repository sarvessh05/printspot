from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import razorpay
from config import settings
from database import supabase

router = APIRouter(prefix="/api/payments", tags=["Razorpay Integration"])

class CalculationItem(BaseModel):
    pages: int
    copies: int
    mode: str  # 'bw' or 'color'
    isTwoSided: bool

@router.post("/calculate")
async def calculate_total_cost(items: List[CalculationItem]):
    """
    Server-side calculation logic to prevent pricing tampering.
    """
    try:
        # Fetch pricing from DB
        res = supabase.table("platform_settings").select("*").eq("key", "pricing").execute()
        pricing = res.data[0]["value"] if res.data else {"bw": 2, "color": 10, "double_sided_discount": 0}
        
        total = 0
        for item in items:
            item_total = 0
            pages = item.pages
            if item.mode == "bw":
                item_total = ( (pages // 2) * 3 + (pages % 2) * 2 ) if item.isTwoSided else (pages * pricing["bw"])
            else:
                item_total = ( (pages // 2) * 18 + (pages % 2) * 10 ) if item.isTwoSided else (pages * pricing["color"])
            
            total += item_total * item.copies
            
        return {"total": total, "currency": "INR"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# --- RAZORPAY CLIENT INITIALIZATION ---
client = razorpay.Client(auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET))

class PaymentOrderRequest(BaseModel):
    amount: int  # in Rupees, not Paisa (we will convert)
    currency: str = "INR"

class PaymentVerification(BaseModel):
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str

@router.post("/create-order")
async def create_razorpay_order(order: PaymentOrderRequest):
    """Creates a Razorpay Order and returns the ID."""
    try:
        # Amount is converted into Paisa as required by Razorpay
        data = {
            "amount": order.amount * 100,
            "currency": order.currency,
            "payment_capture": 1  # Auto capture payment
        }
        razorpay_order = client.order.create(data=data)
        return razorpay_order
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/verify")
async def verify_payment(verification: PaymentVerification):
    """Verifies the Razorpay payment signature."""
    try:
        params_dict = {
            'razorpay_order_id': verification.razorpay_order_id,
            'razorpay_payment_id': verification.razorpay_payment_id,
            'razorpay_signature': verification.razorpay_signature
        }
        client.utility.verify_payment_signature(params_dict)
        return {"status": "success", "message": "Payment Verified"}
    except razorpay.errors.SignatureVerificationError:
         raise HTTPException(status_code=401, detail="Invalid Payment Signature")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
