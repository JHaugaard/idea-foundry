import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FileText, Image, Download } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface FileAttachment {
  name: string;
  type: string;
  path?: string;
  size?: number;
}

interface FileAttachmentRendererProps {
  attachments: FileAttachment[];
  className?: string;
}

export const FileAttachmentRenderer: React.FC<FileAttachmentRendererProps> = ({
  attachments,
  className = ""
}) => {
  if (!attachments || attachments.length === 0) return null;

  const getFileUrl = async (path: string) => {
    const { data } = await supabase.storage
      .from('user-files')
      .createSignedUrl(path, 3600); // 1 hour expiry
    return data?.signedUrl;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const isImage = (type: string) => type.startsWith('image/');
  const isPDF = (type: string) => type === 'application/pdf';

  return (
    <div className={`space-y-3 ${className}`}>
      <h4 className="text-sm font-medium">Attachments</h4>
      <div className="space-y-2">
        {attachments.map((attachment, index) => (
          <Card key={index} className="overflow-hidden">
            <CardContent className="p-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  {isImage(attachment.type) ? (
                    <Image className="h-4 w-4 text-blue-500 flex-shrink-0" />
                  ) : (
                    <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{attachment.name}</p>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {attachment.type.split('/')[1]?.toUpperCase() || 'FILE'}
                      </Badge>
                      {attachment.size && (
                        <span className="text-xs text-muted-foreground">
                          {formatFileSize(attachment.size)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                
                {attachment.path && (
                  <button
                    onClick={async () => {
                      const url = await getFileUrl(attachment.path!);
                      if (url) window.open(url, '_blank');
                    }}
                    className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground"
                  >
                    <Download className="h-4 w-4" />
                  </button>
                )}
              </div>

              {/* Image preview */}
              {isImage(attachment.type) && attachment.path && (
                <div className="mt-3">
                  <ImagePreview path={attachment.path} alt={attachment.name} />
                </div>
              )}

              {/* PDF preview placeholder */}
              {isPDF(attachment.type) && (
                <div className="mt-3 p-4 bg-muted/50 rounded text-center">
                  <FileText className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">PDF Document</p>
                  <p className="text-xs text-muted-foreground">Click download to view</p>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

const ImagePreview: React.FC<{ path: string; alt: string }> = ({ path, alt }) => {
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
      <div className="w-full h-32 bg-muted animate-pulse rounded flex items-center justify-center">
        <span className="text-xs text-muted-foreground">Loading image...</span>
      </div>
    );
  }

  if (error || !imageUrl) {
    return (
      <div className="w-full h-32 bg-muted rounded flex items-center justify-center">
        <span className="text-xs text-muted-foreground">Failed to load image</span>
      </div>
    );
  }

  return (
    <img
      src={imageUrl}
      alt={alt}
      className="w-full max-w-md h-auto rounded border"
      style={{ maxHeight: '300px', objectFit: 'contain' }}
    />
  );
};

export default FileAttachmentRenderer;