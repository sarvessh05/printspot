import { motion } from "framer-motion";
import { ReactNode } from "react";

interface GlowButtonProps {
  children: ReactNode;
  onClick?: () => void;
  className?: string;
  size?: "default" | "lg";
}

export const GlowButton = ({ children, onClick, className = "", size = "default" }: GlowButtonProps) => {
  const isTouch = typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0);
  
  return (
    <motion.button
      onClick={onClick}
      className={`relative font-display font-semibold rounded-2xl bg-primary text-primary-foreground overflow-hidden ${
        size === "lg" ? "px-10 py-5 text-lg" : "px-6 py-3 text-sm"
      } ${className}`}
      whileHover={isTouch ? {} : { scale: 1.05, boxShadow: "0 0 40px hsl(221 83% 53% / 0.5), 0 0 80px hsl(221 83% 53% / 0.25)" }}
      whileTap={{ scale: 0.97 }}
      transition={{ type: "spring", stiffness: 400, damping: 17 }}
    >
      <motion.div
        className="absolute inset-0 gradient-hero opacity-0"
        whileHover={isTouch ? {} : { opacity: 1 }}
        transition={{ duration: 0.3 }}
      />
      <span className="relative z-10">{children}</span>
    </motion.button>
  );
};

