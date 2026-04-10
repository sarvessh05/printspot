# Cloud Console (Fleet Dashboard) 📊
**Proprietary of Print Spot Technologies**

The centralized "Mission Control" for the entire Print Spot Kiosk network. This dashboard allows for remote monitoring, revenue tracking, and hardware power management.

## 🚀 Key Features
- **Fleet Overview**: High-fidelity charts showing revenue trends and machine utilization.
- **Hardware Health Monitor**: Real-time stats on paper levels, ink status, and connection heartbeats.
- **Remote Power Controls**: Trigger OS restarts, shutdowns, or app refreshes on any kiosk in the network.
- **Pricing Manager**: Set global or machine-specific pricing for B&W and Color prints.

## 🚀 Dry Run Command (Port 5174)
```powershell
cd admin-frontend ; npm run dev -- --port=5174
```

## ⚙️ Configuration
Located at `admin-frontend/.env`:
- `VITE_BACKEND_URL`: Points to the Cloud Admin API.
- `VITE_ADMIN_PASSWORD`: For dashboard authentication.

---
Copyright © 2026 **Print Spot Technologies**. All rights reserved.
