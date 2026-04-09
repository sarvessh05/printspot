import { motion } from "framer-motion";
import { useNavigate, useLocation } from "react-router-dom";
import { PageTransition } from "@/components/PageTransition";
import { useState, useRef, useEffect } from "react";
import { ArrowLeft, Check, Loader2 } from "lucide-react";
import { GlowButton } from "@/components/GlowButton";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

const OTP_LENGTH = 6;

// Add this declaration at the top level
declare global {
  interface Window {
    Razorpay: any;
  }
}

const PaymentPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { total = 0, files = [] } = location.state || {};
  
  const [step, setStep] = useState<"pay" | "processing" | "otp" | "success">("pay");
  const [loadingMessage, setLoadingMessage] = useState("Initializing...");
  const [realOtp, setRealOtp] = useState("");
  const [revealedDigits, setRevealedDigits] = useState(0);

  const loadRazorpay = () => {
    return new Promise((resolve) => {
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handlePay = async () => {
    setLoadingMessage("Initializing Razorpay...");
    
    try {
      const backendUrl = import.meta.env.VITE_EC2_IP || 'http://localhost:8080';
      const razorpayKey = import.meta.env.VITE_RAZORPAY_KEY_ID;

      // 1. Load Razorpay Script
      const isLoaded = await loadRazorpay();
      if (!isLoaded) {
        toast.error("Razorpay SDK failed to load. Are you online?");
        return;
      }

      // 2. Create Order on Backend
      const orderResponse = await fetch(`${backendUrl}/api/payments/create-order`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: total }),
      });
      const rzpOrder = await orderResponse.json();

      if (!orderResponse.ok) throw new Error(rzpOrder.detail || "Failed to create order");

      // 3. Open Razorpay Checkout
      const options = {
        key: razorpayKey,
        amount: rzpOrder.amount,
        currency: rzpOrder.currency,
        name: "PrintSpot Kiosk",
        description: `Payment for ${files.length} documents`,
        order_id: rzpOrder.id,
        handler: async (response: any) => {
          setStep("processing");
          setLoadingMessage("Verifying payment...");
          
          try {
            // 4. Upload files to Supabase upon successful payment
            setLoadingMessage("Securing your documents...");
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
                total_amount: Math.round(total / files.length),
                unique_name: uniqueName,
                color_pages: fileItem.colorPagesString,
                paper_size: fileItem.paperSize || "a4"
              });
            }

            // 5. Create batch order on backend (which verifies signature)
            setLoadingMessage("Finalizing order...");
            const batchResponse = await fetch(`${backendUrl}/api/orders/create-batch`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                items: orderResults,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                total_grand_amount: Math.round(total)
              })
            });

            const data = await batchResponse.json();
            if (!batchResponse.ok) throw new Error(data.detail || "Verification failed");

            setRealOtp(data.otp);
            setStep("otp");
            
            // Animate OTP reveal
            let i = 0;
            const interval = setInterval(() => {
              i++;
              setRevealedDigits(i);
              if (i >= OTP_LENGTH) clearInterval(interval);
            }, 150);

          } catch (verifyErr: any) {
            console.error(verifyErr);
            toast.error(verifyErr.message || "Finalization failed. Contact support with Payment ID: " + response.razorpay_payment_id);
            setStep("pay");
          }
        },
        prefill: {
          name: "Kiosk User",
          email: "kiosk@printspot.com",
          contact: "9999999999",
        },
        theme: {
          color: "#6366f1",
        },
      };

      const rzp1 = new window.Razorpay(options);
      rzp1.on('payment.failed', function (response: any) {
        toast.error("Payment failed: " + response.error.description);
      });
      rzp1.open();

    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Something went wrong initializing payment");
      setStep("pay");
    }
  };

  useEffect(() => {
    if (step === "success") {
      const timer = setTimeout(() => {
        navigate("/success", { state: { otp: realOtp } });
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [step, navigate, realOtp]);

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
              className="glass-strong rounded-[3rem] p-10 md:p-12 border border-primary/20 relative overflow-hidden"
            >
              {/* Critical Warning Banner */}
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 mb-8 flex items-center gap-4 text-left">
                <div className="w-10 h-10 rounded-full bg-amber-500 flex items-center justify-center shrink-0">
                  <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <div>
                  <p className="text-amber-600 dark:text-amber-400 font-black text-xs uppercase tracking-wider">Unmanned Kiosk Reminder</p>
                  <p className="text-sm font-medium leading-tight">Take a screenshot or memorise this code. You <b>CANNOT</b> print without it.</p>
                </div>
              </div>

              <h2 className="text-3xl font-display font-bold mb-2">Order Confirmed!</h2>
              <p className="text-sm text-muted-foreground mb-10 italic">Your digital print ticket is ready</p>

              <div className="flex justify-center gap-3 mb-10">
                {realOtp.split("").map((digit, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 20, scale: 0.5 }}
                    animate={i < revealedDigits ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: 20, scale: 0.5 }}
                    className="w-12 h-16 rounded-2xl bg-primary/5 border-2 border-primary/20 flex items-center justify-center font-display font-black text-3xl text-primary shadow-inner"
                  >
                    {digit}
                  </motion.div>
                ))}
              </div>

              <div className="space-y-4">
                <GlowButton 
                  size="lg" 
                  onClick={() => setStep("success")} 
                  className="w-full h-14 text-lg font-bold shadow-xl"
                >
                  I've Saved the Code
                </GlowButton>
                
                <button 
                  onClick={() => window.print()} 
                  className="text-xs font-bold text-muted-foreground hover:text-primary transition-colors flex items-center justify-center gap-2 mx-auto"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  Save as Digital Receipt
                </button>
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
