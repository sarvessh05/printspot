# Admin Dashboard UI 📊

This is the centralized management portal for the Print Spot Kiosk network.

## 🚀 Key Features
- **Dashboard Overview**: Detailed statistics for daily sales, revenue, and kiosk health.
- **Real-time Sales Trend**: Animated charts for sales data via **Chart.js** and **React-Chartjs-2**.
- **Kiosk Monitoring**: Live list of kiosks showing the printer's current online/offline and ink status.
- **Pricing Manager**: Directly edit the pricing per page for black & white or color prints.
- **Order History**: View recent transactions and their print status.

## ⚙️ Configuration
The admin-frontend uses its own **`.env`** file at `admin-frontend/.env`.

**Required Variables**:
- `VITE_BACKEND_URL`: URL of the Cloud Admin API ([http://localhost:8083](http://localhost:8083)).
- `VITE_ADMIN_PASSWORD`: Master password for the admin dashboard.

## 🛠️ Run Locally
```cmd
npm run dev -- --port 5174
```

## ⚠️ Troubleshooting
- **Failed to resolve import "chart.js"**: This happens if the dependencies are not correctly cached. I've already installed them via `npm install chart.js react-chartjs-2`. 
- **Port Conflict**: If 5174 is in use, use `npx vite --port 5174 --force` to override and clear optimization cache.

## 📦 Main Dependencies
- `chart.js`
- `react-chartjs-2`
- `lucide-react` (icons)
- `react-router-dom` (navigation)
