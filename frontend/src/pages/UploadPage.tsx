import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { PageTransition } from "@/components/PageTransition";
import { useState, useCallback, useEffect } from "react";
import { Upload, FileText, X, ArrowRight, ArrowLeft, Shield, Zap, Lock, Cloud, Clock, Copy } from "lucide-react";
import { GlowButton } from "@/components/GlowButton";
import { AnimatedCounter } from "@/components/AnimatedCounter";
import { countPagesFast, convertImageToPdf } from "@/lib/pdf-utils";
import { toast } from "sonner";

interface UploadedFile {
  id: string;
  name: string;
  size: number;
  pages: number;
  fileObj: File;
  mode: "bw" | "color";
  copies: number;
  isTwoSided: boolean;
  originalPageCount: number;
}

const floatingShapes = [
  { x: "10%", y: "20%", size: 80, delay: 0, duration: 6 },
  { x: "85%", y: "15%", size: 60, delay: 1, duration: 8 },
  { x: "70%", y: "70%", size: 100, delay: 2, duration: 7 },
  { x: "15%", y: "75%", size: 50, delay: 0.5, duration: 9 },
  { x: "50%", y: "10%", size: 40, delay: 1.5, duration: 5 },
];

const trustFeatures = [
  {
    icon: Shield,
    title: "Zero Retention",
    desc: "Files auto-deleted after printing. Nothing stored. Ever.",
    gradient: "from-primary to-blue-400",
  },
  {
    icon: Zap,
    title: "Instant Processing",
    desc: "Lightning-fast conversion. Your prints ready in seconds.",
    gradient: "from-blue-400 to-cyan-400",
  },
  {
    icon: Lock,
    title: "End-to-End Encrypted",
    desc: "Military-grade encryption from upload to print.",
    gradient: "from-cyan-400 to-primary",
  },
];

