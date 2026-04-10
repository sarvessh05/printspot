# Kiosk Hardware Server (Local Backend) 🎛️
**Proprietary of Print Spot Technologies**

This is the bridge between the Cloud API and the physical printing hardware. It must run locally on the Kiosk PC.

## 🚀 Key Features
- **Silent Printing**: Uses **SumatraPDF** to print PDF files automatically upon OTP verification.
- **Hardware Monitoring**: Checks `win32print` and SNMP to report "Ready", "Offline", or "Jam" status.
- **Remote Control**: Executes OS-level commands (Restart/Shutdown) received from the Cloud Console.
- **Auto-Recovery**: Built-in "heartbeat" to ensure the link to the cloud is always active.

## 🚀 Dry Run Command
```powershell
cd kiosk-server ; .\venv\Scripts\python -m uvicorn server:app --host 0.0.0.0 --port 5000 --reload
```

## ⚙️ Configuration
Located at `kiosk-server/.env`:
- `PRINTER_NAME`: Full name of the Windows printer queue.
- `SUMATRA_PDF_PATH`: Local path to SumatraPDF.exe.
- `PRINTER_IP`: IP address for SNMP hardware level checks.

## ⚠️ Important Notes
- **Admin Access**: If printing fails, run your terminal as **Administrator**.
- **Kiosk Mode**: For best performance, ensure the OS is locked down to only run this and the browser.

---
Copyright © 2026 **Print Spot Technologies**. All rights reserved.
