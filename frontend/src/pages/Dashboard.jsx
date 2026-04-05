import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import axios from 'axios';
import { Loader, IndianRupee, Printer, Droplet, RefreshCw, FileText, Lock, LogOut } from 'lucide-react';

const Dashboard = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  
  const [isLoading, setIsLoading] = useState(false);
  const [revenue, setRevenue] = useState(0);
  const [hardwareState, setHardwareState] = useState({ paper: 0, ink: 0 });
  const [recentOrders, setRecentOrders] = useState([]);

  // 🔒 Security Login
  const handleLogin = (e) => {
    e.preventDefault();
    if (password === "Sahil@123") {
      setIsAuthenticated(true);
      fetchDashboardData();
    } else {
      alert("wrong password!");
    }
  };

  // 🔄 Data Fetching Logic
  const fetchDashboardData = async () => {
    setIsLoading(true);
    try {
      // 1. Fetch Live Hardware Status from Node.js (Mini PC)
      const nodeResponse = await axios.get('http://localhost:5000/status');
      if (nodeResponse.data && nodeResponse.data.state) {
        setHardwareState(nodeResponse.data.state);
      }

      // 2. Fetch Today's Completed Orders from Supabase
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Aaj raat 12 baje se abhi tak

      const { data: orders, error } = await supabase
        .from('print_orders')
        .select('*')
        .gte('created_at', today.toISOString())
        .eq('print_status', 'completed')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // 3. Calculate Total Revenue
      if (orders) {
        const total = orders.reduce((sum, order) => sum + (order.total_amount || 0), 0);
        setRevenue(total);
        setRecentOrders(orders);
      }

    } catch (error) {
      console.error("Dashboard Error:", error);
      alert("Data Fetch Error!");
    }
    setIsLoading(false);
  };

  // 🛑 LOGIN SCREEN
  if (!isAuthenticated) {
    return (
      <div className="min-vh-100 d-flex justify-content-center align-items-center bg-light">
        <div className="card shadow-lg border-0 rounded-4 p-5 text-center" style={{ maxWidth: '400px', width: '100%' }}>
          <div className="bg-success bg-opacity-10 text-success rounded-circle d-inline-flex p-4 mx-auto mb-4">
            <Lock size={40} />
          </div>
          <h2 className="fw-bolder mb-4">Admin Access</h2>
          <form onSubmit={handleLogin}>
            <input 
              type="password" 
              className="form-control form-control-lg text-center mb-4 bg-light border-0" 
              placeholder="Enter PIN" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoFocus
            />
            <button type="submit" className="btn btn-success btn-lg w-100 rounded-pill fw-bold shadow-sm">
              Unlock Dashboard
            </button>
          </form>
        </div>
      </div>
    );
  }

  // 📊 MAIN DASHBOARD SCREEN
  const paperPercent = Math.max(0, Math.min(100, (hardwareState.paper / 500) * 100));
  const inkPercent = Math.max(0, Math.min(100, (hardwareState.ink / 6000) * 100));

  return (
    <div className="min-vh-100 bg-light pb-5">
      {/* Navbar */}
      <nav className="navbar navbar-expand-lg navbar-dark bg-success shadow-sm px-4 py-3">
        <div className="container-fluid">
          <span className="navbar-brand fw-bolder fs-4 mb-0 d-flex align-items-center gap-2">
            <Printer size={24} /> Print Kro Admin
          </span>
          <div className="d-flex gap-3">
            <button onClick={fetchDashboardData} disabled={isLoading} className="btn btn-light btn-sm fw-bold d-flex align-items-center gap-2 rounded-pill px-3">
              <RefreshCw size={16} className={isLoading ? "fa-spin" : ""} /> Refresh
            </button>
            <button onClick={() => { setIsAuthenticated(false); setPassword(""); }} className="btn btn-outline-light btn-sm rounded-circle p-2">
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </nav>

      <div className="container mt-4">
        <div className="row g-4 mb-5">
          
          {/* Card 1: Today's Revenue */}
          <div className="col-md-4">
            <div className="card border-0 shadow-sm rounded-4 h-100 bg-white">
              <div className="card-body p-4">
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <h6 className="text-muted fw-bold mb-0">TODAY'S REVENUE</h6>
                  <div className="bg-success bg-opacity-10 p-2 rounded text-success"><IndianRupee size={20}/></div>
                </div>
                <h1 className="display-4 fw-bolder text-dark mb-0">₹{revenue}</h1>
                <small className="text-success fw-bold mt-2 d-block">Only Completed Orders</small>
              </div>
            </div>
          </div>

          {/* Card 2: Paper Status */}
          <div className="col-md-4">
            <div className="card border-0 shadow-sm rounded-4 h-100 bg-white">
              <div className="card-body p-4">
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <h6 className="text-muted fw-bold mb-0">PAPER LEFT</h6>
                  <div className="bg-warning bg-opacity-10 p-2 rounded text-warning"><FileText size={20}/></div>
                </div>
                <h2 className="fw-bolder text-dark mb-3">{hardwareState.paper} <span className="text-muted fs-5">/ 500</span></h2>
                <div className="progress" style={{ height: '8px' }}>
                  <div className={`progress-bar ${paperPercent < 20 ? 'bg-danger' : 'bg-warning'}`} style={{ width: `${paperPercent}%` }}></div>
                </div>
                {paperPercent < 20 && <small className="text-danger fw-bold mt-2 d-block">⚠️ Refill soon!</small>}
              </div>
            </div>
          </div>

          {/* Card 3: Ink Status */}
          <div className="col-md-4">
            <div className="card border-0 shadow-sm rounded-4 h-100 bg-white">
              <div className="card-body p-4">
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <h6 className="text-muted fw-bold mb-0">INK STATUS</h6>
                  <div className="bg-primary bg-opacity-10 p-2 rounded text-primary"><Droplet size={20}/></div>
                </div>
                <h2 className="fw-bolder text-dark mb-3">{hardwareState.ink} <span className="text-muted fs-5">/ 6000</span></h2>
                <div className="progress" style={{ height: '8px' }}>
                  <div className={`progress-bar ${inkPercent < 20 ? 'bg-danger' : 'bg-primary'}`} style={{ width: `${inkPercent}%` }}></div>
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* Recent Orders Table */}
        <div className="card border-0 shadow-sm rounded-4 bg-white overflow-hidden">
          <div className="card-header bg-white border-bottom py-3 px-4 d-flex justify-content-between align-items-center">
            <h5 className="fw-bold mb-0 text-dark">Today's Successful Prints</h5>
            <span className="badge bg-success rounded-pill px-3 py-2">{recentOrders.length} Orders</span>
          </div>
          <div className="card-body p-0">
            {isLoading ? (
              <div className="text-center py-5"><Loader className="fa-spin text-success" size={40} /></div>
            ) : recentOrders.length === 0 ? (
              <div className="text-center py-5 text-muted">No prints today yet.</div>
            ) : (
              <div className="table-responsive">
                <table className="table table-hover align-middle mb-0">
                  <thead className="table-light text-muted">
                    <tr>
                      <th className="ps-4 fw-semibold border-0 py-3">Time</th>
                      <th className="fw-semibold border-0 py-3">OTP</th>
                      <th className="fw-semibold border-0 py-3">File Name</th>
                      <th className="fw-semibold border-0 py-3 text-center">Pages</th>
                      <th className="fw-semibold border-0 py-3 text-center">Mode</th>
                      <th className="pe-4 fw-semibold border-0 py-3 text-end">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentOrders.map((order) => (
                      <tr key={order.id}>
                        <td className="ps-4 text-secondary">{new Date(order.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</td>
                        <td><span className="fw-bold text-success font-monospace bg-success bg-opacity-10 px-2 py-1 rounded">{order.otp}</span></td>
                        <td>
                           <span className="text-truncate d-inline-block text-dark fw-medium" style={{ maxWidth: '200px' }}>
                             {order.file_name}
                           </span>
                        </td>
                        <td className="text-center fw-bold">{order.total_pages * order.copies}</td>
                        <td className="text-center">
                          <span className={`badge ${order.mode === 'bw' ? 'bg-dark text-white' : 'bg-info text-white'}`}>
                            {order.mode === 'bw' ? 'B&W' : 'Color'}
                          </span>
                        </td>
                        <td className="pe-4 text-end fw-bold text-success">₹{order.total_amount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;