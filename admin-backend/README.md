# Cloud Admin API (Central API) ☁️
**Proprietary of Print Spot Technologies**

This is the centralized brain for all kiosks in the fleet. It manages payments, order verification, and remote orchestration.

## 🚀 Key Features
- **Razorpay Integration**: Handles secure payment order creation and verification.
- **OTP Brain**: Manages the generation and validation of secure 6-digit print codes.
- **Fleet Orchestration**: Forwards remote commands (Restart/Shutdown) to the correct Kiosk Server.
- **SupaBase Link**: Primary interface for the centralized PostgreSQL database.

## 🚀 Dry Run Command
```powershell
cd admin-backend ; .\venv\Scripts\python -m uvicorn server:app --host 0.0.0.0 --port 8083 --reload
```

## ⚙️ Configuration
Located at `admin-backend/.env`:
- `RAZORPAY_KEY_ID`: Your active Razorpay credentials.
- `ADMIN_MASTER_PASSWORD`: Secret for the Cloud Console access.
- `SUPABASE_URL` & `SUPABASE_KEY`: Database connection strings.

---
Copyright © 2026 **Print Spot Technologies**. All rights reserved.
