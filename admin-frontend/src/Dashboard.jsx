import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Printer, 
  TrendingUp, 
  AlertCircle, 
  Search, 
  Bell, 
  LayoutDashboard, 
  History, 
  Settings, 
  HardDrive,
  DollarSign
} from 'lucide-react';
import PricingManager from './PricingManager';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const Dashboard = () => {
  const [activeTab, setActiveTab] = useState("dashboard");

  // Mock data for Phase 8 demonstration
  const stats = [
    { label: "Daily Revenue", value: "₹2,450", change: "+12.5%", icon: <TrendingUp size={24}/>, pos: true },
    { label: "Active Kiosks", value: "12 / 13", change: "1 Offline", icon: <Printer size={24}/>, pos: false },
    { label: "Total Prints", value: "840 Pages", change: "+8% vs yesterday", icon: <HardDrive size={24}/>, pos: true },
    { label: "New Customers", value: "48", change: "+24%", icon: <Users size={24}/>, pos: true }
  ];

  const chartData = {
    labels: ['9 AM', '11 AM', '1 PM', '3 PM', '5 PM', '7 PM', '9 PM'],
    datasets: [
      {
        label: 'Sales (₹)',
        data: [120, 450, 890, 600, 1100, 1400, 900],
        fill: true,
        borderColor: '#0ea5e9',
        backgroundColor: 'rgba(14, 165, 233, 0.1)',
        tension: 0.4
      }
    ]
  };

  return (
    <div className="admin-layout">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-header">
           Print <span>स्पॉट</span> Admin
        </div>
        
        <nav className="sidebar-nav">
          {[
            { id: "dashboard", icon: <LayoutDashboard size={20}/>, label: "Dashboard" },
            { id: "kiosks", icon: <Printer size={20}/>, label: "Kiosks" },
            { id: "history", icon: <History size={20}/>, label: "History" },
            { id: "pricing", icon: <DollarSign size={20}/>, label: "Pricing" },
            { id: "settings", icon: <Settings size={20}/>, label: "Settings" }
          ].map(item => (
            <a 
              key={item.id}
              href={`#${item.id}`}
              onClick={() => setActiveTab(item.id)}
              className={`nav-item ${activeTab === item.id ? 'active' : ''}`}
            >
              {item.icon}
              {item.label}
            </a>
          ))}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        <header className="header">
          <div>
            <h1>{activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}</h1>
             <p className="text-muted">Welcome back, Admin</p>
          </div>
          
          <div className="d-flex align-items-center gap-4">
             <div className="position-relative">
               <Bell size={24} className="text-muted" />
               <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger" style={{ fontSize: '0.6rem' }}>3</span>
             </div>
             <div className="rounded-circle bg-light d-flex align-items-center justify-content-center" style={{ width: 40, height: 40 }}>
                <Users size={20} className="text-primary" />
             </div>
          </div>
        </header>

        {activeTab === "dashboard" && (
          <>
            {/* Stats Overview */}
            <div className="stats-grid">
              {stats.map((stat, i) => (
                <div key={i} className="stat-card">
                  <div className="stat-card-header">
                    <span className="stat-icon">{stat.icon}</span>
                    <span className={`stat-change ${stat.pos ? 'positive' : 'negative'}`}>{stat.change}</span>
                  </div>
                  <div className="stat-value">{stat.value}</div>
                  <div className="stat-label">{stat.label}</div>
                </div>
              ))}
            </div>

            {/* Charts & Monitoring */}
            <div className="grid-cols-2">
              <div className="card">
                <div className="card-header">
                  <div className="card-title">Real-time Sales Trend</div>
                  <div className="text-muted small">Update every 30s</div>
                </div>
                <div style={{ height: '300px' }}>
                  <Line data={chartData} options={{ maintainAspectRatio: false, scales: { y: { beginAtZero: true } } }} />
                </div>
              </div>

              <div className="card">
                <div className="card-header">
                  <div className="card-title">Printer Health</div>
                </div>
                <div className="table-container">
                  <table className="small">
                    <tbody>
                      {[
                        { name: "Kiosk #01", status: "ONLINE", ink: "85%", paper: "450" },
                        { name: "Kiosk #02", status: "JAMMED", ink: "20%", paper: "12" },
                        { name: "Kiosk #04", status: "OFFLINE", ink: "NA", paper: "NA" }
                      ].map((k, i) => (
                        <tr key={i}>
                          <td><b>{k.name}</b></td>
                          <td>
                            <span className={`badge badge-${k.status === 'ONLINE' ? 'success' : k.status === 'JAMMED' ? 'warning' : 'danger'}`}>
                              {k.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <button className="btn btn-primary w-100 mt-4 py-2 rounded-3 small">
                  View Detailed Health
                </button>
              </div>
            </div>

            {/* Recent Orders Table */}
            <div className="card">
              <div className="card-header">
                <div className="card-title">Recent Transactions</div>
                <button className="btn btn-link text-primary text-decoration-none small fw-bold">View All</button>
              </div>
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>ORDER ID</th>
                      <th>FILE NAME</th>
                      <th>AMOUNT</th>
                      <th>COPIES</th>
                      <th>STATUS</th>
                      <th>TIME</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { id: "ORD_9123", file: "notes_physics.pdf", amt: "₹45.00", copies: "5", status: "Printed" },
                      { id: "ORD_9122", file: "resume_final.pdf", amt: "₹12.00", copies: "2", status: "Pending" },
                      { id: "ORD_9121", file: "ticket_train.pdf", amt: "₹6.00", copies: "1", status: "Printed" }
                    ].map((row, i) => (
                      <tr key={i}>
                        <td>{row.id}</td>
                        <td>{row.file}</td>
                        <td>{row.amt}</td>
                        <td>{row.copies}</td>
                        <td>
                          <span className={`badge badge-${row.status === 'Printed' ? 'success' : 'warning'}`}>
                            {row.status}
                          </span>
                        </td>
                        <td className="text-muted">12 min ago</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {activeTab === "pricing" && (
           <PricingManager />
        )}
      </main>
    </div>
  );
};

export default Dashboard;
