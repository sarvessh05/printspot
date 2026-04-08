import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { PageTransition } from "@/components/PageTransition";
import { Particles } from "@/components/Particles";
import { GlowButton } from "@/components/GlowButton";
import { Printer, Zap, Shield, Clock } from "lucide-react";
import { Footer } from "@/components/Footer";

const features = [

  { icon: Zap, title: "Instant Printing", desc: "Upload and print in under 60 seconds" },
  { icon: Shield, title: "Secure & Private", desc: "Files are deleted after printing" },
  { icon: Clock, title: "24/7 Available", desc: "Print anytime at any kiosk" },
];

const LandingPage = () => {
  const navigate = useNavigate();

  return (
    <PageTransition className="min-h-screen relative overflow-hidden">
      <div className="gradient-mesh absolute inset-0" />
      <Particles />

      <div className="relative z-10">
        {/* Nav */}
        <nav className="flex items-center justify-between px-8 py-6 max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center"
          >
            <img 
              src="/logo.jpg" 
              alt="PrintSpot Logo" 
              className="h-12 w-auto object-contain hover:scale-105 transition-transform duration-300" 
            />
          </motion.div>
          <motion.div
            initial={{ opacity: 0, x: 20 }}
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
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.6 }}
          >
            <span className="inline-block px-4 py-1.5 rounded-full text-sm font-medium bg-accent text-accent-foreground mb-6">
              ✨ The future of self-service printing
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.6 }}
            className="text-6xl md:text-7xl font-display font-bold leading-tight tracking-tight mb-6"
          >
            Print anything.
            <br />
            <span className="text-gradient">Effortlessly.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.6 }}
            className="text-lg text-muted-foreground max-w-xl mb-10"
          >
            Upload your documents, customize your print settings, and pick them up at any kiosk — all in under a minute.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5, duration: 0.6 }}
          >
            <GlowButton size="lg" onClick={() => navigate("/upload")}>
              Start Printing →
            </GlowButton>
          </motion.div>
        </section>

        {/* Features */}
        <section className="max-w-5xl mx-auto px-6 pb-24">
          <div className="grid md:grid-cols-3 gap-6">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 + i * 0.1 }}
                whileHover={{ y: -4, boxShadow: "0 20px 40px hsl(221 83% 53% / 0.1)" }}
                className="glass rounded-2xl p-6 cursor-default"
              >
                <div className="w-12 h-12 rounded-xl bg-accent flex items-center justify-center mb-4">
                  <f.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-display font-semibold text-lg mb-2">{f.title}</h3>
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
