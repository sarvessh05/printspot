import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { PageTransition } from "@/components/PageTransition";
import { ArrowLeft, Users, Target, ShieldCheck, Heart } from "lucide-react";

const AboutUs = () => {
  const navigate = useNavigate();

  return (
    <PageTransition className="min-h-screen gradient-mesh p-6 pb-24 flex flex-col items-center">
      {/* Back Button */}
      <div className="w-full max-w-4xl mb-12">
        <button 
          onClick={() => navigate("/")} 
          className="flex items-center gap-2 group text-slate-500 hover:text-blue-600 transition-colors font-bold text-sm"
        >
          <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" /> 
          Back to Home
        </button>
      </div>

      <div className="max-w-4xl w-full">
        {/* Hero Section */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-strong rounded-[3rem] p-12 mb-12 text-center relative overflow-hidden border border-white/20 shadow-2xl"
        >
          <div className="absolute -top-24 -left-24 w-64 h-64 bg-blue-500/10 blur-[100px]" />
          <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-purple-500/10 blur-[100px]" />
          
          <div className="w-20 h-20 rounded-3xl bg-blue-600 mx-auto flex items-center justify-center mb-8 shadow-xl shadow-blue-500/30">
            <Users className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-5xl font-black text-slate-900 dark:text-white mb-6 tracking-tight">
            We are <span className="text-blue-600">PrintSpot.</span>
          </h1>
          <p className="text-xl text-slate-500 font-medium max-w-2xl mx-auto leading-relaxed">
            Revolutionizing the way the world prints, one kiosk at a time. We believe in making professional-grade printing accessible to everyone, everywhere.
          </p>
        </motion.div>

        {/* Content Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
           <motion.div 
             initial={{ opacity: 0, x: -20 }}
             animate={{ opacity: 1, x: 0 }}
             transition={{ delay: 0.1 }}
             className="glass rounded-[2.5rem] p-8 border border-white/40"
           >
             <div className="w-12 h-12 rounded-2xl bg-purple-600/10 flex items-center justify-center mb-6">
                <Target className="w-6 h-6 text-purple-600" />
             </div>
             <h3 className="text-xl font-black mb-4 dark:text-white">Our Mission</h3>
             <p className="text-sm text-slate-500 leading-relaxed font-medium">
               To build a global network of smart, self-service printing kiosks that eliminate the friction of traditional print shops. We aim for zero-wait times and maximum accessibility.
             </p>
           </motion.div>

           <motion.div 
             initial={{ opacity: 0, x: 20 }}
             animate={{ opacity: 1, x: 0 }}
             transition={{ delay: 0.2 }}
             className="glass rounded-[2.5rem] p-8 border border-white/40"
           >
             <div className="w-12 h-12 rounded-2xl bg-green-600/10 flex items-center justify-center mb-6">
                <ShieldCheck className="w-6 h-6 text-green-600" />
             </div>
             <h3 className="text-xl font-black mb-4 dark:text-white">Our Values</h3>
             <p className="text-sm text-slate-500 leading-relaxed font-medium">
               Privacy is at our core. Your data is your own. Every document processed by our systems is transient, meeting the highest standards of data security and disposal protocols.
             </p>
           </motion.div>
        </div>

        {/* The Story Section */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
          className="glass-strong rounded-[3rem] p-12 mt-12 border border-white/20 shadow-xl"
        >
          <div className="flex items-center gap-4 mb-8">
            <Heart className="w-8 h-8 text-pink-500 fill-pink-500" />
            <h2 className="text-3xl font-black dark:text-white">The Story</h2>
          </div>
          <div className="columns-1 md:columns-2 gap-12 text-sm text-slate-500 font-medium leading-[1.8] space-y-6">
            <p>
              Born in 2026, PrintSpot Technologies set out to solve a simple problem: printing on the go is frustrating. Whether it's finding a shop that's open, or trusting a public computer with your files, the process was broken.
            </p>
            <p>
              We envisioned a world where printing was as simple as scanning a QR code. By combining high-end hardware with intuitive glassmorphic software, we created a kiosk that doesn't just print — it delivers a premium experience.
            </p>
            <p>
              Today, we are expanding across India, installing kiosks in colleges, malls, and tech parks. We continue to iterate on our "Fluid Design" philosophy to ensure that every touchpoint with a PrintSpot kiosk is delightful.
            </p>
            <p>
              Our team consists of engineers, designers, and visionaries dedicated to building the infrastructure of the future. We're just getting started.
            </p>
          </div>
        </motion.div>
      </div>
    </PageTransition>
  );
};

export default AboutUs;
