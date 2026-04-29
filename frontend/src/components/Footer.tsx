import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Mail, MessageSquare, Shield, Info, Send, X, Globe, Phone } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";

export const Footer = () => {
  const navigate = useNavigate();
  const [showContact, setShowContact] = useState(false);
  const [formState, setFormState] = useState({ name: "", email: "", phone: "", message: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      const { error } = await supabase
        .from('contact_submissions')
        .insert([{
          name: formState.name,
          email: formState.email,
          phone: formState.phone || null,
          message: formState.message
        }]);
        
      if (error) throw error;

      toast.success("Message sent! We'll get back to you soon.");
      setFormState({ name: "", email: "", phone: "", message: "" });
      setShowContact(false);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to send message. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div className="w-full pb-12 px-6">
        <motion.div 
          initial={typeof window !== 'undefined' && window.innerWidth < 768 ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          style={{ transform: "translateZ(0)" }}
          className="max-w-5xl mx-auto"
        >
          {/* Main Footer Island */}
          <div className="glass-strong rounded-[2.5rem] p-8 md:p-12 shadow-2xl overflow-hidden relative border border-white/20">
            {/* Background Glows (Optimized: Using radial gradients instead of heavy blur filters) */}
            <div className="absolute top-0 right-0 w-80 h-80 bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.08),transparent_70%)] -z-10" />
            <div className="absolute bottom-0 left-0 w-80 h-80 bg-[radial-gradient(circle_at_center,rgba(147,51,234,0.08),transparent_70%)] -z-10" />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
              {/* Left Side: Branding & Links */}
              <div className="space-y-8">
                <div>
                  <img src="/logo.jpg" alt="PrintSpot" width="120" height="40" loading="lazy" className="h-10 w-auto mb-4 opacity-90" />
                  <p className="text-sm text-slate-500 max-w-xs leading-relaxed">
                    Revolutionizing self-service printing for the modern world. Simple, secure, and always available.
                  </p>
                </div>


                <div className="flex flex-wrap gap-6">
                  <button 
                    onClick={() => navigate("/privacy")}
                    className="flex items-center gap-2 text-xs font-black text-slate-400 hover:text-blue-600 transition-colors uppercase tracking-widest"
                  >
                    <Shield className="w-3.5 h-3.5" /> Privacy Policy
                  </button>
                  <button 
                    onClick={() => navigate("/about")}
                    className="flex items-center gap-2 text-xs font-black text-slate-400 hover:text-blue-600 transition-colors uppercase tracking-widest"
                  >
                    <Info className="w-3.5 h-3.5" /> About Us
                  </button>
                  <button 
                    onClick={() => setShowContact(true)}
                    className="flex items-center gap-2 text-xs font-black text-slate-400 hover:text-blue-600 transition-colors uppercase tracking-widest"
                  >
                    <MessageSquare className="w-3.5 h-3.5" /> Contact Us
                  </button>
                </div>

                <div className="pt-4 border-t border-slate-200/50 dark:border-slate-800/50">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">
                    © 2026 PrintSpot Technologies · All Rights Reserved
                  </p>
                </div>
              </div>

              {/* Right Side: Quick Contact Info */}
              <div className="glass bg-white/50 dark:bg-slate-800/20 rounded-3xl p-8 space-y-6 border border-white/40 shadow-inner">
                <h2 className="text-sm font-black text-slate-800 dark:text-slate-200 uppercase tracking-widest">Support Hub</h2>
                
                <div className="space-y-4">
                  <a href="mailto:support@printspot.com" className="flex items-center gap-4 group" aria-label="Email support: khodabharwad88@gmail.com">
                    <div className="w-10 h-10 rounded-xl bg-blue-600/10 flex items-center justify-center group-hover:bg-blue-600 transition-all duration-300">
                      <Mail className="w-4 h-4 text-blue-600 group-hover:text-white" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Email Support</p>
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-200">khodabharwad88@gmail.com</p>
                    </div>
                  </a>

                  <div className="flex items-center gap-4 group" aria-label="Regional HQ Pune, Maharashtra, India">
                    <div className="w-10 h-10 rounded-xl bg-purple-600/10 flex items-center justify-center group-hover:bg-purple-600 transition-all duration-300">
                      <Globe className="w-4 h-4 text-purple-600 group-hover:text-white" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Regional HQ</p>
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-200">Pune, Maharashtra, India</p>
                    </div>
                  </div>
                </div>

                <button 
                  onClick={() => setShowContact(true)}
                  aria-label="Send a message to support"
                  className="w-full py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl font-black text-xs uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-slate-900/20"
                >
                  Send a Message
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Contact Form Modal */}
      <AnimatePresence>
        {showContact && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowContact(false)}
              className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm"
            />
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-3xl rounded-[3rem] p-8 md:p-12 w-full max-w-lg relative z-10 shadow-2xl border border-white/50"
            >
              <button 
                onClick={() => setShowContact(false)}
                className="absolute top-8 right-8 w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center hover:rotate-90 transition-transform duration-300"
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>

              <div className="mb-8">
                <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-2">Get in Touch</h3>
                <p className="text-sm text-slate-500 font-medium">We'd love to hear your feedback or help with any issues.</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Full Name</label>
                  <input 
                    required
                    type="text" 
                    value={formState.name}
                    onChange={(e) => setFormState({...formState, name: e.target.value})}
                    placeholder="Enter your name" 
                    className="w-full bg-slate-100 dark:bg-slate-800/50 border-none rounded-2xl py-4 px-6 text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Email Address</label>
                  <input 
                    required
                    type="email" 
                    value={formState.email}
                    onChange={(e) => setFormState({...formState, email: e.target.value})}
                    placeholder="your@email.com" 
                    className="w-full bg-slate-100 dark:bg-slate-800/50 border-none rounded-2xl py-4 px-6 text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Phone Number (Optional)</label>
                  <input 
                    type="tel" 
                    value={formState.phone}
                    onChange={(e) => setFormState({...formState, phone: e.target.value})}
                    placeholder="Your phone number" 
                    className="w-full bg-slate-100 dark:bg-slate-800/50 border-none rounded-2xl py-4 px-6 text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Message</label>
                  <textarea 
                    required
                    rows={4}
                    value={formState.message}
                    onChange={(e) => setFormState({...formState, message: e.target.value})}
                    placeholder="How can we help?" 
                    className="w-full bg-slate-100 dark:bg-slate-800/50 border-none rounded-2xl py-4 px-6 text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none transition-all resize-none"
                  />
                </div>

                <button 
                  disabled={isSubmitting}
                  className="w-full py-5 bg-blue-600 text-white rounded-[2rem] font-black text-sm uppercase tracking-widest hover:bg-blue-500 hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-blue-500/30 flex items-center justify-center gap-3 mt-4 disabled:opacity-50"
                >
                  {isSubmitting ? "Sending..." : <>Shoot it! <Send className="w-4 h-4" /></>}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};
