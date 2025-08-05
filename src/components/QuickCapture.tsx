import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useGoogleDrive } from '@/hooks/useGoogleDrive';
import { Plus, Lightbulb, Cloud, CloudOff, Upload, X, FileText } from 'lucide-react';

const QuickCapture = () => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleDriveConnected, setIsGoogleDriveConnected] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<Array<{name: string, id: string}>>([]);
  const { user } = useAuth();
  const { toast } = useToast();
  const { connectGoogleDrive, uploadToGoogleDrive, isConnecting, isUploading } = useGoogleDrive();

  useEffect(() => {
    const checkGoogleDriveConnection = async () => {
      if (!user) return;
      
      const { data } = await supabase
        .from('profiles')
        .select('google_drive_access_token')
        .eq('user_id', user.id)
        .maybeSingle();
      
      setIsGoogleDriveConnected(!!(data as any)?.google_drive_access_token);
    };

    checkGoogleDriveConnection();
  }, [user]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    if (!isGoogleDriveConnected) {
      toast({
        title: "Google Drive not connected",
        description: "Please connect to Google Drive to upload files.",
        variant: "destructive",
      });
      return;
    }

    const files = Array.from(e.dataTransfer.files);
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'image/png',
      'image/jpeg',
      'image/gif',
      'image/webp'
    ];

    for (const file of files) {
      if (!allowedTypes.includes(file.type)) {
        toast({
          title: "Unsupported file type",
          description: `${file.name} is not a supported file type.`,
          variant: "destructive",
        });
        continue;
      }

      try {
        const fileContent = await file.text();
        await uploadToGoogleDrive(file.name, fileContent);
        setUploadedFiles(prev => [...prev, { name: file.name, id: Date.now().toString() }]);
        
        toast({
          title: "File uploaded",
          description: `${file.name} has been uploaded to Google Drive.`,
        });
      } catch (error: any) {
        toast({
          title: "Upload failed",
          description: `Failed to upload ${file.name}: ${error.message}`,
          variant: "destructive",
        });
      }
    }
  }, [isGoogleDriveConnected, uploadToGoogleDrive, toast]);

  const removeUploadedFile = useCallback((id: string) => {
    setUploadedFiles(prev => prev.filter(file => file.id !== id));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user || !title.trim()) {
      toast({
        title: "Missing information",
        description: "Please enter a title for your idea.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await supabase
        .from('notes')
        .insert({
          user_id: user.id,
          title: title.trim(),
          content: content.trim() || null,
        });

      if (error) throw error;

      // Clear form
      setTitle('');
      setContent('');

      toast({
        title: "Idea captured!",
        description: "Your idea has been saved to your collection.",
      });
    } catch (error: any) {
      toast({
        title: "Failed to save idea",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lightbulb className="h-5 w-5" />
          Quick Capture
        </CardTitle>
        <CardDescription>
          Instantly capture your ideas and thoughts
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Input
              type="text"
              placeholder="What's your idea?"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="text-base"
              disabled={isLoading}
            />
          </div>
          <div className="space-y-2">
            <Textarea
              placeholder="Add more details... (optional)"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="min-h-[80px] resize-none"
              disabled={isLoading}
            />
          </div>
          
          {/* Drag and Drop Zone */}
          <div
            className={`
              border-2 border-dashed rounded-lg p-6 text-center transition-colors
              ${isDragOver ? 'border-primary bg-primary/10' : 'border-muted-foreground/25'}
              ${!isGoogleDriveConnected ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
            `}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <div className="flex flex-col items-center gap-2">
              <Upload className={`h-8 w-8 ${isDragOver ? 'text-primary' : 'text-muted-foreground'}`} />
              <div className="text-sm text-muted-foreground">
                {isGoogleDriveConnected ? (
                  <>
                    <p className="font-medium">Drop files here to upload to Google Drive</p>
                    <p className="text-xs">Supports PDF, Word, Excel, and images</p>
                  </>
                ) : (
                  <>
                    <p className="font-medium">Connect Google Drive to upload files</p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={connectGoogleDrive}
                      disabled={isConnecting}
                      className="mt-2"
                    >
                      <Cloud className="h-4 w-4 mr-2" />
                      {isConnecting ? "Connecting..." : "Connect Google Drive"}
                    </Button>
                  </>
                )}
              </div>
              {isUploading && (
                <p className="text-xs text-primary">Uploading...</p>
              )}
            </div>
          </div>

          {/* Uploaded Files List */}
          {uploadedFiles.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium">Uploaded Files:</p>
              <div className="space-y-1">
                {uploadedFiles.map((file) => (
                  <div key={file.id} className="flex items-center justify-between bg-muted/50 rounded-md px-3 py-2">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{file.name}</span>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeUploadedFile(file.id)}
                      className="h-6 w-6 p-0"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <Button 
            type="submit" 
            className="w-full" 
            disabled={isLoading || !title.trim()}
          >
            <Plus className="h-4 w-4 mr-2" />
            {isLoading ? "Capturing..." : "Capture Idea"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default QuickCapture;