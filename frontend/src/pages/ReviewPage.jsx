import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, FileText, Edit2, Loader, CreditCard, ChevronLeft, ChevronRight, ShieldCheck, X, Settings, Minus, Plus } from 'lucide-react';
import { supabase } from '../supabase';

const ReviewPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  
  const { files: initialFiles = [], pricing = { bw: 2, color: 10, double_sided_discount: 0 } } = location.state || {};

  const [files, setFiles] = useState(initialFiles);
  const [isProcessing, setIsProcessing] = useState(false);
  const [loadingTextIndex, setLoadingTextIndex] = useState(0);

  const funnyStories = [
    "🐇 Processing your documents...",
    "🐅 Almost there, stay tuned...",
    "🍖 Calculating the best path for your prints...",
    "🧍‍♂️ Securing your transaction...",
    "🚀 Preparing your unique OTP..."
  ];

  useEffect(() => {
    let interval;
    if (isProcessing) {
      interval = setInterval(() => {
        setLoadingTextIndex((prev) => (prev + 1) % funnyStories.length);
      }, 2500);
    }
    return () => clearInterval(interval);
  }, [isProcessing]);

  // Pricing Logic (Sandwich Logic/Cost Calculation)
  const calculateFileCost = (file) => {
    let basePrice = 0;
    const pages = parseInt(file.pageCount) || 1;
    const copies = parseInt(file.copies) || 1;

    if (file.mode === 'bw') {
      if (!file.isTwoSided) {
        basePrice = pages * pricing.bw;
      } else {
        const physicalPapers = Math.ceil(pages / 2);
        basePrice = physicalPapers * pricing.bw;
      }
    } else if (file.mode === 'color') {
      if (!file.isTwoSided) {
        basePrice = pages * pricing.color;
      } else {
        const fullDoublePapers = Math.floor(pages / 2);
        const singlePagesRemaining = pages % 2;
        // Logic: Double-sided color might have a discount at some point, 
        // for now let's use ₹15 for double or original logic: (full * 15) + (single * 10)
        // Let's stick to the user's previously mentioned ₹15 code but make it dynamic if possible.
        // For now: (full * (pricing.color * 1.5)) + (single * pricing.color)
        basePrice = (fullDoublePapers * 15) + (singlePagesRemaining * 10);
      }
    }
    return basePrice * copies;
  };

  const grandTotal = useMemo(() => {
    return files.reduce((sum, file) => sum + calculateFileCost(file), 0);
  }, [files, pricing]);

  const updateFileSetting = (id, key, value) => {
    setFiles(prev => prev.map(f => {
      if (f.id === id) {
        const updated = { ...f, [key]: value };
        if (key === 'customRangeString' || key === 'printRange') {
            updated.pageCount = getCalculatedPageCount(updated);
            updated.rangeText = updated.printRange === 'all' ? 'All Pages' : updated.customRangeString;
        }
        return updated;
      }
      return f;
    }));
  };

  const getCalculatedPageCount = (file) => {
    const totalPages = file.originalPageCount;
    if (file.printRange === 'all' || !file.customRangeString.trim()) return totalPages;
    try {
      let pages = new Set();
      const parts = file.customRangeString.split(',');
      parts.forEach(part => {
        if (part.includes('-')) {
          let [start, end] = part.split('-').map(num => parseInt(num.trim()));
          if (!isNaN(start) && !isNaN(end)) {
            start = Math.max(1, start);
            end = Math.min(totalPages, end);
            for (let i = start; i <= end; i++) pages.add(i);
          }
        } else {
          const num = parseInt(part.trim());
          if (!isNaN(num) && num >= 1 && num <= totalPages) pages.add(num);
        }
      });
      return pages.size > 0 ? pages.size : totalPages;
    } catch (e) {
      return totalPages;
    }
  };

  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    document.body.appendChild(script);
  }, []);

  const handlePaymentAndUpload = async () => {
    if (files.length === 0) return;
    setIsProcessing(true);

    try {
      // 1. Create Order on Backend first
      const backendUrl = import.meta.env.VITE_EC2_IP || 'http://localhost:8080';
      const orderGenResponse = await fetch(`${backendUrl}/api/payments/create-order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: Math.round(grandTotal) })
      });
      const orderData = await orderGenResponse.json();
      if (!orderGenResponse.ok) throw new Error("Failed to initialize payment");

      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID,
        amount: orderData.amount,
        currency: "INR",
        name: "The Print स्पॉट",
        description: `Batch Payment for ${files.length} docs`,
        order_id: orderData.id,
        handler: async function (paymentResponse) {
          try {
            const orderResults = [];
            for (const fileItem of files) {
              const cleanFileName = fileItem.name.replace(/[\n\r]/g, '').replace(/[^a-zA-Z0-9.\-_]/g, '_');
              const uniqueName = `${Date.now()}_${cleanFileName}`;

              // Upload to Storage
              const { error: uploadError } = await supabase.storage.from('pdfs').upload(uniqueName, fileItem.fileObj);
              if (uploadError) throw uploadError;

              const { data: publicUrlData } = supabase.storage.from('pdfs').getPublicUrl(uniqueName);

              orderResults.push({
                  file_name: cleanFileName,
                  file_url: publicUrlData.publicUrl,
                  copies: parseInt(fileItem.copies),
                  mode: fileItem.mode,
                  is_two_sided: fileItem.isTwoSided,
                  print_range: fileItem.rangeText,
                  total_pages: parseInt(fileItem.pageCount),
                  total_amount: Math.round(calculateFileCost(fileItem)),
                  unique_name: uniqueName
              });
            }

            // 2. Complete Order on Backend with verification
            const response_backend = await fetch(`${backendUrl}/api/orders/create-batch`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                items: orderResults,
                razorpay_order_id: paymentResponse.razorpay_order_id,
                razorpay_payment_id: paymentResponse.razorpay_payment_id,
                razorpay_signature: paymentResponse.razorpay_signature,
                total_grand_amount: Math.round(grandTotal)
              })
            });

            const backendData = await response_backend.json();
            if (!response_backend.ok) throw new Error(backendData.detail || "Server Error");

            navigate('/success', { state: { otp: backendData.otp, fileName: `${files.length} Documents` } });
          } catch (err) {
            console.error("Processing Error:", err);
            alert(`Error: ${err.message}`);
            setIsProcessing(false);
          }
        },
        prefill: { name: "Consumer", contact: "9999999999" },
        theme: { color: "#0ea5e9" }
      };
      
      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', () => setIsProcessing(false));
      rzp.open();
    } catch (err) {
      alert(`Initialization Error: ${err.message}`);
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-vh-100 d-flex flex-column" style={{ backgroundColor: '#f0f9ff' }}>
      {isProcessing && (
        <div className="position-fixed top-0 start-0 w-100 h-100 d-flex flex-column justify-content-center align-items-center bg-white bg-opacity-90" style={{ zIndex: 1000, backdropFilter: 'blur(5px)' }}>
          <Loader size={60} className="fa-spin mb-4" style={{ color: '#0ea5e9' }} />
          <h4 className="fw-bold text-dark mb-2">Generating your OTP...</h4>
          <div className="badge bg-light text-dark fs-6 py-2 px-4 rounded-pill shadow-sm border mt-2">
             {funnyStories[loadingTextIndex]}
          </div>
        </div>
      )}

      {/* Header */}
      <div className="p-3 d-flex align-items-center bg-white shadow-sm sticky-top">
        <button className="btn btn-link text-dark p-0 me-3" onClick={() => navigate(-1)}><ArrowLeft size={24}/></button>
        <h5 className="mb-0 fw-bold">Review Documents</h5>
      </div>

      <div className="container py-3" style={{ maxWidth: '500px' }}>
        <div className="d-flex flex-column gap-3 mb-5 px-2">
          {files.map((file, idx) => (
            <div key={file.id} className="card border-0 shadow-sm rounded-4 bg-white overflow-hidden">
               <div className="bg-light p-3 border-bottom d-flex justify-content-between align-items-center">
                  <div className="d-flex align-items-center gap-2 text-truncate">
                    <FileText size={18} className="text-primary" />
                    <span className="fw-bold text-dark text-truncate small">File {idx + 1}: {file.name}</span>
                  </div>
                  <span className="badge bg-info bg-opacity-10 text-primary rounded-pill">₹{calculateFileCost(file)}</span>
               </div>
               
               <div className="p-3">
                  <div className="row g-2 mb-3">
                    <div className="col-6">
                       <label className="text-muted small fw-bold mb-1">Color Mode</label>
                       <div className="btn-group w-100 rounded-3 overflow-hidden border">
                          <button onClick={() => updateFileSetting(file.id, 'mode', 'bw')} className={`btn btn-sm ${file.mode === 'bw' ? 'btn-primary' : 'btn-white'}`}>B/W</button>
                          <button onClick={() => updateFileSetting(file.id, 'mode', 'color')} className={`btn btn-sm ${file.mode === 'color' ? 'btn-primary' : 'btn-white'}`}>Color</button>
                       </div>
                    </div>
                    <div className="col-6">
                       <label className="text-muted small fw-bold mb-1">Copies</label>
                       <div className="d-flex align-items-center justify-content-between border rounded-3 px-2 py-1">
                          <button onClick={() => updateFileSetting(file.id, 'copies', Math.max(1, file.copies - 1))} className="btn btn-link p-0 text-dark"><Minus size={14}/></button>
                          <span className="fw-bold">{file.copies}</span>
                          <button onClick={() => updateFileSetting(file.id, 'copies', file.copies + 1)} className="btn btn-link p-0 text-dark"><Plus size={14}/></button>
                       </div>
                    </div>
                  </div>

                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <span className="text-muted small fw-bold">Both Sides (Duplex)</span>
                    <div className="form-check form-switch fs-5 mb-0">
                      <input className="form-check-input shadow-none" type="checkbox" checked={file.isTwoSided} onChange={() => updateFileSetting(file.id, 'isTwoSided', !file.isTwoSided)} />
                    </div>
                  </div>

                  <div className="bg-light p-2 rounded-3">
                    <div className="d-flex gap-2 mb-2">
                      <div className="form-check">
                        <input className="form-check-input" type="radio" name={`range_${file.id}`} id={`all_${file.id}`} checked={file.printRange === 'all'} onChange={() => updateFileSetting(file.id, 'printRange', 'all')} />
                        <label className="form-check-label small" htmlFor={`all_${file.id}`}>All Pages ({file.originalPageCount})</label>
                      </div>
                      <div className="form-check">
                        <input className="form-check-input" type="radio" name={`range_${file.id}`} id={`custom_${file.id}`} checked={file.printRange === 'custom'} onChange={() => updateFileSetting(file.id, 'printRange', 'custom')} />
                        <label className="form-check-label small" htmlFor={`custom_${file.id}`}>Range</label>
                      </div>
                    </div>
                    {file.printRange === 'custom' && (
                      <input 
                        type="text" 
                        className="form-control form-control-sm border-secondary border-opacity-25" 
                        placeholder="e.g. 1-2, 5" 
                        value={file.customRangeString}
                        onChange={(e) => updateFileSetting(file.id, 'customRangeString', e.target.value)}
                      />
                    )}
                  </div>
               </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-auto bg-white border-top p-4 sticky-bottom shadow-lg" style={{ borderRadius: '24px 24px 0 0' }}>
         <div className="d-flex justify-content-between align-items-center mb-3">
            <span className="fw-bold text-secondary">Total Bill</span>
            <div className="text-end">
               <h4 className="fw-bolder mb-0" style={{ color: '#0ea5e9' }}>₹{grandTotal}</h4>
               <small className="text-muted">{files.length} Multi-File Bundle</small>
            </div>
         </div>
         <button 
           onClick={handlePaymentAndUpload} 
           disabled={isProcessing || files.length === 0} 
           className="btn btn-lg w-100 py-3 rounded-pill fw-bold text-white shadow-sm flex-center gap-2"
           style={{ backgroundColor: '#0ea5e9', border: 'none' }}
         >
           <CreditCard size={20}/> Pay & Get Multi-Print OTP
         </button>
      </div>
    </div>
  );
};

export default ReviewPage;