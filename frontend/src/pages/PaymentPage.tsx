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

const Receipt = ({ total, files, otp }: { total: number, files: any[], otp?: string }) => (
  <motion.div 
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    className="w-full mb-8 text-left"
  >
    {otp && (
      <div className="bg-primary text-white p-6 rounded-3xl text-center mb-6 shadow-xl shadow-primary/20">
        <p className="text-[10px] font-black uppercase tracking-widest opacity-80 mb-1">Your Print Code</p>
        <p className="text-4xl font-black tracking-wider">{otp}</p>
      </div>
    )}

    <div className="glass-strong rounded-[2rem] border border-primary/10 overflow-hidden divide-y divide-primary/5">
      <div className="bg-primary/5 px-6 py-4">
        <h3 className="text-xs font-black uppercase tracking-widest text-primary/60">Order Breakdown</h3>
      </div>
      <div className="px-6 py-4 space-y-4 max-h-[250px] overflow-y-auto no-scrollbar">
        {files.map((file, i) => (
          <div key={i} className="flex justify-between items-start gap-4">
            <div className="flex-grow">
              <p className="text-sm font-bold text-foreground line-clamp-1 truncate max-w-[200px]">{file.name}</p>
              <p className="text-[10px] text-muted-foreground font-medium uppercase truncate">
                {file.pages} Pgs · {file.copies} Qty · {file.mode}
              </p>
            </div>
            <span className="text-sm font-black text-foreground">₹{file.calculatedCost}</span>
          </div>
        ))}
      </div>
      <div className="bg-primary/5 px-6 py-5 flex justify-between items-center">
        <span className="text-sm font-bold text-muted-foreground">Grand Total</span>
        <span className="text-2xl font-black text-primary">₹{total}</span>
      </div>
    </div>
  </motion.div>
);


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
                total_amount: fileItem.calculatedCost,
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

            // Save to local history for 36h persistence
            const savedOtps = JSON.parse(localStorage.getItem('saved_print_otps') || '[]');
            const newOtpEntry = {
              otp: data.otp,
              timestamp: Date.now(),
              date: new Date().toLocaleString(),
              fileName: files[0]?.name || "Print Job",
              count: files.length
            };
            localStorage.setItem('saved_print_otps', JSON.stringify([newOtpEntry, ...savedOtps]));

            navigate("/success", { state: { otp: data.otp } });

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
    <PageTransition className="min-h-screen gradient-mesh flex items-center justify-center py-12">
      <div className="max-w-md w-full mx-auto px-6">
        {step === "pay" && (
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="text-center">
            <h1 className="text-4xl font-display font-bold mb-2">Final Bill</h1>
            <p className="text-muted-foreground mb-4">Review your print order</p>
            
            <Receipt total={total} files={files} />

            <div className="glass-strong rounded-[2.5rem] p-6 mb-6 border border-primary/10">
              <GlowButton size="lg" onClick={handlePay} className="w-full h-14">
                Secure Payment
              </GlowButton>
            </div>
            <button onClick={() => navigate(-1)} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="w-4 h-4 inline mr-1" /> Edit Order
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
