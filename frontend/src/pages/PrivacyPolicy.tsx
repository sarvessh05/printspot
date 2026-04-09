import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { PageTransition } from "@/components/PageTransition";
import { ArrowLeft, Shield, Lock, Trash2, EyeOff } from "lucide-react";

const PrivacyPolicy = () => {
  const navigate = useNavigate();

  const sections = [
    {
      icon: Lock,
      title: "Data Encryption",
      desc: "All files uploaded to PrintSpot are encrypted in transit using SSL/TLS protocols and at rest using AES-256 encryption."
    },
    {
      icon: Trash2,
      title: "Instant Deletion",
      desc: "Files are automatically and permanently deleted from our servers within 10 minutes of a successful print or 1 hour after upload if not printed."
    },
    {
      icon: EyeOff,
      title: "Zero Human Oversight",
      desc: "Our automated systems process your documents without any human intervention. We do not store, view, or sell your document content."
    }
  ];

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
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-strong rounded-[3rem] p-12 mb-12 border border-white/20 shadow-2xl relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-64 h-64 bg-green-500/10 blur-[100px] -z-10" />
          
          <div className="w-16 h-16 rounded-2xl bg-green-600/10 flex items-center justify-center mb-6">
            <Shield className="w-8 h-8 text-green-600" />
          </div>
          <h1 className="text-4xl font-black text-slate-900 dark:text-white mb-4">Privacy Policy</h1>
          <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Last Updated: April 8, 2026</p>
        </motion.div>

        {/* Core Pillars */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {sections.map((s, i) => (
            <motion.div
              key={s.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="glass rounded-3xl p-6 border border-white/30"
            >
              <s.icon className="w-6 h-6 text-blue-600 mb-4" />
              <h3 className="text-sm font-black mb-2 dark:text-white uppercase tracking-tight">{s.title}</h3>
              <p className="text-xs text-slate-500 leading-relaxed font-medium">{s.desc}</p>
            </motion.div>
          ))}
        </div>

        {/* Legal Text */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="glass-strong rounded-[3rem] p-12 border border-white/20"
        >
          <div className="prose prose-slate dark:prose-invert max-w-none space-y-8">
            <section>
              <h2 className="text-xl font-black mb-4 dark:text-white">1. Information We Collect</h2>
              <p className="text-sm text-slate-500 leading-relaxed">
                When you use a PrintSpot kiosk, we collect minimal data required to provide the service. This includes the file content (processed transitively), file metadata (number of pages, color mode), and payment confirmation details. We do NOT collect personal identification unless you voluntarily provide it for a receipt.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-black mb-4 dark:text-white">2. Use of Information</h2>
              <p className="text-sm text-slate-500 leading-relaxed">
                Your information is used solely to facilitate the printing process and process payments. We use anonymized usage statistics to improve kiosk performance and location-based trends.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-black mb-4 dark:text-white">3. Third-Party Services</h2>
              <p className="text-sm text-slate-500 leading-relaxed">
                We use secure third-party payment gateways (like Razorpay or UPI) to process transactions. These providers have their own privacy policies governing your payment data.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-black mb-4 dark:text-white">4. Your Rights</h2>
              <p className="text-sm text-slate-500 leading-relaxed">
                Under the Information Technology Act (India), you have the right to access and delete your data. Since our data retention is strictly transient, your data is often deleted before you leave the kiosk.
              </p>
            </section>
          </div>
        </motion.div>
      </div>
    </PageTransition>
  );
};

export default PrivacyPolicy;
