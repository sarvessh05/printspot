import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { Loader, Printer, AlertTriangle, CheckCircle, ArrowRight } from 'lucide-react';

// Derived from build-time env var — never changes at runtime
const KIOSK_SERVER_URL = import.meta.env.VITE_KIOSK_SERVER_IP || 'http://localhost:5000';

const KioskPage = () => {
  const [showSlides, setShowSlides] = useState(true);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [otp, setOtp] = useState("");
  const [status, setStatus] = useState("idle"); 
  const [errorMessage, setErrorMessage] = useState("");
  const [tapCount, setTapCount] = useState(0);
  
  // 🚨 Naye States for Admin
  const [showAdmin, setShowAdmin] = useState(false);
  const [adminPass, setAdminPass] = useState("");

  const slides = [
    { id: 1, title: "Step 1: Upload", desc: "Upload your document from your phone.", img: "/photo1.png" },
    { id: 2, title: "Step 2: Review & Pay", desc: "Select copies, mode, and pay securely via UPI.", icon: "💳" },
    { id: 3, title: "Step 3: Print", desc: "Enter your 6-digit code below and grab your print!", icon: "🖨️" }
  ];

  // Auto-Slide Logic
  useEffect(() => {
    let slideTimer;
    if (showSlides) {
      slideTimer = setInterval(() => {
        setCurrentSlide((prev) => (prev + 1) % slides.length);
      }, 3000);
    }
    return () => clearInterval(slideTimer);
  }, [showSlides, slides.length]);

  // Inactivity Timer
  useEffect(() => {
    let idleTimer;
    if (!showSlides && status === "idle" && !showAdmin) {
      idleTimer = setTimeout(() => {
        setShowSlides(true);
        setOtp("");
      }, 30000); 
    }
    return () => clearTimeout(idleTimer);
  }, [showSlides, status, otp, showAdmin]);

  // Auto-Submit OTP
  useEffect(() => {
    if (otp.length === 6) {
      verifyAndPrintOtp();
    }
  }, [otp]);

  // 🕵️‍♂️ LIVE WATCHMAN (Polling Logic)
  useEffect(() => {
    let pollTimer;
    if (status === "printing_physical") {
      pollTimer = setInterval(async () => {
        try {
          const res = await fetch(`${KIOSK_SERVER_URL}/api/printer-status`);
          const data = await res.json();
          
          if (data.status === 'JAMMED') {
            setStatus("jammed");
            setErrorMessage("Hardware Error / Paper Jam Detected!");
            clearInterval(pollTimer);
          } else if (data.status === 'NORMAL') {
            setStatus("success");
            clearInterval(pollTimer);
            setTimeout(() => {
              setOtp("");
              setStatus("idle");
              setShowSlides(true);
            }, 5000);
          }
        } catch (error) {
          console.error("Status fetch error", error);
        }
      }, 3000);
    }
    return () => clearInterval(pollTimer);
  }, [status]);

  const handleKeyPress = (num) => {
    if (status !== "idle") return;
    if (otp.length < 6) setOtp(prev => prev + num);
  };

  const handleDelete = () => {
    setOtp(prev => prev.slice(0, -1));
  };

  // 🛠️ Secret Admin Reset (5 Taps)
  const handleSecretReset = () => {
    setTapCount(prev => prev + 1);
    if (tapCount + 1 >= 5) {
      setShowAdmin(true);
      setTapCount(0);
    }
    setTimeout(() => setTapCount(0), 3000);
  };

  // 🛠️ Admin Submit Function
  const handleAdminSubmit = async (type) => {
    try {
      const res = await fetch(`${KIOSK_SERVER_URL}/admin/reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paper: type === 'paper', ink: type === 'ink', password: adminPass })
      });
      const data = await res.json();
      if(data.success) {
        alert("Hardware Refilled & Machine Unlocked Successfully!");
        setShowAdmin(false);
        setAdminPass("");
        setStatus("idle"); // 🔓 Jam khol diya aur wapas normal kar diya
        setShowSlides(true);
        setOtp("");
      } else {
        alert("Wrong Password!");
      }
    } catch (e) { alert("Server error connecting to backend."); }
  };

  const verifyAndPrintOtp = async () => {
    setStatus("verifying");
    
    try {
      const { data, error } = await supabase
        .from('print_orders')
        .select('*')
        .eq('otp', otp)
        .eq('print_status', 'pending');

      if (error || !data || data.length === 0) {
        throw new Error("Invalid OTP!");
      }

      setStatus("printing");
      
      const jobs = data.map(order => ({
        db_id: order.id,
        otp: order.otp,
        downloadUrl: order.file_url,
        copies: order.copies,
        mode: order.mode,
        isTwoSided: order.is_two_sided,
        printRange: order.print_range,
        totalPages: order.total_pages
      }));

      const response = await fetch(`${KIOSK_SERVER_URL}/print`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(jobs)
      });

      const serverResult = await response.json();

      if (response.ok && serverResult.success) {
        setStatus("printing_physical");
      } else {
        // 🚨 FastAPI HTTPException returns { detail: "..." }, not { message: "..." }
        const errDetail = serverResult.detail || serverResult.message || "Unknown error occurred.";
        if (errDetail === "OUT_OF_PAPER" || errDetail === "OUT_OF_INK") {
          throw new Error(errDetail);
        } else if (errDetail === "MACHINE_ERROR" || errDetail === "MACHINE_OFFLINE" || errDetail === "MACHINE_JAMMED") {
          throw new Error("MACHINE_ERROR");
        } else {
          throw new Error(errDetail);
        }
      }

    } catch (err) {
      if (err.message === "OUT_OF_PAPER" || err.message === "OUT_OF_INK") {
        setErrorMessage(err.message === "OUT_OF_PAPER" ? "Machine is out of paper." : "Machine is out of ink.");
        setStatus("jammed"); // 🛑 LOCKED (No timeout)
      } else if (err.message === "MACHINE_ERROR") {
        setErrorMessage("⚠️ Printer Problem or Switched Off.");
        setStatus("jammed"); // 🛑 LOCKED (No timeout)
      } else {
        setErrorMessage(err.message);
        // Agar sirf Invalid OTP hai toh timeout hone do
        if(err.message === "Invalid OTP!") {
            setStatus("error");
            setTimeout(() => {
              setOtp("");
              setStatus("idle");
              setShowSlides(true); 
            }, 5000);
        } else {
            setStatus("jammed"); // Baaki sab system error pe LOCK
        }
      }
    }
  };

  return (
    // ✨ THEME & LAYOUT FIX: vh-100 & overflow-hidden
    <div className="vh-100 d-flex flex-column overflow-hidden" style={{ backgroundColor: '#f0f9ff', cursor: 'none' }}>
        
      {/* Top Header */}
      <div className="p-3 p-md-4 d-flex justify-content-between align-items-center bg-white shadow-sm border-bottom" style={{ zIndex: 10, borderColor: 'rgba(14, 165, 233, 0.25)' }}>
        <h2 className="fw-bold mb-0" onClick={handleSecretReset} style={{ cursor: 'pointer', color: '#333' }}>
          The Print <span style={{ color: '#0ea5e9' }}>स्पॉट</span> <small className="text-muted fs-6 ms-2">Kiosk #01</small>
        </h2>
        
        {/* Connection Status */}
        <div className="d-flex align-items-center gap-2">
          <div 
            className="rounded-circle" 
            style={{ 
              width: 12, 
              height: 12, 
              backgroundColor: status === 'error' || status === 'jammed' ? '#dc3545' : '#0ea5e9' 
            }}
          ></div>
          <span className="small text-muted font-monospace fw-bold">
            {status === 'error' || status === 'jammed' ? 'ERROR STATE' : 'SYSTEM ONLINE'}
          </span>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-grow-1 d-flex flex-column justify-content-center align-items-center p-3 p-md-4">
          
        {/* SLIDESHOW VIEW */}
        {showSlides && (
          <div className="text-center w-100 d-flex flex-column align-items-center justify-content-center h-100">
             <div className="card shadow-lg rounded-4 p-4 p-md-5 mx-auto bg-white mb-4 mb-md-5 d-flex flex-column justify-content-center" style={{ maxWidth: '800px', height: '400px', border: '1px solid rgba(14, 165, 233, 0.25)' }}>
              
              {slides[currentSlide].img ? (
                <img src={slides[currentSlide].img} alt="Step" className="mx-auto mb-4 rounded shadow-sm" style={{ height: '160px', objectFit: 'contain' }} />
              ) : (
                <div className="display-1 mb-4" style={{ color: '#0ea5e9' }}>{slides[currentSlide].icon}</div>
              )}
              
              <h1 className="fw-bolder text-dark mb-2 mb-md-3">{slides[currentSlide].title}</h1>
              <h4 className="text-muted fs-5">{slides[currentSlide].desc}</h4>

              <div className="d-flex justify-content-center mt-auto pt-3 gap-2">
                {slides.map((_, idx) => (
                  <div 
                    key={idx} 
                    className="rounded-circle" 
                    style={{ 
                      width: idx === currentSlide ? '15px' : '10px', 
                      height: idx === currentSlide ? '15px' : '10px', 
                      backgroundColor: idx === currentSlide ? '#0ea5e9' : 'rgba(14, 165, 233, 0.25)',
                      transition: 'all 0.3s' 
                    }}
                  ></div>
                ))}
              </div>
            </div>

            <button 
              onClick={() => setShowSlides(false)} 
              className="btn btn-lg rounded-pill px-4 px-md-5 py-3 py-md-4 shadow-lg display-6 fw-bold d-inline-flex align-items-center gap-3 text-white"
              style={{ fontSize: '1.8rem', transition: 'transform 0.2s', backgroundColor: '#0ea5e9', border: 'none' }}
            >
              ENTER OTP TO PRINT <ArrowRight size={36} />
            </button>
          </div>
        )}

        {/* OTP INPUT VIEW */}
        {!showSlides && (
          <div className="w-100 h-100 d-flex flex-column align-items-center justify-content-center">
            
            <div className="text-center mb-4 mb-md-5" style={{ minHeight: '120px' }}>
              {status === "idle" && (
                <>
                  <h1 className="display-5 fw-bolder text-dark mb-3">Enter 6-Digit OTP</h1>
                  <div className="d-flex gap-2 justify-content-center mb-3">
                    {[...Array(6)].map((_, i) => (
                      <div 
                        key={i} 
                        className="border-bottom border-4 px-2 px-md-3 py-2 fs-2 fw-bold bg-white rounded-top shadow-sm mx-1"
                        style={{ 
                          borderColor: otp[i] ? '#0ea5e9' : 'rgba(14, 165, 233, 0.25)', 
                          color: otp[i] ? '#0ea5e9' : '#6c757d' 
                        }}
                      >
                        {otp[i] || "•"}
                      </div>
                    ))}
                  </div>
                </>
              )}

              {status === "verifying" && (
                <div className="p-4 rounded-4 bg-white shadow-sm" style={{ color: '#0ea5e9' }}>
                  <Loader size={60} className="fa-spin mb-3 mx-auto d-block" />
                  <h2 className="fw-bold text-dark">Verifying OTP & Payment...</h2>
                </div>
              )}

              {(status === "printing" || status === "printing_physical") && (
                <div className="p-4 rounded-4 bg-white shadow-sm" style={{ color: '#0ea5e9' }}>
                  <Printer size={60} className="mb-3 mx-auto d-block fa-bounce" />
                  <h2 className="fw-bold text-dark">Superfast Printing...</h2>
                  <p className="text-muted fs-5 mb-0">Please wait and collect your papers below.</p>
                </div>
              )}

              {status === "success" && (
                <div className="p-4 rounded-4 bg-white shadow-sm border" style={{ color: '#0ea5e9', borderColor: '#0ea5e9' }}>
                  <CheckCircle size={60} className="mb-3 mx-auto d-block" />
                  <h2 className="fw-bold text-dark">Print Successful!</h2>
                  <p className="text-dark fw-medium fs-5 mb-0">Have a great day!</p>
                </div>
              )}

              {status === "error" && (
                <div className="bg-danger bg-opacity-10 p-4 p-md-5 rounded-4 border border-danger shadow-sm mx-auto" style={{ maxWidth: '600px' }}>
                  <AlertTriangle size={60} className="mb-3 text-danger mx-auto d-block" />
                  <h2 className="fw-bold text-danger mb-3">System Alert</h2>
                  <h4 className="text-dark fs-5">{errorMessage}</h4>
                </div>
              )}

              {/* 🚨 LOCKED JAMMED SCREEN (No timeout, User wait karega) */}
              {status === "jammed" && (
                <div 
                  className="bg-warning bg-opacity-10 p-4 p-md-5 rounded-4 border border-warning shadow-lg mx-auto text-center" 
                  style={{ maxWidth: '650px', cursor: 'pointer' }}
                  onClick={handleSecretReset}
                >
                  <AlertTriangle size={80} className="mb-4 text-warning mx-auto d-block" />
                  <h1 className="fw-bolder text-warning mb-3">SYSTEM PAUSED</h1>
                  <h3 className="text-dark fw-bold mb-4">{errorMessage}</h3>
                  
                  <div className="bg-white p-3 p-md-4 rounded-3 shadow-sm border border-warning border-opacity-25">
                     <h4 className="text-dark fw-bold mb-0 fs-5" style={{ lineHeight: '1.5' }}>
                        🚨 Aapka order safe hai. Operator ko message bhej diya gaya hai, kripya Operator ke aane tak yahin wait kijiye.
                        <br/><br/>
                        <span className="fs-4 fw-bolder text-danger">Need Help? Call: 83560 41978</span>
                     </h4>
                  </div>
                </div>
              )}
            </div>

            {/* NUMPAD */}
            {status === "idle" && (
              <div className="container" style={{ maxWidth: '420px' }}>
                <div className="row g-2 g-md-3">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                    <div key={num} className="col-4">
                      <button 
                        onClick={() => handleKeyPress(num.toString())} 
                        className="btn btn-white w-100 py-3 py-md-4 fs-2 fw-bold rounded-4 shadow-sm"
                        style={{ backgroundColor: 'white', color: '#0ea5e9', border: '1px solid rgba(14, 165, 233, 0.25)' }}
                      >
                        {num}
                      </button>
                    </div>
                  ))}
                  <div className="col-4">
                    <button 
                      onClick={() => { setOtp(""); setShowSlides(true); }} 
                      className="btn btn-light w-100 py-3 py-md-4 fs-5 fw-bold rounded-4 shadow-sm text-secondary d-flex align-items-center justify-content-center h-100 border border-secondary border-opacity-25"
                    >
                      BACK
                    </button>
                  </div>
                  <div className="col-4">
                    <button 
                      onClick={() => handleKeyPress("0")} 
                      className="btn btn-white w-100 py-3 py-md-4 fs-2 fw-bold rounded-4 shadow-sm"
                      style={{ backgroundColor: 'white', color: '#0ea5e9', border: '1px solid rgba(14, 165, 233, 0.25)' }}
                    >
                      0
                    </button>
                  </div>
                  <div className="col-4">
                    <button 
                      onClick={handleDelete} 
                      className="btn btn-danger bg-opacity-75 w-100 py-3 py-md-4 fs-5 fw-bold rounded-4 shadow-sm d-flex align-items-center justify-content-center h-100 border-0"
                    >
                      DEL
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 🛠️ SECRET ADMIN MODAL */}
      {showAdmin && (
          <div className="position-fixed top-0 start-0 w-100 h-100 bg-dark bg-opacity-75 d-flex justify-content-center align-items-center" style={{zIndex: 9999}}>
              <div className="bg-white p-5 rounded-4 shadow-lg text-center" style={{minWidth: '400px'}}>
                  <h3 className="fw-bold mb-4" style={{ color: '#0ea5e9' }}>Operator Dashboard</h3>
                  <input type="password" placeholder="Enter PIN" value={adminPass} onChange={e => setAdminPass(e.target.value)} className="form-control mb-4 fs-4 text-center" />
                  
                  <button 
                    onClick={() => handleAdminSubmit('paper')} 
                    className="btn btn-lg w-100 mb-3 fw-bold text-white"
                    style={{ backgroundColor: '#0ea5e9', border: 'none' }}
                  >
                    Unlock & Refill Paper
                  </button>
                  
                  <button 
                    onClick={() => handleAdminSubmit('ink')} 
                    className="btn btn-lg w-100 mb-4 fw-bold"
                    style={{ color: '#0ea5e9', backgroundColor: 'transparent', border: '2px solid #0ea5e9' }}
                  >
                    Unlock & Refill Ink
                  </button>

                  <button onClick={() => {setShowAdmin(false); setAdminPass("");}} className="btn btn-link text-muted text-decoration-none">Cancel</button>
              </div>
          </div>
      )}

      {/* Styled Footer */}
      <div className="py-3 text-center bg-white border-top shadow-sm mt-auto position-relative" style={{ borderColor: 'rgba(14, 165, 233, 0.25)' }}>
        <div className="position-absolute top-0 start-50 translate-middle w-50 h-1 rounded" style={{ backgroundColor: '#0ea5e9', opacity: 0.5 }}></div>
        <p className="mb-0 text-muted" style={{ fontSize: '0.9rem', letterSpacing: '0.5px' }}>
          Engineered & Founded by <span className="fw-bolder" style={{ fontStyle: 'italic', fontSize: '1.1rem', color: '#0ea5e9' }}>Sahil</span>
        </p>
      </div>
    </div>
  );
};

export default KioskPage;
