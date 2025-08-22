import React, { useState, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { slugify } from '@/lib/slug';
import { useToast } from '@/hooks/use-toast';
import { useSupabaseStorage } from '@/hooks/useSupabaseStorage';
import { useQueryClient } from '@tanstack/react-query';
import { Plus, Lightbulb, Upload, X, FileText } from 'lucide-react';

// Form validation schema - simplified for capture only
const formSchema = z.object({
  content: z
    .string()
    .min(1, 'Content is required for capture')
    .max(10000, 'Content must be less than 10,000 characters')
});

type FormData = z.infer<typeof formSchema>;

const QuickCapture = () => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<Array<{name: string, id: string}>>([]);
  
  const { user } = useAuth();
  const { toast } = useToast();
  const { uploadFile, isUploading } = useSupabaseStorage();
  const queryClient = useQueryClient();

  // Initialize form with validation
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      content: ''
    }
  });

  const { reset } = form;

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

  const generateTemporaryTitle = (content: string): string => {
    // Use first five words of content as placeholder title
    const words = content.trim().split(/\s+/).slice(0, 5);
    return words.length > 0 ? words.join(' ') : 'New Note';
  };

  const handleSubmit = async (values: FormData) => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please sign in to save notes.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Generate temporary title and slug from content
      const tempTitle = generateTemporaryTitle(values.content);
      const tempSlug = slugify(`${tempTitle}-${Date.now()}`);

      const { data: inserted, error: insertError } = await supabase
        .from('notes')
        .insert({
          user_id: user.id,
          title: tempTitle,
          content: values.content.trim(),
          slug: tempSlug,
          review_status: 'not_reviewed'
        })
        .select('id, slug')
        .single();

      if (insertError) throw insertError;

  // Backlink processing is paused — auto-linking disabled for now.

  // Feature flag: temporarily disable AI summarization and tag generation
  const AI_SUMMARIZATION_ENABLED = false;

  // AI summarization & tags (non-blocking)
  if (AI_SUMMARIZATION_ENABLED) {
    try {
      const { data: aiData, error: aiError } = await supabase.functions.invoke('note-summarize', {
        body: {
          note_title: tempTitle,
          note_text: values.content.trim()
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
  }

      // Clear form 
      reset();
      setUploadedFiles([]);

      // Refresh the notes list to show the new note
      queryClient.invalidateQueries({ queryKey: ['notes', 'not_reviewed', user.id] });

      toast({
        title: "Note captured!",
        description: "Your note has been saved for review.",
      });
    } catch (error: any) {
      toast({
        title: "Failed to save note",
        description: error.message,
        variant: "destructive",
      });
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
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            {/* Content Input Area */}
            <FormField
              control={form.control}
              name="content"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Enter text, paste content, images, or links</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Type or paste your content here..."
                      className="min-h-[120px] resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* File Drop Area */}
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
                <div className="flex flex-col items-center gap-3">
                  <Upload className={`h-8 w-8 ${isDragOver ? 'text-primary' : 'text-muted-foreground'}`} />
                  <div className="text-sm text-muted-foreground">
                    {user ? (
                      <>
                        <p className="font-medium">Drop files here</p>
                        <p className="text-xs">PDF, Word, Excel, images, text files</p>
                      </>
                    ) : (
                      <p className="font-medium">Sign in to upload files</p>
                    )}
                  </div>
                  {isUploading && (
                    <p className="text-sm text-primary font-medium">Uploading...</p>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col justify-center items-center gap-3">
                <Button 
                  type="submit" 
                  size="lg"
                  disabled={form.formState.isSubmitting}
                  className="w-full max-w-xs"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  {form.formState.isSubmitting ? "Capturing..." : "Capture"}
                </Button>
                <Button
                  type="button"
                  size="lg"
                  variant="outline"
                  disabled={form.formState.isSubmitting}
                  className="w-full max-w-xs"
                  onClick={() => {
                    reset();
                    setUploadedFiles([]);
                  }}
                >
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
              </div>
            </div>

            {/* Show uploaded files */}
            {uploadedFiles.length > 0 && (
              <div className="border-t pt-4">
                <p className="text-sm font-medium mb-2">Uploaded Files:</p>
                <div className="space-y-1">
                  {uploadedFiles.map((file) => (
                    <div key={file.id} className="flex items-center justify-between text-sm bg-muted p-2 rounded">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        <span>{file.name}</span>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => removeUploadedFile(file.id)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};

export default QuickCapture;