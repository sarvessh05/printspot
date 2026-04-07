import { motion } from "framer-motion";
import { useNavigate, useLocation } from "react-router-dom";
import { PageTransition } from "@/components/PageTransition";
import { useState, useRef, useEffect } from "react";
import { ArrowLeft, Check } from "lucide-react";
import { GlowButton } from "@/components/GlowButton";

const OTP_LENGTH = 6;

const PaymentPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const total = (location.state as any)?.total || 0;
  const [step, setStep] = useState<"pay" | "otp" | "success">("pay");
  const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(""));
  const [revealedDigits, setRevealedDigits] = useState(0);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const generatedOtp = useRef(
    Array.from({ length: OTP_LENGTH }, () => Math.floor(Math.random() * 10).toString()).join("")
  );

  const handlePay = () => {
    setStep("otp");
    // Digit-by-digit reveal
    let i = 0;
    const interval = setInterval(() => {
      i++;
      setRevealedDigits(i);
      if (i >= OTP_LENGTH) clearInterval(interval);
    }, 200);
  };

  const handleOtpChange = (idx: number, val: string) => {
    if (!/^\d?$/.test(val)) return;
    const next = [...otp];
    next[idx] = val;
    setOtp(next);
    if (val && idx < OTP_LENGTH - 1) inputRefs.current[idx + 1]?.focus();
  };

  const handleKeyDown = (idx: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !otp[idx] && idx > 0) inputRefs.current[idx - 1]?.focus();
  };

  const verifyOtp = () => {
    if (otp.join("") === generatedOtp.current) {
      setStep("success");
      setTimeout(() => navigate("/kiosk"), 2000);
    }
  };

  useEffect(() => {
    if (otp.every((d) => d !== "") && step === "otp") verifyOtp();
  }, [otp, step]);

  return (
    <PageTransition className="min-h-screen gradient-mesh flex items-center justify-center">
      <div className="max-w-md w-full mx-auto px-6">
        {step === "pay" && (
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="text-center">
            <h1 className="text-4xl font-display font-bold mb-2">Complete Payment</h1>
            <p className="text-muted-foreground mb-8">Amount: ₹{total}</p>
            <div className="glass-strong rounded-3xl p-8 mb-6">
              <p className="text-sm text-muted-foreground mb-6">Tap below to simulate payment</p>
              <GlowButton size="lg" onClick={handlePay} className="w-full">
                Pay ₹{total}
              </GlowButton>
            </div>
            <button onClick={() => navigate(-1)} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="w-4 h-4 inline mr-1" /> Go back
            </button>
          </motion.div>
        )}

        {step === "otp" && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center">
            <motion.div
              animate={{ boxShadow: ["0 0 20px hsl(221 83% 53% / 0.2)", "0 0 40px hsl(221 83% 53% / 0.4)", "0 0 20px hsl(221 83% 53% / 0.2)"] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="glass-strong rounded-3xl p-8"
            >
              <h2 className="text-2xl font-display font-bold mb-2">Your Print Code</h2>
              <p className="text-sm text-muted-foreground mb-6">Enter this at any kiosk</p>

              {/* Generated OTP display */}
              <div className="flex justify-center gap-3 mb-8">
                {generatedOtp.current.split("").map((digit, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 20, scale: 0.5 }}
                    animate={
                      i < revealedDigits
                        ? { opacity: 1, y: 0, scale: 1 }
                        : { opacity: 0, y: 20, scale: 0.5 }
                    }
                    transition={{ delay: i * 0.1, type: "spring", stiffness: 300 }}
                    className="w-12 h-14 rounded-xl bg-accent flex items-center justify-center font-display font-bold text-2xl text-primary"
                  >
                    {digit}
                  </motion.div>
                ))}
              </div>

              <p className="text-xs text-muted-foreground mb-4">Verify by entering the code below</p>

              {/* OTP Input */}
              <div className="flex justify-center gap-2">
                {otp.map((d, i) => (
                  <motion.input
                    key={i}
                    ref={(el) => { inputRefs.current[i] = el; }}
                    value={d}
                    onChange={(e) => handleOtpChange(i, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(i, e)}
                    maxLength={1}
                    className="w-10 h-12 rounded-lg neumorphic text-center font-display font-bold text-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    whileFocus={{ scale: 1.05 }}
                  />
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}

        {step === "success" && (
          <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 300, delay: 0.2 }}
              className="w-20 h-20 rounded-full gradient-hero mx-auto flex items-center justify-center mb-6 glow-strong"
            >
              <Check className="w-10 h-10 text-primary-foreground" />
            </motion.div>
            <h2 className="text-3xl font-display font-bold mb-2">Ready to Print!</h2>
            <p className="text-muted-foreground">Redirecting to kiosk...</p>
            {/* Subtle confetti */}
            {Array.from({ length: 20 }).map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-2 h-2 rounded-full"
                style={{
                  left: `${30 + Math.random() * 40}%`,
                  top: `${20 + Math.random() * 30}%`,
                  backgroundColor: ["hsl(221,83%,53%)", "hsl(199,89%,48%)", "hsl(210,100%,65%)"][i % 3],
                }}
                initial={{ opacity: 1, y: 0, scale: 0 }}
                animate={{ opacity: 0, y: 100 + Math.random() * 100, scale: 1, x: (Math.random() - 0.5) * 200 }}
                transition={{ duration: 1.5, delay: 0.3 + Math.random() * 0.5 }}
              />
            ))}
          </motion.div>
        )}
      </div>
    </PageTransition>
  );
};

export default PaymentPage;
