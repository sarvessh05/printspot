import { motion, AnimatePresence } from "framer-motion";
import { useNavigate, useLocation } from "react-router-dom";
import { PageTransition } from "@/components/PageTransition";
import { GlowButton } from "@/components/GlowButton";
import { AnimatedCounter } from "@/components/AnimatedCounter";
import { useState, useMemo, useEffect } from "react";
import { ArrowLeft, FileText, ChevronLeft, ChevronRight, Edit2, ShieldCheck, Palette, Copy as CopyIcon, ScanText, Loader2, Minus, Plus, Layers, Upload, CreditCard } from "lucide-react";
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

const PDFThumbnail = ({ file, onPageCount }: { file: File, onPageCount?: (p: number) => void }) => {
  const [thumbnail, setThumbnail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let isMounted = true;
    let mainUrl: string | null = null;

    const generateThumbnail = async () => {
      try {
        if (!file || !(file instanceof File)) {
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
            if (onPageCount) onPageCount(1);
          }
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
        if (onPageCount) onPageCount(pdf.numPages);
        
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
    <div className="w-full aspect-[4/5] bg-white dark:bg-slate-900 rounded-[2rem] overflow-hidden flex items-center justify-center relative shadow-sm">
      {loading ? (
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="w-6 h-6 text-primary animate-spin" />
        </div>
      ) : thumbnail ? (
        <motion.img 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          src={thumbnail} 
          alt="Document preview" 
          width={320}
          height={400}
          className="w-full h-full object-cover" 
        />
      ) : (
        <div className="flex flex-col items-center gap-2 text-slate-300 dark:text-slate-700">
          <FileText className="w-10 h-10 opacity-30" />
        </div>
      )}
    </div>
  );
};

const SlidingToggle = ({ options, value, onChange, id, pricing }: { options: {label: string, value: string}[], value: string, onChange: (v: any) => void, id: string, pricing: any }) => (
  <div className="bg-slate-100 dark:bg-slate-800/50 rounded-xl p-1 flex relative gap-1 w-full">
    {options.map((opt) => {
      const isSelected = value === opt.value;
      const priceLabel = opt.value === 'bw' ? `(₹${pricing.bw})` : opt.value === 'color' ? `(₹${pricing.color})` : '';
      
      return (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={`relative z-10 flex-1 py-2.5 text-[10px] font-black transition-colors duration-300 uppercase tracking-wider ${
            isSelected ? "text-white" : "text-slate-500 hover:text-slate-700"
          }`}
        >
          <span className="relative z-10">{opt.label} {priceLabel}</span>
          {isSelected && (
            <motion.div
              layoutId={`toggle-bg-${id}`}
              className="absolute inset-0 bg-primary rounded-lg shadow-lg shadow-primary/20"
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
            />
          )}
        </button>
      );
    })}
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
  const [activeIndex, setActiveIndex] = useState(0);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    const backendUrl = import.meta.env.VITE_EC2_IP || 'http://localhost:8080';
    fetch(`${backendUrl}/api/settings/pricing`)
      .then(res => res.json())
      .then(data => { if (data && data.bw) setPricing(data); })
      .catch(err => console.error("Pricing sync error", err));
  }, []);

  const currentFile = files[activeIndex];

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
      } catch (e) { return totalPages; }
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
      try {
        let colorPageCount = 0;
        if (file.colorPagesString.trim()) {
          let pagesSet = new Set<number>();
          const parts = file.colorPagesString.split(',');
          parts.forEach(part => {
            if (part.includes('-')) {
              let [start, end] = part.split('-').map(num => parseInt(num.trim()));
              if (!isNaN(start) && !isNaN(end)) for (let i = start; i <= end; i++) pagesSet.add(i);
            } else {
              const num = parseInt(part.trim());
              if (!isNaN(num)) pagesSet.add(num);
            }
          });
          colorPageCount = pagesSet.size;
        }
        const bwPageCount = Math.max(0, pages - colorPageCount);
        basePrice = (colorPageCount * pricing.color) + (bwPageCount * pricing.bw);
      } catch (e) { basePrice = pages * pricing.bw; }
    }
    return basePrice * copies;
  };

  const grandTotal = useMemo(() => files.reduce((sum, f) => sum + calculateFileCost(f), 0), [files]);

  return (
    <PageTransition className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col font-sans">
      {/* Redesigned Document Preview Section */}
      <div className="flex-1 flex flex-col p-6 pb-0 max-w-lg mx-auto w-full">
        <div className="flex items-center justify-between mb-2">
          <button onClick={() => navigate("/upload")} className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-foreground" aria-label="Go back to upload">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex flex-col items-center">
             <h1 className="text-sm font-black text-slate-800 truncate max-w-[240px]">{currentFile.name}</h1>
             <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{currentFile.pages} Pages Total</p>
          </div>
          <button 
            onClick={() => {
              const input = document.createElement("input");
              input.type = "file";
              input.multiple = true;
              input.accept = ".pdf,.docx,.doc,.png,.jpg,.jpeg,.heic,.heif";
              input.onchange = async (e) => {
                const target = e.target as HTMLInputElement;
                if (target.files) {
                  // This is a bit complex as we need the handleFiles logic here
                  // For now, let's navigate back with existing files 
                  // or just show a toast that adding more is coming
                  navigate("/upload", { state: { existingFiles: files } });
                }
              };
              input.click();
            }}
            aria-label="Upload more documents"
            className="w-10 h-10 flex items-center justify-center text-blue-500 hover:bg-blue-50 rounded-full transition-colors"
          >
            <Upload className="w-5 h-5" />
          </button>
        </div>

        <div className="relative group mb-4">
          <div className="flex justify-center">
            <div className="w-full max-w-[320px]">
              <PDFThumbnail file={currentFile.fileObj} />
            </div>
          </div>
          
          {/* Navigation Arrows */}
          {files.length > 1 && (
            <>
              <button 
                onClick={() => setActiveIndex(prev => Math.max(0, prev - 1))}
                disabled={activeIndex === 0}
                aria-label="Previous document"
                className="absolute left-0 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/90 shadow-md flex items-center justify-center text-slate-600 disabled:opacity-0 transition-all active:scale-90 z-10"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button 
                onClick={() => setActiveIndex(prev => Math.min(files.length - 1, prev + 1))}
                disabled={activeIndex === files.length - 1}
                aria-label="Next document"
                className="absolute right-0 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/90 shadow-md flex items-center justify-center text-slate-600 disabled:opacity-0 transition-all active:scale-90 z-10"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </>
          )}

          {/* Page Pill */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-slate-900/80 backdrop-blur-sm text-white px-3 py-1 rounded-full text-[9px] font-black tracking-wider shadow-lg">
            DOC {activeIndex + 1} OF {files.length}
          </div>
        </div>

        {/* Order Details Card */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 flex flex-col gap-4 relative">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-500">
                <FileText className="w-4 h-4" />
              </div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Print Settings</p>
            </div>
            <button onClick={() => setIsEditing(!isEditing)} className="px-3 py-1 rounded-full border border-blue-500/20 flex items-center gap-1.5 text-blue-500 text-[9px] font-black uppercase">
              <Edit2 className="w-2.5 h-2.5" /> {isEditing ? 'Close' : 'Adjust'}
            </button>
          </div>

          <div className="h-[1px] bg-slate-100 w-full" />

          <div className="grid grid-cols-3 gap-2 text-center pb-2">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Copies</p>
              <p className="text-sm font-black text-slate-800">{currentFile.copies}</p>
            </div>
            <div className="border-x border-slate-50">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Sides</p>
              <p className="text-sm font-black text-slate-800">{currentFile.isTwoSided ? 'Double' : 'Single'}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Bill</p>
              <p className="text-sm font-black text-blue-500">₹{calculateFileCost(currentFile)}</p>
            </div>
          </div>

          {/* Expanded Edit Settings */}
          <AnimatePresence>
            {isEditing && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden space-y-4 pt-4 border-t border-slate-50"
              >
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-400 uppercase flex items-center gap-1.5">
                    <Palette className="w-3 h-3 text-blue-500" /> Mode Choice
                  </label>
                  <SlidingToggle 
                    id={`mode-${currentFile.id}`}
                    pricing={pricing}
                    options={[
                      {label: "B&W", value: "bw"}, 
                      {label: "Color", value: "color"}, 
                      {label: "Mixed", value: "mixed"}
                    ]} 
                    value={currentFile.mode} 
                    onChange={(v) => updateFileSetting(currentFile.id, 'mode', v)} 
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-slate-400 uppercase flex items-center gap-1.5">
                      <CopyIcon className="w-3 h-3 text-blue-500" /> Quantity
                    </label>
                    <div className="bg-slate-100 rounded-xl p-1 flex items-center justify-between h-[36px]">
                      <button onClick={() => updateFileSetting(currentFile.id, 'copies', Math.max(1, currentFile.copies - 1))} className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400"><Minus className="w-4 h-4" /></button>
                      <span className="text-xs font-black text-slate-800">{currentFile.copies}</span>
                      <button onClick={() => updateFileSetting(currentFile.id, 'copies', currentFile.copies + 1)} className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400"><Plus className="w-4 h-4" /></button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-slate-400 uppercase flex items-center gap-1.5">
                      <Layers className="w-3 h-3 text-blue-500" /> Siding
                    </label>
                    <button 
                      onClick={() => updateFileSetting(currentFile.id, 'isTwoSided', !currentFile.isTwoSided)}
                      className={`w-full flex items-center justify-between px-3 h-[36px] rounded-xl border transition-all ${currentFile.isTwoSided ? "bg-blue-50 border-blue-200 text-blue-600" : "bg-slate-100 border-transparent text-slate-500"}`}
                    >
                      <span className="text-[10px] font-bold">Double Sided</span>
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-400 uppercase flex items-center gap-1.5">
                    <ScanText className="w-3 h-3 text-blue-500" /> Page Select
                  </label>
                  <SlidingToggle 
                    id={`range-${currentFile.id}`}
                    pricing={pricing}
                    options={[{label: "Full Document", value: "all"}, {label: "Custom Range", value: "custom"}]} 
                    value={currentFile.printRange} 
                    onChange={(v) => updateFileSetting(currentFile.id, 'printRange', v)} 
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Action Footer */}
      <div className="p-6 pt-8 pb-10 flex flex-col items-center gap-6">
        <button 
          onClick={() => {
            const filesWithCost = files.map(f => ({ ...f, calculatedCost: calculateFileCost(f) }));
            navigate("/payment", { state: { total: grandTotal, files: filesWithCost } });
          }}
          className="w-full h-12 bg-blue-500 hover:bg-blue-600 text-white rounded-2xl font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 transition-all active:scale-[0.98]"
        >
          <CreditCard className="w-4 h-4" />
          Pay ₹<AnimatedCounter value={grandTotal} /> & Get OTP
        </button>

        <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
          <ShieldCheck className="w-3.5 h-3.5 text-slate-300" />
          Secure Razorpay Checkout
        </div>
      </div>
    </PageTransition>
  );
};

export default ReviewPage;
