import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { PageTransition } from "@/components/PageTransition";
import { Particles } from "@/components/Particles";
import { GlowButton } from "@/components/GlowButton";
import { Zap, Shield, Clock, FileText, Image as ImageIcon, Presentation, Table, File } from "lucide-react";
import { Footer } from "@/components/Footer";
import { useState, useEffect } from "react";

const features = [
  { icon: Zap, title: "Instant Printing", desc: "Upload and print in under 60 seconds" },
  { icon: Shield, title: "Secure & Private", desc: "Files are deleted after printing" },
  { icon: Clock, title: "24/7 Available", desc: "Print anytime at any kiosk" },
];

const supportedFormats = [
  { name: "PDF", icon: File, color: "text-red-500", bg: "bg-red-500/10 dark:bg-red-500/20" },
  { name: "DOCX", icon: FileText, color: "text-blue-500", bg: "bg-blue-500/10 dark:bg-blue-500/20" },
  { name: "PPTX", icon: Presentation, color: "text-orange-500", bg: "bg-orange-500/10 dark:bg-orange-500/20" },
  { name: "XLSX", icon: Table, color: "text-green-500", bg: "bg-green-500/10 dark:bg-green-500/20" },
  { name: "Images", icon: ImageIcon, color: "text-purple-500", bg: "bg-purple-500/10 dark:bg-purple-500/20" },
];

const LandingPage = () => {
  const navigate = useNavigate();
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Animation variants that are simpler on mobile
  const fadeInUp = {
    initial: { opacity: 0, y: isMobile ? 10 : 30 },
    animate: { opacity: 1, y: 0 },
  };

  return (
    <PageTransition className="min-h-screen relative overflow-hidden">
      <div className="gradient-mesh absolute inset-0" aria-hidden="true" />
      <Particles />

      <div className="relative z-10">
        {/* Nav */}
        <nav className="flex items-center justify-between px-8 py-6 max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, x: isMobile ? 0 : -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center"
          >
            <img 
              src="/logo.jpg" 
              alt="PrintSpot Logo" 
              width={48}
              height={48}
              loading="eager"
              className="h-12 w-auto object-contain hover:scale-105 transition-transform duration-300" 
            />
          </motion.div>
          <motion.div
            initial={{ opacity: 0, x: isMobile ? 0 : 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex gap-6 items-center"
          >
            <button
              onClick={() => navigate("/admin")}
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Admin
            </button>
            <GlowButton onClick={() => navigate("/upload")}>Get Started</GlowButton>
          </motion.div>
        </nav>

        {/* Hero */}
        <section className="flex flex-col items-center justify-center text-center px-6 pt-24 pb-32 max-w-4xl mx-auto">
          <motion.div
            variants={fadeInUp}
            initial="initial"
            animate="animate"
            transition={{ delay: 0.1, duration: 0.5 }}
          >
            <span className="inline-block px-4 py-1.5 rounded-full text-sm font-medium bg-accent text-accent-foreground mb-6">
              ✨ The future of self-service printing
            </span>
          </motion.div>

          <motion.h1
            variants={fadeInUp}
            initial="initial"
            animate="animate"
            transition={{ delay: 0.2, duration: 0.5 }}
            className="text-5xl md:text-7xl font-display font-bold leading-tight tracking-tight mb-6"
          >
            Print anything.
            <br />
            <span className="text-gradient">Effortlessly.</span>
          </motion.h1>

          <motion.p
            variants={fadeInUp}
            initial="initial"
            animate="animate"
            transition={{ delay: 0.3, duration: 0.5 }}
            className="text-base md:text-lg text-muted-foreground max-w-xl mb-10"
          >
            Upload your documents, customize your print settings, and pick them up at any kiosk — all in under a minute.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, scale: isMobile ? 1 : 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4, duration: 0.5 }}
          >
            <GlowButton size="lg" onClick={() => navigate("/upload")} aria-label="Start Printing: Start your printing process now">
              Start Printing →
            </GlowButton>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.5 }}
            className="mt-12 flex flex-col items-center justify-center gap-4 w-full"
          >
            <p className="text-[10px] md:text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">Seamlessly Supports</p>
            <div className="flex flex-wrap justify-center gap-3">
              {supportedFormats.map((format) => (
                <div key={format.name} className={`flex items-center gap-2 px-3 py-1.5 md:px-4 md:py-2 rounded-2xl ${format.bg} border border-slate-200/50 dark:border-slate-800/50 backdrop-blur-sm shadow-sm transition-transform hover:scale-105 cursor-default`}>
                  <format.icon className={`w-4 h-4 md:w-4 md:h-4 ${format.color}`} />
                  <span className={`text-xs md:text-sm font-black tracking-tight ${format.color}`}>{format.name}</span>
                </div>
              ))}
            </div>
          </motion.div>
        </section>

        {/* Features */}
        <section className="max-w-5xl mx-auto px-6 pb-24">
          <h2 className="sr-only">Why choose PrintSpot</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: isMobile ? 10 : 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: isMobile ? 0.1 : 0.5 + i * 0.1 }}
                whileHover={isMobile ? {} : { y: -4, boxShadow: "0 20px 40px hsl(221 83% 53% / 0.1)" }}
                className="glass rounded-2xl p-6 cursor-default"
              >
                <div className="w-12 h-12 rounded-xl bg-accent flex items-center justify-center mb-4 text-primary">
                  <f.icon className="w-6 h-6" />
                </div>
                <h2 className="font-display font-semibold text-lg mb-2">{f.title}</h2>
                <p className="text-sm text-muted-foreground">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </section>

        <Footer />
      </div>
    </PageTransition>
  );
};

export default LandingPage;

