import { PDFDocument } from 'pdf-lib';
import heic2any from 'heic2any';
import JSZip from 'jszip';

/**
 * Extracts the page count from a DOCX file's internal metadata (docProps/app.xml).
 */
export const countDocxPages = async (file: File): Promise<number> => {
  return countOfficePages(file, /<[^>]*Pages>(\d+)<\/[^>]*Pages>/i, /<Pages>(\d+)<\/Pages>/i);
};

/**
 * Extracts slide count from a PPTX file.
 */
export const countPptxPages = async (file: File): Promise<number> => {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const zip = await JSZip.loadAsync(arrayBuffer);
    
    // PPTX slides are typically stored as individual XML files in ppt/slides/
    let slideCount = 0;
    zip.folder("ppt/slides")?.forEach((relativePath) => {
      // Look for files like slide1.xml, slide2.xml...
      if (relativePath.match(/^slide\d+\.xml$/i)) {
        slideCount++;
      }
    });
    
    if (slideCount > 0) {
      return slideCount;
    }
    
    // Fallback to app.xml metadata if folder scanning fails
    return await countOfficePages(file, /<[^>]*Slides>(\d+)<\/[^>]*Slides>/i, /<Slides>(\d+)<\/Slides>/i);
  } catch (e) {
    console.error("Failed to read PPTX slides", e);
    return 1;
  }
};

/**
 * Extracts sheet count from an XLSX file (each sheet is estimated as 1 page).
 */
export const countXlsxPages = async (file: File): Promise<number> => {
  // XLSX usually stores sheet count in workbook.xml or app.xml, let's try a common tag or default to 1.
  // Actually, TitlesOfParts size often equals the number of sheets in app.xml
  try {
    const arrayBuffer = await file.arrayBuffer();
    const zip = await JSZip.loadAsync(arrayBuffer);
    const workbookXml = zip.file("xl/workbook.xml");
    if (workbookXml) {
      const text = await workbookXml.async("text");
      const match = text.match(/<sheet\s+/gi);
      if (match && match.length > 0) return match.length;
    }
  } catch (e) {
    console.error("Failed to read XLSX sheets", e);
  }
  return 1;
};

// Internal helper for Office metadata extraction
const countOfficePages = async (file: File, regex1: RegExp, regex2: RegExp): Promise<number> => {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const zip = await JSZip.loadAsync(arrayBuffer);
    const appXmlFile = zip.file("docProps/app.xml");
    
    if (!appXmlFile) {
      return 1;
    }
    
    const appXmlText = await appXmlFile.async("text");
    const match = appXmlText.match(regex1) || appXmlText.match(regex2);
    
    if (match && match[1]) {
      const pages = parseInt(match[1], 10);
      return pages > 0 ? pages : 1;
    }
    return 1;
  } catch (error) {
    console.error(`Failed to extract pages from ${file.name}`, error);
    return 1;
  }
};

/**
 * Extracts the embedded thumbnail from an Office Document (DOCX/PPTX/XLSX) if it exists.
 * Many Office files contain `docProps/thumbnail.jpeg`.
 */
export const extractOfficeThumbnail = async (file: File): Promise<string | null> => {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const zip = await JSZip.loadAsync(arrayBuffer);
    const thumbnailFile = zip.file("docProps/thumbnail.jpeg") || zip.file("docProps/thumbnail.wmf");
    if (thumbnailFile) {
      const blob = await thumbnailFile.async("blob");
      return URL.createObjectURL(blob);
    }
  } catch (e) {
    // silently fail and return null
  }
  return null;
};

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
    const isHeic = 
      file.name.toLowerCase().endsWith('.heic') || 
      file.name.toLowerCase().endsWith('.heif') || 
      file.type === 'image/heic' || 
      file.type === 'image/heif';

    // 1. Convert HEIC to JPEG if needed
    if (isHeic) {
      try {
        const convertedBlob = await heic2any({
          blob: file,
          toType: 'image/jpeg',
          quality: 0.8
        });
        const finalBlob = Array.isArray(convertedBlob) ? convertedBlob[0] : convertedBlob;
        sourceFile = new File([finalBlob], file.name.replace(/\.(heic|heif)$/i, ".jpg"), { type: 'image/jpeg' });
      } catch (err) {
        console.error("HEIC conversion failed:", err);
        // Fallback or re-throw
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

