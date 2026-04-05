 import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

// Tere saare pages yahan import ho rahe hain
import LandingPage from './pages/LandingPage';
import UploadPage from './pages/UploadPage'; // 👈 YE IMPORT MISSING THA!
import ReviewPage from './pages/ReviewPage';
import SuccessPage from './pages/SuccessPage';
  
import Dashboard from './pages/Dashboard';
 

 

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          {/* Main Website Flow (Mobile users ke liye) */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/upload" element={<UploadPage />} /> {/* 👈 YE RAASTA MISSING THA! */}
          <Route path="/review" element={<ReviewPage />} />
          <Route path="/success" element={<SuccessPage />} />
           
           <Route path="/admin" element={<Dashboard />} />
        
        </Routes>
      </div>
    </Router>
  );
}

export default App;