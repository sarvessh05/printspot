import { Phone } from "lucide-react";
import { motion } from "framer-motion";

const HelpButton = () => {
  return (
    <motion.a
      href="tel:8356041978"
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.9 }}
      className="fixed bottom-6 right-6 z-[9999] flex items-center gap-3 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border border-primary/20 shadow-2xl px-5 py-3 rounded-full hover:bg-white dark:hover:bg-slate-900 transition-all group"
    >
      <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center shadow-lg shadow-primary/30 group-hover:rotate-12 transition-transform">
        <Phone className="w-4 h-4 text-white" />
      </div>
      <div className="flex flex-col">
        <span className="text-[10px] font-black uppercase tracking-widest text-primary/60 leading-none mb-0.5">Need Help?</span>
        <span className="text-sm font-bold text-foreground">8356041978</span>
      </div>
    </motion.a>
  );
};

export default HelpButton;
