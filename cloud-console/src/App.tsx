import React, { useState, useEffect } from 'react'
import axios from 'axios'
import { 
  LayoutDashboard, 
  Activity, 
  Settings, 
  FileText, 
  LogOut, 
  Lock, 
  Package, 
  Printer, 
  DollarSign,
  TrendingUp,
  Power,
  RefreshCcw,
  RotateCw,
  AlertTriangle
} from 'lucide-react'
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line,
  AreaChart,
  Area
} from 'recharts'

const BASE_URL = 'http://localhost:8000/api/analytics'

const AdminConsole = () => {
  const [isAdmin, setIsAdmin] = useState(false)
  const [password, setPassword] = useState('')
  const [activeTab, setActiveTab] = useState('overview')
  const [overview, setOverview] = useState<any>(null)
  const [kiosks, setKiosks] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const config = { headers: { 'X-Admin-Password': password } }
      const [ov, ks] = await Promise.all([
        axios.get(`${BASE_URL}/overview`, config),
        axios.get(`${BASE_URL}/kiosks`, config)
      ])
      setOverview(ov.data)
      setKiosks(ks.data)
      setIsAdmin(true)
    } catch (error) {
       alert('Invalid master password')
    } finally {
      setLoading(false)
    }
  }

  const sendRemoteCommand = async (kioskId: string, command: string) => {
    if (!window.confirm(`Are you sure you want to trigger ${command} on ${kioskId}?`)) return;
    try {
      await axios.post(`${BASE_URL}/remote-command`, {
        kiosk_id: kioskId,
        command: command
      }, { headers: { 'X-Admin-Password': password } });
      alert('Command queued successfully');
    } catch (e) {
      alert('Failed to queue command');
    }
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-[#0a0a0c] flex items-center justify-center p-4">
        <div className="w-full max-w-md glass-card p-10 space-y-8 animate-in fade-in zoom-in duration-500">
          <div className="text-center space-y-2">
            <div className="w-16 h-16 bg-primary/20 rounded-2xl flex items-center justify-center mx-auto text-primary mb-4">
              <Lock size={32} />
            </div>
            <h1 className="text-3xl font-black tracking-tight text-white">Cloud Console</h1>
            <p className="text-gray-500">Secure operator gateway</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-gray-400">Master Password</label>
              <input 
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-4 focus:ring-2 focus:ring-primary outline-none transition-all text-white"
                placeholder="••••••••"
                required
              />
            </div>
            <button 
              disabled={loading}
              className="w-full bg-primary hover:bg-primary/80 text-white font-bold py-4 rounded-xl shadow-lg shadow-primary/20 transition-all flex items-center justify-center gap-2"
            >
              {loading ? 'Authenticating...' : 'Access Terminal'}
            </button>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0a0a0c] text-gray-200 flex flex-col md:flex-row">
      {/* Sidebar */}
      <aside className="w-full md:w-64 border-b md:border-b-0 md:border-r border-white/5 bg-[#0d0d0f] flex flex-col">
        <div className="p-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-white font-black italic">P</div>
            <span className="text-xl font-bold tracking-tighter text-white">PrintSpot<span className="text-primary">.</span></span>
          </div>
        </div>

        <nav className="flex-1 px-4 space-y-2">
          {[
            { id: 'overview', label: 'Overview', icon: LayoutDashboard },
            { id: 'kiosks', label: 'Kiosks', icon: Activity },
            { id: 'power', label: 'Power', icon: Power },
            { id: 'orders', label: 'Orders', icon: FileText },
            { id: 'settings', label: 'Settings', icon: Settings },
          ].map((item) => (
            <button 
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium ${activeTab === item.id ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-gray-500 hover:bg-white/5 hover:text-white'}`}
            >
              <item.icon size={18} />
              {item.label}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-white/5">
          <button 
            onClick={() => setIsAdmin(false)}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-danger hover:bg-danger/10 transition-all font-medium"
          >
            <LogOut size={18} />
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-6 md:p-10 space-y-10 overflow-auto">
        {activeTab === 'overview' && overview && (
          <div className="space-y-10">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <StatCard label="Total Revenue" value={`₹${overview.total_revenue || 0}`} icon={DollarSign} color="primary" trend="+12.5%" />
              <StatCard label="Orders Today" value={overview.orders_today || 0} icon={FileText} color="secondary" trend="+5.2%" />
              <StatCard label="Pages Printed" value={overview.total_pages_today || 0} icon={Printer} color="primary" />
              <StatCard label="Active Kiosks" value={kiosks.length} icon={Activity} color="secondary" />
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="glass-card p-6 space-y-6">
                <h3 className="text-lg font-bold flex items-center gap-2">
                  <TrendingUp className="text-primary" size={20} /> Revenue 7D Trend
                </h3>
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={[
                      { name: 'Mon', r: 400 },
                      { name: 'Tue', r: 700 },
                      { name: 'Wed', r: 500 },
                      { name: 'Thu', r: 900 },
                      { name: 'Fri', r: 1200 },
                      { name: 'Sat', r: 1000 },
                      { name: 'Sun', r: 1500 },
                    ]}>
                      <defs>
                        <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ffffff10" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#666', fontSize: 12}} />
                      <YAxis axisLine={false} tickLine={false} tick={{fill: '#666', fontSize: 12}} />
                      <Tooltip contentStyle={{backgroundColor: '#16161a', border: 'none', borderRadius: '12px'}} />
                      <Area type="monotone" dataKey="r" stroke="#4f46e5" strokeWidth={3} fillOpacity={1} fill="url(#colorRev)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="glass-card p-6 space-y-6">
                <h3 className="text-lg font-bold flex items-center gap-2">
                  <Package className="text-secondary" size={20} /> Kiosk Utilization
                </h3>
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={kiosks.map(k => ({ name: k.name, pages: Math.floor(Math.random() * 500) }))}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ffffff10" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#666', fontSize: 12}} />
                      <YAxis axisLine={false} tickLine={false} tick={{fill: '#666', fontSize: 12}} />
                      <Tooltip contentStyle={{backgroundColor: '#16161a', border: 'none', borderRadius: '12px'}} />
                      <Bar dataKey="pages" fill="#10b981" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'kiosks' && (
          <div className="grid grid-cols-1 gap-6">
            <h3 className="text-xl font-bold">Machine Health Monitor</h3>
            <div className="glass-card overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead className="bg-white/5">
                  <tr>
                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-gray-500">Machine Name</th>
                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-gray-500">Status</th>
                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-gray-500">Paper Level</th>
                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-gray-500">Ink Level</th>
                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-gray-500">Heartbeat</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {kiosks.map((k: any) => (
                    <tr key={k.kiosk_id} className="hover:bg-white/5 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-bold text-white">{k.name}</div>
                        <div className="text-xs text-gray-500">{k.location}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${k.printer_status === 'READY' ? 'bg-secondary/10 text-secondary' : 'bg-danger/10 text-danger'}`}>
                          {k.printer_status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden w-24">
                          <div 
                            className={`h-full ${k.paper_left < 50 ? 'bg-danger' : 'bg-primary'}`} 
                            style={{ width: `${(k.paper_left / 500) * 100}%` }}
                          />
                        </div>
                        <span className="text-[10px] text-gray-400 mt-1 block">{k.paper_left} / 500 sheets</span>
                      </td>
                      <td className="px-6 py-4 text-sm font-mono">{k.ink_left} ml</td>
                      <td className="px-6 py-4 text-xs text-gray-500">30 seconds ago</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'power' && (
          <div className="space-y-6">
            <h3 className="text-xl font-bold">Remote Power Management</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {kiosks.map((k: any) => (
                <div key={k.kiosk_id} className="glass-card space-y-4 border-l-4 border-l-primary">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-bold text-lg">{k.name}</h4>
                      <p className="text-xs text-gray-500">{k.location}</p>
                    </div>
                    <span className={`w-2 h-2 rounded-full ${k.printer_status === 'READY' ? 'bg-secondary' : 'bg-danger'} animate-pulse`} />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <button 
                      onClick={() => sendRemoteCommand(k.kiosk_id, 'RESTART')}
                      className="flex items-center justify-center gap-2 py-3 rounded-xl bg-white/5 hover:bg-primary/10 text-primary border border-white/5 transition-all text-xs font-bold"
                    >
                      <RefreshCcw size={14} /> Restart OS
                    </button>
                    <button 
                      onClick={() => sendRemoteCommand(k.kiosk_id, 'SHUTDOWN')}
                      className="flex items-center justify-center gap-2 py-3 rounded-xl bg-white/5 hover:bg-danger/10 text-danger border border-white/5 transition-all text-xs font-bold"
                    >
                      <Power size={14} /> Shutdown
                    </button>
                    <button 
                      onClick={() => sendRemoteCommand(k.kiosk_id, 'RESTART_APP')}
                      className="col-span-2 flex items-center justify-center gap-2 py-3 rounded-xl bg-white/5 hover:bg-yellow-400/10 text-yellow-400 border border-white/5 transition-all text-xs font-bold"
                    >
                      <RotateCw size={14} /> Restart App
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab !== 'overview' && activeTab !== 'kiosks' && activeTab !== 'power' && (
          <div className="flex flex-col items-center justify-center h-[500px] text-gray-500 space-y-4">
            <AlertTriangle size={48} />
            <p className="font-medium">Module under development</p>
          </div>
        )}
      </main>
    </div>
  )
}

const StatCard = ({ label, value, icon: Icon, color, trend }: any) => (
  <div className="glass-card p-6 space-y-4 border border-white/5 hover:border-white/10 transition-all group">
    <div className="flex justify-between items-start">
      <div className={`p-3 rounded-xl ${color === 'primary' ? 'bg-primary/20 text-primary' : 'bg-secondary/20 text-secondary'}`}>
        <Icon size={24} />
      </div>
      {trend && <span className="text-[10px] font-black text-secondary px-2 py-1 bg-secondary/10 rounded-lg">{trend}</span>}
    </div>
    <div>
      <h4 className="text-gray-500 text-xs font-bold uppercase tracking-widest">{label}</h4>
      <p className="text-3xl font-black text-white mt-1">{value}</p>
    </div>
  </div>
)

export default AdminConsole;
