import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Upload, FileText, Loader, Clock, X } from 'lucide-react';
import { PDFDocument } from 'pdf-lib';

const UploadPage = () => {
  const [savedOtps, setSavedOtps] = useState([]);
  const navigate = useNavigate();
  const location = useLocation();

  // States
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [isCalculating, setIsCalculating] = useState(false);
  const [fileError, setFileError] = useState("");
  const [pricing, setPricing] = useState({ bw: 2, color: 10 });

  useEffect(() => {
    // Fetch pricing from backend
    fetch('http://localhost:8080/api/settings/pricing')
      .then(res => res.json())
      .then(data => setPricing(data))
      .catch(err => console.log("Pricing fetch error", err));
    
    const otps = JSON.parse(localStorage.getItem('saved_print_otps') || '[]');
    setSavedOtps(otps);
  }, []);

  const countPagesFast = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      const CHUNK_SIZE = 3 * 1024 * 1024;
      let blobToRead = file;

      if (file.size > CHUNK_SIZE * 2) {
        const head = file.slice(0, CHUNK_SIZE);
        const tail = file.slice(file.size - CHUNK_SIZE, file.size);
        blobToRead = new Blob([head, tail]);
      }
      
      reader.onload = (e) => {
        const content = e.target.result;
        const matches = content.match(/\/Count\s+(\d+)/g);
        if (matches) {
          let maxCount = 0;
          matches.forEach(match => {
            const count = parseInt(match.match(/\d+/)[0]);
            if (count > maxCount) maxCount = count;
          });
          if (maxCount > 0) resolve(maxCount);
          else reject("Metadata read error");
        } else reject("Metadata not found");
      };

      reader.onerror = () => reject("Error reading file");
      reader.readAsText(blobToRead);
    });
  };

  const processFile = async (file) => {
    const isPDF = file.type === 'application/pdf';
    const isImage = file.type.startsWith('image/');
    let finalFile = file;
    let pageCount = 1;

    if (isPDF) {
      try {
        pageCount = await countPagesFast(file);
      } catch (error) {
        try {
          const arrayBuffer = await file.arrayBuffer();
          const pdfDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
          pageCount = pdfDoc.getPageCount();
        } catch (pdfLibError) {
          pageCount = 1;
        }
      }
    } else if (isImage) {
      try {
        const pdfDoc = await PDFDocument.create();
        const imageBytes = await file.arrayBuffer();
        let image;
        if (file.type === 'image/jpeg' || file.type === 'image/jpg') image = await pdfDoc.embedJpg(imageBytes);
        else if (file.type === 'image/png') image = await pdfDoc.embedPng(imageBytes);

        const a4Width = 595.28;
        const a4Height = 841.89;
        const page = pdfDoc.addPage([a4Width, a4Height]);
        const scale = Math.min(a4Width / image.width, a4Height / image.height);
        const scaledWidth = image.width * scale;
        const scaledHeight = image.height * scale;
        page.drawImage(image, { x: (a4Width - scaledWidth)/2, y: (a4Height - scaledHeight)/2, width: scaledWidth, height: scaledHeight });
        const pdfBytes = await pdfDoc.save();
        const newFileName = file.name.replace(/\.[^/.]+$/, "") + ".pdf";
        finalFile = new File([pdfBytes], newFileName, { type: 'application/pdf' });
      } catch (err) {
        console.error("Image to PDF error:", err);
      }
    }

    return {
      id: Math.random().toString(36).substring(7),
      name: finalFile.name,
      fileObj: finalFile,
      pageCount: pageCount,
      originalPageCount: pageCount,
      copies: 1,
      mode: 'bw',
      isTwoSided: false,
      printRange: 'all',
      customRangeString: '',
      rangeText: 'All Pages'
    };
  };

  const handleFileChange = async (event) => {
    const files = Array.from(event.target.files);
    if (files.length === 0) return;

    setIsCalculating(true);
    const processedFiles = [];
    for (const file of files) {
      if (file.size > 50 * 1024 * 1024) continue;
      const processed = await processFile(file);
      processedFiles.push(processed);
    }
    setSelectedFiles(prev => [...prev, ...processedFiles]);
    setIsCalculating(false);
    event.target.value = '';
  };

  const removeFile = (id) => {
    setSelectedFiles(prev => prev.filter(f => f.id !== id));
  };

  const handleContinue = () => {
    if (selectedFiles.length === 0) return;
    navigate('/review', { state: { files: selectedFiles, pricing } });
  };

  const fileInputRef = useRef(null);
  const handleBoxClick = () => fileInputRef.current.click();

  return (
    <div className="min-vh-100 d-flex justify-content-center align-items-center py-4 px-3" style={{ backgroundColor: '#f0f9ff' }}>
      <div className="card shadow-lg border-0 rounded-4 w-100 p-4 p-md-5 bg-white" style={{ maxWidth: '450px' }}>
        
        <div className="text-center mb-4">
          <img src="/printerlogo.png" alt="The Print Spot Logo" className="rounded-circle border border-opacity-25 p-1 mb-2" style={{ height: '70px', width: '70px', objectFit: 'cover', borderColor: '#0ea5e9' }} />
          <h2 className="fw-bolder text-dark mb-0" style={{ letterSpacing: '-0.5px' }}>
            The Print <span style={{ color: '#0ea5e9' }}>स्पॉट</span>
          </h2>
          <p className="text-muted small mt-1">Multi-File Printing Service</p>
        </div>
        
        <input type="file" ref={fileInputRef} onChange={handleFileChange} multiple accept=".pdf, image/jpeg, image/png, image/jpg" className="d-none" />

        <div className={`p-4 text-center rounded-4 mb-3 transition-all ${isCalculating ? 'bg-light opacity-50' : 'bg-light border-secondary border-opacity-50'}`} 
             style={{ border: '2px dashed', cursor: isCalculating ? 'wait' : 'pointer' }} 
             onClick={!isCalculating ? handleBoxClick : undefined}>
          <div className="d-flex flex-column align-items-center">
            <div className="bg-white border text-secondary rounded-circle d-flex justify-content-center align-items-center mb-3 shadow-sm" style={{ width: '56px', height: '56px' }}>
               {isCalculating ? <Loader size={28} className="fa-spin" /> : <Upload size={28} />}
            </div>
            <p className="fw-bold text-dark mb-1">Upload Documents</p>
            <small className="text-muted">PDF, JPG, PNG (You can pick multiple!)</small>
          </div>
        </div>

        {selectedFiles.length > 0 && (
          <div className="mb-4">
            <div className="d-flex justify-content-between align-items-center mb-2">
               <span className="fw-bold text-secondary small">{selectedFiles.length} File(s) added</span>
               <button onClick={handleBoxClick} className="btn btn-link py-0 text-decoration-none small fw-bold" style={{ color: '#0ea5e9' }}>+ Add More</button>
            </div>
            <div className="d-flex flex-column gap-2" style={{ maxHeight: '200px', overflowY: 'auto' }}>
              {selectedFiles.map(file => (
                <div key={file.id} className="d-flex justify-content-between align-items-center p-2 rounded-3 bg-light border border-opacity-10 w-100">
                  <div className="d-flex align-items-center gap-2 text-truncate pe-2">
                    <FileText size={16} className="text-primary flex-shrink-0" />
                    <span className="small text-dark text-truncate">{file.name}</span>
                    <span className="badge bg-secondary bg-opacity-10 text-secondary" style={{ fontSize: '0.65rem' }}>{file.pageCount}p</span>
                  </div>
                  <button onClick={() => removeFile(file.id)} className="btn btn-sm btn-link text-danger p-0">
                    <X size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <button 
          onClick={handleContinue} 
          disabled={selectedFiles.length === 0 || isCalculating} 
          className={`btn w-100 py-3 rounded-pill fw-bold shadow-sm mb-4 text-white ${selectedFiles.length === 0 || isCalculating ? 'btn-secondary opacity-50' : ''}`}
          style={{ backgroundColor: selectedFiles.length > 0 ? '#0ea5e9' : '' }}
        >
          {isCalculating ? 'Processing...' : 'Set Print Configs →'}
        </button>

        {savedOtps.length > 0 && (
          <div className="pt-4 border-top">
            <h6 className="fw-bold text-secondary mb-3 d-flex align-items-center gap-2">
              <Clock size={16} style={{ color: '#0ea5e9' }}/> Recent Prints
            </h6>
            <div className="d-flex flex-column gap-2">
              {savedOtps.slice(0, 2).map((item, index) => (
                <div key={index} className="d-flex justify-content-between align-items-center p-2 bg-light rounded-3 border border-opacity-10">
                  <span className="small text-dark text-truncate w-50">{item.fileName}</span>
                  <div className="fw-bold text-primary small">{item.otp}</div>
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