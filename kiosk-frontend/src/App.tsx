import { motion } from "framer-motion";
import { PageTransition } from "./components/PageTransition";
import { RippleButton } from "./components/RippleButton";
import { useState, useEffect, useRef } from "react";
import { Printer, Delete, Loader2, AlertCircle, Check } from "lucide-react";
import { Toaster, toast } from "sonner";

type KioskState = "input" | "verifying" | "printing" | "done" | "error";

function App() {
  const [code, setCode] = useState("");
  const [state, setState] = useState<KioskState>("input");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [orderDetails, setOrderDetails] = useState<any[]>([]);
  const [isMaintenance, setIsMaintenance] = useState(false);
  const [maintenanceMsg, setMaintenanceMsg] = useState("System checking...");
  const idleTimerRef = useRef<NodeJS.Timeout | null>(null);

  const resetIdleTimer = (duration = 120000) => {
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    
    idleTimerRef.current = setTimeout(() => {
      setCode("");
      setState("input");
      setProgress(0);
      setOrderDetails([]);
    }, duration);
  };

  const handleKeyPress = (key: string) => {
    resetIdleTimer();
    if (code.length < 6) setCode((prev) => prev + key);
  };

  const handleDelete = () => {
    resetIdleTimer();
    setCode((prev) => prev.slice(0, -1));
  };

  useEffect(() => {
    const checkMaintenance = async () => {
      try {
        const res = await fetch('http://localhost:5000/api/printer/status');
        const data = await res.json();
        if (data.status === 'ERROR' || data.status === 'OFFLINE') {
           setIsMaintenance(true);
           setMaintenanceMsg(data.reason || "Printer is currently undergoing maintenance.");
        } else {
           setIsMaintenance(false);
        }
      } catch (e) {
        setIsMaintenance(true);
        setMaintenanceMsg("Hardware link lost. Contact operator.");
      }
    };

    const interval = setInterval(checkMaintenance, 10000); // Check every 10s
    checkMaintenance();
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (state === "done") {
      // Auto reset after 30 seconds on success page
      resetIdleTimer(30000);
    } else if (state === "input" && code !== "") {
      resetIdleTimer(120000);
    } else if (state === "input" && code === "") {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    }
    
    return () => { if (idleTimerRef.current) clearTimeout(idleTimerRef.current); };
  }, [code, state]);

  const handleSubmit = async () => {
    if (code.length !== 6) return;
    setState("verifying");
    setError("");

    try {
      const backendUrl = import.meta.env.VITE_EC2_IP || 'http://localhost:8080';
      const verifyRes = await fetch(`${backendUrl}/api/orders/verify-otp/${code}`);
      const verifyData = await verifyRes.json();

      if (!verifyRes.ok) throw new Error(verifyData.detail || "Invalid OTP or Secret Code");

      setOrderDetails(verifyData.items);
      setState("printing");
      
      // Call local hardware printer server batch endpoint
      const printRes = await fetch('http://localhost:5000/api/print', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(verifyData.items.map((item: any) => ({ ...item, otp: code })))
      });

      if (!printRes.ok) {
        const printError = await printRes.json();
        throw new Error(printError.detail || "Printer Hardware Error");
      }

      // Mark order as completed ONLY if printer accepted the jobs
      await fetch(`${backendUrl}/api/orders/mark-completed/${code}`, { method: 'POST' });
      
      // Simulate progress for UI feel
      let currentProgress = 0;
      const interval = setInterval(() => {
        currentProgress += 5;
        setProgress(currentProgress);
        if (currentProgress >= 100) {
          clearInterval(interval);
          setTimeout(() => setState("done"), 500);
        }
      }, 150);

    } catch (err: any) {
      setError(err.message);
      setState("error");
      toast.error(err.message);
    }
  };

  return (
    <PageTransition className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-6 overflow-hidden relative">
      <Toaster position="top-center" richColors theme="light" />
      
      {/* Dynamic Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-cyan-500/5 blur-[120px] animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-500/5 blur-[120px] animate-pulse" style={{ animationDelay: '2s' }} />
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-[0.03]" />
      </div>
      
      <div className="max-w-md w-full mx-auto text-center relative z-10">
        {/* Logo Section */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }} 
          animate={{ opacity: 1, y: 0 }} 
          className="mb-10 flex flex-col items-center"
        >
          <div className="w-20 h-20 rounded-[2rem] glass neo-blur p-4 shadow-2xl shadow-cyan-500/10 mb-6 flex items-center justify-center border border-white/50">
            <Printer className="w-10 h-10 text-cyan-500 animate-float" />
          </div>
          <h1 className="text-4xl font-display font-black text-slate-900 tracking-tight flex items-center gap-2">
            PrintKro <span className="text-cyan-500">Kiosk</span>
          </h1>
          <p className="text-slate-400 text-xs mt-2 uppercase tracking-[0.4em] font-bold">Secure Printing Hub</p>
        </motion.div>

        {state === "input" && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }}
            className="space-y-8"
          >
            {/* Code display with premium feel */}
            <div className="flex justify-center gap-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <motion.div
                  key={i}
                  animate={code[i] ? { 
                    scale: [1, 1.05, 1], 
                    borderColor: "rgb(6, 182, 212)",
                    backgroundColor: "white",
                    boxShadow: "0 10px 25px -5px rgba(6, 182, 212, 0.1)"
                  } : {}}
                  className={`w-14 h-20 rounded-2xl border-2 flex items-center justify-center font-display text-4xl font-bold transition-all duration-200 ${
                    code[i] ? "border-cyan-500 text-slate-900" : "border-slate-200 text-slate-300 bg-white/50"
                  }`}
                >
                  {code[i] || "•"}
                </motion.div>
              ))}
            </div>

            {/* Keypad Container */}
            <div className="glass rounded-[2.5rem] p-6 shadow-2xl shadow-slate-200/50 border border-white/80">
              <div className="grid grid-cols-3 gap-4 mb-6">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
                  <RippleButton
                    key={n}
                    onClick={() => handleKeyPress(String(n))}
                    className="h-20 rounded-2xl bg-white/80 border border-slate-100 text-slate-900 font-display text-3xl font-bold hover:bg-white hover:shadow-lg hover:border-cyan-100 transition-all active:scale-95 flex items-center justify-center shadow-sm"
                  >
                    {n}
                  </RippleButton>
                ))}
                <RippleButton 
                  onClick={handleDelete} 
                  className="h-20 rounded-2xl bg-slate-50 border border-slate-100 text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all flex items-center justify-center"
                >
                  <Delete className="w-8 h-8" />
                </RippleButton>
                <RippleButton 
                  onClick={() => handleKeyPress("0")} 
                  className="h-20 rounded-2xl bg-white/80 border border-slate-100 text-slate-900 font-display text-3xl font-bold hover:bg-white transition-all flex items-center justify-center shadow-sm"
                >
                  0
                </RippleButton>
                <RippleButton
                  onClick={handleSubmit}
                  disabled={code.length !== 6}
                  className={`h-20 rounded-2xl font-display font-black text-lg tracking-wider transition-all shadow-xl ${
                    code.length === 6 
                      ? "bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-cyan-500/25 hover:shadow-cyan-500/40 hover:scale-[1.02]" 
                      : "bg-slate-100 text-slate-300 pointer-events-none"
                  }`}
                >
                  PRINT NOW
                </RippleButton>
              </div>
              <p className="text-slate-400 text-[10px] uppercase font-bold tracking-widest">Enter the 6-digit code from your phone</p>
            </div>
          </motion.div>
        )}

        {state === "verifying" && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }} 
            animate={{ opacity: 1, scale: 1 }} 
            className="py-16 glass rounded-[3rem] border border-white shadow-2xl shadow-cyan-500/10"
          >
            <div className="relative w-20 h-20 mx-auto mb-8">
              <div className="absolute inset-0 rounded-full border-4 border-slate-100" />
              <div className="absolute inset-0 rounded-full border-4 border-cyan-500 border-t-transparent animate-spin" />
              <Loader2 className="absolute inset-0 m-auto w-10 h-10 text-cyan-500 animate-pulse" />
            </div>
            <h2 className="text-2xl font-display font-black text-slate-900 mb-2">Securing Connection</h2>
            <p className="text-slate-400 font-medium px-10">Validating your print session with the cloud...</p>
          </motion.div>
        )}

        {state === "printing" && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }} 
            className="py-16 glass rounded-[3rem] border border-white shadow-2xl"
          >
            <div className="relative w-32 h-32 mx-auto mb-10">
               <motion.div
                 animate={{ y: [0, -10, 0] }}
                 transition={{ repeat: Infinity, duration: 2 }}
               >
                 <Printer className="w-32 h-32 text-cyan-500 drop-shadow-[0_0_15px_rgba(6,182,212,0.3)]" />
               </motion.div>
               <div className="absolute -bottom-4 left-0 right-0 h-2 bg-cyan-500/20 blur-xl rounded-full animate-pulse" />
            </div>
            <h2 className="text-3xl font-display font-black text-slate-900 mb-8">Printing...</h2>
            
            <div className="px-12">
              <div className="w-full h-3 rounded-full bg-slate-100 overflow-hidden mb-4 p-0.5 border border-slate-200">
                <motion.div
                  className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full shadow-[0_0_20px_rgba(6,182,212,0.4)]"
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                />
              </div>
              <div className="flex justify-between items-center">
                <p className="text-cyan-600 font-black text-xs tracking-[0.2em]">{progress}% READY</p>
                <div className="flex gap-1">
                  <div className="w-1 h-1 rounded-full bg-cyan-500 animate-bounce" />
                  <div className="w-1 h-1 rounded-full bg-cyan-500 animate-bounce [animation-delay:0.2s]" />
                  <div className="w-1 h-1 rounded-full bg-cyan-500 animate-bounce [animation-delay:0.4s]" />
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {state === "done" && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }} 
            animate={{ opacity: 1, scale: 1 }} 
            className="py-16 glass rounded-[4rem] border border-white shadow-2xl relative overflow-hidden"
          >
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-cyan-500 to-blue-500" />
            
            <div className="w-28 h-28 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 mx-auto flex items-center justify-center mb-10 shadow-2xl shadow-cyan-500/30">
               <Check className="w-14 h-14 text-white stroke-[4px] animate-[scale-in_0.5s_ease-out]" />
            </div>
            <h2 className="text-5xl font-display font-black text-slate-900 mb-4 tracking-tight">All Set!</h2>
            <p className="text-slate-500 text-lg mb-12 leading-relaxed px-10 font-medium">
              Your documents are ready. Please collect them from the printer tray.
            </p>
            
            <div className="px-10">
              <RippleButton
                onClick={() => { setCode(""); setState("input"); setProgress(0); }}
                className="w-full py-5 rounded-2xl bg-slate-900 text-white font-black text-lg tracking-wider hover:bg-slate-800 transition-all shadow-xl shadow-slate-900/20 active:scale-95"
              >
                FINISH SESSION
              </RippleButton>
              <p className="text-slate-400 text-[10px] mt-6 uppercase tracking-widest font-bold">Auto-resets in 30 seconds</p>
            </div>
          </motion.div>
        )}

        {state === "error" && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }} 
            animate={{ opacity: 1, scale: 1 }} 
            className="py-16 glass rounded-[3rem] border border-red-100 shadow-2xl"
          >
            <div className="w-24 h-24 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-8 border border-red-100">
              <AlertCircle className="w-12 h-12 text-red-500" />
            </div>
            <h2 className="text-3xl font-display font-black text-slate-900 mb-4">Error</h2>
            <p className="text-red-500 font-semibold mb-10 px-12 leading-relaxed">{error}</p>
            <RippleButton
              onClick={() => setState("input")}
              className="px-12 py-4 rounded-2xl bg-red-500 text-white font-black text-lg shadow-xl shadow-red-500/20 hover:bg-red-600 transition-all active:scale-95"
            >
              TRY AGAIN
            </RippleButton>
          </motion.div>
        )}
      </div>

      {/* Maintenance Overlay - Critical Level */}
      {isMaintenance && (
        <motion.div 
          initial={{ opacity: 0 }} 
          animate={{ opacity: 1 }}
          className="fixed inset-0 z-[20000] bg-white/98 backdrop-blur-3xl flex flex-col items-center justify-center p-12 text-center"
        >
           <div className="relative mb-10">
              <div className="absolute inset-0 bg-amber-500/20 blur-[60px] rounded-full animate-pulse" />
              <div className="w-32 h-32 rounded-[2.5rem] bg-amber-50 flex items-center justify-center border-2 border-amber-100 relative z-10">
                 <AlertCircle className="w-16 h-16 text-amber-500" />
              </div>
           </div>
           <h2 className="text-5xl font-display font-black text-slate-900 mb-6 tracking-tight">Station Offline</h2>
           <p className="max-w-md text-slate-500 text-xl leading-relaxed font-medium mb-12">{maintenanceMsg}</p>
           
           <div className="bg-slate-50 px-8 py-4 rounded-full border border-slate-100 flex items-center gap-4 text-slate-400 uppercase tracking-[0.2em] text-[10px] font-black">
              <div className="relative w-4 h-4">
                <div className="absolute inset-0 border-2 border-slate-200 rounded-full" />
                <div className="absolute inset-0 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
              </div>
              System diagnostic in progress...
           </div>
        </motion.div>
      )}
    </PageTransition>
  );
}

export default App;
