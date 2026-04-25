import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { PageTransition } from "@/components/PageTransition";
import { GlowButton } from "@/components/GlowButton";
import { AnimatedCounter } from "@/components/AnimatedCounter";
import { useState, useCallback, useEffect, useMemo, memo, useRef } from "react";
import { 
  Upload, FileText, X, ArrowRight, ArrowLeft, Shield, Zap, Lock, 
  Cloud, Plus, Minus, CreditCard, Layers, Palette, 
  ScanText, Loader2, Copy as CopyIcon, Presentation, Table
} from "lucide-react";
import { countPagesFast, convertImageToPdf, countDocxPages, countPptxPages, countXlsxPages, extractOfficeThumbnail } from "@/lib/pdf-utils";
import * as pdfjs from 'pdfjs-dist';
import { renderAsync } from 'docx-preview';
import { useFiles, UploadedFile } from "@/context/FilesContext";
import { IOSCompatibleThumbnail } from "@/components/IOSCompatibleThumbnail";

// Robust worker configuration for Vite
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';
pdfjs.GlobalWorkerOptions.workerSrc = pdfjsWorker;

const floatingShapes = [
  { x: "10%", y: "20%", size: 80, delay: 0, duration: 6 },
  { x: "85%", y: "15%", size: 60, delay: 1, duration: 8 },
  { x: "70%", y: "70%", size: 100, delay: 2, duration: 7 },
  { x: "15%", y: "75%", size: 50, delay: 0.5, duration: 9 },
  { x: "50%", y: "10%", size: 40, delay: 1.5, duration: 5 },
];

const trustFeatures = [
  { icon: Shield, title: "Zero Retention", desc: "Files auto-deleted after printing.", gradient: "from-primary to-blue-400" },
  { icon: Zap, title: "Instant Processing", desc: "Lightning-fast conversion.", gradient: "from-blue-400 to-cyan-400" },
  { icon: Lock, title: "End-to-End Encrypted", desc: "Military-grade encryption.", gradient: "from-cyan-400 to-primary" },
];

