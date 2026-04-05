import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Upload, Plus, Minus, FileText, Loader, Settings, Clock, X } from 'lucide-react';
import { PDFDocument } from 'pdf-lib';

const UploadPage = () => {
  const [savedOtps, setSavedOtps] = useState([]);
  const navigate = useNavigate();
  const location = useLocation();
  const previousState = location.state || {};

  // States
  const [copies, setCopies] = useState(previousState.copies || 1);
  const [mode, setMode] = useState(previousState.mode || 'bw');
  const [printRange, setPrintRange] = useState(previousState.printRange || 'all'); 
  const [customRangeString, setCustomRangeString] = useState(previousState.customRangeString || ''); 
  const [isTwoSided, setIsTwoSided] = useState(previousState.isTwoSided || false); 
  const [selectedFile, setSelectedFile] = useState(null);
  const [pageCount, setPageCount] = useState(previousState.pageCount || 0); 
  const [isCalculating, setIsCalculating] = useState(false); 
  const [fileError, setFileError] = useState(""); 

  const fileInputRef = useRef(null);
 
  const countPagesFast = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      // 🥪 SANDWICH LOGIC: Poori file nahi padhni hai!
      // Sirf shuru ka 3MB aur aakhri ka 3MB padhenge jahan Metadata chhupa hota hai.
      const CHUNK_SIZE = 3 * 1024 * 1024; // 3MB limit
      let blobToRead = file;

      if (file.size > CHUNK_SIZE * 2) {
        // Agar file 6MB se badi hai, toh beech ka kachra hata do
        const head = file.slice(0, CHUNK_SIZE); // Shuru ka hissa
        const tail = file.slice(file.size - CHUNK_SIZE, file.size); // Aakhri hissa
        blobToRead = new Blob([head, tail]); // Dono ko jod do
      }
      
      reader.onload = (e) => {
        const content = e.target.result;
        
        // PDF mein '/Count' tag dhoondho
        const matches = content.match(/\/Count\s+(\d+)/g);
        
        if (matches) {
          let maxCount = 0;
          matches.forEach(match => {
            const count = parseInt(match.match(/\d+/)[0]);
            if (count > maxCount) maxCount = count;
          });
          
          if (maxCount > 0) {
            resolve(maxCount);
          } else {
            reject("Metadata read error");
          }
        } else {
          reject("Metadata not found");
        }
      };

      reader.onerror = () => reject("Error reading file");
      
      // Ab iPhone Chrome ko sirf max 6MB file padhni padegi, toh wo kabhi hang nahi hoga!
      reader.readAsText(blobToRead);
    });
  };

  useEffect(() => {
    const otps = JSON.parse(localStorage.getItem('saved_print_otps') || '[]');
    setSavedOtps(otps);
  }, []);

  const handleBoxClick = () => fileInputRef.current.click();

  const handleFileChange = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setFileError(""); 

    // 🚨 50MB LIMIT BOUNCER
    const MAX_FILE_SIZE = 50 * 1024 * 1024; 
    if (file.size > MAX_FILE_SIZE) {
      setFileError("⚠️ file is larger than 50MB.");
      event.target.value = ''; 
      return; 
    }

    const isPDF = file.type === 'application/pdf';
    const isImage = file.type.startsWith('image/');

    if (isPDF) {
      setSelectedFile(file);
      setIsCalculating(true);
      try {
        const count = await countPagesFast(file);
        setPageCount(count);
      } catch (error) {
        console.log("Fast method failed, falling back to pdf-lib", error);
        
        try {
          const arrayBuffer = await file.arrayBuffer();
          const pdfDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
          setPageCount(pdfDoc.getPageCount());
        } catch (pdfLibError) {
          console.error("Dono method fail! File corrupted hai.", pdfLibError);
          setPageCount(1);
          setFileError("⚠️ check file format and try again.");
        }
      }
      setIsCalculating(false);
      
    } else if (isImage) {
      setIsCalculating(true);
      try {
        const pdfDoc = await PDFDocument.create();
        const imageBytes = await file.arrayBuffer();
        let image;
        
        if (file.type === 'image/jpeg' || file.type === 'image/jpg') {
          image = await pdfDoc.embedJpg(imageBytes);
        } else if (file.type === 'image/png') {
          image = await pdfDoc.embedPng(imageBytes);
        }

        const a4Width = 595.28;
        const a4Height = 841.89;
        const page = pdfDoc.addPage([a4Width, a4Height]);

        const scale = Math.min(a4Width / image.width, a4Height / image.height);
        const scaledWidth = image.width * scale;
        const scaledHeight = image.height * scale;

        const x = (a4Width - scaledWidth) / 2;
        const y = (a4Height - scaledHeight) / 2;

        page.drawImage(image, { x, y, width: scaledWidth, height: scaledHeight });

        const pdfBytes = await pdfDoc.save();
        const newFileName = file.name.replace(/\.[^/.]+$/, "") + ".pdf";
        const pdfFile = new File([pdfBytes], newFileName, { type: 'application/pdf' });

        setSelectedFile(pdfFile); 
        setPageCount(1);
        setPrintRange('all');
        setIsTwoSided(false);
      } catch (err) {
        console.error("Image to PDF error:", err);
        setFileError("⚠️ Image processing error.");
      }
      setIsCalculating(false);
    }
  };

  const getCalculatedPageCount = () => {
    if (printRange === 'all') return pageCount;
    if (!customRangeString.trim()) return pageCount;
    try {
      let pages = new Set();
      const parts = customRangeString.split(',');
      parts.forEach(part => {
        if (part.includes('-')) {
          let [start, end] = part.split('-').map(num => parseInt(num.trim()));
          if (!isNaN(start) && !isNaN(end)) {
            start = Math.max(1, start);
            end = Math.min(pageCount, end);
            for (let i = start; i <= end; i++) pages.add(i);
          }
        } else {
          const num = parseInt(part.trim());
          if (!isNaN(num) && num >= 1 && num <= pageCount) pages.add(num);
        }
      });
      return pages.size > 0 ? pages.size : pageCount;
    } catch (e) {
      return pageCount;
    }
  };

  const handleUploadClick = () => {
    if (!selectedFile) return;
    const finalPageCount = getCalculatedPageCount();
    const finalRangeText = printRange === 'all' ? 'All Pages' : customRangeString;
    navigate('/review', { 
      state: { 
        file: selectedFile.name, 
        fileObj: selectedFile, 
        copies, 
        mode, 
        pageCount: finalPageCount, 
        isTwoSided, 
        rangeText: finalRangeText, 
        printRange, 
        customRangeString, 
        originalPageCount: pageCount 
      } 
    });
  };

  return (
    <div className="min-vh-100 d-flex justify-content-center align-items-center py-4 px-3" style={{ backgroundColor: '#f0f9ff' }}>
      <div className="card shadow-lg border-0 rounded-4 w-100 p-4 p-md-5 bg-white" style={{ maxWidth: '500px' }}>
        
        <div className="text-center mb-4">
          <img src="/printerlogo.png" alt="The Print Spot Logo" className="rounded-circle border border-opacity-25 p-1 mb-2" style={{ height: '70px', width: '70px', objectFit: 'cover', borderColor: '#0ea5e9' }} />
          <h2 className="fw-bolder text-dark mb-0" style={{ letterSpacing: '-0.5px' }}>
            The Print <span style={{ color: '#0ea5e9' }}>स्पॉट</span>
          </h2>
        </div>
        
        <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".pdf, image/jpeg, image/png, image/jpg" className="d-none" />

        <div className={`p-4 text-center rounded-4 mb-2 transition-all position-relative ${selectedFile ? 'bg-info bg-opacity-10 border-info' : 'bg-light border-secondary border-opacity-50'}`} style={{ border: '2px dashed', cursor: selectedFile ? 'default' : 'pointer' }} onClick={!selectedFile ? handleBoxClick : undefined}>
          
          {selectedFile ? (
            <>
              <button 
                onClick={(e) => { 
                  e.stopPropagation(); 
                  setSelectedFile(null); 
                  setPageCount(0); 
                  setIsCalculating(false); 
                  setFileError(""); 
                }} 
                className="btn btn-sm btn-danger position-absolute rounded-circle shadow-sm d-flex justify-content-center align-items-center"
                style={{ top: '-10px', right: '-10px', width: '32px', height: '32px', zIndex: 10 }}
              >
                <X size={18} className="text-white" />
              </button>

              <div className="d-flex flex-column align-items-center">
                <div className="text-white rounded-circle d-flex justify-content-center align-items-center mb-3 shadow-sm" style={{ width: '56px', height: '56px', backgroundColor: '#0ea5e9' }}>
                  <FileText size={28} />
                </div>
                <p className="fw-bold fs-5 mb-1" style={{ color: '#0ea5e9' }}>File Ready!</p>
                <p className="text-muted small mb-3 text-truncate w-100 px-3">{selectedFile.name}</p>
                {isCalculating ? (
                  <span className="badge bg-warning text-dark px-3 py-2 rounded-pill">
                    <Loader size={14} className="fa-spin me-2"/> Reading...
                  </span>
                ) : (
                  <span className="badge bg-info bg-opacity-25 border px-3 py-2 rounded-pill" style={{ color: '#0284c7', borderColor: '#0ea5e9' }}>
                    {pageCount} Pages detected
                  </span>
                )}
              </div>
            </>
          ) : (
            <div className="d-flex flex-column align-items-center">
              <div className="bg-white border text-secondary rounded-circle d-flex justify-content-center align-items-center mb-3 shadow-sm" style={{ width: '56px', height: '56px' }}><Upload size={28} /></div>
              <p className="fw-bold text-dark fs-5 mb-1">Tap to Upload File</p>
              <small className="text-muted">PDF, JPG, PNG (Max 50MB)</small>
              <small className="text-danger mt-2 fw-medium bg-danger bg-opacity-10 px-2 py-1 rounded">
     iPhone users: For fast upload, use Safari browser
  </small>
            </div>
          )}
        </div>

        {fileError && (
          <div className="alert alert-danger py-2 mb-4 text-center rounded-3 shadow-sm border-0" role="alert">
            <span className="fw-bold small">{fileError}</span>
          </div>
        )}

        {selectedFile && selectedFile.type === 'application/pdf' && !isCalculating && !fileError && (
          <div className="card border-0 bg-light rounded-4 p-3 mb-4">
            <h6 className="fw-bold text-dark mb-3 d-flex align-items-center gap-2" style={{fontSize: '0.9rem'}}>
              <Settings size={16} style={{ color: '#0ea5e9' }}/> Print Settings
            </h6>
            
            <div className="d-flex justify-content-between align-items-center mb-3 pb-3 border-bottom border-secondary border-opacity-10">
              <span className="fw-semibold text-secondary small">Print Both Sides</span>
              <div className="form-check form-switch fs-4 mb-0">
                <input className="form-check-input shadow-none cursor-pointer" type="checkbox" role="switch" checked={isTwoSided} onChange={() => setIsTwoSided(!isTwoSided)} />
              </div>
            </div>

            <div className="mb-2">
              <span className="fw-semibold text-secondary small d-block mb-2">Pages to Print</span>
              <div className="d-flex gap-3 mb-2">
                <div className="form-check">
                  <input className="form-check-input shadow-none" type="radio" name="range" id="all" checked={printRange === 'all'} onChange={() => setPrintRange('all')} />
                  <label className="form-check-label small text-dark" htmlFor="all">All ({pageCount})</label>
                </div>
                <div className="form-check">
                  <input className="form-check-input shadow-none" type="radio" name="range" id="custom" checked={printRange === 'custom'} onChange={() => setPrintRange('custom')} />
                  <label className="form-check-label small text-dark" htmlFor="custom">Custom Range</label>
                </div>
              </div>
              
              {printRange === 'custom' && (
                <input 
                  type="text" 
                  className="form-control form-control-sm border-info border-opacity-25 rounded-3" 
                  placeholder="e.g. 1-5, 8, 11-13" 
                  value={customRangeString} 
                  onChange={(e) => setCustomRangeString(e.target.value)} 
                />
              )}
            </div>
          </div>
        )}

        <div className="d-flex justify-content-between align-items-center bg-light rounded-4 p-3 mb-4">
          <span className="fw-semibold text-secondary small">Number of Copies</span>
          <div className="d-flex align-items-center gap-3 bg-white border rounded-pill px-2 py-1">
            <button className="btn btn-sm btn-light rounded-circle p-1 d-flex align-items-center" onClick={() => copies > 1 && setCopies(copies - 1)}><Minus size={16}/></button>
            <span className="fw-bold fs-5 px-2">{copies}</span>
            <button className="btn btn-sm btn-light rounded-circle p-1 d-flex align-items-center" onClick={() => setCopies(copies + 1)}><Plus size={16}/></button>
          </div>
        </div>

        <p className="fw-semibold text-secondary small mb-3">Color Mode</p>
        <div className="row g-3 mb-4">
          <div className="col-6">
            <div 
              className={`card h-100 p-3 text-center border-2 rounded-4 shadow-sm transition-all ${mode === 'bw' ? 'text-white' : 'border-light bg-white text-dark'}`} 
              onClick={() => setMode('bw')} 
              style={{ cursor: 'pointer', backgroundColor: mode === 'bw' ? '#0ea5e9' : 'white', borderColor: mode === 'bw' ? '#0ea5e9' : '' }}
            >
              <p className="fw-bold mb-1">B & W</p><small className={mode === 'bw' ? 'text-white-50' : 'text-muted'}>₹2/page</small>
            </div>
          </div>
          <div className="col-6">
            <div 
              className={`card h-100 p-3 text-center border-2 rounded-4 shadow-sm transition-all ${mode === 'color' ? 'text-white' : 'border-light bg-white text-dark'}`} 
              onClick={() => setMode('color')} 
              style={{ cursor: 'pointer', backgroundColor: mode === 'color' ? '#0ea5e9' : 'white', borderColor: mode === 'color' ? '#0ea5e9' : '' }}
            >
              <p className="fw-bold mb-1">Color</p><small className={mode === 'color' ? 'text-white-50' : 'text-muted'}>₹10/page</small>
            </div>
          </div>
        </div>

        <button 
          onClick={handleUploadClick} 
          disabled={!selectedFile || isCalculating || fileError} 
          className={`btn w-100 py-3 rounded-pill fw-bold shadow-sm mb-4 text-white ${!selectedFile || isCalculating || fileError ? 'btn-secondary opacity-50' : ''}`}
          style={{ backgroundColor: selectedFile && !isCalculating && !fileError ? '#0ea5e9' : '' }}
        >
          {isCalculating ? 'Reading File...' : (selectedFile && !fileError ? 'Continue to Review' : 'Select a file first')}
        </button>

        {savedOtps.length > 0 && (
          <div className="pt-4 border-top">
            <h6 className="fw-bold text-secondary mb-3 d-flex align-items-center gap-2">
              <Clock size={18} style={{ color: '#0ea5e9' }}/> Your Recent Prints
            </h6>
            <div className="d-flex flex-column gap-3">
              {savedOtps.slice(0, 3).map((item, index) => (
                <div key={index} className="d-flex justify-content-between align-items-center p-3 bg-light rounded-4 border border-secondary border-opacity-25">
                  <div className="text-truncate pe-3" style={{ maxWidth: '65%' }}>
                    <span className="d-block fw-bold text-dark mb-1 text-truncate" style={{fontSize: '0.9rem'}}>{item.fileName}</span>
                    <span className="badge bg-white text-secondary border fw-normal" style={{fontSize: '0.7rem'}}>{item.date}</span>
                  </div>
                  <div className="fw-bolder fs-4" style={{ letterSpacing: '1px', color: '#0ea5e9' }}>{item.otp}</div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default UploadPage;