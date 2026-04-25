import { useState, useEffect, useRef } from 'react';
import { FileText, Loader2 } from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';
import { renderAsync } from 'docx-preview';

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url
).toString();

if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/5.6.205/pdf.worker.min.js';
}

interface IOSCompatibleThumbnailProps {
    file: File;
    onLoad?: (thumbnail: string) => void;
}

export const IOSCompatibleThumbnail = ({ file, onLoad }: IOSCompatibleThumbnailProps) => {
    const [thumbnail, setThumbnail] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const docxRef = useRef<HTMLDivElement>(null);

    const isDocx = file.name.toLowerCase().endsWith('.docx') ||
        file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

    // ✅ Effect 1: Handles PDF and Image thumbnails only
    useEffect(() => {
        if (isDocx) return; // DOCX is handled separately below

        let isMounted = true;
        let objectUrl: string | null = null;

        const generateThumbnail = async () => {
            try {
                // For images
                if (file.type.startsWith('image/')) {
                    objectUrl = URL.createObjectURL(file);
                    if (isMounted) {
                        setThumbnail(objectUrl);
                        setLoading(false);
                        if (onLoad) onLoad(objectUrl);
                    }
                    return;
                }

                // For PDFs
                if (file.type === 'application/pdf') {
                    objectUrl = URL.createObjectURL(file);

                    try {
                        const loadingTask = pdfjsLib.getDocument({
                            url: objectUrl,
                            useSystemFonts: true,
                            disableFontFace: false,
                        });

                        const pdf = await loadingTask.promise;
                        const page = await pdf.getPage(1);

                        const viewport = page.getViewport({ scale: 1.0 });
                        const scale = Math.min(96 / viewport.width, 1.5);
                        const scaledViewport = page.getViewport({ scale });

                        const canvas = document.createElement('canvas');
                        const context = canvas.getContext('2d');
                        if (!context) throw new Error("No canvas context");

                        canvas.width = scaledViewport.width;
                        canvas.height = scaledViewport.height;

                        await page.render({
                            canvasContext: context,
                            viewport: scaledViewport
                        }).promise;

                        if (isMounted) {
                            const thumbnailUrl = canvas.toDataURL('image/jpeg', 0.8);
                            setThumbnail(thumbnailUrl);
                            setLoading(false);
                            if (onLoad) onLoad(thumbnailUrl);
                        }
                    } catch (pdfError) {
                        console.error("PDF rendering error:", pdfError);
                        if (isMounted) {
                            setThumbnail(null);
                            setLoading(false);
                        }
                    }
                }
            } catch (err) {
                console.error("Thumbnail generation error:", err);
                if (isMounted) {
                    setError(true);
                    setLoading(false);
                }
            } finally {
                if (objectUrl && !isMounted) {
                    URL.revokeObjectURL(objectUrl);
                }
            }
        };

        generateThumbnail();

        return () => {
            isMounted = false;
        };
    }, [file, isDocx]);

    // ✅ Effect 2: Handles DOCX rendering AFTER the ref div is mounted in the DOM
    useEffect(() => {
        if (!isDocx) return; // Only runs for DOCX files

        let isMounted = true;

        const renderDocx = async () => {
            // Safety check — ref must be available
            if (!docxRef.current) {
                console.warn("docxRef not ready yet");
                return;
            }

            try {
                const arrayBuffer = await file.arrayBuffer();

                if (isMounted && docxRef.current) {
                    await renderAsync(arrayBuffer, docxRef.current, undefined, {
                        className: "docx-thumbnail-render",
                        inWrapper: false,
                        ignoreWidth: true,
                        ignoreHeight: true,
                    });

                    if (isMounted) setLoading(false);
                }
            } catch (err) {
                console.error("Docx thumbnail error:", err);
                if (isMounted) {
                    setError(true);
                    setLoading(false);
                }
            }
        };

        renderDocx();

        return () => {
            isMounted = false;
        };
    }, [isDocx, file]); // ← Runs after mount when isDocx=true, ref div is already in DOM

    // Loading state for PDF/Image only (DOCX shows its own inline spinner)
    if (loading && !isDocx) {
        return (
            <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                <Loader2 className="w-5 h-5 text-primary animate-spin" />
            </div>
        );
    }

    // ✅ DOCX container — always renders so docxRef is attached before Effect 2 runs
    if (isDocx) {
        return (
            <div className="w-12 h-12 rounded-xl bg-white overflow-hidden shadow-md border border-slate-200 relative">
                {loading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-white z-10">
                        <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
                    </div>
                )}
                <div
                    ref={docxRef}
                    className="origin-top-left scale-[0.15] w-[320px] h-[450px]"
                    style={{ pointerEvents: 'none' }}
                />
                <div className="absolute bottom-0 right-0 bg-blue-600 px-1 rounded-tl-md">
                    <span className="text-[6px] font-bold text-white uppercase">Docx</span>
                </div>
            </div>
        );
    }

    if (thumbnail) {
        return (
            <img
                src={thumbnail}
                alt="Preview"
                className="w-12 h-12 rounded-xl object-cover shadow-md border border-slate-200"
                loading="lazy"
            />
        );
    }

    return (
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-slate-500 to-slate-600 flex items-center justify-center shadow-md">
            <FileText className="w-5 h-5 text-white" />
        </div>
    );
};