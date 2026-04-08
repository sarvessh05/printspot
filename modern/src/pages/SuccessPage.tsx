import { motion } from "framer-motion";
import { useLocation, useNavigate } from "react-router-dom";
import { PageTransition } from "@/components/PageTransition";
import { GlowButton } from "@/components/GlowButton";
import { CheckCircle, Copy, Info, ArrowLeft, Clock } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

const SuccessPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { otp, fileName = "Your Document" } = location.state || {};

  useEffect(() => {
    if (otp) {
      try {
        const savedOtps = JSON.parse(localStorage.getItem('saved_print_otps') || '[]');
        if (!savedOtps.find((item: any) => item.otp === otp)) {
          savedOtps.unshift({ otp, fileName, date: new Date().toLocaleDateString() });
          localStorage.setItem('saved_print_otps', JSON.stringify(savedOtps));
        }
      } catch (error) {
        console.error("Local storage error:", error);
      }
    }
  }, [otp, fileName]);

  const copyToClipboard = () => {
    if (otp) {
      navigator.clipboard.writeText(otp);
      toast.success("OTP Copied! Take a screenshot just in case.");
    }
  };

  if (!otp) {
    return (
      <PageTransition className="min-h-screen flex items-center justify-center p-6">
        <div className="glass-strong rounded-[2rem] p-8 max-w-sm w-full text-center">
          <Info className="w-12 h-12 text-destructive mx-auto mb-4" />
          <h2 className="text-2xl font-display font-bold mb-2">No Active Session</h2>
          <p className="text-muted-foreground mb-8">It seems you reached this page without a successful payment.</p>
          <GlowButton onClick={() => navigate("/")} className="w-full">
            Go Home
          </GlowButton>
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition className="min-h-screen gradient-mesh flex items-center justify-center p-6">
      <div className="max-w-md w-full">
        <motion.div
           initial={{ opacity: 0, scale: 0.9 }}
           animate={{ opacity: 1, scale: 1 }}
           className="glass-strong rounded-[2.5rem] p-8 md:p-10 text-center relative overflow-hidden"
        >
          {/* Success Animation Background */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-64 bg-primary/20 blur-[100px] -z-10" />

          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 300, delay: 0.2 }}
            className="w-20 h-20 rounded-full gradient-hero mx-auto flex items-center justify-center mb-6 shadow-2xl shadow-primary/40"
          >
            <CheckCircle className="w-10 h-10 text-primary-foreground" />
          </motion.div>

          <motion.h1 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-3xl font-display font-bold mb-2"
          >
            Payment Successful!
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="text-muted-foreground mb-8"
          >
            Your document is ready. Go to the PrintSpot kiosk and enter this OTP.
          </motion.p>

          {/* OTP Box */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="neumorphic-inset rounded-3xl p-8 mb-8 relative group"
          >
            <p className="text-[10px] font-bold tracking-[0.2em] text-primary/60 uppercase mb-4">Secret Print Code</p>
            <div className="flex justify-center gap-3">
              {otp.split('').map((char: string, i: number) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 + (i * 0.1) }}
                  className="w-10 h-14 glass flex items-center justify-center text-3xl font-display font-bold text-primary"
                >
                  {char}
                </motion.div>
              ))}
            </div>
            
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={copyToClipboard}
              className="absolute -bottom-4 left-1/2 -translate-x-1/2 bg-background border border-border px-4 py-2 rounded-full text-xs font-semibold shadow-lg flex items-center gap-2 hover:bg-muted transition-colors"
            >
              <Copy className="w-3.5 h-3.5" />
              Copy OTP
            </motion.button>
          </motion.div>

          {/* Warning Note */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.2 }}
            className="bg-primary/5 rounded-2xl p-4 mb-8 flex gap-3 text-left border border-primary/10"
          >
            <Info className="w-5 h-5 text-primary shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-bold text-foreground mb-1 text-primary">Pro Tip</p>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Take a screenshot now. If you lose this, find it in "Recent Prints" on the upload page.
              </p>
            </div>
          </motion.div>

          <GlowButton onClick={() => navigate("/upload")} size="lg" className="w-full">
            Print Another File
          </GlowButton>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5 }}
          className="text-center text-muted-foreground text-xs mt-8"
        >
          Need help? Call <span className="text-foreground font-medium">83560 41978</span>
        </motion.p>
      </div>
    </PageTransition>
  );
};

export default SuccessPage;
