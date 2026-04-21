
import { useState, useEffect } from 'react';
import { FileText, Loader2 } from 'lucide-react';

// Import pdfjs-dist statically (not dynamically)
import * as pdfjsLib from 'pdfjs-dist';

// Set worker source immediately
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url
).toString();

// Fallback worker URL for iOS
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

    useEffect(() => {
        let isMounted = true;
        let objectUrl: string | null = null;

        const generateThumbnail = async () => {
            try {
                // For images - works everywhere
                if (file.type.startsWith('image/')) {
                    objectUrl = URL.createObjectURL(file);
                    if (isMounted) {
                        setThumbnail(objectUrl);
                        setLoading(false);
                        if (onLoad) onLoad(objectUrl);
                    }
                    return;
                }

                // For PDFs - simplified approach that works on iOS
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

                        // Scale to fit thumbnail (max 96px)
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
                        // Fallback - just show file icon
                        setThumbnail(null);
                        setLoading(false);
                    }
                }
            } catch (err) {
                console.error("Thumbnail generation error:", err);
                setError(true);
                setLoading(false);
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
    }, [file]);

    if (loading) {
        return (
            <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                <Loader2 className="w-5 h-5 text-primary animate-spin" />
            </div>
        );
    }

    if (thumbnail) {
        return (
            <img
                src={thumbnail}
                alt="Preview"
                className="w-12 h-12 rounded-xl object-cover shadow-md"
                loading="lazy"
            />
        );
    }

    return (
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-md">
            <FileText className="w-5 h-5 text-white" />
        </div>
    );
};