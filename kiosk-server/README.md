# Kiosk Hardware Server (Local Backend) ⚡

This is the local Python server that interacts with the hardware (printer) at the kiosk. It must be running on the PC connected to the printer.

## 🚀 Key Features
- **Silent Printing**: Uses **SumatraPDF** to print PDF files without user interaction.
- **Printer Monitoring**: Checks `win32print` to report "Ready", "Offline", or "Ink Low" status.
- **Supabase Sync**: Notifies the main database when a print job is successfully completed.
- **Health Checks**: Provides a `/health` endpoint for the frontend to confirm connectivity.

## ⚙️ Configuration
The kiosk server uses its own **`.env`** file at `kiosk-server/.env`.

**Required Variables**:
- `PRINTER_NAME`: Full name of the Windows printer (e.g. "Canon G2010 series").
- `SUMATRA_PDF_PATH`: Local path to the SumatraPDF executable.
- `MOCK_PRINTER`: Set to `True` for testing without actual hardware. 
- `EC2_IP`: URL of the Cloud Admin API ([http://localhost:8083](http://localhost:8083)).

## 🛠️ Run Locally
```powershell
# Create venv if it doesn't exist
python -m venv venv
.\venv\Scripts\activate
pip install -r requirements.txt

# Start Server
.\venv\Scripts\python -m uvicorn server:app --host 0.0.0.0 --port 5000
```

## ⚠️ Notes
- **Administrator Privileges**: Printing on Windows sometimes requires running the terminal as Administrator.
- **SumatraPDF**: Must be installed. Default path: `C:\Program Files\SumatraPDF\SumatraPDF.exe`.
