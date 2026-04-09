import { motion } from "framer-motion";
import { PageTransition } from "@/components/PageTransition";
import { RippleButton } from "@/components/RippleButton";
import { useState, useEffect, useRef } from "react";
import { Printer, Delete, Loader2, AlertCircle, Check } from "lucide-react";
import { toast } from "sonner";

type KioskState = "input" | "verifying" | "printing" | "done" | "error";

const KioskPage = () => {
  const [code, setCode] = useState("");
  const [state, setState] = useState<KioskState>("input");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [orderDetails, setOrderDetails] = useState<any[]>([]);
  const [isMaintenance, setIsMaintenance] = useState(false);
  const [maintenanceMsg, setMaintenanceMsg] = useState("System checking...");
  const idleTimerRef = useRef<NodeJS.Timeout | null>(null);

  const resetIdleTimer = () => {
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    if (state === "input" && code === "") return;
    
    idleTimerRef.current = setTimeout(() => {
      setCode("");
      setState("input");
      setProgress(0);
    }, 120000); // 2 minutes
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
    resetIdleTimer();
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
        body: JSON.stringify(verifyData.items)
      });

      if (!printRes.ok) {
        const printError = await printRes.json();
        throw new Error(printError.detail || "Printer Hardware Error");
      }

      // Mark order as completed ONLY if printer accepted the jobs
      await fetch(`${backendUrl}/api/orders/mark-completed/${code}`, { method: 'POST' });
      
      setProgress(100);
      setTimeout(() => setState("done"), 1000);

    } catch (err: any) {
      setError(err.message);
      setState("error");
      toast.error(err.message);
    }
  };

  return (
    <PageTransition className="min-h-screen bg-slate-950 flex items-center justify-center p-6 overflow-hidden relative">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(34,211,238,0.1),transparent)]" />
      
      <div className="max-w-sm w-full mx-auto text-center relative z-10">
        {/* Logo */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-12 flex flex-col items-center">
          <div className="w-24 h-24 rounded-3xl bg-white p-4 shadow-2xl shadow-cyan-500/20 mb-6 flex items-center justify-center">
            <Printer className="w-12 h-12 text-cyan-500" />
          </div>
          <h1 className="text-3xl font-display font-bold text-white tracking-tight">PrintSpot <span className="text-cyan-400 text-lg align-top uppercase ml-1">Kiosk</span></h1>
          <p className="text-slate-400 text-sm mt-1 uppercase tracking-[0.3em] font-semibold">Self-Service Station</p>
        </motion.div>

        {state === "input" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            {/* Code display */}
            <div className="flex justify-center gap-2.5 mb-10">
              {Array.from({ length: 6 }).map((_, i) => (
                <motion.div
                  key={i}
                  animate={code[i] ? { 
                    scale: [1, 1.1, 1], 
                    borderColor: "rgba(34, 211, 238, 0.6)",
                    backgroundColor: "rgba(34, 211, 238, 0.05)"
                  } : {}}
                  className="w-12 h-16 rounded-2xl border-2 border-slate-800 bg-slate-900/50 flex items-center justify-center font-display text-3xl font-bold text-white shadow-inner transition-all"
                >
                  {code[i] || ""}
                </motion.div>
              ))}
            </div>

            {/* Keypad */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
                <RippleButton
                  key={n}
                  onClick={() => handleKeyPress(String(n))}
                  className="h-16 rounded-2xl bg-slate-900 border border-slate-800 text-white font-display text-2xl font-bold hover:bg-slate-800 hover:border-slate-700 transition-all active:scale-95 flex items-center justify-center"
                >
                  {n}
                </RippleButton>
              ))}
              <RippleButton onClick={handleDelete} className="h-16 rounded-2xl bg-slate-950 border border-slate-900 text-slate-400 hover:text-white hover:bg-red-900/20 transition-all flex items-center justify-center">
                <Delete className="w-6 h-6" />
              </RippleButton>
              <RippleButton onClick={() => handleKeyPress("0")} className="h-16 rounded-2xl bg-slate-900 border border-slate-800 text-white font-display text-2xl font-bold hover:bg-slate-800 transition-all flex items-center justify-center">
                0
              </RippleButton>
              <RippleButton
                onClick={handleSubmit}
                disabled={code.length !== 6}
                className={`h-16 rounded-2xl font-display font-bold text-base tracking-wider transition-all shadow-lg ${
                  code.length === 6 
                    ? "bg-cyan-500 text-white shadow-cyan-500/40 hover:bg-cyan-400 hover:scale-[1.02]" 
                    : "bg-slate-900 text-slate-700 pointer-events-none"
                }`}
              >
                PROCEED
              </RippleButton>
            </div>
          </motion.div>
        )}

        {state === "verifying" && (
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="py-12 bg-slate-900/40 rounded-[3rem] border border-slate-800">
            <Loader2 className="w-16 h-16 text-cyan-400 animate-spin mx-auto mb-6" />
            <h2 className="text-xl font-bold text-white mb-2">Verifying Code</h2>
            <p className="text-slate-400 text-sm animate-pulse">Contacting secure cloud...</p>
          </motion.div>
        )}

        {state === "printing" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-12 bg-slate-900/40 rounded-[3rem] border border-slate-800">
            <div className="relative w-24 h-24 mx-auto mb-8">
               <Printer className="w-24 h-24 text-cyan-400 animate-bounce" />
               <div className="absolute -bottom-2 left-0 right-0 h-1 bg-cyan-400/20 blur-md rounded-full animate-pulse" />
            </div>
            <h2 className="text-2xl font-display font-bold text-white mb-6">Printing Document</h2>
            
            <div className="px-10">
              <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden mb-3">
                <motion.div
                  className="h-full bg-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.5)]"
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-cyan-400 font-bold text-sm tracking-widest">{progress}% COMPLETE</p>
            </div>
          </motion.div>
        )}

        {state === "done" && (
          <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="py-12">
            <div className="w-24 h-24 rounded-full bg-cyan-500 mx-auto flex items-center justify-center mb-8 shadow-2xl shadow-cyan-500/40">
               <Check className="w-12 h-12 text-white stroke-[4px]" />
            </div>
            <h2 className="text-4xl font-display font-bold text-white mb-4">Success!</h2>
            <p className="text-slate-400 text-lg mb-10 leading-relaxed font-medium">Please collect your documents from the tray below.</p>
            <RippleButton
              onClick={() => { setCode(""); setState("input"); setProgress(0); }}
              className="px-10 py-4 rounded-2xl bg-slate-900 border border-slate-800 text-white font-bold hover:bg-slate-800 transition-all shadow-xl"
            >
              FINISH SESSION
            </RippleButton>
          </motion.div>
        )}

        {state === "error" && (
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="py-12 bg-red-500/5 rounded-[3rem] border border-red-500/20">
            <div className="w-20 h-20 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-6">
              <AlertCircle className="w-12 h-12 text-red-500" />
            </div>
            <h2 className="text-2xl font-display font-bold text-white mb-2">Oops!</h2>
            <p className="text-red-400 font-medium mb-8 px-6">{error}</p>
            <RippleButton
              onClick={() => setState("input")}
              className="px-8 py-3 rounded-xl bg-red-500 text-white font-bold shadow-lg shadow-red-500/20 hover:bg-red-400 transition-all"
            >
              TRY AGAIN
            </RippleButton>
          </motion.div>
        )}
      </div>
      {/* Maintenance Overlay */}
      {isMaintenance && (
        <motion.div 
          initial={{ opacity: 0 }} 
          animate={{ opacity: 1 }}
          className="fixed inset-0 z-[20000] bg-slate-950/95 backdrop-blur-xl flex flex-col items-center justify-center p-10 text-center"
        >
           <div className="w-32 h-32 rounded-full bg-amber-500/10 flex items-center justify-center mb-8 border border-amber-500/20">
              <AlertCircle className="w-16 h-16 text-amber-500 animate-pulse" />
           </div>
           <h2 className="text-4xl font-display font-black text-white mb-4 tracking-tight">Kiosk Offline</h2>
           <p className="max-w-md text-slate-400 text-lg leading-relaxed">{maintenanceMsg}</p>
           <div className="mt-12 flex items-center gap-2 text-slate-500 uppercase tracking-widest text-xs font-bold">
              <Loader2 className="w-4 h-4 animate-spin" />
              Retrying Hardware Link...
           </div>
        </motion.div>
      )}
    </PageTransition>
  );
};

export default KioskPage;