const UploadPage = () => {
  const navigate = useNavigate();
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isAbsorbing, setIsAbsorbing] = useState(false);
  const [pricing, setPricing] = useState({ bw: 2, color: 10, double_sided_discount: 0 });
  const [recentOtps, setRecentOtps] = useState<any[]>([]);

  useEffect(() => {
    // Ported from legacy: Fetch pricing
    const backendUrl = import.meta.env.VITE_EC2_IP || 'http://localhost:8080';
    fetch(`${backendUrl}/api/settings/pricing`)
      .then(res => res.json())
      .then(data => setPricing(data))
      .catch(err => console.log("Pricing fetch error", err));
    
    const otps = JSON.parse(localStorage.getItem('saved_print_otps') || '[]');
    setRecentOtps(otps);
  }, []);

  const handleFiles = useCallback(async (fileList: FileList) => {
    const SESSION_LIMIT = 50 * 1024 * 1024; // 50MB Total Session Limit
    
    if (files.length + fileList.length > 30) {
      toast.error("Maximum 30 documents allowed per session.");
      return;
    }

    setIsAbsorbing(true);
    const processedFiles: UploadedFile[] = [];
    let currentSessionSize = files.reduce((acc, f) => acc + f.size, 0);
    
    for (const f of Array.from(fileList)) {
      // 1. Duplicate check (Name & Size)
      const isDuplicate = files.some(existing => existing.name === f.name && existing.size === f.size) ||
                         processedFiles.some(p => p.name === f.name && p.size === f.size);
      
      if (isDuplicate) {
        toast.warning(`"${f.name}" is already in your selection.`);
        continue;
      }

      // 2. Session Size Limit check
      if (currentSessionSize + f.size > SESSION_LIMIT) {
        toast.error(`"${f.name}" exceeds session capacity. Total limit is 50MB.`);
        break; // Stop processing further files if limit reached
      }

      let finalFile = f;
      let pageCount = 1;

      if (f.type === 'application/pdf') {
        pageCount = await countPagesFast(f);
      } else if (f.type.startsWith('image/')) {
        try {
          finalFile = await convertImageToPdf(f);
          pageCount = 1;
        } catch (err) {
          console.error("Image processing error", err);
          continue;
        }
      }

      processedFiles.push({
        id: Math.random().toString(36).substring(7),
        name: finalFile.name,
        size: finalFile.size,
        pages: pageCount,
        fileObj: finalFile,
        mode: "bw",
        copies: 1,
        isTwoSided: false,
        originalPageCount: pageCount
      });

      currentSessionSize += finalFile.size;
    }

    if (processedFiles.length > 0) {
      setFiles((prev) => [...prev, ...processedFiles]);
    }
    setIsAbsorbing(false);
  }, [files]);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      if (e.dataTransfer.files.length) handleFiles(e.dataTransfer.files);
    },
    [handleFiles]
  );

  const removeFile = (idx: number) => setFiles((prev) => prev.filter((_, i) => i !== idx));

  const totalPages = files.reduce((a, f) => a + f.pages, 0);

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / 1048576).toFixed(1) + " MB";
  };

  return (
    <PageTransition className="min-h-screen gradient-mesh relative overflow-hidden">
      {/* Floating background shapes */}
      {floatingShapes.map((shape, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full opacity-[0.04] bg-primary pointer-events-none"
          style={{ left: shape.x, top: shape.y, width: shape.size, height: shape.size }}
          animate={{
            y: [0, -20, 0],
            x: [0, 10, 0],
            scale: [1, 1.1, 1],
          }}
          transition={{
            duration: shape.duration,
            repeat: Infinity,
            delay: shape.delay,
            ease: "easeInOut",
          }}
        />
      ))}

      <div className="max-w-4xl mx-auto px-6 py-12 relative z-10">
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8 group"
        >
          <motion.span whileHover={{ x: -3 }} transition={{ type: "spring", stiffness: 300 }}>
            <ArrowLeft className="w-4 h-4" />
          </motion.span>
          Back
        </button>

        {/* Header with animated accent */}
        <div className="text-center mb-12">
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 20 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass text-xs font-medium text-primary mb-6"
          >
            <Cloud className="w-3.5 h-3.5" />
            Secure cloud printing
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="text-5xl md:text-6xl font-display font-bold mb-4"
          >
            Upload your{" "}
            <span className="text-gradient">files</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-muted-foreground text-lg max-w-md mx-auto"
          >
            Drag & drop or click to browse. We handle the rest.
          </motion.p>
        </div>

        {/* Drop zone — redesigned */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => {
            const input = document.createElement("input");
            input.type = "file";
            input.multiple = true;
            input.accept = ".pdf,.docx,.doc,.png,.jpg,.jpeg";
            input.onchange = (e) => {
              const target = e.target as HTMLInputElement;
              if (target.files) handleFiles(target.files);
            };
            input.click();
          }}
          className="relative cursor-pointer group"
        >
          {/* Glow ring behind */}
          <motion.div
            className="absolute -inset-1 rounded-[2rem] bg-gradient-to-r from-primary/20 via-blue-400/20 to-cyan-400/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-700"
            animate={isDragging ? { opacity: 1, scale: 1.02 } : {}}
          />

          <motion.div
            animate={{
              scale: isDragging ? 1.02 : 1,
              borderColor: isDragging ? "hsl(221, 83%, 53%)" : "hsl(214, 32%, 91%)",
            }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className={`relative glass rounded-[2rem] border-2 border-dashed p-12 md:p-16 flex flex-col items-center justify-center overflow-hidden ${
              isAbsorbing ? "animate-pulse-glow" : ""
            }`}
          >
            {/* Animated background mesh inside drop zone */}
            <div className="absolute inset-0 opacity-30">
              <motion.div
                className="absolute w-40 h-40 rounded-full bg-primary/10 blur-3xl"
                animate={{ x: [0, 50, 0], y: [0, -30, 0] }}
                transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
                style={{ top: "10%", left: "20%" }}
              />
              <motion.div
                className="absolute w-32 h-32 rounded-full bg-accent-foreground/5 blur-3xl"
                animate={{ x: [0, -40, 0], y: [0, 20, 0] }}
                transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                style={{ bottom: "10%", right: "15%" }}
              />
            </div>

            <AnimatePresence mode="wait">
              {isAbsorbing ? (
                <motion.div
                  key="absorbing"
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.8, opacity: 0 }}
                  className="flex flex-col items-center relative z-10"
                >
                  <motion.div
                    className="relative w-16 h-16"
                  >
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
                      className="w-16 h-16 rounded-full border-4 border-primary/30 border-t-primary"
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Upload className="w-6 h-6 text-primary" />
                    </div>
                  </motion.div>
                  <p className="mt-6 text-sm font-medium text-foreground">Processing your files...</p>
                  <p className="text-xs text-muted-foreground mt-1">This won't take long</p>
                </motion.div>
              ) : (
                <motion.div
                  key="idle"
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.8, opacity: 0 }}
                  className="flex flex-col items-center relative z-10"
                >
                  <motion.div
                    animate={{ y: [0, -8, 0] }}
                    transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                    className="relative"
                  >
                    <div className="w-20 h-20 rounded-3xl gradient-hero flex items-center justify-center shadow-lg">
                      <Upload className="w-9 h-9 text-primary-foreground" />
                    </div>
                    {/* Pulse rings */}
                    <motion.div
                      className="absolute inset-0 rounded-3xl border-2 border-primary/30"
                      animate={{ scale: [1, 1.4], opacity: [0.5, 0] }}
                      transition={{ duration: 2, repeat: Infinity, ease: "easeOut" }}
                    />
                    <motion.div
                      className="absolute inset-0 rounded-3xl border-2 border-primary/20"
                      animate={{ scale: [1, 1.7], opacity: [0.3, 0] }}
                      transition={{ duration: 2, repeat: Infinity, ease: "easeOut", delay: 0.5 }}
                    />
                  </motion.div>
                  <p className="font-display font-bold text-lg text-foreground mt-6">
                    Drop files here
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    or <span className="text-primary font-medium underline underline-offset-4 decoration-primary/40">browse</span> your device
                  </p>
                  <div className="flex items-center gap-3 mt-4">
                    {["PDF", "DOCX", "PNG", "JPG"].map((fmt) => (
                      <span
                        key={fmt}
                        className="text-[10px] font-bold tracking-wider text-muted-foreground/70 bg-muted/60 px-2.5 py-1 rounded-full"
                      >
                        {fmt}
                      </span>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </motion.div>

        {/* File list */}
        <AnimatePresence>
          {files.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="mt-8 space-y-3"
            >
              {files.map((file, idx) => (
                <motion.div
                  key={`${file.name}-${idx}`}
                  initial={{ opacity: 0, x: -20, scale: 0.95 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  exit={{ opacity: 0, x: 20, scale: 0.95 }}
                  transition={{ delay: idx * 0.05, type: "spring", stiffness: 300, damping: 25 }}
                  className="glass-strong rounded-2xl p-4 flex items-center justify-between group hover:shadow-lg transition-shadow duration-300"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl gradient-hero flex items-center justify-center shadow-md">
                      <FileText className="w-5 h-5 text-primary-foreground" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground truncate max-w-[240px]">{file.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {file.pages} pages · {formatSize(file.size)}
                      </p>
                    </div>
                  </div>
                  <motion.button
                    onClick={(e) => { e.stopPropagation(); removeFile(idx); }}
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    <X className="w-4 h-4" />
                  </motion.button>
                </motion.div>
              ))}

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center justify-between pt-6"
              >
                <div className="text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">{files.length} file{files.length > 1 ? "s" : ""}</span>
                  {" · "}
                  <AnimatedCounter value={totalPages} className="font-semibold text-primary" /> pages total
                </div>
                <GlowButton onClick={() => navigate("/review", { state: { files, pricing } })} size="lg">
                  Continue <ArrowRight className="w-4 h-4 inline ml-1" />
                </GlowButton>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Recent Prints - Ported from legacy */}
        <AnimatePresence>
          {recentOtps.length > 0 && files.length === 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-12 glass-strong rounded-3xl p-6 relative overflow-hidden"
            >
              <div className="flex items-center gap-2 text-sm font-semibold text-primary mb-4">
                <Clock className="w-4 h-4" />
                Recent Prints
              </div>
              <div className="space-y-3">
                {recentOtps.slice(0, 3).map((item, idx) => (
                  <div key={idx} className="flex justify-between align-items-center p-3 glass rounded-xl border border-primary/5 hover:border-primary/20 transition-colors">
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-foreground truncate max-w-[200px]">{item.fileName}</span>
                      <span className="text-[10px] text-muted-foreground">{item.date}</span>
                    </div>
                    <div className="flex items-center gap-2">
                       <span className="text-xs font-bold text-primary tracking-wider">{item.otp}</span>
                       <button 
                         onClick={() => {
                           navigator.clipboard.writeText(item.otp);
                           toast.success("OTP Copied!");
                         }}
                         className="p-1.5 hover:bg-primary/10 rounded-lg text-primary transition-colors"
                       >
                         <Copy className="w-3.5 h-3.5" />
                       </button>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Trust cards */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.6 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-16"
        >
          {trustFeatures.map((feature, i) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 + i * 0.15 }}
              whileHover={{ y: -4, transition: { type: "spring", stiffness: 300 } }}
              className="glass-strong rounded-2xl p-6 group cursor-default relative overflow-hidden"
            >
              {/* Subtle gradient overlay on hover */}
              <motion.div
                className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} opacity-0 group-hover:opacity-[0.04] transition-opacity duration-500`}
              />

              <div className="relative z-10">
                <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center mb-4 shadow-lg`}>
                  <feature.icon className="w-5 h-5 text-primary-foreground" />
                </div>
                <h3 className="font-display font-bold text-foreground text-base mb-1.5">{feature.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{feature.desc}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </PageTransition>
  );
};

export default UploadPage;
