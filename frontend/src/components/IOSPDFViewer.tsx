
import { useState, useEffect, useRef } from 'react';
import { X, ChevronLeft, ChevronRight, Download, FileText, Loader2 } from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';
import { renderAsync } from 'docx-preview';

// Set worker source
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();

if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/5.6.205/pdf.worker.min.js';
}

interface IOSPDFViewerProps {
  file: File;
  onClose: () => void;
}

export const IOSPDFViewer = ({ file, onClose }: IOSPDFViewerProps) => {
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [pdfData, setPdfData] = useState<Uint8Array | null>(null);
  const [loading, setLoading] = useState(true);
  const docxContainerRef = useRef<HTMLDivElement>(null);
  const isDocx = file.name.toLowerCase().endsWith('.docx') || file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

  useEffect(() => {
    const loadFile = async () => {
      try {
        if (isDocx) {
          // Handled by the second useEffect
          return;
        }

        if (file.type === 'application/pdf') {
          const arrayBuffer = await file.arrayBuffer();
          setPdfData(new Uint8Array(arrayBuffer));
          setLoading(false);
        } else if (file.type.startsWith('image/')) {
          setLoading(false);
        } else {
          setLoading(false);
        }
      } catch (err) {
        console.error("Error loading file:", err);
        setError("Failed to load file");
        setLoading(false);
      }
    };

    loadFile();
  }, [file, isDocx]);

  // Handle DOCX rendering separately when ref is ready
  useEffect(() => {
    if (isDocx && docxContainerRef.current && loading) {
      const renderDocx = async () => {
        try {
          const arrayBuffer = await file.arrayBuffer();
          await renderAsync(arrayBuffer, docxContainerRef.current!, undefined, {
            className: "docx-render",
            inWrapper: false,
            ignoreWidth: false,
            ignoreHeight: false,
            debug: false
          });
          setLoading(false);
        } catch (err) {
          console.error("Docx render error:", err);
          setError("Failed to render Word document");
          setLoading(false);
        }
      };
      renderDocx();
    }
  }, [isDocx, file, loading]);

  // For images
  if (file.type.startsWith('image/')) {
    const imageUrl = URL.createObjectURL(file);
    return (
      <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4" onClick={onClose}>
        <div className="relative max-w-4xl max-h-[90vh]">
          <button
            onClick={onClose}
            className="absolute -top-12 right-0 text-white hover:text-gray-300 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
          <img
            src={imageUrl}
            alt={file.name}
            className="max-w-full max-h-[90vh] object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      </div>
    );
  }

  // Simple PDF viewer that works on iOS
  const renderPDFPage = async () => {
    if (!pdfData) return null;

    try {
      const loadingTask = pdfjsLib.getDocument({ data: pdfData });
      const pdf = await loadingTask.promise;
      setNumPages(pdf.numPages);

      const page = await pdf.getPage(pageNumber);
      const viewport = page.getViewport({ scale: 1.5 });

      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      if (!context) throw new Error("No context");

      canvas.width = viewport.width;
      canvas.height = viewport.height;

      await page.render({
        canvasContext: context,
        viewport: viewport
      }).promise;

      return canvas.toDataURL('image/jpeg', 0.9);
    } catch (err) {
      console.error("Render error:", err);
      return null;
    }
  };

  const [currentPageUrl, setCurrentPageUrl] = useState<string | null>(null);
  const [renderLoading, setRenderLoading] = useState(false);

  useEffect(() => {
    if (pdfData && !loading && !isDocx) {
      const render = async () => {
        setRenderLoading(true);
        const url = await renderPDFPage();
        setCurrentPageUrl(url);
        setRenderLoading(false);
      };
      render();
    }
  }, [pdfData, pageNumber, loading, isDocx]);

  return (
    <div className="fixed inset-0 bg-black/90 z-50 flex flex-col" onClick={onClose}>
      <div className="flex justify-between items-center p-4 bg-black/80">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <FileText className="w-5 h-5 text-blue-400 flex-shrink-0" />
          <h3 className="text-white font-semibold truncate text-sm">
            {file.name}
          </h3>
        </div>
        <div className="flex gap-4 items-center">
          <a
            href={URL.createObjectURL(file)}
            download={file.name}
            className="flex items-center gap-2 px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-white text-xs font-medium transition-colors"
            onClick={(e) => e.stopPropagation()}
          >
            <Download className="w-4 h-4" />
            Download
          </a>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-white/10 rounded-full text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto flex justify-center items-start p-4 md:p-8" onClick={(e) => e.stopPropagation()}>
        {loading || renderLoading ? (
          <div className="text-white text-center mt-20">
            <Loader2 className="w-12 h-12 text-blue-400 animate-spin mx-auto mb-4" />
            <p className="text-gray-400">Preparing preview...</p>
          </div>
        ) : error ? (
          <div className="text-white text-center mt-20 max-w-md mx-auto">
            <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <FileText className="w-10 h-10 text-red-500 opacity-50" />
            </div>
            <p className="text-lg font-medium mb-2">{error}</p>
            <p className="text-gray-400 text-sm mb-8">We couldn't generate a preview for this file, but you can still download or print it.</p>
            <a
              href={URL.createObjectURL(file)}
              download={file.name}
              className="px-6 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors inline-flex items-center gap-2 shadow-lg"
            >
              <Download className="w-4 h-4" />
              Download Original File
            </a>
          </div>
        ) : isDocx ? (
          <div className="w-full max-w-[850px] bg-white rounded-sm shadow-2xl overflow-hidden min-h-[500px]">
            <div ref={docxContainerRef} className="docx-viewer-container" />
          </div>
        ) : currentPageUrl ? (
          <div className="relative">
            <img
              src={currentPageUrl}
              alt={`Page ${pageNumber}`}
              className="max-w-full h-auto rounded-sm shadow-2xl border border-white/10"
            />
          </div>
        ) : null}
      </div>

      {!isDocx && numPages && numPages > 1 && !error && (
        <div className="flex justify-center items-center gap-6 p-4 bg-black/80 backdrop-blur-md">
          <button
            onClick={() => setPageNumber(Math.max(1, pageNumber - 1))}
            disabled={pageNumber <= 1}
            className="p-2 bg-white/10 rounded-full disabled:opacity-30 hover:bg-white/20 transition-colors text-white"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <span className="text-white font-medium text-sm">
            Page <span className="text-blue-400">{pageNumber}</span> of {numPages}
          </span>
          <button
            onClick={() => setPageNumber(Math.min(numPages, pageNumber + 1))}
            disabled={pageNumber >= numPages}
            className="p-2 bg-white/10 rounded-full disabled:opacity-30 hover:bg-white/20 transition-colors text-white"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        </div>
      )}
      
      {isDocx && !loading && !error && (
        <div className="p-3 bg-blue-600/20 border-t border-blue-500/30 text-center">
          <p className="text-blue-300 text-[10px] uppercase tracking-wider font-bold">Word Document Preview</p>
        </div>
      )}
    </div>
  );
};

