# Print Spot Kiosk System 🖨️

A full-stack automated printing solution consisting of a kiosk interface, a centralized admin dashboard, and hardware-level print management.

## 🏗️ System Architecture

The following components work together to provide a seamless printing experience:

| Component | Directory | Port | Description |
| :--- | :--- | :--- | :--- |
| **Kiosk Frontend** | `frontend` | `5173` | React/Vite UI for customers to upload files and pay. |
| **Admin Frontend** | `admin-frontend` | `5174` | React/Vite dashboard for managing kiosks, pricing, and orders. |
| **Kiosk Backend** | `kiosk-server` | `5000` | Python/FastAPI server running locally on the kiosk PC to handle hardware (Printer). |
| **Cloud Admin API** | `admin-backend` | `8083` | Python/FastAPI central server for payments (Razorpay) and global data. |

---

## 🚀 Automation (Recommended)

To start the **entire system** (Backend, Kiosk Server, and both Frontends) with a single click:

1.  Open the root directory in File Explorer.
2.  Double-click **`run_all.bat`**.
3.  Each service will open in its own window. **Do not close these windows** while the kiosk is in use.

---

## 🚀 Manual Start (Custom Development)

### 1. Preparation
Ensure you have the following installed:
- **Node.js** (for Frontends)
- **Python 3.10+** (for Backends)
- **SumatraPDF** (Required by Kiosk Server for silent printing)

### 2. Environment Configuration
The system uses centralized `.env` management.
- Ensure the root `.env` file is present (Vite frontends look here).
- Each backend folder (`kiosk-server` and `admin-backend`) has its own `.env` for secret keys.

### 3. Running the System
Open four terminal tabs and run the following in each:

**Terminal 1: Cloud Admin API**
```powershell
cd admin-backend ; .\venv\Scripts\python -m uvicorn server:app --host 0.0.0.0 --port 8083 --reload
```

**Terminal 2: Kiosk Hardware Server**
```powershell
cd kiosk-server ; .\venv\Scripts\python -m uvicorn server:app --host 0.0.0.0 --port 5000 --reload
```

**Terminal 3: Kiosk Frontend**
```powershell
cd frontend ; npm run dev -- --port=5173
```

**Terminal 4: Admin Panel UI**
```powershell
cd admin-frontend ; npm run dev -- --port=5174
```

---

## ⚖️ Ownership & License

Copyright © 2026 **Print Spot Technologies**. All rights reserved.
This system is proprietary software. Unauthorized reproduction, modification, or distribution is prohibited.

---

## 🛠️ Key Technologies
- **Frontend**: React, Vite, Lucide Icons, Chart.js
- **Backend**: Python, FastAPI, Uvicorn, Pydantic
- **Database**: Supabase (PostgreSQL)
- **Payments**: Razorpay Integration
- **Hardware**: Win32 Printing API via SumatraPDF

## 📜 Documentation Links
- [Kiosk Frontend Details](./frontend/README.md)
- [Admin Frontend Details](./admin-frontend/README.md)
- [Kiosk Server (Hardware) Details](./kiosk-server/README.md)
- [Admin Backend (Cloud) Details](./admin-backend/README.md)