const PDFThumbnail = memo(({ file }: { file: File }) => {
  const [thumbnail, setThumbnail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const docxRef = useRef<HTMLDivElement>(null);

  const name = file.name.toLowerCase();
  const isDocx = name.endsWith('.docx') || file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  const isPptx = name.endsWith('.pptx') || file.type === 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
  const isXlsx = name.endsWith('.xlsx') || file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

  // For PPTX and XLSX, try to extract the embedded thumbnail
  useEffect(() => {
    if (!isPptx && !isXlsx) return;
    let isMounted = true;
    extractOfficeThumbnail(file).then(thumb => {
      if (isMounted) {
        setThumbnail(thumb);
        setLoading(false);
      }
    }).catch(() => {
      if (isMounted) setLoading(false);
    });
    return () => { isMounted = false; };
  }, [file, isPptx, isXlsx]);

  useEffect(() => {
    if (isDocx || isPptx || isXlsx) return;
    let isMounted = true;
    let mainUrl = '';

    const generate = async () => {
      try {
        if (!file) return;
        if (file.type && file.type.startsWith('image/')) {
          mainUrl = URL.createObjectURL(file);
          if (isMounted) { setThumbnail(mainUrl); setLoading(false); }
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
        const viewport = page.getViewport({ scale: 0.8 }); 
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        if (!context) throw new Error("Canvas Error");
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        await page.render({ canvasContext: context, viewport }).promise;
        if (isMounted) { setThumbnail(canvas.toDataURL('image/jpeg', 0.8)); setLoading(false); }
      } catch (err) {
        if (isMounted) { setError(true); setLoading(false); }
      }
    };
    generate();
    return () => { isMounted = false; if (mainUrl) URL.revokeObjectURL(mainUrl); };
  }, [file, isDocx, isPptx, isXlsx]);

  useEffect(() => {
    if (!isDocx || !docxRef.current) return;
    let isMounted = true;
    const renderDocx = async () => {
      try {
        const arrayBuffer = await file.arrayBuffer();
        if (isMounted && docxRef.current) {
          await renderAsync(arrayBuffer, docxRef.current, undefined, {
            className: "docx-render",
            inWrapper: false,
            ignoreWidth: true,
            ignoreHeight: true,
          });
          if (isMounted) setLoading(false);
        }
      } catch (err) {
        if (isMounted) { setError(true); setLoading(false); }
      }
    };
    renderDocx();
    return () => { isMounted = false; };
  }, [isDocx, file]);

  return (
    <div className="w-full aspect-[3/4] bg-white dark:bg-slate-900 rounded-2xl overflow-hidden flex items-center justify-center relative border border-slate-200 dark:border-slate-800 shadow-xl group-hover:scale-[1.05] transition-all duration-500 ring-1 ring-slate-900/5">
      {isDocx ? (
        <div className="w-full h-full relative overflow-hidden bg-white flex items-center justify-center p-4">
           {loading && (
             <div className="absolute inset-0 flex flex-col items-center justify-center bg-white z-30">
               <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
             </div>
           )}
           <div ref={docxRef} className="scale-[0.22] w-[816px] h-[1100px] pointer-events-none flex-shrink-0" />
           <div className="absolute bottom-0 right-0 bg-blue-600 px-3 py-1.5 rounded-tl-2xl shadow-2xl z-20">
             <span className="text-[10px] font-black text-white uppercase tracking-widest">Docx</span>
           </div>
        </div>
      ) : isPptx || isXlsx ? (
        <div className="w-full h-full relative overflow-hidden bg-white flex items-center justify-center p-4">
          {loading ? (
             <div className="absolute inset-0 flex flex-col items-center justify-center bg-white z-30">
               <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
             </div>
          ) : thumbnail ? (
             <img loading="lazy" src={thumbnail} alt="Document preview" className="w-full h-full object-cover" />
          ) : (
             <div className="flex flex-col items-center gap-2 text-slate-300 dark:text-slate-700">
               {isPptx ? <Presentation className="w-16 h-16 opacity-30 text-orange-500" /> : <Table className="w-16 h-16 opacity-30 text-green-500" />}
             </div>
          )}
          <div className={`absolute bottom-0 right-0 px-3 py-1.5 rounded-tl-2xl shadow-2xl z-20 ${isPptx ? 'bg-orange-600' : 'bg-green-600'}`}>
            <span className="text-[10px] font-black text-white uppercase tracking-widest">{isPptx ? 'Pptx' : 'Xlsx'}</span>
          </div>
        </div>
      ) : loading ? (
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
        </div>
      ) : thumbnail ? (
        <img loading="lazy" src={thumbnail} alt="Document preview" className="w-full h-full object-cover" />
      ) : (
        <div className="flex flex-col items-center gap-2 text-slate-300 dark:text-slate-700">
          <FileText className="w-12 h-12 opacity-30" />
        </div>
      )}
    </div>
  );
});

const SlidingToggle = ({ options, value, onChange, id, isMobile }: { options: string[], value: string, onChange: (v: any) => void, id: string, isMobile: boolean }) => (
  <div className="bg-slate-100 dark:bg-slate-800/50 rounded-xl p-1 flex relative gap-1 border border-slate-200 dark:border-slate-700 w-full">
    {options.map((opt) => (
      <button
        key={opt}
        onClick={() => onChange(opt.toLowerCase().replace('&', '').replace(' ', ''))}
        className={`relative z-10 flex-1 py-2 text-[10px] md:text-xs font-bold transition-colors duration-300 ${
          (value === opt.toLowerCase().replace('&', '').replace(' ', ''))
            ? "text-white" 
            : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
        }`}
      >
        <span className="relative z-10">{opt}</span>
        {value === opt.toLowerCase().replace('&', '').replace(' ', '') && (
          <motion.div
            layoutId={isMobile ? undefined : `toggle-bg-${id}`}
            className="absolute inset-0 bg-blue-600 rounded-lg shadow-lg shadow-blue-500/20"
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            style={isMobile ? { backgroundColor: 'rgb(37 99 235)' } : {}}
          />
        )}
      </button>
    ))}
  </div>
);

const OrderPage = () => {
  const navigate = useNavigate();
  const { files, setFiles } = useFiles();
  const [isDragging, setIsDragging] = useState(false);
  const [isAbsorbing, setIsAbsorbing] = useState(false);
  const [pricing, setPricing] = useState({ bw: 2, color: 10 });
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);

    const backendUrl = import.meta.env.VITE_EC2_IP || 'http://localhost:8080';
    fetch(`${backendUrl}/api/settings/pricing`)
      .then(res => res.json())
      .then(data => setPricing(data))
      .catch(err => console.log("Pricing fetch error", err));

    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const handleFiles = useCallback(async (fileList: FileList) => {
    setIsAbsorbing(true);
    const processedFiles: UploadedFile[] = [];

    for (const f of Array.from(fileList)) {
      if (files.some(existing => existing.name === f.name && existing.size === f.size)) continue;

      let finalFile = f;
      let pageCount = 1;

      if (f.type === 'application/pdf') {
        pageCount = await countPagesFast(f);
      } else if (f.name.toLowerCase().endsWith('.docx') || f.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        pageCount = await countDocxPages(f);
      } else if (f.name.toLowerCase().endsWith('.pptx') || f.type === 'application/vnd.openxmlformats-officedocument.presentationml.presentation') {
        pageCount = await countPptxPages(f);
      } else if (f.name.toLowerCase().endsWith('.xlsx') || f.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
        pageCount = await countXlsxPages(f);
      } else if (f.type.startsWith('image/')) {
        try { finalFile = await convertImageToPdf(f); } catch (err) { continue; }
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
        originalPageCount: pageCount,
        printRange: "all",
        customRangeString: "",
        colorPagesString: "",
        paperSize: "a4"
      });
    }

    setFiles(prev => [...prev, ...processedFiles]);
    setIsAbsorbing(false);
  }, [files, setFiles]);

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
    if (file.customRangeString.trim()) {
      try {
        let pagesSet = new Set<number>();
        const parts = file.customRangeString.split(',');
        parts.forEach(part => {
          if (part.includes('-')) {
            let [start, end] = part.split('-').map(num => parseInt(num.trim()));
            if (!isNaN(start) && !isNaN(end)) {
              for (let i = Math.max(1, start); i <= Math.min(totalPages, end); i++) pagesSet.add(i);
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

  const grandTotal = useMemo(() => files.reduce((sum, f) => sum + calculateFileCost(f), 0), [files, pricing, calculateFileCost]);
  const totalSheets = useMemo(() => files.reduce((sum, f) => sum + (f.isTwoSided ? Math.ceil(f.pages / 2) : f.pages), 0), [files]);

  return (
    <PageTransition className="min-h-screen gradient-mesh relative overflow-x-hidden flex flex-col">
       {/* Floating background shapes - Disabled on mobile */}
       {!isMobile && floatingShapes.map((shape, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full opacity-[0.04] bg-primary pointer-events-none"
          style={{ left: shape.x, top: shape.y, width: shape.size, height: shape.size }}
          animate={{ y: [0, -20, 0], x: [0, 10, 0], scale: [1, 1.1, 1] }}
          transition={{ duration: shape.duration, repeat: Infinity, delay: shape.delay, ease: "easeInOut" }}
        />
      ))}

      <div className="flex-grow max-w-6xl mx-auto px-6 py-12 w-full z-10">
        <button onClick={() => navigate("/")} aria-label="Go back to landing page" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8 group">
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" /> Back
        </button>

        <AnimatePresence mode="wait">
          {files.length === 0 ? (
            <motion.div key="empty" initial={{ opacity: 0, y: isMobile ? 10 : 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}>
              <div className="text-center mb-12">
                <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass text-xs font-medium text-primary mb-6">
                  <Cloud className="w-3.5 h-3.5" /> Secure cloud printing
                </motion.div>
                <h1 className="text-5xl md:text-7xl font-display font-bold mb-4 tracking-tighter">
                  Upload your <span className="text-gradient">files</span>
                </h1>
                <p className="text-muted-foreground text-base md:text-lg max-w-md mx-auto">Drag & drop or click to browse. We handle the rest.</p>
              </div>

              <motion.div
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(e) => { e.preventDefault(); setIsDragging(false); if (e.dataTransfer.files.length) handleFiles(e.dataTransfer.files); }}
                onClick={() => {
                  const input = document.createElement("input");
                  input.type = "file";
                  input.multiple = true;
                  input.onchange = (e) => { if ((e.target as any).files) handleFiles((e.target as any).files); };
                  input.click();
                }}
                className="relative cursor-pointer group"
              >
                {!isMobile && <motion.div className="absolute -inset-1 rounded-[2rem] bg-gradient-to-r from-primary/20 via-blue-400/20 to-cyan-400/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-700" animate={isDragging ? { opacity: 1, scale: 1.02 } : {}} />}
                <motion.div animate={{ scale: isDragging ? 1.02 : 1, borderColor: isDragging ? "hsl(221, 83%, 53%)" : "hsl(214, 32%, 91%)" }} className={`relative glass rounded-[3rem] border-2 border-dashed p-12 md:p-24 flex flex-col items-center justify-center overflow-hidden ${isAbsorbing ? "animate-pulse-glow" : ""}`}>
                  <AnimatePresence mode="wait">
                    {isAbsorbing ? (
                      <motion.div key="absorbing" initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex flex-col items-center relative z-10">
                        <div className="relative w-16 h-16">
                          <div className="w-16 h-16 rounded-full border-4 border-primary/30 border-t-primary animate-spin" />
                          <div className="absolute inset-0 flex items-center justify-center"><Upload className="w-6 h-6 text-primary" /></div>
                        </div>
                        <p className="mt-6 text-sm font-black text-foreground uppercase tracking-widest">Processing...</p>
                      </motion.div>
                    ) : (
                      <motion.div key="idle" initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex flex-col items-center relative z-10">
                        <div className="relative">
                          <div className="w-16 h-16 md:w-20 md:h-20 rounded-3xl gradient-hero flex items-center justify-center shadow-lg"><Upload className="w-7 h-7 md:w-9 md:h-9 text-primary-foreground" /></div>
                        </div>
                        <p className="font-display font-bold text-lg text-foreground mt-6">Drop files here</p>
                        <p className="text-sm text-muted-foreground mt-1">or <span className="text-primary font-medium underline">browse</span> your device</p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              </motion.div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-16">
                {trustFeatures.map((f, i) => (
                  <div key={f.title} className="glass-strong rounded-2xl p-6 group cursor-default relative overflow-hidden">
                    <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${f.gradient} flex items-center justify-center mb-4 shadow-lg`}><f.icon className="w-5 h-5 text-primary-foreground" /></div>
                    <h3 className="font-display font-bold text-foreground text-base mb-1.5">{f.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
                  </div>
                ))}
              </div>
            </motion.div>
          ) : (
            <div className="space-y-10 pb-48">
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                 <div>
                   <h2 className="text-3xl md:text-5xl font-display font-bold text-slate-900 dark:text-white tracking-tight">Print Settings</h2>
                   <p className="text-blue-600 font-black uppercase tracking-[0.2em] text-[10px] mt-1">Configuration Dashboard</p>
                 </div>
                 <button onClick={() => {
                   const input = document.createElement("input");
                   input.type = "file";
                   input.multiple = true;
                   input.onchange = (e) => { if ((e.target as any).files) handleFiles((e.target as any).files); };
                   input.click();
                 }} 
                 aria-label="Add more documents"
                 className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-8 py-3.5 rounded-2xl font-black text-xs transition-all shadow-xl shadow-blue-500/20 uppercase tracking-widest"
               >
                   <Plus className="w-4 h-4" /> Add
                 </button>
              </div>

              <div className={`flex overflow-x-auto gap-8 pb-8 snap-x snap-mandatory no-scrollbar px-4 -mx-4 items-stretch ${files.length === 1 ? 'justify-start md:justify-center' : 'justify-start'}`}>
                {files.map((file, idx) => (
                  <div key={file.id} className="min-w-[85vw] md:min-w-[420px] snap-center bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-xl border border-white dark:border-slate-800 overflow-hidden flex flex-col">
                    <div className="p-8 pb-4 flex flex-col items-center relative">
                      {/* Close Button top right */}
                      <button 
                        onClick={() => setFiles(prev => prev.filter(f => f.id !== file.id))} 
                        aria-label="Remove this file"
                        className="absolute top-6 right-6 text-slate-300 hover:text-red-500 transition-colors"
                      >
                        <X className="w-5 h-5"/>
                      </button>

                      <div className="w-44 md:w-52 mb-8">
                        <PDFThumbnail file={file.fileObj} />
                      </div>

                      <div className="text-center w-full">
                        <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest block mb-2">Doc #{idx+1}</span>
                        <div className="flex items-center justify-center gap-3 mb-2 flex-wrap px-4">
                          <h3 className="text-base font-black text-slate-800 dark:text-slate-200 truncate max-w-[180px] tracking-tight">{file.name}</h3>
                          <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800/50 px-3 py-1 rounded-full border border-slate-100 dark:border-slate-700">
                            <span className="text-lg font-black text-primary">₹{calculateFileCost(file)}</span>
                            <span className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter">incl. Tax</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="p-8 space-y-6 flex-grow">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                         <div className="space-y-3">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><Palette className="w-3 h-3 text-blue-500"/> Color</label>
                            <SlidingToggle id={`mode-${file.id}`} options={["B&W", "Color", "Mixed"]} value={file.mode} onChange={(v) => updateFileSetting(file.id, 'mode', v)} isMobile={isMobile} />
                            {file.mode === 'mixed' && (
                              <div className="pt-2">
                                <p className="text-[9px] font-bold text-red-500 mb-2 uppercase tracking-tight flex items-center gap-1">
                                  <Zap className="w-2.5 h-2.5" /> Note: Only the pages you specify below will be in color. All other pages will be B&W.
                                </p>
                                <input type="text" placeholder="e.g. 1, 3-5" value={file.colorPagesString} onChange={(e) => updateFileSetting(file.id, 'colorPagesString', e.target.value)} className="w-full bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl py-2 px-3 text-base md:text-[10px] font-bold outline-none"/>
                              </div>
                            )}
                         </div>
                         <div className="space-y-3">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><CopyIcon className="w-3 h-3 text-blue-500"/> Quantity</label>
                            <div className="bg-slate-100 dark:bg-slate-800/50 rounded-xl p-1 flex items-center justify-between border border-slate-200 dark:border-slate-700 h-[42px]">
                               <button onClick={() => updateFileSetting(file.id, 'copies', Math.max(1, file.copies-1))} aria-label="Decrease copies" className="w-10 h-10 rounded-lg flex items-center justify-center text-slate-400 hover:text-blue-600 transition-all"><Minus className="w-4 h-4"/></button>
                               <span className="text-sm font-black text-slate-800 dark:text-white tabular-nums">{file.copies}</span>
                               <button onClick={() => updateFileSetting(file.id, 'copies', file.copies+1)} aria-label="Increase copies" className="w-10 h-10 rounded-lg flex items-center justify-center text-slate-400 hover:text-blue-600 transition-all"><Plus className="w-4 h-4"/></button>
                            </div>
                         </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                         <div className="space-y-3">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><Layers className="w-3 h-3 text-blue-500"/> Paper</label>
                            <button onClick={() => updateFileSetting(file.id, 'isTwoSided', !file.isTwoSided)} className={`w-full flex items-center justify-between px-5 py-2.5 rounded-xl border transition-all duration-300 ${file.isTwoSided ? "bg-blue-600/5 border-blue-600/20 text-blue-600" : "bg-slate-100 border-slate-200 dark:bg-slate-800/50 text-slate-500"}`}>
                               <span className="text-xs font-bold">Double Sided</span>
                               <div className={`w-10 h-5 rounded-full relative ${file.isTwoSided ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-700'}`}>
                                 <div className={`w-4 h-4 bg-white rounded-full mt-0.5 transition-all ${file.isTwoSided ? 'translate-x-[22px]' : 'translate-x-[2px]'}`} />
                               </div>
                            </button>
                         </div>
                         <div className="space-y-3">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><ScanText className="w-3 h-3 text-blue-500"/> Pages</label>
                             <SlidingToggle id={`range-${file.id}`} options={["All", "Custom"]} value={file.printRange} onChange={(v) => updateFileSetting(file.id, 'printRange', v)} isMobile={isMobile} />
                             {file.printRange === 'custom' && (
                               <div className="pt-2">
                                 <input 
                                   type="text" 
                                   placeholder="e.g. 1-5, 8, 11-13" 
                                   value={file.customRangeString} 
                                   onChange={(e) => updateFileSetting(file.id, 'customRangeString', e.target.value)} 
                                   className="w-full bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl py-2 px-3 text-base md:text-[10px] font-bold outline-none"
                                 />
                               </div>
                             )}
                          </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {files.length > 0 && (
          <motion.div initial={{ y: 200 }} animate={{ y: 0 }} exit={{ y: 200 }} className="fixed bottom-0 left-0 right-0 z-50 p-6 md:pb-10" style={{ paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom))' }}>
            <div className="max-w-xl mx-auto">
              <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl rounded-[3rem] p-4 flex items-center justify-between border border-white dark:border-slate-800 shadow-2xl">
                <div className="pl-6 py-2">
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Total</p>
                   <div className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white flex items-baseline gap-1">
                      <span className="text-lg font-bold text-blue-600">₹</span>
                      <AnimatedCounter value={grandTotal} />
                   </div>
                </div>
                <button 
                  onClick={() => {
                    // Final safety check: Ensure no file exceeds 50MB
                    const tooLargeFile = files.find(f => f.fileObj.size > 50 * 1024 * 1024);
                    if (tooLargeFile) {
                      toast.error(`"${tooLargeFile.name}" exceeds the 50MB limit. Please remove it to proceed.`);
                      return;
                    }

                    const filesWithCost = files.map(f => ({ ...f, calculatedCost: calculateFileCost(f) }));
                    navigate("/payment", { state: { total: grandTotal, files: filesWithCost } });
                  }}
                  className="bg-blue-600 hover:bg-blue-500 text-white h-16 md:h-20 px-8 md:px-10 rounded-[2.5rem] font-black text-base md:text-lg transition-all active:scale-95 flex items-center gap-3 shadow-xl"
                >
                   <span>Confirm & Pay</span>
                   <CreditCard className="w-5 h-5" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </PageTransition>
  );
};

export default OrderPage;
