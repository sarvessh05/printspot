import { Phone, MessageCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";

import { useLocation } from "react-router-dom";

const HelpButton = () => {
  const [isExpanded, setIsExpanded] = useState(true);
  const location = useLocation();

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsExpanded(false);
    }, 15000); // 15 seconds

    return () => clearTimeout(timer);
  }, []);

  // Hide help button on Review and Payment pages as requested
  const hiddenRoutes = ["/review", "/payment"];
  if (hiddenRoutes.includes(location.pathname)) {
    return null;
  }

  const toggleExpand = (e: React.MouseEvent) => {
    if (!isExpanded) {
      e.preventDefault();
      setIsExpanded(true);
      // Reset timer if we want it to hide again after 15s of being expanded
      setTimeout(() => setIsExpanded(false), 15000);
    }
  };

  return (
    <motion.div
      className="fixed bottom-6 right-6 z-[9999]"
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
    >
      <AnimatePresence mode="wait">
        {isExpanded ? (
          <motion.a
            key="expanded"
            href="tel:8356041978"
            initial={{ width: 60, opacity: 0 }}
            animate={{ width: "auto", opacity: 1 }}
            exit={{ width: 60, opacity: 0 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="flex items-center gap-3 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-primary/20 shadow-2xl px-5 py-3 rounded-full hover:bg-white dark:hover:bg-slate-900 transition-all group"
          >
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center shadow-lg shadow-primary/30 group-hover:rotate-12 transition-transform">
              <Phone className="w-4 h-4 text-white" />
            </div>
            <div className="flex flex-col whitespace-nowrap">
              <span className="text-[10px] font-black uppercase tracking-widest text-primary/60 leading-none mb-0.5">Need Help?</span>
              <span className="text-sm font-bold text-foreground">8356041978</span>
            </div>
            <button 
              onClick={(e) => {
                e.preventDefault();
                setIsExpanded(false);
              }}
              aria-label="Minimize help info"
              className="ml-2 text-muted-foreground hover:text-foreground p-2 min-w-[24px] min-h-[24px] flex items-center justify-center"
            >
              <span className="text-sm">×</span>
            </button>
          </motion.a>
        ) : (
          <motion.button
            key="collapsed"
            onClick={toggleExpand}
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.5, opacity: 0 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            className="w-14 h-14 rounded-full bg-primary flex items-center justify-center shadow-2xl shadow-primary/40 border-4 border-white dark:border-slate-800 text-white"
          >
            <MessageCircle className="w-6 h-6 animate-pulse" />
          </motion.button>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default HelpButton;

