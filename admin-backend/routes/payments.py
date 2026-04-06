from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
import razorpay
from config import settings

router = APIRouter(prefix="/api/payments", tags=["Razorpay Integration"])

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
