import React, { useEffect, useRef, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { FileText, Download } from 'lucide-react';

// Set the worker source
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

interface PdfCanvasViewerProps {
  pdfBlob: Blob;
  name: string;
  onDownload?: () => void;
}

export const PdfCanvasViewer: React.FC<PdfCanvasViewerProps> = ({ 
  pdfBlob, 
  name, 
  onDownload 
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [numPages, setNumPages] = useState(0);

  useEffect(() => {
    const loadPdf = async () => {
      try {
        setLoading(true);
        setError(false);

        // Convert blob to array buffer
        const arrayBuffer = await pdfBlob.arrayBuffer();
        
        // Load PDF document
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        setNumPages(pdf.numPages);

        // Clear container
        if (containerRef.current) {
          containerRef.current.innerHTML = '';
        }

        // Render all pages
        for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
          const page = await pdf.getPage(pageNum);
          const viewport = page.getViewport({ scale: 1.5 });

          // Create canvas element
          const canvas = document.createElement('canvas');
          const context = canvas.getContext('2d');
          canvas.height = viewport.height;
          canvas.width = viewport.width;
          canvas.className = 'w-full border-b border-border mb-4 last:mb-0';

          // Add canvas to container
          if (containerRef.current) {
            containerRef.current.appendChild(canvas);
          }

          // Render page
          if (context) {
            await page.render({
              canvasContext: context,
              viewport: viewport,
              canvas: canvas,
            }).promise;
          }
        }

        setLoading(false);
      } catch (err) {
        console.error('Failed to render PDF:', err);
        setError(true);
        setLoading(false);
      }
    };

    loadPdf();
  }, [pdfBlob]);

  if (loading) {
    return (
      <div className="w-full h-96 bg-muted animate-pulse rounded-lg flex flex-col items-center justify-center">
        <FileText className="h-16 w-16 text-muted-foreground mb-4" />
        <span className="text-sm text-muted-foreground">Loading PDF...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full h-96 bg-muted rounded-lg flex items-center justify-center">
        <div className="text-center">
          <FileText className="h-16 w-16 mx-auto text-red-500 mb-4" />
          <p className="text-lg font-medium">{name}</p>
          <p className="text-sm text-muted-foreground mb-4">Failed to load PDF</p>
          {onDownload && (
            <button
              onClick={onDownload}
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
            >
              <Download className="h-4 w-4" />
              Download PDF
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-4 p-4 bg-muted/50 rounded-t-lg">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-red-500" />
          <span className="font-medium">{name}</span>
          <span className="text-sm text-muted-foreground">({numPages} pages)</span>
        </div>
        {onDownload && (
          <button
            onClick={onDownload}
            className="inline-flex items-center gap-2 px-3 py-1 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
          >
            <Download className="h-3 w-3" />
            Download
          </button>
        )}
      </div>
      <div 
        ref={containerRef} 
        className="max-h-96 overflow-y-auto bg-white p-4 rounded-b-lg border"
        style={{ scrollbarWidth: 'thin' }}
      />
    </div>
  );
};