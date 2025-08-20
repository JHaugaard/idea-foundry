import React, { useState, useCallback, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { slugify, extractBracketLinks } from '@/lib/slug';
import TagInput from '@/components/TagInput';
import { useTags } from '@/hooks/useTags';
import { useToast } from '@/hooks/use-toast';
import { useSupabaseStorage } from '@/hooks/useSupabaseStorage';
import { Plus, Lightbulb, Upload, X, FileText } from 'lucide-react';

// Form validation schema
const formSchema = z.object({
  title: z
    .string()
    .min(1, 'Title is required')
    .max(200, 'Title must be less than 200 characters'),
  content: z
    .string()
    .max(10000, 'Content must be less than 10,000 characters')
    .optional()
    .or(z.literal('')),
  tags: z
    .array(z.string())
    .max(10, 'Maximum 10 tags allowed')
});

type FormData = z.infer<typeof formSchema>;

const QuickCapture = () => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<Array<{name: string, id: string}>>([]);
  const [tagSuggestions, setTagSuggestions] = useState<string[]>([]);
  
  const { user } = useAuth();
  const { toast } = useToast();
  const { uploadFile, isUploading } = useSupabaseStorage();
  const { tags: existingTags, invalidateTags, getTagSuggestions } = useTags();

  // Initialize form with validation
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: '',
      content: '',
      tags: []
    }
  });

  const { watch, reset } = form;
  const watchedTitle = watch('title');
  const watchedContent = watch('content');

  // Generate tag suggestions when title/content changes
  useEffect(() => {
    const generateSuggestions = async () => {
      if (watchedTitle?.trim()) {
        const suggestions = await getTagSuggestions(watchedTitle, watchedContent);
        setTagSuggestions(suggestions);
      } else {
        setTagSuggestions([]);
      }
    };

    const timer = setTimeout(generateSuggestions, 500);
    return () => clearTimeout(timer);
  }, [watchedTitle, watchedContent, getTagSuggestions]);

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
      const noteSlug = slugify(values.title.trim());
      const bracketLinks = extractBracketLinks(values.title);

      const { data: inserted, error: insertError } = await supabase
        .from('notes')
        .insert({
          user_id: user.id,
          title: values.title.trim(),
          content: values.content?.trim() || null,
          slug: noteSlug,
          tags: values.tags.length > 0 ? values.tags : null,
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
          note_title: values.title.trim(),
          note_text: values.content?.trim() || ''
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

      // Clear form and refresh tag cache
      reset();
      setUploadedFiles([]);
      setTagSuggestions([]);
      invalidateTags(); // Refresh tag suggestions for future use

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
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            {/* Title Input */}
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Note Title</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter note title..."
                      {...field}
                      className="text-base"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Content Input */}
            <FormField
              control={form.control}
              name="content"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Content (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Add additional notes..."
                      className="min-h-[80px] resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Tags Input */}
            <FormField
              control={form.control}
              name="tags"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tags</FormLabel>
                  <FormControl>
                    <TagInput
                      tags={field.value}
                      onTagsChange={field.onChange}
                      suggestions={[...existingTags, ...tagSuggestions]}
                      maxTags={10}
                      placeholder="Add tags to organize your note..."
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              {/* Left side - Action buttons */}
              <div className="space-y-3">
                <div className="flex justify-center gap-2">
                  <Button 
                    type="submit" 
                    size="sm"
                    disabled={form.formState.isSubmitting}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    {form.formState.isSubmitting ? "Capturing..." : "Capture"}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={form.formState.isSubmitting}
                    onClick={() => {
                      reset();
                      setUploadedFiles([]);
                      setTagSuggestions([]);
                    }}
                  >
                    Cancel
                  </Button>
                </div>
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
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};

export default QuickCapture;