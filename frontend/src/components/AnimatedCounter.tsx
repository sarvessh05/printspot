import { motion, useSpring, useTransform, useMotionValue } from "framer-motion";
import { useEffect } from "react";

interface AnimatedCounterProps {
  value: number;
  prefix?: string;
  suffix?: string;
  className?: string;
  decimals?: number;
}

export const AnimatedCounter = ({ value, prefix = "", suffix = "", className = "", decimals = 0 }: AnimatedCounterProps) => {
  const motionValue = useMotionValue(0);
  const spring = useSpring(motionValue, { stiffness: 100, damping: 30 });
  const display = useTransform(spring, (v) => `${prefix}${v.toFixed(decimals)}${suffix}`);

  useEffect(() => {
    motionValue.set(value);
  }, [value, motionValue]);

  return <motion.span className={className}>{display}</motion.span>;
};
