import React, { useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
// Removed unused Input import
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
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
  const [open, setOpen] = useState(false);
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

      setOpen(false);
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
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Lightbulb className="h-4 w-4 mr-2" />
          Capture
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5" />
            Capture
          </DialogTitle>
          <DialogDescription>
            Type or paste text and drop files below.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div
            className={`
                border-2 border-dashed rounded-lg p-3 transition-colors
                ${isDragOver ? 'border-primary bg-primary/10' : 'border-muted-foreground/25'}
                ${!user ? 'opacity-50 cursor-not-allowed' : ''}
              `}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <Textarea
              placeholder="Write or paste your note here..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="min-h-40 text-base"
              disabled={isLoading}
              autoFocus
            />

            <div className="mt-2 text-xs text-muted-foreground flex items-center gap-2">
              <Upload className={`h-4 w-4 ${isDragOver ? 'text-primary' : 'text-muted-foreground'}`} />
              <span>Drop files (PDF, Word, Excel, images)</span>
              {isUploading && (
                <span className="text-primary ml-auto">Uploading...</span>
              )}
            </div>
          </div>

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

          <DialogFooter className="gap-2 sm:gap-0">
            <DialogClose asChild>
              <Button type="button" variant="outline">
                - Cancel
              </Button>
            </DialogClose>
            <Button
              type="submit"
              size="sm"
              disabled={isLoading || !title.trim()}
            >
              <Plus className="h-4 w-4 mr-2" />
              {isLoading ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default QuickCapture;