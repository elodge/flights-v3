/**
 * @fileoverview PDF Viewer Component for Tour Documents
 * 
 * @description Displays PDF documents inline using iframe with fallback options
 * @access Client and Employee (view-only)
 * @security Uses signed URLs for secure document access
 * @database No direct database operations
 * @coverage PDF viewing functionality and error handling
 */

'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Eye, Download, ExternalLink, AlertCircle } from 'lucide-react';

interface PDFViewerProps {
  /**
   * Signed URL for the PDF document
   */
  pdfUrl: string;
  
  /**
   * Document title for display
   */
  title: string;
  
  /**
   * Whether to show as a button trigger or inline
   */
  variant?: 'button' | 'inline';
  
  /**
   * Button size for button variant
   */
  size?: 'sm' | 'default' | 'lg';
}

/**
 * PDF Viewer Component
 * 
 * @description Displays PDF documents with fallback options for download
 * @param pdfUrl - Signed URL for secure document access
 * @param title - Document title for display and accessibility
 * @param variant - Display mode: button trigger or inline viewer
 * @param size - Button size when using button variant
 * @returns JSX.Element - PDF viewer with fallback options
 * @access Client and Employee (view-only)
 * @security Uses signed URLs with expiration for secure access
 * @example
 * ```tsx
 * <PDFViewer 
 *   pdfUrl="https://signed-url.com/document.pdf" 
 *   title="Tour Itinerary"
 *   variant="button"
 * />
 * ```
 */
export function PDFViewer({ 
  pdfUrl, 
  title, 
  variant = 'button', 
  size = 'default' 
}: PDFViewerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [hasError, setHasError] = useState(false);

  // CONTEXT: Handle PDF loading errors
  const handleLoadError = () => {
    setHasError(true);
  };

  // CONTEXT: Open PDF in new tab as fallback
  const handleOpenInNewTab = () => {
    window.open(pdfUrl, '_blank', 'noopener,noreferrer');
  };

  // CONTEXT: Download PDF as fallback
  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = pdfUrl;
    link.download = `${title}.pdf`;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (variant === 'inline') {
    return (
      <div className="w-full h-[600px] border rounded-lg overflow-hidden">
        {hasError ? (
          <div className="flex items-center justify-center h-full bg-muted">
            <Alert className="max-w-md">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Unable to display PDF. 
                <Button 
                  variant="link" 
                  className="p-0 h-auto ml-1"
                  onClick={handleOpenInNewTab}
                >
                  Open in new tab
                </Button>
              </AlertDescription>
            </Alert>
          </div>
        ) : (
          <iframe
            src={pdfUrl}
            title={title}
            className="w-full h-full"
            onError={handleLoadError}
            onLoad={() => setHasError(false)}
          />
        )}
      </div>
    );
  }

  return (
    <>
      <Button
        variant="outline"
        size={size}
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2"
      >
        <Eye className="h-4 w-4" />
        View
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] p-0">
          <DialogHeader className="px-6 py-4 border-b">
            <DialogTitle className="flex items-center justify-between">
              <span>{title}</span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDownload}
                  className="flex items-center gap-1"
                >
                  <Download className="h-3 w-3" />
                  Download
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleOpenInNewTab}
                  className="flex items-center gap-1"
                >
                  <ExternalLink className="h-3 w-3" />
                  Open
                </Button>
              </div>
            </DialogTitle>
          </DialogHeader>
          
          <div className="flex-1 min-h-0">
            {hasError ? (
              <div className="flex items-center justify-center h-96 bg-muted">
                <Alert className="max-w-md">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Unable to display PDF. 
                    <Button 
                      variant="link" 
                      className="p-0 h-auto ml-1"
                      onClick={handleOpenInNewTab}
                    >
                      Open in new tab
                    </Button>
                  </AlertDescription>
                </Alert>
              </div>
            ) : (
              <iframe
                src={pdfUrl}
                title={title}
                className="w-full h-[70vh]"
                onError={handleLoadError}
                onLoad={() => setHasError(false)}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
