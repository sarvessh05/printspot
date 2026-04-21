
import { useState, useEffect } from 'react';
import { X, ChevronLeft, ChevronRight, Download, FileText } from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';

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

  useEffect(() => {
    const loadPDF = async () => {
      try {
        const arrayBuffer = await file.arrayBuffer();
        setPdfData(new Uint8Array(arrayBuffer));
        setLoading(false);
      } catch (err) {
        console.error("Error loading PDF:", err);
        setError("Failed to load PDF file");
        setLoading(false);
      }
    };

    loadPDF();
  }, [file]);

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
    if (pdfData && !loading) {
      const render = async () => {
        setRenderLoading(true);
        const url = await renderPDFPage();
        setCurrentPageUrl(url);
        setRenderLoading(false);
      };
      render();
    }
  }, [pdfData, pageNumber]);

  return (
    <div className="fixed inset-0 bg-black/90 z-50 flex flex-col" onClick={onClose}>
      <div className="flex justify-between items-center p-4 bg-black/80">
        <h3 className="text-white font-semibold truncate flex-1 text-sm">
          {file.name}
        </h3>
        <div className="flex gap-2">
          {file && (
            <a
              href={URL.createObjectURL(file)}
              download={file.name}
              className="text-white hover:text-gray-300 transition-colors"
              onClick={(e) => e.stopPropagation()}
            >
              <Download className="w-5 h-5" />
            </a>
          )}
          <button
            onClick={onClose}
            className="text-white hover:text-gray-300 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto flex justify-center items-center p-4" onClick={(e) => e.stopPropagation()}>
        {loading || renderLoading ? (
          <div className="text-white text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
            <p>Loading PDF...</p>
          </div>
        ) : error ? (
          <div className="text-white text-center">
            <FileText className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <p className="mb-4">{error}</p>
            <a
              href={URL.createObjectURL(file)}
              download={file.name}
              className="px-4 py-2 bg-blue-500 rounded-lg hover:bg-blue-600 transition-colors inline-block"
            >
              Download PDF instead
            </a>
          </div>
        ) : currentPageUrl ? (
          <img
            src={currentPageUrl}
            alt={`Page ${pageNumber}`}
            className="max-w-full h-auto rounded-lg shadow-2xl"
          />
        ) : null}
      </div>

      {numPages && numPages > 1 && !error && (
        <div className="flex justify-center gap-4 p-4 bg-black/80">
          <button
            onClick={() => setPageNumber(Math.max(1, pageNumber - 1))}
            disabled={pageNumber <= 1}
            className="px-4 py-2 bg-white/20 rounded-lg disabled:opacity-50 hover:bg-white/30 transition-colors text-white"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="text-white">
            Page {pageNumber} of {numPages}
          </span>
          <button
            onClick={() => setPageNumber(Math.min(numPages, pageNumber + 1))}
            disabled={pageNumber >= numPages}
            className="px-4 py-2 bg-white/20 rounded-lg disabled:opacity-50 hover:bg-white/30 transition-colors text-white"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      )}
    </div>
  );
};
