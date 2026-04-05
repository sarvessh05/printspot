 
import React, { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { CheckCircle, Copy, Info } from 'lucide-react';

const SuccessPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  // Safe destructuring
  const { otp, fileName = "Your Document" } = location.state || {};

  useEffect(() => {
    // Agar OTP hai, toh usko LocalStorage mein save karo
    if (otp) {
      try {
        const savedOtps = JSON.parse(localStorage.getItem('saved_print_otps') || '[]');
        // Prevent duplicate saves
        if (!savedOtps.find(item => item.otp === otp)) {
          // Newest OTP hamesha list ke upar (start mein) aaye iske liye unshift use kiya hai
          savedOtps.unshift({ otp, fileName, date: new Date().toLocaleDateString() });
          localStorage.setItem('saved_print_otps', JSON.stringify(savedOtps));
        }
      } catch (error) {
        console.error("Local storage error:", error);
      }
    }
  }, [otp, fileName]);

  const copyToClipboard = () => {
    if (otp) {
      navigator.clipboard.writeText(otp);
      alert("✅ OTP Copied! Take a screenshot just in case.");
    }
  };

  // Agar direct /success khola bina payment ke
  if (!otp) {
    return (
      // ✨ THEME: Light Blue background
      <div className="min-vh-100 d-flex justify-content-center align-items-center" style={{ backgroundColor: '#f0f9ff' }}>
        <div className="card shadow-lg border-0 rounded-4 p-5 text-center bg-white" style={{ maxWidth: '400px' }}>
          <h4 className="text-danger mb-3">⚠️ No Active Session</h4>
          <button 
            className="btn rounded-pill px-4 fw-bold text-white" 
            style={{ backgroundColor: '#0ea5e9', border: 'none' }}
            onClick={() => navigate('/')}
          >
            Go to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    // ✨ THEME: Light Blue Background matched with Upload Page
    <div className="min-vh-100 d-flex justify-content-center align-items-center py-4 px-3" style={{ backgroundColor: '#f0f9ff' }}>
      
      {/* Centered White Card */}
      <div className="card shadow-lg border-0 rounded-4 w-100 p-4 p-md-5 bg-white text-center" style={{ maxWidth: '500px' }}>
        
        {/* ✨ THEME: Success Checkmark to Light Blue */}
        <CheckCircle size={70} className="mx-auto mb-3" style={{ color: '#0ea5e9' }} />
        <h2 className="fw-bolder text-dark mb-2">Payment Successful!</h2>
        <p className="text-secondary mb-4">Your document is ready to print. Go to The Print स्पॉट kiosk and enter this OTP.</p>
        
        {/* ✨ THEME: OTP Highlight Box to Light Blue */}
        <div className="w-100 p-4 mb-4 rounded-4" style={{ backgroundColor: 'rgba(14, 165, 233, 0.1)', border: '1px solid rgba(14, 165, 233, 0.25)' }}>
          <p className="mb-1 small text-uppercase fw-bold" style={{ color: '#0ea5e9' }}>Your Secret OTP</p>
          <h1 className="display-3 fw-bold mb-0" style={{ letterSpacing: '8px', color: '#0ea5e9' }}>{otp}</h1>
        </div>

        {/* Note / Warning Box */}
        <div className="alert alert-light border text-start rounded-4 p-3 mb-4 shadow-sm" style={{ borderColor: 'rgba(245, 158, 11, 0.5)' }}>
          <p className="mb-2 d-flex align-items-center gap-2 fw-bold text-dark">
            <Info size={18} className="text-warning"/> Important Notes:
          </p>
          <ul className="text-muted small mb-0 ps-3">
            <li className="mb-1">Please take a screenshot of this page right now.</li>
            <li>Lost your OTP? You can always find it saved at the bottom of the Upload Page.</li>
          </ul>
        </div>

        {/* Buttons */}
        {/* ✨ THEME: Outline Button to Light Blue */}
        <button 
          className="btn rounded-pill py-3 px-4 fw-bold mb-3 w-100 d-flex justify-content-center align-items-center gap-2 transition-all" 
          style={{ color: '#0ea5e9', borderColor: '#0ea5e9', backgroundColor: 'transparent' }}
          onMouseOver={(e) => { e.target.style.backgroundColor = 'rgba(14, 165, 233, 0.1)'; }}
          onMouseOut={(e) => { e.target.style.backgroundColor = 'transparent'; }}
          onClick={copyToClipboard}
        >
          <Copy size={20} /> Copy OTP
        </button>

        {/* ✨ THEME: Solid Button to Light Blue */}
        <button 
          className="btn rounded-pill py-3 w-100 fw-bold shadow-sm transition-all text-white" 
          style={{ backgroundColor: '#0ea5e9', border: 'none' }}
          onMouseOver={(e) => { e.target.style.transform = 'translateY(-2px)'; e.target.style.boxShadow = '0 4px 6px -1px rgba(14, 165, 233, 0.4)'; }}
          onMouseOut={(e) => { e.target.style.transform = 'translateY(0)'; e.target.style.boxShadow = 'none'; }}
          onClick={() => navigate('/upload')}
        >
          Print Another File
        </button>

      </div>
    </div>
  );
};

export default SuccessPage;