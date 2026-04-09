import { motion } from "framer-motion";
import { Check, ArrowRight, Printer, Scissors, Smartphone } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { PageTransition } from "@/components/PageTransition";
import { GlowButton } from "@/components/GlowButton";

const SuccessPage = () => {
  const navigate = useNavigate();

  const location = useLocation();
  const { otp = "000000" } = location.state || {};

  const steps = [
    { icon: <Printer className="w-6 h-6" />, text: "Locate the physical kiosk screen" },
    { icon: <Scissors className="w-6 h-6" />, text: "Tap 'Enter Code' on the kiosk" },
    { icon: <Smartphone className="w-6 h-6" />, text: "Type your order code: " + otp },
  ];

  return (
    <PageTransition className="min-h-screen gradient-mesh flex items-center justify-center py-12 px-6">
      <div className="max-w-md w-full text-center">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", damping: 12 }}
          className="w-24 h-24 rounded-full gradient-hero mx-auto flex items-center justify-center mb-8 glow-strong"
        >
          <Check className="w-12 h-12 text-white" />
        </motion.div>

        <h1 className="text-4xl font-display font-bold mb-2 tracking-tight">You're All Set!</h1>
        <div className="mb-8">
           <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary/60 mb-2">Your Order Code</p>
           <div className="text-5xl font-display font-black tracking-widest text-primary drop-shadow-sm">
             {otp}
           </div>
        </div>
        
        <p className="text-muted-foreground mb-12">Visit any PrintSpot kiosk and enter this code to begin printing.</p>

        <div className="glass-strong rounded-[2.5rem] p-8 border border-primary/10 mb-10 text-left">
          <h2 className="text-sm font-black uppercase tracking-widest text-primary mb-6">What to do next?</h2>
          <div className="space-y-6">
            {steps.map((step, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 + i * 0.1 }}
                className="flex items-center gap-4"
              >
                <div className="w-10 h-10 rounded-xl bg-primary/5 border border-primary/10 flex items-center justify-center text-primary shrink-0">
                  {step.icon}
                </div>
                <p className="text-sm font-medium text-foreground/80">{step.text}</p>
              </motion.div>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <GlowButton size="lg" onClick={() => navigate("/")} className="w-full h-14 group">
            Done & Finish
            <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
          </GlowButton>
          <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">Thank you for using PrintKro</p>
        </div>
      </div>
    </PageTransition>
  );
};

export default SuccessPage;
