 



import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const LandingPage = () => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const navigate = useNavigate();

  const steps = [
    {
      id: 1,
      title: "Step 1: Upload Your File",
      desc: "Select the PDF you want to print directly from your phone or laptop.",
      icon: "📁"
    },
    {
      id: 2,
      title: "Step 2: Secure Payment",
      desc: "Customize your print settings and pay securely via UPI or Card.",
      icon: "💳"
    },
    {
      id: 3,
      title: "Step 3: Enter OTP in Machine",
      desc: "Get your 6-digit OTP, type it into the Kiosk, and grab your print!",
      icon: "🖨️"
    }
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % steps.length);
    }, 3000);
    return () => clearInterval(timer);
  }, [steps.length]);

  return (
    // ✨ Light Blue tinted background
    <div className="min-vh-100 d-flex flex-column" style={{ backgroundColor: '#f0f9ff' }}>
      
      {/* Navbar - White background, subtle shadow */}
      <nav className="navbar navbar-light bg-white shadow-sm py-3 px-4">
        <div className="container">
          <a className="navbar-brand d-flex align-items-center fw-bold fs-3" href="/" style={{ color: '#0ea5e9' }}>
            <img 
              src="/printerlogo.png" 
              alt="The Print Spot Logo" 
              width="50" 
              height="50" 
              className="me-3 rounded-circle p-1"
              style={{ border: '2px solid #0ea5e9', borderColor: 'rgba(14, 165, 233, 0.25)' }} 
            />
            The Print स्पॉट
          </a>
        </div>
      </nav>

      {/* Main Hero Section */}
      <div className="container py-5 mt-4 mb-5">
        <div className="row align-items-center min-vh-75">
          
          {/* Left Side: Text and Button */}
          <div className="col-lg-6 text-center text-lg-start mb-5 mb-lg-0">
            <h1 className="display-4 fw-bolder text-dark mb-4">
              Smart Printing, <br />
              <span style={{ color: '#0ea5e9' }}>Zero Hassle.</span>
            </h1>
            <p className="lead text-secondary mb-5">
              Experience the future of document printing. Upload anywhere, print securely at our smart kiosks.
            </p>
            
            <button 
              className="btn btn-lg rounded-pill px-5 py-3 fw-bold shadow-sm text-white"
              onClick={() => navigate('/upload')}
              style={{ 
                transition: 'all 0.3s ease', 
                backgroundColor: '#0ea5e9', 
                border: 'none' 
              }}
              onMouseOver={(e) => { e.target.style.transform = 'translateY(-3px)'; e.target.style.boxShadow = '0 10px 15px -3px rgba(14, 165, 233, 0.4)'; }}
              onMouseOut={(e) => { e.target.style.transform = 'translateY(0)'; e.target.style.boxShadow = 'none'; }}
            >
              Get Started 🚀
            </button>
          </div>

          {/* Right Side: Sliding Card */}
          <div className="col-lg-5 offset-lg-1">
            <div className="card border-0 shadow-lg rounded-4 p-4 text-center bg-white" style={{ minHeight: '350px' }}>
              <div className="card-body d-flex flex-column justify-content-center">
                
                <div className="display-1 mb-4">{steps[currentSlide].icon}</div>
                <h3 className="h4 fw-bold mb-3" style={{ color: '#0ea5e9' }}>{steps[currentSlide].title}</h3>
                <p className="text-muted px-3">{steps[currentSlide].desc}</p>

                {/* Dots (Indicators) */}
                <div className="d-flex justify-content-center mt-auto pt-4 gap-2">
                  {steps.map((_, index) => (
                    <div 
                      key={index} 
                      className="rounded-circle"
                      style={{ 
                        width: index === currentSlide ? '12px' : '10px', 
                        height: index === currentSlide ? '12px' : '10px',
                        transition: 'all 0.3s ease',
                        backgroundColor: index === currentSlide ? '#0ea5e9' : '#cbd5e1'
                      }}
                    ></div>
                  ))}
                </div>

              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Footer Section */}
      <footer className="mt-auto py-4 bg-white border-top text-center" style={{ borderColor: 'rgba(14, 165, 233, 0.1)' }}>
        <div className="container">
          <p className="text-muted mb-0 small fw-medium">
            Need help or support? Contact us at: <br className="d-block d-sm-none" />
            <a 
              href="mailto:khodabharwad88@gmail.com" 
              className="fw-bold text-decoration-none ms-sm-2"
              style={{ color: '#0ea5e9' }}
            >
              khodabharwad88@gmail.com
            </a>
          </p>
        </div>
      </footer>

    </div>
  );
};

export default LandingPage;