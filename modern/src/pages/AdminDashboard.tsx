import { motion } from "framer-motion";
import { PageTransition } from "@/components/PageTransition";
import { AnimatedCounter } from "@/components/AnimatedCounter";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Printer, ArrowLeft, Search, Filter, FileText, TrendingUp, Users, DollarSign } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area } from "recharts";

const machines = [
  { id: "K-001", name: "Lobby Kiosk", status: "online" as const, jobs: 42, paper: 85 },
  { id: "K-002", name: "Floor 2 Kiosk", status: "online" as const, jobs: 28, paper: 62 },
  { id: "K-003", name: "Library Kiosk", status: "offline" as const, jobs: 0, paper: 91 },
  { id: "K-004", name: "Cafe Kiosk", status: "busy" as const, jobs: 15, paper: 34 },
];

const chartData = [
  { name: "Mon", prints: 120 }, { name: "Tue", prints: 190 }, { name: "Wed", prints: 150 },
  { name: "Thu", prints: 230 }, { name: "Fri", prints: 280 }, { name: "Sat", prints: 90 }, { name: "Sun", prints: 60 },
];

const revenueData = [
  { name: "Mon", revenue: 600 }, { name: "Tue", revenue: 950 }, { name: "Wed", revenue: 750 },
  { name: "Thu", revenue: 1150 }, { name: "Fri", revenue: 1400 }, { name: "Sat", revenue: 450 }, { name: "Sun", revenue: 300 },
];

const orders = [
  { id: "#2847", user: "Aarav K.", pages: 12, amount: 24, status: "completed", time: "2 min ago" },
  { id: "#2846", user: "Priya M.", pages: 45, amount: 135, status: "printing", time: "5 min ago" },
  { id: "#2845", user: "Rahul S.", pages: 3, amount: 6, status: "completed", time: "12 min ago" },
  { id: "#2844", user: "Meera J.", pages: 28, amount: 84, status: "completed", time: "18 min ago" },
  { id: "#2843", user: "Kiran D.", pages: 8, amount: 16, status: "failed", time: "25 min ago" },
];

const statusColors: Record<string, string> = {
  online: "bg-success",
  offline: "bg-muted-foreground",
  busy: "bg-warning",
  completed: "text-success",
  printing: "text-primary",
  failed: "text-destructive",
};

const stats = [
  { label: "Total Prints", value: 1120, icon: FileText, suffix: "" },
  { label: "Revenue", value: 5600, icon: DollarSign, prefix: "₹" },
  { label: "Active Users", value: 84, icon: Users, suffix: "" },
  { label: "Growth", value: 12, icon: TrendingUp, suffix: "%" },
];

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [tab, setTab] = useState<"overview" | "orders">("overview");
  const [search, setSearch] = useState("");
  const [selectedMachine, setSelectedMachine] = useState<string | null>(null);

  const filteredOrders = orders.filter(
    (o) => o.user.toLowerCase().includes(search.toLowerCase()) || o.id.includes(search)
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
            <div>
              <h1 className="text-3xl font-display font-bold">Dashboard</h1>
              <p className="text-sm text-muted-foreground">PrintSpot Admin</p>
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
                <h3 className="font-display font-semibold mb-4">Print Volume</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={chartData}>
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "hsl(215, 16%, 47%)" }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "hsl(215, 16%, 47%)" }} />
                    <Tooltip contentStyle={{ borderRadius: 12, border: "none", boxShadow: "0 4px 20px rgba(0,0,0,0.08)" }} />
                    <Bar dataKey="prints" fill="hsl(221, 83%, 53%)" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </motion.div>

              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="glass-strong rounded-2xl p-6">
                <h3 className="font-display font-semibold mb-4">Revenue</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={revenueData}>
                    <defs>
                      <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="hsl(221, 83%, 53%)" stopOpacity={0.3} />
                        <stop offset="100%" stopColor="hsl(221, 83%, 53%)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "hsl(215, 16%, 47%)" }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "hsl(215, 16%, 47%)" }} />
                    <Tooltip contentStyle={{ borderRadius: 12, border: "none", boxShadow: "0 4px 20px rgba(0,0,0,0.08)" }} />
                    <Area type="monotone" dataKey="revenue" stroke="hsl(221, 83%, 53%)" fill="url(#revGrad)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </motion.div>
            </div>

            {/* Machines */}
            <div>
              <h3 className="font-display font-semibold mb-4">Kiosk Machines</h3>
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {machines.map((m, i) => (
                  <motion.div
                    key={m.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 + i * 0.05 }}
                    whileHover={{ y: -4, boxShadow: "0 20px 40px hsl(221 83% 53% / 0.1)" }}
                    onClick={() => setSelectedMachine(selectedMachine === m.id ? null : m.id)}
                    className="glass-strong rounded-2xl p-5 cursor-pointer transition-all"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-mono text-muted-foreground">{m.id}</span>
                      <motion.div
                        animate={{ scale: [1, 1.3, 1] }}
                        transition={{ duration: 2, repeat: Infinity }}
                        className={`w-2.5 h-2.5 rounded-full ${statusColors[m.status]}`}
                      />
                    </div>
                    <p className="font-display font-semibold text-sm mb-1">{m.name}</p>
                    <p className="text-xs text-muted-foreground">{m.jobs} jobs · {m.paper}% paper</p>

                    {selectedMachine === m.id && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        className="mt-3 pt-3 border-t border-border"
                      >
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">Status</span>
                          <span className="capitalize font-medium">{m.status}</span>
                        </div>
                        <div className="mt-2">
                          <div className="flex justify-between text-xs mb-1">
                            <span className="text-muted-foreground">Paper</span>
                            <span>{m.paper}%</span>
                          </div>
                          <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${m.paper}%` }}
                              className="h-full gradient-hero rounded-full"
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
                      <p className="font-medium text-sm">{o.user} <span className="text-muted-foreground">{o.id}</span></p>
                      <p className="text-xs text-muted-foreground">{o.pages} pages · {o.time}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-display font-semibold text-sm">₹{o.amount}</p>
                    <p className={`text-xs capitalize font-medium ${statusColors[o.status] || "text-muted-foreground"}`}>{o.status}</p>
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
