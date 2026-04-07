# Cloud Admin API (Central API) ☁️

This is the centralized backend for all your kiosks. Its primary role is to handle global state like payments, metrics, and remote commands.

## 🚀 Key Features
- **Razorpay Orders**: Securely generates order IDs for customer payments (`/api/payments/create-order`).
- **OTP Generation**: Fetches a unique print OTP from Supabase after successful payment.
- **Unified Health**: Aggregates health reports from all kiosks for the Admin Dashboard.
- **Admin Authentication**: Validates the `X-Admin-Password` header for secure admin tasks.

## ⚙️ Configuration
The admin-backend uses its own **`.env`** file at `admin-backend/.env`.

**Required Variables**:
- `RAZORPAY_KEY_ID`: Your Razorpay Key ID (rzp_test_...).
- `RAZORPAY_KEY_SECRET`: Your Razorpay Secret.
- `ADMIN_MASTER_PASSWORD`: For verifying the Dashboard logins.
- `SUPABASE_SERVICE_ROLE_KEY`: Required for write-level access to the global DB.

## ⚠️ Notes
- **Authentication**: If you get a **500 (Internal Server Error)** on "Authentication failed", double-check your Razorpay keys in the `.env`. 
- **Port Allocation**: Default port is **8083**. Avoid 8080 or 8081 if your local machine is holding them in "TIME_WAIT" state.

## 🛠️ Run Locally
```powershell
# Create venv if it doesn't exist
python -m venv venv
.\venv\Scripts\activate
pip install -r requirements.txt

# Start Server
.\venv\Scripts\python -m uvicorn server:app --host 0.0.0.0 --port 8083
```

## 📦 Main Libraries
- `fastapi`
- `uvicorn`
- `razorpay` (Payment SDK)
- `pydantic-settings` (Config management)
