import { motion, AnimatePresence } from "framer-motion";
import { useNavigate, useLocation } from "react-router-dom";
import { PageTransition } from "@/components/PageTransition";
import { GlowButton } from "@/components/GlowButton";
import { AnimatedCounter } from "@/components/AnimatedCounter";
import { useState, useMemo, useEffect } from "react";
import { ArrowLeft, FileText, Minus, Plus, CreditCard, Layers, Palette, Copy as CopyIcon, ScanText } from "lucide-react";

interface UploadedFile {
  id: string;
  name: string;
  size: number;
  pages: number;
  fileObj: File;
  mode: "bw" | "color" | "mixed";
  copies: number;
  isTwoSided: boolean;
  originalPageCount: number;
  printRange: "all" | "custom" | "odd" | "even";
  customRangeString: string;
  colorPagesString: string;
  paperSize: "a4" | "letter";
}

const SlidingToggle = ({ options, value, onChange, id }: { options: string[], value: string, onChange: (v: any) => void, id: string }) => (
  <div className="bg-slate-100 dark:bg-slate-800/50 rounded-xl p-1 flex relative gap-1 border border-slate-200 dark:border-slate-700 w-full">
    {options.map((opt) => (
      <button
        key={opt}
        onClick={() => onChange(opt.toLowerCase().replace('&', '').replace(' ', ''))}
        className={`relative z-10 flex-1 py-2 text-xs font-bold transition-colors duration-300 ${
          (value === opt.toLowerCase().replace('&', '').replace(' ', ''))
            ? "text-white" 
            : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
        }`}
      >
        <span className="relative z-10">{opt}</span>
        {value === opt.toLowerCase().replace('&', '').replace(' ', '') && (
          <motion.div
            layoutId={`toggle-bg-${id}`}
            className="absolute inset-0 bg-blue-600 rounded-lg shadow-lg shadow-blue-500/20"
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
          />
        )}
      </button>
    ))}
  </div>
);

const ReviewPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { files: initialFiles = [] } = location.state || {};
  const [pricing, setPricing] = useState(location.state?.pricing || { bw: 2, color: 10 });
  const [files, setFiles] = useState<UploadedFile[]>(initialFiles.map((f: any) => ({
    ...f,
    printRange: f.printRange || "all",
    customRangeString: f.customRangeString || "",
    colorPagesString: f.colorPagesString || "",
    paperSize: f.paperSize || "a4"
  })));

  useEffect(() => {
    // Sync pricing with backend
    const backendUrl = import.meta.env.VITE_EC2_IP || 'http://localhost:8080';
    fetch(`${backendUrl}/api/settings/pricing`)
      .then(res => res.json())
      .then(data => {
        if (data && data.bw) setPricing(data);
      })
      .catch(err => console.error("Pricing sync error", err));
  }, []);

  const updateFileSetting = (id: string, key: keyof UploadedFile, value: any) => {
    setFiles(prev => prev.map(f => {
      if (f.id === id) {
        const updated = { ...f, [key]: value };
        if (key === 'customRangeString' || key === 'printRange') {
          updated.pages = getCalculatedPageCount(updated);
        }
        return updated;
      }
      return f;
    }));
  };

  const getCalculatedPageCount = (file: UploadedFile) => {
    const totalPages = file.originalPageCount;
    if (file.printRange === 'all') return totalPages;
    if (file.printRange === 'odd') return Math.ceil(totalPages / 2);
    if (file.printRange === 'even') return Math.floor(totalPages / 2);
    
    if (file.printRange === 'custom' && file.customRangeString.trim()) {
      try {
        let pagesSet = new Set<number>();
        const parts = file.customRangeString.split(',');
        parts.forEach(part => {
          if (part.includes('-')) {
            let [start, end] = part.split('-').map(num => parseInt(num.trim()));
            if (!isNaN(start) && !isNaN(end)) {
              start = Math.max(1, start);
              end = Math.min(totalPages, end);
              for (let i = start; i <= end; i++) pagesSet.add(i);
            }
          } else {
            const num = parseInt(part.trim());
            if (!isNaN(num) && num >= 1 && num <= totalPages) pagesSet.add(num);
          }
        });
        return pagesSet.size > 0 ? pagesSet.size : totalPages;
      } catch (e) {
        return totalPages;
      }
    }
    return totalPages;
  };

  const calculateFileCost = (file: UploadedFile) => {
    let basePrice = 0;
    const pages = file.pages || 1;
    const copies = file.copies || 1;

    if (file.mode === 'bw') {
      basePrice = file.isTwoSided 
        ? (Math.floor(pages / 2) * Math.ceil(pricing.bw * 1.5) + (pages % 2) * pricing.bw) 
        : pages * pricing.bw;
    } else if (file.mode === 'color') {
      basePrice = file.isTwoSided 
        ? (Math.floor(pages / 2) * Math.ceil(pricing.color * 1.8) + (pages % 2) * pricing.color) 
        : pages * pricing.color;
    } else if (file.mode === 'mixed') {
      // Mixed mode: Parse color pages, calculate color vs bw
      try {
        let colorPageCount = 0;
        if (file.colorPagesString.trim()) {
          let pagesSet = new Set<number>();
          const parts = file.colorPagesString.split(',');
          parts.forEach(part => {
            if (part.includes('-')) {
              let [start, end] = part.split('-').map(num => parseInt(num.trim()));
              if (!isNaN(start) && !isNaN(end)) {
                 for (let i = start; i <= end; i++) pagesSet.add(i);
              }
            } else {
              const num = parseInt(part.trim());
              if (!isNaN(num)) pagesSet.add(num);
            }
          });
          colorPageCount = pagesSet.size;
        }
        const bwPageCount = Math.max(0, pages - colorPageCount);
        basePrice = (colorPageCount * pricing.color) + (bwPageCount * pricing.bw);
      } catch (e) {
        basePrice = pages * pricing.bw; 
      }
    }
    return basePrice * copies;
  };

  const grandTotal = useMemo(() => files.reduce((sum, f) => sum + calculateFileCost(f), 0), [files]);
  const totalSheets = useMemo(() => files.reduce((sum, f) => sum + (f.isTwoSided ? Math.ceil(f.pages / 2) : f.pages), 0), [files]);

  return (
    <PageTransition className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col">
      {/* Dynamic Header */}
      <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800 sticky top-0 z-50 px-6 py-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <button 
            onClick={() => navigate("/upload")} 
            className="flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-blue-600 transition-colors group"
          >
            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" /> 
            Back
          </button>
          <div className="text-center">
            <h1 className="text-lg font-bold text-slate-900 dark:text-white">Print Settings</h1>
            <p className="text-[10px] text-blue-600 font-black uppercase tracking-widest">Configuration</p>
          </div>
          <div className="w-10" />
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8 w-full flex-grow pb-48">
        <div className="flex overflow-x-auto gap-8 pb-12 snap-x snap-mandatory no-scrollbar -mx-4 px-4 h-full items-start">
          {files.map((file, idx) => (
            <motion.div
              key={file.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: idx * 0.1 }}
              className="min-w-[85vw] md:min-w-[500px] snap-center flex-shrink-0 bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-xl shadow-slate-200/50 dark:shadow-none border border-white dark:border-slate-800 overflow-hidden"
            >
              {/* File Info Title Bar */}
              <div className="bg-slate-50/50 dark:bg-slate-800/20 px-8 py-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/40">
                    <FileText className="w-6 h-6 text-white" />
                  </div>
                  <div className="max-w-[180px] md:max-w-[300px]">
                    <h3 className="text-sm font-black text-slate-800 dark:text-slate-200 truncate">{file.name}</h3>
                    <div className="flex items-center gap-2 mt-0.5">
                       <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                        {file.pages} PGS
                       </span>
                       <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">₹{calculateFileCost(file)}</span>
                    </div>
                  </div>
                </div>
                <div className="text-[10px] font-black text-slate-300 dark:text-slate-700 px-3 py-1 border-2 border-slate-100 dark:border-slate-800 rounded-full">
                  #{idx + 1}
                </div>
              </div>

              {/* Settings Grid */}
              <div className="p-8 space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Color Mode */}
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                       <Palette className="w-3 h-3 text-blue-500" /> Color Choice
                    </label>
                    <SlidingToggle 
                      id={`mode-${file.id}`}
                      options={["B&W", "Color", "Mixed"]} 
                      value={file.mode} 
                      onChange={(v) => updateFileSetting(file.id, 'mode', v)} 
                    />
                    <AnimatePresence>
                      {file.mode === 'mixed' && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="pt-2"
                        >
                          <input 
                            type="text"
                            placeholder="Color pages (e.g. 1, 3-5)"
                            value={file.colorPagesString}
                            onChange={(e) => updateFileSetting(file.id, 'colorPagesString', e.target.value)}
                            className="w-full bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl py-2 px-3 text-[10px] font-bold focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                          />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Paper Size */}
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                       <ScanText className="w-3 h-3 text-blue-500" /> Paper Size
                    </label>
                    <SlidingToggle 
                      id={`paper-${file.id}`}
                      options={["A4", "Letter"]} 
                      value={file.paperSize} 
                      onChange={(v) => updateFileSetting(file.id, 'paperSize', v)} 
                    />
                  </div>

                  {/* Copies */}
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                       <CopyIcon className="w-3 h-3 text-blue-500" /> Quantity
                    </label>
                    <div className="bg-slate-100 dark:bg-slate-800/50 rounded-xl p-1 flex items-center justify-between border border-slate-200 dark:border-slate-700">
                      <button 
                        onClick={() => updateFileSetting(file.id, 'copies', Math.max(1, file.copies - 1))}
                        className="w-10 h-10 rounded-lg flex items-center justify-center text-slate-400 hover:bg-white dark:hover:bg-slate-700 transition-all hover:text-blue-600"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <span className="text-sm font-black text-slate-800 dark:text-white tabular-nums">{file.copies}</span>
                      <button 
                        onClick={() => updateFileSetting(file.id, 'copies', file.copies + 1)}
                        className="w-10 h-10 rounded-lg flex items-center justify-center text-slate-400 hover:bg-white dark:hover:bg-slate-700 transition-all hover:text-blue-600"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                   {/* Two Sided */}
                   <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                       <Layers className="w-3 h-3 text-blue-500" /> Paper Usage
                    </label>
                    <button 
                      onClick={() => updateFileSetting(file.id, 'isTwoSided', !file.isTwoSided)}
                      className={`w-full flex items-center justify-between px-5 py-3 rounded-xl border transition-all duration-300 ${
                        file.isTwoSided 
                          ? "bg-blue-600/5 border-blue-600/20 text-blue-600 ring-2 ring-blue-600/10" 
                          : "bg-slate-100 border-slate-200 dark:bg-slate-800/50 dark:border-slate-700 text-slate-500"
                      }`}
                    >
                      <span className="text-xs font-bold">Double Sided</span>
                      <div className={`w-10 h-5 rounded-full relative transition-colors ${file.isTwoSided ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-700'}`}>
                        <motion.div 
                          animate={{ x: file.isTwoSided ? 22 : 2 }}
                          className="w-4 h-4 bg-white rounded-full mt-0.5"
                        />
                      </div>
                    </button>
                   </div>

                   {/* Print Range */}
                   <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                       <ScanText className="w-3 h-3 text-blue-500" /> Page Select
                    </label>
                    <div className="flex flex-col gap-2">
                      <SlidingToggle 
                        id={`range-${file.id}`}
                        options={["All", "Odd", "Even", "Custom"]} 
                        value={file.printRange} 
                        onChange={(v) => updateFileSetting(file.id, 'printRange', v)} 
                      />
                      <AnimatePresence>
                        {file.printRange === 'custom' && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                          >
                            <input 
                              type="text"
                              placeholder="e.g. 1-5, 8, 10-12"
                              value={file.customRangeString}
                              onChange={(e) => updateFileSetting(file.id, 'customRangeString', e.target.value)}
                              className="w-full bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl py-3 px-4 text-xs font-bold focus:ring-2 focus:ring-blue-500 outline-none transition-all placeholder:text-slate-400"
                            />
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                   </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Modern Fixed Bottom Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-50 p-6">
        <div className="max-w-xl mx-auto">
          <motion.div 
            initial={{ y: 100 }}
            animate={{ y: 0 }}
            className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-2xl rounded-[3rem] p-4 flex items-center justify-between border border-white dark:border-slate-800 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.25)]"
          >
            <div className="pl-6 py-2">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Total Bill</p>
              <div className="text-3xl font-black text-slate-900 dark:text-white flex items-baseline gap-1">
                <span className="text-xl font-bold text-blue-600">₹</span>
                <AnimatedCounter value={grandTotal} />
              </div>
              <p className="text-[10px] font-bold text-slate-400 uppercase mt-0.5">{files.length} Files · {totalSheets} Sheets</p>
            </div>
            
            <button 
              onClick={() => navigate("/payment", { state: { total: grandTotal, files } })}
              className="bg-blue-600 hover:bg-blue-500 text-white h-20 px-10 rounded-[2.5rem] font-black text-lg transition-all active:scale-95 flex items-center gap-3 shadow-xl shadow-blue-500/30 group overflow-hidden relative"
            >
              <span className="relative z-10">Confirm & Pay</span>
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center relative z-10 group-hover:rotate-12 transition-transform">
                <CreditCard className="w-5 h-5" />
              </div>
            </button>
          </motion.div>
        </div>
      </div>
    </PageTransition>
  );
};

export default ReviewPage;
