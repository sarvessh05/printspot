# PrintSpot — Pure Magic Printing 🪄
**Proprietary of Print Spot Technologies**

The sleek, customer-facing interface for the Print Spot Kiosk. This application handles the document upload, payment review, and physical kiosk keypad.

## ✨ Key Features
- **Modern Kiosk UI**: A premium, 4-page optimized flow for maximum speed and simplicity.
- **Dynamic Billing**: Real-time price calculation based on color, paper size, and duplex settings.
- **Glassmorphism Design**: High-end visual aesthetic for a modern "smart kiosk" feel.
- **Real-time Status**: Monitors hardware availability before allowing customer uploads.

## 🚀 Dry Run Command (Port 5173)
```powershell
cd frontend ; npm run dev -- --port=5173
```

## ⚙️ Configuration
Located at `frontend/.env`:
- `VITE_RAZORPAY_KEY`: Public key for the payment gateway.
- `VITE_API_URL`: Points to the Cloud Admin API.
- `VITE_HARDWARE_URL`: Points to the local Kiosk Server (usually localhost:5000).

---
Copyright © 2026 **Print Spot Technologies**. All rights reserved.
