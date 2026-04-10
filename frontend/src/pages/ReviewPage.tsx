import { motion, AnimatePresence } from "framer-motion";
import { useNavigate, useLocation } from "react-router-dom";
import { PageTransition } from "@/components/PageTransition";
import { GlowButton } from "@/components/GlowButton";
import { AnimatedCounter } from "@/components/AnimatedCounter";
import { useState, useMemo, useEffect, useRef } from "react";
import { ArrowLeft, FileText, Minus, Plus, CreditCard, Layers, Palette, Copy as CopyIcon, ScanText, Loader2 } from "lucide-react";
import * as pdfjs from 'pdfjs-dist';

// Robust worker configuration for Vite
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';
pdfjs.GlobalWorkerOptions.workerSrc = pdfjsWorker;

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

const PDFThumbnail = ({ file }: { file: File }) => {
  const [thumbnail, setThumbnail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let isMounted = true;
    let mainUrl: string | null = null;

    const generateThumbnail = async () => {
      try {
        if (!file || !(file instanceof File)) {
          console.error("Invalid file object", file);
          setError(true);
          setLoading(false);
          return;
        }

        // Handle images
        if (file.type && file.type.startsWith('image/')) {
          mainUrl = URL.createObjectURL(file);
          if (isMounted) {
            setThumbnail(mainUrl);
            setLoading(false);
          }
          return;
        }

        // Handle PDFs
        const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
        if (!isPdf) {
          if (isMounted) setLoading(false);
          return;
        }

        mainUrl = URL.createObjectURL(file);
        
        const loadingTask = pdfjs.getDocument({
          url: mainUrl,
          cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@5.6.205/cmaps/',
          cMapPacked: true,
        });
        
        const pdf = await loadingTask.promise;
        const page = await pdf.getPage(1);
        
        const viewport = page.getViewport({ scale: 1.0 });
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        
        if (!context) throw new Error("Could not get canvas context");
        
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        
        await page.render({
          canvasContext: context,
          viewport: viewport
        }).promise;
        
        if (isMounted) {
          setThumbnail(canvas.toDataURL('image/jpeg', 0.8));
          setLoading(false);
        }
      } catch (err) {
        console.error("Thumbnail rendering failed:", err);
        if (isMounted) {
          setError(true);
          setLoading(false);
        }
      }
    };

    generateThumbnail();
    
    return () => { 
      isMounted = false; 
      if (mainUrl) URL.revokeObjectURL(mainUrl);
    };
  }, [file]);

  return (
    <div className="w-full aspect-[3/4] bg-white dark:bg-slate-900 rounded-2xl overflow-hidden flex items-center justify-center relative border border-slate-200 dark:border-slate-800 shadow-xl group-hover:scale-[1.05] transition-all duration-500 ring-1 ring-slate-900/5">
      {loading ? (
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
          <span className="text-[8px] font-black text-slate-400 animate-pulse tracking-tighter">GENERATING...</span>
        </div>
      ) : thumbnail ? (
        <motion.img 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          src={thumbnail} 
          alt="Preview" 
          className="w-full h-full object-cover" 
        />
      ) : (
        <div className="flex flex-col items-center gap-2 text-slate-300 dark:text-slate-700">
          <FileText className="w-10 h-10 opacity-30" />
          <span className="text-[8px] font-black uppercase tracking-widest">{error ? 'No Preview' : 'PDF File'}</span>
        </div>
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/5 to-transparent pointer-events-none" />
    </div>
  );
};

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

       <div className="max-w-6xl mx-auto px-6 py-8 w-full flex-grow pb-48 overflow-hidden">
        <div className={`flex overflow-x-auto gap-8 pb-12 snap-x snap-mandatory no-scrollbar px-[calc(50%-170px)] md:px-[calc(50%-250px)] h-full items-start ${files.length === 1 ? 'justify-center' : ''}`}>
          {files.map((file, idx) => (
            <motion.div
              key={file.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              whileHover={{ y: -5 }}
              className="min-w-[320px] md:min-w-[500px] snap-center flex-shrink-0 bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-xl shadow-slate-200/50 dark:shadow-none border border-white dark:border-slate-800 overflow-hidden group transition-all duration-500"
            >
              {/* Preview & File Info Header */}
              <div className="p-6 md:p-8 pb-0">
                <div className="flex gap-4 md:gap-6 items-start">
                  {/* PDF Preview */}
                  <div className="w-24 md:w-32 flex-shrink-0">
                    <PDFThumbnail file={file.fileObj} />
                  </div>
                  
                  <div className="flex-grow pt-2">
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-[9px] md:text-[10px] font-black text-blue-600 uppercase tracking-widest">Doc #{idx + 1}</div>
                      <div className="text-[9px] md:text-[10px] font-black text-slate-300 dark:text-slate-700 px-2 py-0.5 border border-slate-100 dark:border-slate-800 rounded-full uppercase">
                        {file.pages} Pgs
                      </div>
                    </div>
                    <h3 className="text-base md:text-lg font-black text-slate-800 dark:text-slate-200 line-clamp-1 md:line-clamp-2 leading-tight mb-2 tracking-tight">{file.name}</h3>
                    <div className="flex items-center gap-2">
                       <span className="text-xl md:text-2xl font-black text-slate-900 dark:text-white">₹{calculateFileCost(file)}</span>
                       <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded-md">
                        GST INCL.
                       </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Settings Grid */}
              <div className="p-6 md:p-8 space-y-6 md:y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8">
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
                          <div className="flex flex-col gap-2">
                            <input 
                              type="text"
                              placeholder="Color pages (e.g. 1, 3-5)"
                              value={file.colorPagesString}
                              onChange={(e) => updateFileSetting(file.id, 'colorPagesString', e.target.value)}
                              className="w-full bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl py-2 px-3 text-[10px] font-bold focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                            />
                            <p className="text-[8px] font-extrabold text-red-500 flex items-center gap-1 animate-pulse leading-none px-1">
                              <span className="w-1 h-1 rounded-full bg-red-500" />
                              NOTE: REST PAGES WILL BE B&W
                            </p>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Copies */}
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                       <CopyIcon className="w-3 h-3 text-blue-500" /> Quantity
                    </label>
                    <div className="bg-slate-100 dark:bg-slate-800/50 rounded-xl p-1 flex items-center justify-between border border-slate-200 dark:border-slate-700 h-[42px]">
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

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8">
                   {/* Two Sided */}
                   <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                       <Layers className="w-3 h-3 text-blue-500" /> Paper Usage
                    </label>
                    <button 
                      onClick={() => updateFileSetting(file.id, 'isTwoSided', !file.isTwoSided)}
                      className={`w-full flex items-center justify-between px-5 py-2.5 rounded-xl border transition-all duration-300 ${
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
                        options={["All", "Custom"]} 
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
                              className="w-full bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl py-2.5 px-4 text-xs font-bold focus:ring-1 focus:ring-blue-500 outline-none transition-all placeholder:text-slate-400"
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
              onClick={() => {
                const filesWithCost = files.map(f => ({
                  ...f,
                  calculatedCost: calculateFileCost(f)
                }));
                navigate("/payment", { state: { total: grandTotal, files: filesWithCost } });
              }}
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
