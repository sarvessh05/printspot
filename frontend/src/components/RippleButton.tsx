import { motion, AnimatePresence } from "framer-motion";
import { ReactNode, useState, useCallback } from "react";

interface Ripple {
  id: number;
  x: number;
  y: number;
}

interface RippleButtonProps {
  children: ReactNode;
  onClick?: () => void;
  className?: string;
  disabled?: boolean;
}

export const RippleButton = ({ children, onClick, className = "", disabled }: RippleButtonProps) => {
  const [ripples, setRipples] = useState<Ripple[]>([]);

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const ripple = {
        id: Date.now(),
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
      setRipples((prev) => [...prev, ripple]);
      setTimeout(() => setRipples((prev) => prev.filter((r) => r.id !== ripple.id)), 600);
      onClick?.();
    },
    [onClick]
  );

  return (
    <motion.button
      onClick={handleClick}
      disabled={disabled}
      className={`relative overflow-hidden ${className}`}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      {ripples.map((ripple) => (
        <motion.span
          key={ripple.id}
          className="absolute rounded-full bg-primary/30 pointer-events-none"
          style={{ left: ripple.x, top: ripple.y, width: 10, height: 10, marginLeft: -5, marginTop: -5 }}
          animate={{ scale: [0, 4], opacity: [0.6, 0] }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        />
      ))}
      {children}
    </motion.button>
  );
};
