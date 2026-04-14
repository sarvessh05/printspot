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
    initial={typeof window !== 'undefined' && window.innerWidth < 768 ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    className="w-full mb-8 text-left font-sans"
  >

    {/* Receipt Paper Effect Container */}
    <div className="relative bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl border border-white/40 dark:border-slate-800 overflow-hidden">
      {/* Decorative Top Accent */}
      <div className="h-2 w-full bg-primary" />
      
      <div className="p-8 pb-10">
        {/* Header Branding */}
        <div className="flex justify-between items-start mb-8">
          <div>
            <h3 className="text-2xl font-display font-black text-slate-900 dark:text-white leading-none tracking-tighter">Receipt</h3>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-2">PrintSpot Station #01</p>
          </div>
          <div className="text-right">
            <span className="inline-block text-[10px] font-black text-primary uppercase tracking-widest bg-primary/5 px-2.5 py-1 rounded-full border border-primary/10">
              Verified
            </span>
            <p className="text-[10px] text-slate-400 mt-2 font-medium">{new Date().toLocaleDateString()}</p>
          </div>
        </div>

        {/* OTP Section (If available - usually shown on SuccessPage but here as fallback) */}
        {otp && (
          <div className="bg-slate-50 dark:bg-slate-800/50 rounded-3xl p-6 text-center mb-10 border border-slate-100 dark:border-slate-700/50 group">
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 mb-2 group-hover:text-primary transition-colors">Your Order Code</p>
            <p className="text-5xl font-display font-black text-primary tracking-widest drop-shadow-sm">{otp}</p>
          </div>
        )}

        {/* Line Items Table */}
        <div className="space-y-6 mb-10">
          <div className="flex justify-between text-[10px] font-black text-slate-400 uppercase tracking-widest pb-3 border-b border-slate-50 dark:border-slate-800">
            <span>Description</span>
            <span>Total</span>
          </div>
          
          <div className="space-y-5 max-h-[300px] overflow-y-auto no-scrollbar pr-1">
            {files.map((file, i) => (
              <div key={i} className="group">
                <div className="flex justify-between items-start gap-6">
                  <div className="flex-grow">
                    <p className="text-sm font-black text-slate-800 dark:text-slate-200 line-clamp-1 group-hover:text-primary transition-colors">{file.name}</p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className="text-[10px] text-slate-400 font-bold uppercase pb-0.5 border-b border-transparent group-hover:border-slate-200 transition-all">
                        {file.pages} Pgs
                      </span>
                      <span className="text-slate-200 dark:text-slate-700">•</span>
                      <span className="text-[10px] text-slate-400 font-bold uppercase">
                        {file.copies} Qty
                      </span>
                      <span className="text-slate-200 dark:text-slate-700">•</span>
                      <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded ${file.mode === 'color' ? 'bg-orange-500/10 text-orange-600' : 'bg-slate-100 text-slate-500'}`}>
                        {file.mode === 'bw' ? 'B&W' : file.mode}
                      </span>
                    </div>
                  </div>
                  <p className="text-sm font-black text-slate-900 dark:text-white tabular-nums pt-0.5">₹{file.calculatedCost}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Calculation Summary */}
        <div className="space-y-4 pt-8 border-t-2 border-dashed border-slate-100 dark:border-slate-800 relative">
           {/* Decorative cutout circles at ends of dashed line */}
           <div className="absolute -left-[42px] top-[-10px] w-5 h-5 bg-background rounded-full dark:bg-slate-950" />
           <div className="absolute -right-[42px] top-[-10px] w-5 h-5 bg-background rounded-full dark:bg-slate-950" />

           <div className="flex justify-between items-center text-[11px] font-bold text-slate-500">
             <span className="uppercase tracking-widest opacity-60">Subtotal</span>
             <span className="tabular-nums">₹{total}</span>
           </div>
           <div className="flex justify-between items-center text-[11px] font-bold text-slate-500">
             <span className="uppercase tracking-widest opacity-60">Tax (GST Inclusive)</span>
             <span className="tabular-nums">₹0.00</span>
           </div>
           
           <div className="flex justify-between items-end pt-4">
             <div>
               <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">Total Amount</span>
               <div className="text-4xl font-display font-black text-slate-900 dark:text-white mt-1 leading-none tracking-tighter">
                 <span className="text-xl font-bold text-primary mr-1">₹</span>
                 {total}
               </div>
             </div>
             <div className="pb-1">
                <span className="text-[9px] font-bold text-slate-300 uppercase tracking-widest">Ink on Paper</span>
             </div>
           </div>
        </div>
      </div>
      
      {/* Footer / Trust Branding */}
      <div className="bg-slate-50 dark:bg-slate-800/30 px-8 py-5 flex items-center justify-between border-t border-slate-100 dark:border-slate-800">
         <div className="flex items-center gap-2">
           <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center shadow-lg shadow-primary/20">
             <Check className="w-3 h-3 text-white stroke-[4px]" />
           </div>
           <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Payment Secured</span>
         </div>
         <p className="text-[9px] font-black text-slate-400 italic">No File Retention</p>
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
    // Preload Razorpay script
    loadRazorpay();

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
