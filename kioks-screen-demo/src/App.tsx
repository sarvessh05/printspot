import { motion } from "framer-motion";
import { PageTransition } from "./components/PageTransition";
import { RippleButton } from "./components/RippleButton";
import { useState, useEffect, useRef } from "react";
import { Printer, Delete, Loader2, AlertCircle, Check } from "lucide-react";
import { Toaster, toast } from "sonner";

type KioskState = "landing" | "input" | "verifying" | "printing" | "done" | "error";

function App() {
  const [code, setCode] = useState("");
  const [state, setState] = useState<KioskState>("landing");
  const [progress, setProgress] = useState(0);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const resetIdleTimer = (duration = 120000) => {
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    
    idleTimerRef.current = setTimeout(() => {
      setCode("");
      setState("landing");
      setProgress(0);
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
    if (state === "done") {
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
    
    if (code !== "000000") {
      toast.error("Invalid OTP. Try 000000 for demo.");
      return;
    }

    setState("verifying");

    try {
      // Simulate API call for demo
      await new Promise(r => setTimeout(r, 2000));

      setState("printing");
      
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
      setState("error");
      toast.error("An error occurred during print", { duration: 5000 });
    }
  };

  return (
    <PageTransition className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-6 overflow-y-auto relative">
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
          <div className="w-20 h-20 rounded-[2rem] glass neo-blur p-4 shadow-2xl shadow-cyan-500/10 mb-6 flex items-center justify-center border border-white/50 cursor-default select-none transition-transform">
            <Printer className="w-10 h-10 text-cyan-500 animate-float" />
          </div>
          <h1 className="text-4xl font-display font-black text-slate-900 tracking-tight flex items-center gap-2">
            PrintKro <span className="text-cyan-500">Kiosk</span>
          </h1>
          <p className="text-slate-400 text-xs mt-2 uppercase tracking-[0.4em] font-bold">Hardware Testing Demo</p>
        </motion.div>

        {state === "landing" && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6 glass rounded-[2.5rem] p-8 shadow-2xl shadow-slate-200/50 border border-white/80"
          >
            <h2 className="text-2xl font-display font-black text-slate-900 mb-6">Select a Demo Screen</h2>
            <div className="flex flex-col gap-4">
              <RippleButton 
                onClick={() => { setState("input"); setCode(""); }}
                className="w-full h-16 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-display text-xl font-bold hover:shadow-lg hover:scale-[1.02] transition-all shadow-cyan-500/25 flex items-center justify-center"
              >
                Test OTP Flow
              </RippleButton>
              <RippleButton 
                onClick={() => setState("error")}
                className="w-full h-16 rounded-2xl bg-red-50 border border-red-100 text-red-500 font-display text-xl font-bold hover:bg-red-100 transition-all flex items-center justify-center"
              >
                Test Error Flow
              </RippleButton>
            </div>
          </motion.div>
        )}

        {state === "input" && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }}
            className="space-y-8"
          >
            <div className="flex justify-between items-center px-4">
               <span className="text-sm font-semibold text-slate-500">Type <span className="text-cyan-600">000000</span> for demo</span>
               <button 
                 onClick={() => setState("error")}
                 className="px-4 py-2 bg-red-50 text-red-500 rounded-full text-xs font-bold hover:bg-red-100 transition-colors"
               >
                 Go to Error Screen
               </button>
            </div>
            
            {/* Code display */}
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
            </div>
            
            <button 
              onClick={() => setState("landing")}
              className="text-slate-400 hover:text-slate-600 text-sm font-semibold transition-colors"
            >
               ← Back to Menu
            </button>
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
                onClick={() => { setCode(""); setState("landing"); setProgress(0); }}
                className="w-full py-5 rounded-2xl bg-slate-900 text-white font-black text-lg tracking-wider hover:bg-slate-800 transition-all shadow-xl shadow-slate-900/20 active:scale-95"
              >
                BACK TO MENU
              </RippleButton>
              <p className="text-slate-400 text-[10px] mt-6 uppercase tracking-widest font-bold">Auto-resets in 30 seconds</p>
            </div>
          </motion.div>
        )}

        {state === "error" && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }} 
            animate={{ opacity: 1, scale: 1 }} 
            className="py-16 glass rounded-[3rem] border border-red-100 shadow-2xl relative"
          >
             <div className="absolute top-4 right-4">
                 <button 
                   onClick={() => { setState("input"); setCode(""); }}
                   className="px-4 py-2 bg-cyan-50 text-cyan-600 rounded-full text-xs font-bold hover:bg-cyan-100 transition-colors"
                 >
                   Go to OTP Screen
                 </button>
             </div>
            <div className="w-24 h-24 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-8 border border-red-100 mt-4">
              <AlertCircle className="w-12 h-12 text-red-500" />
            </div>
            <h2 className="text-3xl font-display font-black text-slate-900 mb-4">Demo Error</h2>
            <p className="text-red-500 font-semibold mb-10 px-12 leading-relaxed">This is a simulated error for hardware testing.</p>
            
            <div className="px-12 flex flex-col gap-3">
              <RippleButton
                onClick={() => { setState("landing"); setCode(""); }}
                className="px-12 py-4 rounded-2xl bg-red-500 text-white font-black text-lg shadow-xl shadow-red-500/20 hover:bg-red-600 transition-all active:scale-95"
              >
                BACK TO MENU
              </RippleButton>
            </div>
          </motion.div>
        )}
      </div>
    </PageTransition>
  );
}

export default App;
