import { motion } from "framer-motion";
import { useNavigate, useLocation } from "react-router-dom";
import { PageTransition } from "@/components/PageTransition";
import { GlowButton } from "@/components/GlowButton";
import { AnimatedCounter } from "@/components/AnimatedCounter";
import { useState } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";

interface ToggleOptionProps {
  label: string;
  options: string[];
  value: string;
  onChange: (val: string) => void;
}

const ToggleOption = ({ label, options, value, onChange }: ToggleOptionProps) => (
  <div className="flex items-center justify-between py-4">
    <span className="text-sm font-medium text-foreground">{label}</span>
    <div className="neumorphic-inset rounded-xl p-1 flex gap-1">
      {options.map((opt) => (
        <motion.button
          key={opt}
          onClick={() => onChange(opt)}
          className={`relative px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            value === opt ? "text-primary-foreground" : "text-muted-foreground"
          }`}
        >
          {value === opt && (
            <motion.div
              layoutId={`toggle-${label}`}
              className="absolute inset-0 gradient-hero rounded-lg"
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
            />
          )}
          <span className="relative z-10">{opt}</span>
        </motion.button>
      ))}
    </div>
  </div>
);

const ReviewPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const files = (location.state as any)?.files || [];
  const totalPages = files.reduce((a: number, f: any) => a + f.pages, 0);

  const [color, setColor] = useState("B&W");
  const [sided, setSided] = useState("Single");
  const [copies, setCopies] = useState(1);
  const [size, setSize] = useState("A4");

  const pricePerPage = color === "Color" ? 5 : 2;
  const sideMultiplier = sided === "Double" ? 0.6 : 1;
  const total = totalPages * pricePerPage * sideMultiplier * copies;

  return (
    <PageTransition className="min-h-screen gradient-mesh">
      <div className="max-w-xl mx-auto px-6 py-12">
        <button onClick={() => navigate("/upload")} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>

        <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-4xl font-display font-bold mb-2">
          Print Settings
        </motion.h1>
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }} className="text-muted-foreground mb-8">
          {files.length} file(s) · {totalPages} pages
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass-strong rounded-3xl p-6 divide-y divide-border"
        >
          <ToggleOption label="Color" options={["B&W", "Color"]} value={color} onChange={setColor} />
          <ToggleOption label="Sides" options={["Single", "Double"]} value={sided} onChange={setSided} />
          <ToggleOption label="Paper Size" options={["A4", "A3", "Letter"]} value={size} onChange={setSize} />

          <div className="flex items-center justify-between py-4">
            <span className="text-sm font-medium text-foreground">Copies</span>
            <div className="flex items-center gap-3">
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => setCopies(Math.max(1, copies - 1))}
                className="w-8 h-8 rounded-lg neumorphic flex items-center justify-center text-foreground font-semibold"
              >
                −
              </motion.button>
              <span className="w-8 text-center font-display font-semibold text-foreground">{copies}</span>
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => setCopies(copies + 1)}
                className="w-8 h-8 rounded-lg neumorphic flex items-center justify-center text-foreground font-semibold"
              >
                +
              </motion.button>
            </div>
          </div>
        </motion.div>

        {/* Price */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="glass-strong rounded-3xl p-6 mt-4 flex items-center justify-between"
        >
          <span className="text-muted-foreground font-medium">Total</span>
          <span className="text-3xl font-display font-bold text-foreground">
            <AnimatedCounter value={total} prefix="₹" decimals={0} />
          </span>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="mt-6 flex justify-end"
        >
          <GlowButton size="lg" onClick={() => navigate("/payment", { state: { total, files } })}>
            Pay & Print <ArrowRight className="w-4 h-4 inline ml-1" />
          </GlowButton>
        </motion.div>
      </div>
    </PageTransition>
  );
};

export default ReviewPage;
