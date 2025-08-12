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

      // Attempt auto-linking for [[...]] to existing notes by slug (excluding self)
      if (inserted && bracketLinks.length > 0) {
        const uniqueSlugs = Array.from(new Set(
          bracketLinks.map(b => b.slug).filter(s => s && s !== inserted.slug)
        ));

        if (uniqueSlugs.length > 0) {
          const { data: targets, error: findError } = await supabase
            .from('notes')
            .select('id, slug, title')
            .eq('user_id', user.id)
            .in('slug', uniqueSlugs);

          if (findError) throw findError;

          const slugToId = new Map<string, string>();
          (targets || []).forEach(t => slugToId.set(t.slug, t.id));

          const linkRows = bracketLinks
            .filter(b => slugToId.has(b.slug))
            .map(b => ({
              user_id: user.id,
              source_note_id: inserted.id,
              target_note_id: slugToId.get(b.slug)!,
              anchor_text: b.text,
              canonical_title: b.text,
              canonical_slug: b.slug,
            }));

          if (linkRows.length > 0) {
            const { error: linkError } = await supabase.from('note_links').insert(linkRows);
            if (linkError) {
              console.error('Auto-linking error:', linkError);
            }
          }
        }
      }

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
          <div
            className={`
              border-2 border-dashed rounded-lg p-4 transition-colors
              ${isDragOver ? 'border-primary bg-primary/10' : 'border-muted-foreground/25'}
              ${!user ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
            `}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <div className="flex items-start gap-3">
              <Upload className={`h-6 w-6 mt-1 ${isDragOver ? 'text-primary' : 'text-muted-foreground'}`} />
              <div className="flex-1 space-y-2">
                <Input
                  type="text"
                  placeholder={user ? 'Type or paste your note title here — you can also drop files into this box' : 'Sign in to capture notes'}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="text-base"
                  disabled={isLoading}
                />
                <p className="text-xs text-muted-foreground">
                  {user ? 'Drop PDF, Word, Excel, or image files here. They will be attached to this capture.' : 'Please sign in to upload files.'}
                </p>
                {isUploading && (
                  <p className="text-xs text-primary">Uploading...</p>
                )}
              </div>
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
              variant="ghost"
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