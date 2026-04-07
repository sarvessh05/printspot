import { motion } from "framer-motion";
import { PageTransition } from "@/components/PageTransition";
import { RippleButton } from "@/components/RippleButton";
import { useState } from "react";
import { Printer, Delete } from "lucide-react";

type KioskState = "input" | "verifying" | "printing" | "done";

const KioskPage = () => {
  const [code, setCode] = useState("");
  const [state, setState] = useState<KioskState>("input");
  const [progress, setProgress] = useState(0);

  const handleKeyPress = (key: string) => {
    if (code.length < 6) setCode((prev) => prev + key);
  };

  const handleDelete = () => setCode((prev) => prev.slice(0, -1));

  const handleSubmit = () => {
    if (code.length !== 6) return;
    setState("verifying");
    setTimeout(() => {
      setState("printing");
      let p = 0;
      const interval = setInterval(() => {
        p += 5;
        setProgress(p);
        if (p >= 100) {
          clearInterval(interval);
          setTimeout(() => setState("done"), 500);
        }
      }, 100);
    }, 2000);
  };

  return (
    <PageTransition className="min-h-screen bg-foreground flex items-center justify-center">
      <div className="max-w-sm w-full mx-auto px-6 text-center">
        {/* Logo */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="w-14 h-14 rounded-2xl gradient-hero mx-auto flex items-center justify-center mb-4 glow">
            <Printer className="w-7 h-7 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-display font-bold text-primary-foreground">PrintSpot Kiosk</h1>
        </motion.div>

        {state === "input" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            {/* Code display */}
            <div className="flex justify-center gap-2 mb-8">
              {Array.from({ length: 6 }).map((_, i) => (
                <motion.div
                  key={i}
                  animate={code[i] ? { scale: [1.1, 1], borderColor: "hsl(221, 83%, 53%)" } : {}}
                  className="w-12 h-14 rounded-xl border-2 border-primary-foreground/20 flex items-center justify-center font-display text-2xl font-bold text-primary-foreground"
                >
                  {code[i] || ""}
                </motion.div>
              ))}
            </div>

            {/* Keypad */}
            <div className="grid grid-cols-3 gap-3 mb-4">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
                <RippleButton
                  key={n}
                  onClick={() => handleKeyPress(String(n))}
                  className="h-16 rounded-2xl bg-primary-foreground/10 text-primary-foreground font-display text-xl font-semibold hover:bg-primary-foreground/20 transition-colors"
                >
                  {n}
                </RippleButton>
              ))}
              <RippleButton onClick={handleDelete} className="h-16 rounded-2xl bg-primary-foreground/10 text-primary-foreground hover:bg-primary-foreground/20 transition-colors flex items-center justify-center">
                <Delete className="w-5 h-5" />
              </RippleButton>
              <RippleButton onClick={() => handleKeyPress("0")} className="h-16 rounded-2xl bg-primary-foreground/10 text-primary-foreground font-display text-xl font-semibold hover:bg-primary-foreground/20 transition-colors">
                0
              </RippleButton>
              <RippleButton
                onClick={handleSubmit}
                disabled={code.length !== 6}
                className={`h-16 rounded-2xl font-display font-semibold text-sm transition-colors ${
                  code.length === 6 ? "gradient-hero text-primary-foreground glow" : "bg-primary-foreground/5 text-primary-foreground/30"
                }`}
              >
                Print
              </RippleButton>
            </div>
          </motion.div>
        )}

        {state === "verifying" && (
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="py-12">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
              className="w-16 h-16 mx-auto rounded-full border-4 border-primary border-t-transparent mb-6"
            />
            <motion.p
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="text-primary-foreground/70 font-display"
            >
              Verifying code...
            </motion.p>
          </motion.div>
        )}

        {state === "printing" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-12">
            <p className="text-primary-foreground font-display font-semibold text-lg mb-6">Printing...</p>
            <div className="w-full h-3 rounded-full bg-primary-foreground/10 overflow-hidden">
              <motion.div
                className="h-full gradient-hero rounded-full"
                style={{ width: `${progress}%` }}
                transition={{ ease: "easeOut" }}
              />
            </div>
            <p className="text-primary-foreground/50 text-sm mt-3">{progress}%</p>
          </motion.div>
        )}

        {state === "done" && (
          <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="py-12">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 300 }}
              className="w-20 h-20 rounded-full gradient-hero mx-auto flex items-center justify-center mb-6 glow-strong"
            >
              <span className="text-3xl">✓</span>
            </motion.div>
            <h2 className="text-2xl font-display font-bold text-primary-foreground mb-2">Done!</h2>
            <p className="text-primary-foreground/50">Collect your prints below</p>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => { setCode(""); setState("input"); setProgress(0); }}
              className="mt-8 px-6 py-3 rounded-xl bg-primary-foreground/10 text-primary-foreground font-medium hover:bg-primary-foreground/20 transition-colors"
            >
              New Print
            </motion.button>
          </motion.div>
        )}
      </div>
    </PageTransition>
  );
};

export default KioskPage;
