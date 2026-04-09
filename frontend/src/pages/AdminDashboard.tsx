import { motion } from "framer-motion";
import { PageTransition } from "@/components/PageTransition";
import { AnimatedCounter } from "@/components/AnimatedCounter";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Printer, ArrowLeft, Search, Filter, FileText, TrendingUp, Users, DollarSign } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area } from "recharts";

// Local interface for Kiosk Data matching backend analytics.py
interface Kiosk {
  kiosk_id: string;
  name: string;
  location: string;
  paper: number;
  ink: number;
  printer_status: string;
  last_seen?: string;
  revenue_today: number;
  orders_today: number;
}

const statusColors: Record<string, string> = {
  online: "bg-success",
  offline: "bg-muted-foreground",
  busy: "bg-warning",
  NORMAL: "bg-success",
  BUSY: "bg-warning",
  OFFLINE: "bg-muted-foreground",
  completed: "text-success",
  printing: "text-primary",
  failed: "text-destructive",
};

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [tab, setTab] = useState<"overview" | "orders">("overview");
  const [search, setSearch] = useState("");
  const [selectedMachine, setSelectedMachine] = useState<string | null>(null);
  
  // Real Data State
  const [machines, setMachines] = useState<Kiosk[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [stats, setStats] = useState([
    { label: "Total Prints", value: 0, icon: FileText, suffix: "" },
    { label: "Today Revenue", value: 0, icon: DollarSign, prefix: "₹" },
    { label: "Active Kiosks", value: 0, icon: Users, suffix: "" },
    { label: "All Time Rev", value: 0, icon: TrendingUp, prefix: "₹" },
  ]);

  const backendUrl = import.meta.env.VITE_EC2_IP || 'http://localhost:8080';
  const adminPass = import.meta.env.VITE_ADMIN_PASS || 'admin_secret_987';

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const headers = { 'X-Admin-Password': adminPass };
        
        // 1. Overview Stats
        const overSync = await fetch(`${backendUrl}/api/admin/overview`, { headers });
        const overData = await overSync.json();
        
        setStats([
          { label: "Today Prints", value: overData.total_orders_today, icon: FileText, suffix: "" },
          { label: "Today Revenue", value: overData.total_revenue_today, icon: DollarSign, prefix: "₹" },
          { label: "Active Kiosks", value: overData.active_kiosks, icon: Users, suffix: ` / ${overData.total_kiosks}` },
          { label: "Total Revenue", value: overData.total_revenue_alltime, icon: TrendingUp, prefix: "₹" },
        ]);

        // 2. Kiosks Status
        const kioskSync = await fetch(`${backendUrl}/api/admin/kiosks`, { headers });
        const kioskData = await kioskSync.json();
        setMachines(kioskData);

        // 3. Recent Orders
        const orderSync = await fetch(`${backendUrl}/api/admin/orders?limit=10`, { headers });
        const ordData = await orderSync.json();
        setOrders(ordData.orders || []);

      } catch (err) {
        console.error("Dashboard fetch error:", err);
      }
    };

    fetchDashboard();
    const interval = setInterval(fetchDashboard, 30000); // Auto-refresh every 30s
    return () => clearInterval(interval);
  }, [backendUrl, adminPass]);

  const filteredOrders = orders.filter(
    (o) => (o.unique_name || o.file_name)?.toLowerCase().includes(search.toLowerCase()) || o.otp?.includes(search)
  );

  return (
    <PageTransition className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate("/")} className="text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-3">
              <img src="/logo-bg.png" alt="" className="w-10 h-10 object-contain" />
              <div>
                <h1 className="text-3xl font-display font-bold">Dashboard</h1>
                <p className="text-sm text-muted-foreground">PrintSpot Admin</p>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            {(["overview", "orders"] as const).map((t) => (
              <motion.button
                key={t}
                onClick={() => setTab(t)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors relative ${
                  tab === t ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab === t && (
                  <motion.div layoutId="admin-tab" className="absolute inset-0 gradient-hero rounded-xl" transition={{ type: "spring", stiffness: 500, damping: 30 }} />
                )}
                <span className="relative z-10 capitalize">{t}</span>
              </motion.button>
            ))}
          </div>
        </div>

        {tab === "overview" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {stats.map((s, i) => (
                <motion.div
                  key={s.label}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="glass-strong rounded-2xl p-5"
                >
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center">
                      <s.icon className="w-4 h-4 text-primary" />
                    </div>
                    <span className="text-xs text-muted-foreground">{s.label}</span>
                  </div>
                  <p className="text-2xl font-display font-bold">
                    <AnimatedCounter value={s.value} prefix={s.prefix || ""} suffix={s.suffix || ""} />
                  </p>
                </motion.div>
              ))}
            </div>

            {/* Charts */}
            <div className="grid md:grid-cols-2 gap-6">
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass-strong rounded-2xl p-6">
                <h3 className="font-display font-semibold mb-4">Live Performance</h3>
                <div className="h-[200px] flex items-center justify-center text-muted-foreground border-2 border-dashed border-border rounded-xl">
                  <p className="text-sm">Consolidated chart data syncing...</p>
                </div>
              </motion.div>

              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="glass-strong rounded-2xl p-6">
                <h3 className="font-display font-semibold mb-4">Recent Activity</h3>
                <div className="space-y-4">
                  {orders.slice(0, 3).map((o, i) => (
                    <div key={i} className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground truncate max-w-[150px]">{o.file_name}</span>
                      <span className="font-bold text-primary">₹{o.total_amount}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            </div>

            {/* Machines */}
            <div>
              <h3 className="font-display font-semibold mb-4">Kiosk Machines</h3>
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {machines.map((m, i) => (
                  <motion.div
                    key={m.kiosk_id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 + i * 0.05 }}
                    whileHover={{ y: -4, boxShadow: "0 20px 40px hsl(221 83% 53% / 0.1)" }}
                    onClick={() => setSelectedMachine(selectedMachine === m.kiosk_id ? null : m.kiosk_id)}
                    className="glass-strong rounded-2xl p-5 cursor-pointer transition-all"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-mono text-muted-foreground">{m.kiosk_id}</span>
                      <motion.div
                        animate={{ scale: [1, 1.3, 1] }}
                        transition={{ duration: 2, repeat: Infinity }}
                        className={`w-2.5 h-2.5 rounded-full ${statusColors[m.printer_status] || "bg-warning"}`}
                      />
                    </div>
                    <p className="font-display font-semibold text-sm mb-1">{m.name}</p>
                    <p className="text-xs text-muted-foreground">{m.orders_today} jobs · {m.paper}% paper</p>

                    {selectedMachine === m.kiosk_id && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        className="mt-3 pt-3 border-t border-border"
                      >
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">Location</span>
                          <span className="capitalize font-medium text-[10px]">{m.location}</span>
                        </div>
                        <div className="flex justify-between text-xs mt-1">
                          <span className="text-muted-foreground">Status</span>
                          <span className={`capitalize font-black text-[10px] ${m.printer_status === 'NORMAL' ? 'text-success' : 'text-warning'}`}>{m.printer_status}</span>
                        </div>
                        <div className="flex justify-between text-xs mt-1">
                          <span className="text-muted-foreground">Last Ping</span>
                          <span className="text-[10px]">{m.last_seen ? new Date(m.last_seen).toLocaleTimeString() : 'Never'}</span>
                        </div>
                        <div className="mt-3">
                          <div className="flex justify-between text-xs mb-1">
                            <span className="text-muted-foreground">Ink Level</span>
                            <span className="font-bold">{m.ink}%</span>
                          </div>
                          <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${m.ink}%` }}
                              className="h-full bg-blue-500 rounded-full"
                            />
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {tab === "orders" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            {/* Search */}
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="glass-strong rounded-2xl p-3 flex items-center gap-3 mb-6">
              <Search className="w-4 h-4 text-muted-foreground" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search orders..."
                className="bg-transparent border-none outline-none text-sm flex-1 text-foreground placeholder:text-muted-foreground"
              />
              <Filter className="w-4 h-4 text-muted-foreground" />
            </motion.div>

            {/* Orders list */}
            <div className="space-y-3">
              {filteredOrders.map((o, i) => (
                <motion.div
                  key={o.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  whileHover={{ x: 4 }}
                  className="glass-strong rounded-2xl p-5 flex items-center justify-between"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center">
                      <FileText className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{o.file_name} <span className="text-muted-foreground">#{o.otp}</span></p>
                      <p className="text-xs text-muted-foreground">{o.total_pages} pages · {new Date(o.created_at).toLocaleTimeString()}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-display font-semibold text-sm">₹{o.total_amount}</p>
                    <p className={`text-xs capitalize font-medium ${statusColors[o.print_status] || "text-muted-foreground"}`}>{o.print_status}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </PageTransition>
  );
};

export default AdminDashboard;
