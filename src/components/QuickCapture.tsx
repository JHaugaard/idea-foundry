import React, { useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useSupabaseStorage } from '@/hooks/useSupabaseStorage';
import { Plus, Lightbulb, Upload, X, FileText } from 'lucide-react';

const QuickCapture = () => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<Array<{name: string, id: string}>>([]);
  const { user } = useAuth();
  const { toast } = useToast();
  const { uploadFile, isUploading } = useSupabaseStorage();

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

    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please sign in to upload files.",
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
      'image/webp',
      'text/plain'
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
        await uploadFile(file);
        setUploadedFiles(prev => [...prev, { name: file.name, id: Date.now().toString() }]);
      } catch (error: any) {
        // Error is already handled in the hook
      }
    }
  }, [user, uploadFile, toast]);

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
      setUploadedFiles([]);

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
              border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer
              ${isDragOver ? 'border-primary bg-primary/10' : 'border-muted-foreground/25'}
              ${!user ? 'opacity-50 cursor-not-allowed' : ''}
            `}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <div className="flex flex-col items-center gap-2">
              <Upload className={`h-8 w-8 ${isDragOver ? 'text-primary' : 'text-muted-foreground'}`} />
              <div className="text-sm text-muted-foreground">
                {user ? (
                  <>
                    <p className="font-medium">Drop files here to upload</p>
                    <p className="text-xs">Supports PDF, Word, Excel, images, and text files</p>
                  </>
                ) : (
                  <p className="font-medium">Sign in to upload files</p>
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