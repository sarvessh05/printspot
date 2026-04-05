 


import React, { useState, useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, FileText, Edit2, Loader, CreditCard, ChevronLeft, ChevronRight, ShieldCheck } from 'lucide-react';

// PDF Rendering
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Supabase Import
import { supabase } from '../supabase';

// 🚀 HACK 1: Local Worker from Public Folder
pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

const ReviewPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  
  const { 
    file = 'Unknown File', 
    fileObj, 
    copies = 1, 
    mode = 'bw', 
    pageCount = 1, 
    isTwoSided = false, 
    rangeText = 'All Pages' 
  } = location.state || {};

  const [isProcessing, setIsProcessing] = useState(false);
  const [numPages, setNumPages] = useState(pageCount);
  const [currentPage, setCurrentPage] = useState(1);
  const [previewUrl, setPreviewUrl] = useState(null);
  
  // 🐅 ADDED: Tiger & Rabbit Story State
  const [loadingTextIndex, setLoadingTextIndex] = useState(0);

  const isImage = fileObj?.type?.startsWith('image/');

  // 🐅 ADDED: Jungle Story Array
  const funnyStories = [
    "🐇 Khargosh jungle mein bhaag raha hai...",
    "🐅 Baagh khargosh ke peeche pada hai...",
    "🍖 Baagh ne khargosh ko dabocha...",
    "🧍‍♂️ Insaan ne teer se baagh ko gira diya...",
    " Baagh ne 🐇 ko chhoda aur apni zindagi bachayi",

    "🚀Bas aapki file upload ho hi gayi hai...",
    "   Internet Slow hai Aapka thodi location badal lo, par humari printer tez hai! Thoda sa intezaar karo...",
  ];

  // 🐅 ADDED: Story Changer Effect
  useEffect(() => {
    let interval;
    if (isProcessing) {
      interval = setInterval(() => {
        setLoadingTextIndex((prev) => (prev + 1) % funnyStories.length);
      }, 2500); // Har 2.5 second mein line badlegi
    } else {
      setLoadingTextIndex(0);
    }
    return () => clearInterval(interval);
  }, [isProcessing]);

  // 💰 HACK 2: Tera Custom Indian Pricing Model (Mathematics)
  const totalBill = useMemo(() => {
    let basePrice = 0;
    const pages = parseInt(pageCount) || 1;

    if (mode === 'bw') {
      if (!isTwoSided) {
        // Single side B&W: ₹2 per page
        basePrice = pages * 2;
      } else {
        // Double side B&W: ₹2 per physical paper (708 pages / 2 = 354 papers)
        const physicalPapers = Math.ceil(pages / 2);
        basePrice = physicalPapers * 2;
      }
    } else if (mode === 'color') {
      if (!isTwoSided) {
        // Single side Color: ₹10 per page
        basePrice = pages * 10;
      } else {
        // Double side Color: ₹15 for full double-sided paper, ₹10 for remaining single side
        const fullDoublePapers = Math.floor(pages / 2); // pairs
        const singlePagesRemaining = pages % 2; // odd page left
        basePrice = (fullDoublePapers * 15) + (singlePagesRemaining * 10);
      }
    }
    
    // Multiply by number of copies requested
    return basePrice * (parseInt(copies) || 1);
  }, [pageCount, mode, isTwoSided, copies]);

  useEffect(() => {
    if (fileObj) {
      const url = URL.createObjectURL(fileObj);
      setPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    }
  }, [fileObj]);

  // Jaise hi page khulega, Razorpay background mein ready ho jayega
  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    document.body.appendChild(script);
  }, []);

  const onDocumentLoadSuccess = ({ numPages }) => {
    setNumPages(numPages);
  };

  const handlePaymentAndUpload = async () => {
    if (!fileObj) return;
    setIsProcessing(true);

    const options = {
      key: import.meta.env.VITE_RAZORPAY_KEY_ID,
      amount: Math.round(totalBill * 100), // Paise mein convert
      currency: "INR",
      name: "The Print स्पॉट", // ✨ THEME: Updated Name
      description: `Order for ${file}`,
      handler: async function (response) {
        try {
          const otp = Math.floor(100000 + Math.random() * 900000).toString();
          const cleanFileName = file.replace(/[\n\r]/g, '').replace(/[^a-zA-Z0-9.\-_]/g, '_');
          const uniqueName = `${Date.now()}_${cleanFileName}`;

          // 1. Storage Upload
          const { error: uploadError } = await supabase.storage.from('pdfs').upload(uniqueName, fileObj);
          if (uploadError) throw uploadError;

          const { data: publicUrlData } = supabase.storage.from('pdfs').getPublicUrl(uniqueName);

          // 2. Database Insert
          const { error: dbError } = await supabase.from('print_orders').insert([{
             file_name: cleanFileName,
            file_url: publicUrlData.publicUrl,
            copies: parseInt(copies),
            mode: mode,
            is_two_sided: isTwoSided,
            print_range: rangeText, 
            total_pages: parseInt(pageCount),
            total_amount: Math.round(totalBill),
            otp: otp,
             payment_status: 'paid',
            payment_id: response.razorpay_payment_id,  
            unique_name: uniqueName
          }]);

          if (dbError) throw dbError;

          // 3. LocalStorage
          const newOrder = { fileName: file, otp, date: new Date().toLocaleDateString() };
          const existing = JSON.parse(localStorage.getItem('saved_print_otps') || '[]');
          localStorage.setItem('saved_print_otps', JSON.stringify([newOrder, ...existing]));

          // 4. Success Page redirect
          navigate('/success', { state: { otp, fileName: file } });
        } catch (err) {
          console.error("Supabase Error:", err);
          alert(`Database Error: ${err.message}`);
          setIsProcessing(false);
        }
      },
      prefill: { name: "User", contact: "9999999999" },
      theme: { color: "#0ea5e9" } // ✨ THEME: Razorpay checkout color updated to Light Blue
    };
    const rzp = new window.Razorpay(options);
    rzp.open();
    
    // Agar user popup close kar de toh processing hatani hai
    rzp.on('payment.failed', function () {
      setIsProcessing(false);
    });
  };

  // 🚀 HACK 3: Device Pixel Ratio optimizer for crisp yet lightweight text
  const customPixelRatio = Math.min(window.devicePixelRatio || 1, 1.2);

  return (
    // ✨ THEME: Changed background to match Light Blue theme
    <div className="min-vh-100 d-flex flex-column" style={{ backgroundColor: '#f0f9ff' }}>
      
      {/* 🐅 ANIMATED LOADER SCREEN */}
      {isProcessing && (
        <div className="position-fixed top-0 start-0 w-100 h-100 d-flex flex-column justify-content-center align-items-center bg-white bg-opacity-90" style={{ zIndex: 1000, backdropFilter: 'blur(5px)' }}>
          <Loader size={60} className="fa-spin mb-4" style={{ color: '#0ea5e9' }} />
          <h4 className="fw-bold text-dark mb-2">Processing Order...</h4>
          <div className="badge bg-light text-dark fs-5 py-2 px-4 rounded-pill shadow-sm border mt-2 transition-all">
             {funnyStories[loadingTextIndex]}
          </div>
        </div>
      )}

      {/* Header */}
      <div className="p-3 d-flex align-items-center bg-white shadow-sm mb-3">
        <button className="btn btn-link text-dark p-0 me-3" onClick={() => navigate(-1)}><ArrowLeft size={24}/></button>
        <h5 className="mb-0 fw-bold">Review & Pay</h5>
      </div>

      <div className="container" style={{ maxWidth: '500px' }}>
        
        {/* PDF PREVIEW CAROUSEL */}
        <div className="card border-0 shadow-sm mb-4 bg-dark d-flex justify-content-center align-items-center position-relative mx-2" style={{ borderRadius: '25px', height: '400px', overflow: 'hidden' }}>
          
          {isImage ? (
            <img src={previewUrl} alt="Preview" className="img-fluid" style={{ maxHeight: '100%', objectFit: 'contain' }} />
          ) : (
            <div className="w-100 h-100 d-flex flex-column justify-content-center align-items-center">
              <Document 
                file={fileObj} 
                onLoadSuccess={onDocumentLoadSuccess}
                loading={<Loader className="animate-spin text-white" />}
              >
                {/* Memory Optimizer: Sirf 1 page load hoga ek time par, baki unmount */}
                <Page 
                  key={`page_${currentPage}`} 
                  pageNumber={currentPage} 
                  width={280} 
                  devicePixelRatio={customPixelRatio} 
                  renderTextLayer={false} 
                  renderAnnotationLayer={false} 
                  loading={<Loader className="text-white-50 animate-pulse" />}
                />
              </Document>

              {numPages > 1 && (
                <div className="position-absolute bottom-0 w-100 p-3 d-flex justify-content-between align-items-center" style={{ background: 'linear-gradient(transparent, rgba(0,0,0,0.8))' }}>
                  <button className="btn btn-sm btn-light rounded-circle p-2 shadow" onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} disabled={currentPage === 1}><ChevronLeft size={20} /></button>
                  {/* ✨ THEME: Badge color to Light Blue */}
                  <span className="text-white small fw-bold px-3 py-1 rounded-pill" style={{ backgroundColor: 'rgba(14, 165, 233, 0.75)' }}>Page {currentPage} of {numPages}</span>
                  <button className="btn btn-sm btn-light rounded-circle p-2 shadow" onClick={() => setCurrentPage(prev => Math.min(prev + 1, numPages))} disabled={currentPage === numPages}><ChevronRight size={20} /></button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Order Details */}
        <div className="card border-0 shadow-sm p-4 mx-2 mb-4 rounded-4 bg-white">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h6 className="fw-bold text-secondary mb-0 small">ORDER DETAILS</h6>
            {/* ✨ THEME: Edit button to Light Blue */}
            <button className="btn btn-sm btn-outline-info rounded-pill px-3" onClick={() => navigate('/upload')} style={{ color: '#0ea5e9', borderColor: '#0ea5e9' }}><Edit2 size={12}/></button>
          </div>
          
          <div className="d-flex align-items-center mb-3 border-bottom pb-3">
            {/* ✨ THEME: File icon to Light Blue */}
            <div className="bg-info bg-opacity-10 p-2 rounded me-3" style={{ color: '#0ea5e9' }}><FileText/></div>
            <div className="overflow-hidden">
               <p className="fw-bold mb-0 text-truncate text-dark">{file}</p>
               <small className="text-muted">{pageCount} Pages • {mode === 'bw' ? 'B/W' : 'Color'}</small>
            </div>
          </div>

          <div className="row text-center">
            <div className="col-4 border-end"><small className="d-block text-muted small">Copies</small><span className="fw-bold">{copies}</span></div>
            <div className="col-4 border-end"><small className="d-block text-muted small">Sides</small><span className="fw-bold">{isTwoSided ? 'Double' : 'Single'}</span></div>
            {/* ✨ THEME: Price text to Light Blue */}
            <div className="col-4"><small className="d-block text-muted small">Bill</small><span className="fw-bold" style={{ color: '#0ea5e9' }}>₹{totalBill}</span></div>
          </div>
        </div>

        {/* Footer Payment Bar */}
        <div className="mt-auto px-2 pb-5">
          {/* ✨ THEME: Pay Button to Light Blue */}
          <button 
            onClick={handlePaymentAndUpload} 
            disabled={isProcessing} 
            className="btn w-100 py-3 rounded-pill fw-bold shadow-lg d-flex justify-content-center align-items-center gap-2 text-white"
            style={{ backgroundColor: '#0ea5e9', border: 'none' }}
          >
            <CreditCard size={20}/> Pay ₹{totalBill} & Get OTP
          </button>
          <div className="text-center mt-3 text-muted small d-flex justify-content-center align-items-center gap-1">
            {/* ✨ THEME: Shield to Light Blue */}
            <ShieldCheck size={14} style={{ color: '#0ea5e9' }}/> Secure Razorpay Checkout
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReviewPage;