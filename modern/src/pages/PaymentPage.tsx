import { motion } from "framer-motion";
import { useNavigate, useLocation } from "react-router-dom";
import { PageTransition } from "@/components/PageTransition";
import { useState, useRef, useEffect } from "react";
import { ArrowLeft, Check, Loader2 } from "lucide-react";
import { GlowButton } from "@/components/GlowButton";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

const OTP_LENGTH = 6;

const PaymentPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { total = 0, files = [] } = location.state || {};
  
  const [step, setStep] = useState<"pay" | "processing" | "otp" | "success">("pay");
  const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(""));
  const [revealedDigits, setRevealedDigits] = useState(0);
  const [loadingMessage, setLoadingMessage] = useState("Initializing...");
  const [realOtp, setRealOtp] = useState("");
  
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const handlePay = async () => {
    // In Phase 1, we simulate Razorpay success but do REAL backend work
    setStep("processing");
    setLoadingMessage("Securing transaction...");
    
    try {
      const backendUrl = import.meta.env.VITE_EC2_IP || 'http://localhost:8080';
      
      // 1. Upload files to Supabase
      setLoadingMessage("Uploading documents to vault...");
      const orderResults = [];
      
      for (const fileItem of files) {
        const cleanFileName = fileItem.name.replace(/[\n\r]/g, '').replace(/[^a-zA-Z0-9.\-_]/g, '_');
        const uniqueName = `${Date.now()}_${cleanFileName}`;

        const { error: uploadError } = await supabase.storage.from('pdfs').upload(uniqueName, fileItem.fileObj);
        if (uploadError) throw uploadError;

        const { data: publicUrlData } = supabase.storage.from('pdfs').getPublicUrl(uniqueName);

        orderResults.push({
          file_name: cleanFileName,
          file_url: publicUrlData.publicUrl,
          copies: parseInt(fileItem.copies),
          mode: fileItem.mode,
          is_two_sided: fileItem.isTwoSided,
          print_range: fileItem.printRange === 'all' ? 'All Pages' : fileItem.customRangeString,
          total_pages: parseInt(fileItem.pages),
          total_amount: Math.round(total / files.length), // Simplified for now
          unique_name: uniqueName
        });
      }

      // 2. Create batch order
      setLoadingMessage("Generating your OTP...");
      const response = await fetch(`${backendUrl}/api/orders/create-batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: orderResults,
          razorpay_order_id: "simulated_" + Date.now(),
          razorpay_payment_id: "simulated_pay_" + Date.now(),
          razorpay_signature: "simulated_sig",
          total_grand_amount: Math.round(total)
        })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || "Server error");

      setRealOtp(data.otp);
      setStep("otp");
      
      // Animate OTP reveal
      let i = 0;
      const interval = setInterval(() => {
        i++;
        setRevealedDigits(i);
        if (i >= OTP_LENGTH) clearInterval(interval);
      }, 150);

    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Something went wrong");
      setStep("pay");
    }
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
    if (otp.join("") === realOtp) {
      setStep("success");
      setTimeout(() => navigate("/success", { state: { otp: realOtp, fileName: `${files.length} Documents` } }), 1500);
    } else {
       toast.error("Incorrect code. Please try again.");
       setOtp(Array(OTP_LENGTH).fill(""));
       inputRefs.current[0]?.focus();
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
            <div className="glass-strong rounded-[2.5rem] p-8 mb-6 border border-primary/10">
              <p className="text-sm text-muted-foreground mb-6">Secure checkout for {files.length} files</p>
              <GlowButton size="lg" onClick={handlePay} className="w-full h-14">
                Pay ₹{total}
              </GlowButton>
            </div>
            <button onClick={() => navigate(-1)} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="w-4 h-4 inline mr-1" /> Go back
            </button>
          </motion.div>
        )}

        {step === "processing" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center">
            <div className="w-20 h-20 rounded-full border-4 border-primary/20 border-t-primary animate-spin mx-auto mb-6" />
            <h2 className="text-2xl font-display font-bold mb-2">Processing Prints</h2>
            <p className="text-muted-foreground animate-pulse">{loadingMessage}</p>
          </motion.div>
        )}

        {step === "otp" && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center">
            <motion.div
              animate={{ boxShadow: ["0 0 20px hsl(var(--primary) / 0.1)", "0 0 40px hsl(var(--primary) / 0.2)", "0 0 20px hsl(var(--primary) / 0.1)"] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="glass-strong rounded-[2.5rem] p-8 md:p-10 border border-primary/20"
            >
              <h2 className="text-2xl font-display font-bold mb-2">Success!</h2>
              <p className="text-sm text-muted-foreground mb-8">Memorize this code to verify</p>

              <div className="flex justify-center gap-3 mb-10">
                {realOtp.split("").map((digit, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 20, scale: 0.5 }}
                    animate={i < revealedDigits ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: 20, scale: 0.5 }}
                    className="w-10 h-14 rounded-xl bg-primary/5 border border-primary/10 flex items-center justify-center font-display font-bold text-2xl text-primary"
                  >
                    {digit}
                  </motion.div>
                ))}
              </div>

              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em] mb-4">Enter Code to Continue</p>
              <div className="flex justify-center gap-2">
                {otp.map((d, i) => (
                  <input
                    key={i}
                    ref={(el) => { inputRefs.current[i] = el; }}
                    value={d}
                    onChange={(e) => handleOtpChange(i, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(i, e)}
                    maxLength={1}
                    className="w-10 h-12 rounded-xl glass text-center font-display font-bold text-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary transition-all shadow-inner"
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
              className="w-20 h-20 rounded-full gradient-hero mx-auto flex items-center justify-center mb-6 glow-strong"
            >
              <Check className="w-10 h-10 text-primary-foreground" />
            </motion.div>
            <h2 className="text-3xl font-display font-bold mb-2">Verified!</h2>
            <p className="text-muted-foreground">Saving your print code...</p>
          </motion.div>
        )}
      </div>
    </PageTransition>
  );
};

export default PaymentPage;
