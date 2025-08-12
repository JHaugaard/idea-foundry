import React, { useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { slugify, extractBracketLinks } from '@/lib/slug';

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
        // Also create a corresponding note entry so it appears in Review (Not Reviewed)
        const fileTitle = file.name;
        const fileSlug = slugify(`${file.name}-${Date.now()}`);
        await supabase
          .from('notes')
          .insert({
            user_id: user.id,
            title: fileTitle,
            content: null,
            slug: fileSlug,
          });
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
        description: "Please enter a title for your note.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const noteSlug = slugify(title.trim());
      const bracketLinks = extractBracketLinks(title);

      const { data: inserted, error: insertError } = await supabase
        .from('notes')
        .insert({
          user_id: user.id,
          title: title.trim(),
          content: content.trim() || null,
          slug: noteSlug,
        })
        .select('id, slug')
        .single();

      if (insertError) throw insertError;

      // Backlink processing is paused — auto-linking disabled for now.

      // AI summarization & tags (non-blocking)
      try {
        const { data: aiData, error: aiError } = await supabase.functions.invoke('note-summarize', {
          body: {
            note_title: title.trim(),
            note_text: content.trim() || ''
          }
        });
        if (!aiError && aiData) {
          const parsed = typeof aiData === 'string' ? JSON.parse(aiData) : aiData;
          const tags = Array.isArray(parsed?.tags) ? parsed.tags.slice(0, 6) : null;
          if (tags && tags.length > 0 && inserted) {
            await supabase
              .from('notes')
              .update({ tags })
              .eq('id', inserted.id)
              .eq('user_id', user.id);
          }
        }
      } catch (e) {
        console.warn('Summarize/tags failed (continuing):', e);
      }

      // Clear form
      setTitle('');
      setContent('');
      setUploadedFiles([]);

      toast({
        title: "Note captured!",
        description: "Your note has been saved as Not Reviewed.",
      });
    } catch (error: any) {
      toast({
        title: "Failed to save note",
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
          Capture
        </CardTitle>
    </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {/* Left side - Note input */}
            <div className="space-y-3">
              <Input
                type="text"
                placeholder="Note"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="text-base"
                disabled={isLoading}
              />
            </div>
            
            {/* Right side - Drag and Drop Zone */}
            <div
              className={`
                border-2 border-dashed rounded-lg p-4 text-center transition-colors cursor-pointer
                ${isDragOver ? 'border-primary bg-primary/10' : 'border-muted-foreground/25'}
                ${!user ? 'opacity-50 cursor-not-allowed' : ''}
              `}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <div className="flex flex-col items-center gap-2">
                <Upload className={`h-6 w-6 ${isDragOver ? 'text-primary' : 'text-muted-foreground'}`} />
                <div className="text-xs text-muted-foreground">
                  {user ? (
                    <>
                      <p className="font-medium">Drop files</p>
                      <p className="text-xs">PDF, Word, Excel, images</p>
                    </>
                  ) : (
                    <p className="font-medium">Sign in to upload</p>
                  )}
                </div>
                {isUploading && (
                  <p className="text-xs text-primary">Uploading...</p>
                )}
              </div>
            </div>
          </div>


          <div className="flex justify-center gap-2">
            <Button 
              type="submit" 
              size="sm"
              disabled={isLoading || !title.trim()}
            >
              <Plus className="h-4 w-4 mr-2" />
              {isLoading ? "Capturing..." : "Capture"}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={isLoading}
              onClick={() => {
                setTitle('');
                setContent('');
                setUploadedFiles([]);
              }}
            >
              - Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default QuickCapture;