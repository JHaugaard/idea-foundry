import React from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { FileText, Image as ImageIcon, Download } from 'lucide-react';
import { PdfCanvasViewer } from '@/components/PdfCanvasViewer';

interface FileAttachment {
  name: string;
  type: string;
  path?: string;
  size?: number;
}

interface AttachmentInlineViewerProps {
  attachments: FileAttachment[];
  className?: string;
}

export const AttachmentInlineViewer: React.FC<AttachmentInlineViewerProps> = ({
  attachments,
  className = ""
}) => {
  if (!attachments || attachments.length === 0) return null;

  const getFileUrl = async (path: string) => {
    const { data } = await supabase.storage
      .from('user-files')
      .createSignedUrl(path, 3600);
    return data?.signedUrl;
  };

  const isImage = (type: string) => type.startsWith('image/');
  const isPDF = (type: string) => type === 'application/pdf';
  const isText = (type: string) => type.startsWith('text/');

  // If single attachment, show it prominently
  if (attachments.length === 1) {
    const attachment = attachments[0];
    
    return (
      <div className={`space-y-4 ${className}`}>
        <div className="text-sm text-muted-foreground mb-2">
          File: {attachment.name}
        </div>
        
        {/* Single Image Display */}
        {isImage(attachment.type) && attachment.path && (
          <SingleImageViewer path={attachment.path} alt={attachment.name} />
        )}
        
        {/* Single PDF Display */}
        {isPDF(attachment.type) && attachment.path && (
          <SinglePDFViewer path={attachment.path} name={attachment.name} />
        )}
        
        {/* Single Text File Display */}
        {isText(attachment.type) && attachment.path && (
          <SingleTextViewer path={attachment.path} name={attachment.name} />
        )}
        
        {/* Other file types */}
        {!isImage(attachment.type) && !isPDF(attachment.type) && !isText(attachment.type) && (
          <div className="p-8 bg-muted/50 rounded-lg text-center">
            <FileText className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <p className="text-lg font-medium">{attachment.name}</p>
            <p className="text-sm text-muted-foreground mt-1">
              {attachment.type.split('/')[1]?.toUpperCase() || 'FILE'}
            </p>
            {attachment.path && (
              <button
                onClick={async () => {
                  const url = await getFileUrl(attachment.path!);
                  if (url) window.open(url, '_blank');
                }}
                className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
              >
                <Download className="h-4 w-4" />
                Download
              </button>
            )}
          </div>
        )}
      </div>
    );
  }

  // Multiple attachments - show grid
  return (
    <div className={`space-y-4 ${className}`}>
      <div className="text-sm text-muted-foreground mb-4">
        {attachments.length} files attached
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {attachments.map((attachment, index) => (
          <Card key={index}>
            <CardContent className="p-4">
              {isImage(attachment.type) && attachment.path && (
                <ThumbnailImageViewer path={attachment.path} alt={attachment.name} />
              )}
              
              {isPDF(attachment.type) && (
                <div className="text-center">
                  <FileText className="h-12 w-12 mx-auto text-red-500 mb-2" />
                  <p className="text-sm font-medium">{attachment.name}</p>
                </div>
              )}
              
              {!isImage(attachment.type) && !isPDF(attachment.type) && (
                <div className="text-center">
                  <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm font-medium">{attachment.name}</p>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

const SingleImageViewer: React.FC<{ path: string; alt: string }> = ({ path, alt }) => {
  const [imageUrl, setImageUrl] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(false);

  React.useEffect(() => {
    const loadImage = async () => {
      try {
        const { data } = await supabase.storage
          .from('user-files')
          .createSignedUrl(path, 3600);
        
        if (data?.signedUrl) {
          setImageUrl(data.signedUrl);
        } else {
          setError(true);
        }
      } catch (err) {
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    loadImage();
  }, [path]);

  if (loading) {
    return (
      <div className="w-full h-96 bg-muted animate-pulse rounded-lg flex items-center justify-center">
        <span className="text-sm text-muted-foreground">Loading image...</span>
      </div>
    );
  }

  if (error || !imageUrl) {
    return (
      <div className="w-full h-96 bg-muted rounded-lg flex items-center justify-center">
        <div className="text-center">
          <ImageIcon className="h-16 w-16 mx-auto text-muted-foreground mb-2" />
          <span className="text-sm text-muted-foreground">Failed to load image</span>
        </div>
      </div>
    );
  }

  return (
    <div className="text-center">
      <img
        src={imageUrl}
        alt={alt}
        className="max-w-full h-auto rounded-lg border shadow-sm mx-auto"
        style={{ maxHeight: '600px' }}
      />
    </div>
  );
};

const SinglePDFViewer: React.FC<{ path: string; name: string }> = ({ path, name }) => {
  const [pdfBlob, setPdfBlob] = React.useState<Blob | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(false);

  React.useEffect(() => {
    const loadPDF = async () => {
      try {
        setLoading(true);
        setError(false);
        
        // Download PDF as blob
        const { data, error } = await supabase.storage
          .from('user-files')
          .download(path);
        
        if (error || !data) {
          setError(true);
          return;
        }

        setPdfBlob(data);
      } catch (err) {
        console.error('Failed to load PDF:', err);
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    loadPDF();
  }, [path]);

  const handleDownload = async () => {
    try {
      const { data } = await supabase.storage
        .from('user-files')
        .createSignedUrl(path, 60);
      if (data?.signedUrl) {
        window.open(data.signedUrl, '_blank');
      }
    } catch (err) {
      console.error('Failed to download PDF:', err);
    }
  };

  if (loading) {
    return (
      <div className="w-full h-96 bg-muted animate-pulse rounded-lg flex items-center justify-center">
        <span className="text-sm text-muted-foreground">Loading PDF...</span>
      </div>
    );
  }

  if (error || !pdfBlob) {
    return (
      <div className="w-full h-96 bg-muted rounded-lg flex items-center justify-center">
        <div className="text-center">
          <FileText className="h-16 w-16 mx-auto text-red-500 mb-4" />
          <p className="text-lg font-medium">{name}</p>
          <p className="text-sm text-muted-foreground mb-4">Failed to load PDF</p>
          <button
            onClick={handleDownload}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
          >
            <Download className="h-4 w-4" />
            Download PDF
          </button>
        </div>
      </div>
    );
  }

  return <PdfCanvasViewer pdfBlob={pdfBlob} name={name} onDownload={handleDownload} />;
};

const SingleTextViewer: React.FC<{ path: string; name: string }> = ({ path, name }) => {
  const [textContent, setTextContent] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const loadText = async () => {
      try {
        const { data: urlData } = await supabase.storage
          .from('user-files')
          .createSignedUrl(path, 3600);
        
        if (urlData?.signedUrl) {
          const response = await fetch(urlData.signedUrl);
          const text = await response.text();
          setTextContent(text);
        }
      } catch (err) {
        console.error('Failed to load text file:', err);
      } finally {
        setLoading(false);
      }
    };

    loadText();
  }, [path]);

  if (loading) {
    return (
      <div className="w-full h-64 bg-muted animate-pulse rounded-lg flex items-center justify-center">
        <span className="text-sm text-muted-foreground">Loading text file...</span>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="bg-muted/50 rounded-lg p-4 max-h-96 overflow-auto">
        <div className="text-xs text-muted-foreground mb-2 font-mono">{name}</div>
        <pre className="text-sm font-mono whitespace-pre-wrap break-words">
          {textContent || 'Failed to load text content'}
        </pre>
      </div>
    </div>
  );
};

const ThumbnailImageViewer: React.FC<{ path: string; alt: string }> = ({ path, alt }) => {
  const [imageUrl, setImageUrl] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(false);

  React.useEffect(() => {
    const loadImage = async () => {
      try {
        const { data } = await supabase.storage
          .from('user-files')
          .createSignedUrl(path, 3600);
        
        if (data?.signedUrl) {
          setImageUrl(data.signedUrl);
        } else {
          setError(true);
        }
      } catch (err) {
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    loadImage();
  }, [path]);

  if (loading) {
    return (
      <div className="w-full h-32 bg-muted animate-pulse rounded">
        <div className="text-center pt-12">
          <span className="text-xs text-muted-foreground">Loading...</span>
        </div>
      </div>
    );
  }

  if (error || !imageUrl) {
    return (
      <div className="w-full h-32 bg-muted rounded flex items-center justify-center">
        <ImageIcon className="h-8 w-8 text-muted-foreground" />
      </div>
    );
  }

  return (
    <img
      src={imageUrl}
      alt={alt}
      className="w-full h-32 object-cover rounded"
    />
  );
};

export default AttachmentInlineViewer;
