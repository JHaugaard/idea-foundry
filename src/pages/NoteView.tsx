
import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, Save, Trash2, X, Calendar, Tag as TagIcon, Hash, Plus } from 'lucide-react';
import { format } from 'date-fns';
import TagInput from '@/components/TagInput';
import { FileAttachmentRenderer } from '@/components/FileAttachmentRenderer';
import { AttachmentInlineViewer } from '@/components/AttachmentInlineViewer';
import { parseHashtags, mergeTags } from '@/lib/tags';

interface Note {
  id: string;
  title: string;
  content: string | null;
  tags: string[] | null;
  summary: string | null;
  processing_flags: any;
  review_status: 'not_reviewed' | 'reviewed';
  created_at: string;
  updated_at: string;
  slug?: string;
  file_attachments?: Array<{
    name: string;
    type: string;
    path?: string;
    size?: number;
  }>;
}

interface ProcessingFlags {
  [key: string]: any;
  title_generated?: boolean;
  summary_generated?: boolean;
  tags_generated?: boolean;
  backlinks_processed?: boolean;
  embeddings_processed?: boolean;
  embeddings_source?: 'client' | 'ai' | null;
}

export default function NoteView() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [summary, setSummary] = useState('');
  const [processingChoices, setProcessingChoices] = useState({
    title: false,
    summary: false,
    tags: false,
    backlinking: false,
    embeddings: false,
    embeddingsSource: null as 'client' | 'ai' | null
  });

  // Fetch note data
  const noteQuery = useQuery({
    queryKey: ['note', slug, user?.id],
    queryFn: async () => {
      if (!user || !slug) throw new Error('Missing user or slug');
      
      const { data, error } = await supabase
        .from('notes')
        .select('*')
        .eq('slug', slug)
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;
      if (!data) throw new Error('Note not found');
      
      return {
        ...data,
        file_attachments: Array.isArray(data.file_attachments) ? data.file_attachments as Array<{
          name: string;
          type: string;
          path?: string;
          size?: number;
        }> : undefined
      } as Note;
    },
    enabled: !!user && !!slug,
  });

  // Detect inline hashtags from title and content
  const inlineTags = useMemo(() => {
    const titleTags = parseHashtags(title);
    const contentTags = parseHashtags(content);
    const allInlineTags = mergeTags(titleTags, contentTags);
    return allInlineTags.filter(tag => !tags.includes(tag));
  }, [title, content, tags]);

  // Initialize form state when note loads
  useEffect(() => {
    if (noteQuery.data) {
      const note = noteQuery.data;
      setTitle(note.title || '');
      setContent(note.content || '');
      setTags(note.tags || []);
      setSummary(note.summary || '');

      // Reset processing choices for fresh review
      setProcessingChoices({
        title: false,
        summary: false,
        tags: false,
        backlinking: false,
        embeddings: false,
        embeddingsSource: null
      });
    }
  }, [noteQuery.data]);

  const addInlineTags = () => {
    setTags(prevTags => mergeTags(prevTags, inlineTags));
  };

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!user || !noteQuery.data) throw new Error('Missing data');

      const note = noteQuery.data;
      const processingFlags: ProcessingFlags = { ...note.processing_flags };
      
      // Update processing flags based on choices
      if (processingChoices.title) processingFlags.title_generated = true;
      if (processingChoices.summary) processingFlags.summary_generated = true;
      if (processingChoices.tags) processingFlags.tags_generated = true;
      if (processingChoices.backlinking) processingFlags.backlinks_processed = true;
      if (processingChoices.embeddings) {
        processingFlags.embeddings_processed = true;
        processingFlags.embeddings_source = processingChoices.embeddingsSource;
      }

      // Merge inline hashtags with existing tags on save
      const finalTags = mergeTags(tags, parseHashtags(`${title}\n${content}`));

      // Update note
      const { error } = await supabase
        .from('notes')
        .update({
          title: title.trim() || note.title,
          content: content.trim() || note.content,
          tags: finalTags,
          summary: summary.trim() || note.summary,
          processing_flags: processingFlags as any,
          review_status: 'reviewed',
          updated_at: new Date().toISOString()
        })
        .eq('id', note.id)
        .eq('user_id', user.id);

      if (error) throw error;

      // TODO: Trigger processing based on choices (title, summary, tags, backlinking, embeddings)
      // This will be implemented with the existing processing hooks/functions
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!user || !noteQuery.data) throw new Error('Missing data');

      const { error } = await supabase
        .from('notes')
        .delete()
        .eq('id', noteQuery.data.id)
        .eq('user_id', user.id);

      if (error) throw error;
    },
  });

  const handleSave = async () => {
    try {
      await saveMutation.mutateAsync();
      toast({ title: "Note saved successfully" });
      queryClient.invalidateQueries({ queryKey: ['notes'] });
      navigate('/');
    } catch (error: any) {
      toast({
        title: "Failed to save note",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this note?')) return;
    
    try {
      await deleteMutation.mutateAsync();
      toast({ title: "Note deleted successfully" });
      queryClient.invalidateQueries({ queryKey: ['notes'] });
      navigate('/');
    } catch (error: any) {
      toast({
        title: "Failed to delete note",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const handleCancel = () => {
    navigate('/');
  };

  const handleProcessingChoice = (choice: keyof typeof processingChoices, checked: boolean) => {
    setProcessingChoices(prev => ({
      ...prev,
      [choice]: checked,
      // Reset embeddings source when unchecking embeddings
      ...(choice === 'embeddings' && !checked ? { embeddingsSource: null } : {})
    }));
  };

  if (noteQuery.isLoading) {
    return (
      <div className="min-h-screen bg-background p-4 flex items-center justify-center">
        <div>Loading note...</div>
      </div>
    );
  }

  if (noteQuery.error || !noteQuery.data) {
    return (
      <div className="min-h-screen bg-background p-4 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Note not found</h2>
          <Button onClick={() => navigate('/')} variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Go back
          </Button>
        </div>
      </div>
    );
  }

  const note = noteQuery.data;
  const appliedProcessing = note.processing_flags as ProcessingFlags;

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Button onClick={handleCancel} variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div className="flex items-center gap-2">
            {note.review_status === 'not_reviewed' && (
              <Badge variant="secondary">Review Required</Badge>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-4">
            {/* Title */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Title</CardTitle>
              </CardHeader>
              <CardContent>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Enter note title..."
                  className="text-lg font-medium"
                />
              </CardContent>
            </Card>

            {/* Content */}
            <Card className="flex-1">
              <CardHeader>
                <CardTitle className="text-lg">Content</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Always show file attachments inline when present */}
                  {note.file_attachments && note.file_attachments.length > 0 && (
                    <AttachmentInlineViewer attachments={note.file_attachments} />
                  )}
                  <Textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder={note.file_attachments && note.file_attachments.length > 0 
                      ? "Add description or additional notes..." 
                      : "Enter note content..."
                    }
                    className="min-h-[200px] resize-y"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Tags */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Tags</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <TagInput
                  tags={tags}
                  onTagsChange={setTags}
                  placeholder="Add tags or use #hashtags in content..."
                  noteContent={content}
                  noteTitle={title}
                />
                
                {/* Inline hashtags preview */}
                {inlineTags.length > 0 && (
                  <div className="p-3 bg-muted/50 rounded-md border">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Hash className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium text-muted-foreground">
                          Hashtags detected in content
                        </span>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={addInlineTags}
                        className="h-7 px-2 text-xs"
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        Add all
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {inlineTags.map(tag => (
                        <Badge key={tag} variant="outline" className="text-xs h-6 px-2">
                          #{tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  placeholder="Enter summary..."
                  className="min-h-[100px] resize-y"
                />
              </CardContent>
            </Card>


            {/* Action Buttons */}
            <div className="flex items-center justify-between pt-4">
              <Button
                onClick={handleDelete}
                variant="destructive"
                disabled={deleteMutation.isPending}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
              <div className="flex items-center gap-2">
                <Button
                  onClick={handleCancel}
                  variant="outline"
                  disabled={saveMutation.isPending || deleteMutation.isPending}
                >
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={saveMutation.isPending || deleteMutation.isPending}
                >
                  <Save className="h-4 w-4 mr-2" />
                  Save
                </Button>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Processing Options */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Processing</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="title-processing"
                      checked={processingChoices.title}
                      onCheckedChange={(checked) => handleProcessingChoice('title', checked as boolean)}
                    />
                    <label htmlFor="title-processing" className="text-sm">
                      Generate Title
                      {appliedProcessing.title_generated && (
                        <Badge variant="outline" className="ml-2 text-xs">Applied</Badge>
                      )}
                    </label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="summary-processing"
                      checked={processingChoices.summary}
                      onCheckedChange={(checked) => handleProcessingChoice('summary', checked as boolean)}
                    />
                    <label htmlFor="summary-processing" className="text-sm">
                      Generate Summary
                      {appliedProcessing.summary_generated && (
                        <Badge variant="outline" className="ml-2 text-xs">Applied</Badge>
                      )}
                    </label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="tags-processing"
                      checked={processingChoices.tags}
                      onCheckedChange={(checked) => handleProcessingChoice('tags', checked as boolean)}
                    />
                    <label htmlFor="tags-processing" className="text-sm">
                      Generate Tags
                      {appliedProcessing.tags_generated && (
                        <Badge variant="outline" className="ml-2 text-xs">Applied</Badge>
                      )}
                    </label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="backlinking-processing"
                      checked={processingChoices.backlinking}
                      onCheckedChange={(checked) => handleProcessingChoice('backlinking', checked as boolean)}
                    />
                    <label htmlFor="backlinking-processing" className="text-sm">
                      Process Backlinks
                      {appliedProcessing.backlinks_processed && (
                        <Badge variant="outline" className="ml-2 text-xs">Applied</Badge>
                      )}
                    </label>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="embeddings-processing"
                        checked={processingChoices.embeddings}
                        onCheckedChange={(checked) => handleProcessingChoice('embeddings', checked as boolean)}
                      />
                      <label htmlFor="embeddings-processing" className="text-sm">
                        Generate Embeddings
                        {appliedProcessing.embeddings_processed && (
                          <Badge variant="outline" className="ml-2 text-xs">
                            Applied ({appliedProcessing.embeddings_source})
                          </Badge>
                        )}
                      </label>
                    </div>

                    {processingChoices.embeddings && (
                      <div className="ml-6 space-y-2">
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="embeddings-client"
                            checked={processingChoices.embeddingsSource === 'client'}
                            onCheckedChange={(checked) => 
                              setProcessingChoices(prev => ({
                                ...prev,
                                embeddingsSource: checked ? 'client' : null
                              }))
                            }
                          />
                          <label htmlFor="embeddings-client" className="text-xs">
                            Client-side
                          </label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="embeddings-ai"
                            checked={processingChoices.embeddingsSource === 'ai'}
                            onCheckedChange={(checked) => 
                              setProcessingChoices(prev => ({
                                ...prev,
                                embeddingsSource: checked ? 'ai' : null
                              }))
                            }
                          />
                          <label htmlFor="embeddings-ai" className="text-xs">
                            AI
                          </label>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Metadata */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Metadata</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                 <div className="flex items-center gap-2">
                   <Calendar className="h-4 w-4" />
                   <div>
                     <div>Created {format(new Date(note.created_at), 'MM/dd/yyyy')}</div>
                     {note.updated_at !== note.created_at && (
                       <div>Updated {format(new Date(note.updated_at), 'MM/dd/yyyy')}</div>
                     )}
                   </div>
                 </div>

                {note.tags && note.tags.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <TagIcon className="h-4 w-4" />
                      <span>Current Tags</span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {note.tags.map((tag) => (
                        <Badge key={tag} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
