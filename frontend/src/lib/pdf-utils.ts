import { PDFDocument } from 'pdf-lib';
import heic2any from 'heic2any';

/**
 * Rapidly counts pages in a PDF file by scanning metadata chunks.
 * Falls back to full library load if metadata is missing or ambiguous.
 */
export const countPagesFast = (file: File): Promise<number> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    const CHUNK_SIZE = 3 * 1024 * 1024; // 3MB chunks
    let blobToRead = file;

    // For large files, only read the start and end where metadata usually lives
    if (file.size > CHUNK_SIZE * 2) {
      const head = file.slice(0, CHUNK_SIZE);
      const tail = file.slice(file.size - CHUNK_SIZE, file.size);
      blobToRead = new Blob([head, tail]);
    }
    
    reader.onload = (e) => {
      const content = e.target?.result as string;
      if (!content) return reject("Failed to read file content");

      // Regex to find /Count metadata tag
      const matches = content.match(/\/Count\s+(\d+)/g);
      if (matches) {
        let maxCount = 0;
        matches.forEach(match => {
          const countMatch = match.match(/\d+/);
          if (countMatch) {
            const count = parseInt(countMatch[0]);
            if (count > maxCount) maxCount = count;
          }
        });
        if (maxCount > 0) return resolve(maxCount);
      }
      
      // Fallback: Full parse using pdf-lib
      parsePdfFully(file).then(resolve).catch(reject);
    };

    reader.onerror = () => reject("Error reading file");
    reader.readAsText(blobToRead);
  });
};

/**
 * Full PDF parsing using pdf-lib for accuracy when metadata scan fails.
 */
export const parsePdfFully = async (doc: Blob): Promise<number> => {
  try {
    const arrayBuffer = await doc.arrayBuffer();
    const pdfDoc = await PDFDocument.load(arrayBuffer, { 
      ignoreEncryption: true,
      updateMetadata: false 
    });
    return pdfDoc.getPageCount();
  } catch (error) {
    console.warn("PDF-lib full parse failed, defaulting to 1 page", error);
    return 1;
  }
};

/**
 * Converts images to PDF to standardize the printing pipeline.
 */
export const convertImageToPdf = async (file: File): Promise<File> => {
  try {
    let sourceFile: File | Blob = file;
    const isHeic = file.name.toLowerCase().endsWith('.heic') || file.type === 'image/heic' || file.type === 'image/heif';

    // 1. Convert HEIC to JPEG if needed
    if (isHeic) {
      try {
        const convertedBlob = await heic2any({
          blob: file,
          toType: 'image/jpeg',
          quality: 0.8
        });
        sourceFile = Array.isArray(convertedBlob) ? convertedBlob[0] : convertedBlob;
      } catch (err) {
        console.error("HEIC conversion failed:", err);
      }
    }

    const pdfDoc = await PDFDocument.create();
    const imageBytes = await sourceFile.arrayBuffer();
    let image;
    
    // Check type or extension
    const type = sourceFile.type;
    const isPng = type === 'image/png';
    
    if (isPng) {
      image = await pdfDoc.embedPng(imageBytes);
    } else {
      // Default to JPG for others (including converted HEIC)
      image = await pdfDoc.embedJpg(imageBytes);
    }

    const a4Width = 595.28; // A4 dimensions in points
    const a4Height = 841.89;
    
    const page = pdfDoc.addPage([a4Width, a4Height]);
    const scale = Math.min(a4Width / image.width, a4Height / image.height);
    const scaledWidth = image.width * scale;
    const scaledHeight = image.height * scale;
    
    page.drawImage(image, {
      x: (a4Width - scaledWidth) / 2,
      y: (a4Height - scaledHeight) / 2,
      width: scaledWidth,
      height: scaledHeight
    });

    const pdfBytes = await pdfDoc.save();
    const newFileName = file.name.replace(/\.[^/.]+$/, "") + ".pdf";
    return new File([pdfBytes], newFileName, { type: 'application/pdf' });
  } catch (err) {
    console.error("Image to PDF error:", err);
    throw err;
  }
};

