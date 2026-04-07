# Kiosk Frontend (Customer UI) 🖥️

This is the customer-facing interface for the Print Spot Kiosk. 

## 🚀 Key Features
- **File Upload**: Customers can select files (PDF, JPG, PNG) for printing.
- **Print Preview**: Shows a visual preview of the uploaded content.
- **Payment & OTP**: Integrates with the Cloud API to generate a Razorpay order and fetch an OTP.
- **Admin Access**: Hidden maintenance screen reachable via [localhost:5173/maintenance](http://localhost:5173/maintenance).

## ⚙️ Configuration
The frontend uses environment variables from the **root `.env`** file via `vite.config.js` (`envDir: '..'`).

**Required Variables in Root `.env`**:
- `VITE_SUPABASE_URL`: For storing customer metadata.
- `VITE_SUPABASE_ANON_KEY`: Supabase authentication.
- `VITE_EC2_IP`: URL of the Cloud Admin API (currently [http://localhost:8083](http://localhost:8083)).
- `VITE_KIOSK_SERVER_IP`: URL of the local hardware server (typically [http://localhost:5000](http://localhost:5000)).

## 🛠️ Run Locally
```cmd
npm run dev -- --port 5173
```
- If the app is already listening on 5173, Vite will automatically increment to 5174. 
- Ensure you always check the terminal output for the correct port.

## 🗺️ Routing
- `/`: Main customer interface (Upload -> Preview -> Payment).
- `/maintenance`: Admin actions for local kiosk maintenance (Printer logs, Reset status).
