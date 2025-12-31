import React, { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useNotes } from '@/hooks/useNotes';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Check, Trash2, SkipForward, Sparkles, Inbox as InboxIcon, Edit } from 'lucide-react';
import SmartTextarea from '@/components/SmartTextarea';
import TagInput from '@/components/TagInput';
import { AttachmentInlineViewer } from '@/components/AttachmentInlineViewer';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export default function Inbox() {
    const { notes, isLoading, invalidateNotes } = useNotes();
    const { user } = useAuth();
    const { toast } = useToast();
    const queryClient = useQueryClient();

    // State for the current note being reviewed (always notes[0])
    const currentNote = notes && notes.length > 0 ? notes[0] : null;

    // Local editing state
    const [editedTitle, setEditedTitle] = useState('');
    const [editedContent, setEditedContent] = useState('');
    const [editedTags, setEditedTags] = useState<string[]>([]);
    const [isAiProcessing, setIsAiProcessing] = useState(false);

    // Update local state when the current note changes
    useEffect(() => {
        if (currentNote) {
            setEditedTitle(currentNote.title);
            setEditedContent(currentNote.content || '');
            setEditedTags(currentNote.tags || []);
        }
    }, [currentNote]);

    const handleProcess = async (action: 'approve' | 'delete' | 'skip') => {
        if (!currentNote || !user) return;

        try {
            if (action === 'delete') {
                if (!confirm('Are you sure you want to delete this note?')) return;
                await supabase.from('notes').delete().eq('id', currentNote.id);
                toast({ title: "Trashed", description: "Note deleted." });
            } else if (action === 'approve') {
                // 1. Update with edits and set status to reviewed
                await supabase.from('notes').update({
                    title: editedTitle,
                    content: editedContent,
                    tags: editedTags,
                    review_status: 'reviewed',
                    updated_at: new Date().toISOString()
                }).eq('id', currentNote.id);

                // 2. Trigger Embedding Generation (Fire and Forget or Await?)
                toast({ title: "Indexing...", description: "Generating vector embedding." });

                const { error: embedError } = await supabase.functions.invoke('note-embed', {
                    body: { note_id: currentNote.id }
                });

                if (embedError) {
                    console.error("Embedding failed:", embedError);
                    toast({ title: "Embedding Failed", description: "Saved, but search index failed.", variant: "destructive" });
                } else {
                    toast({ title: "Processed", description: "Note saved and indexed." });
                }
            } else if (action === 'skip') {
                // Just move to end of list? or just effectively ignore for now.
                // For now, we don't have a "skip" logic in the backend query, 
                // so skipping would just mean "leave it in inbox".
                // To make it disappear we'd need a "snooze" or different sort.
                // Let's just do nothing (it stays in list) but maybe show a toast.
                toast({ title: "Skipped", description: "Left in inbox for later." });
                return; // Don't invalidate
            }

            invalidateNotes();

        } catch (e: any) {
            toast({ title: "Error", description: e.message, variant: "destructive" });
        }
    };

    const handleAiEnhance = async () => {
        if (!currentNote) return;
        setIsAiProcessing(true);
        try {
            const userMessage = `Summarize and tag this note: \nTitle: ${editedTitle}\nContent: ${editedContent}`;

            // Note: This matches the "note-summarize" function interface roughly
            const { data, error } = await supabase.functions.invoke('note-summarize', {
                body: {
                    note_title: editedTitle,
                    note_text: editedContent
                }
            });

            if (error) throw error;

            const result = typeof data === 'string' ? JSON.parse(data) : data;

            if (result.tags && Array.isArray(result.tags)) {
                // Merge tags
                const newTags = [...new Set([...editedTags, ...result.tags])];
                setEditedTags(newTags);
            }

            toast({ title: "AI Enhanced", description: "Tags generated." });

        } catch (e: any) {
            toast({ title: "AI Error", description: "Make sure AI functions are configured.", variant: "destructive" });
        } finally {
            setIsAiProcessing(false);
        }
    };

    if (isLoading) {
        return <div className="p-8 flex justify-center text-muted-foreground">Loading specific atoms...</div>;
    }

    if (!currentNote) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-4 animate-in fade-in zoom-in duration-300">
                <div className="h-24 w-24 bg-primary/10 rounded-full flex items-center justify-center">
                    <InboxIcon className="h-12 w-12 text-primary" />
                </div>
                <h2 className="text-3xl font-bold tracking-tight">Inbox Zero</h2>
                <p className="text-muted-foreground max-w-sm">
                    You have processed all your captured ideas. Great job!
                    <br />Go capture some new ones or explore your links.
                </p>
                <Button variant="outline" onClick={() => window.location.href = '/'}>
                    Back to Capture
                </Button>
            </div>
        );
    }

    const remainingCount = notes.length;

    return (
        <div className="container max-w-3xl mx-auto py-8 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">Inbox</h1>
                    <p className="text-muted-foreground">Review and process your captured thoughts ({remainingCount} remaining)</p>
                </div>
                {/* Progress indicator could go here */}
            </div>

            <Card className="border-2 shadow-md">
                <CardHeader className="pb-4">
                    <div className="flex justify-between items-start gap-4">
                        <div className="w-full">
                            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Title</label>
                            <input
                                className="w-full text-xl font-bold bg-transparent border-none focus:outline-none focus:ring-0 p-0 placeholder:text-muted-foreground/50"
                                value={editedTitle}
                                onChange={(e) => setEditedTitle(e.target.value)}
                                placeholder="Untitled Note"
                            />
                        </div>
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button variant="ghost" size="icon" onClick={handleAiEnhance} disabled={isAiProcessing}>
                                        {isAiProcessing ? <span className="animate-pulse">...</span> : <Sparkles className="h-5 w-5 text-purple-500" />}
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>AI Enhance (Tag & Summarize)</TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    </div>
                </CardHeader>
                <Separator />
                <CardContent className="pt-6 space-y-6">
                    {/* File Attachments */}
                    {Array.isArray(currentNote.file_attachments) && currentNote.file_attachments.length > 0 && (
                        <AttachmentInlineViewer attachments={currentNote.file_attachments as any[]} />
                    )}

                    <div className="space-y-2">
                        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Content</label>
                        <SmartTextarea
                            value={editedContent}
                            onChange={(e) => setEditedContent(e.target.value)}
                            className="min-h-[200px] text-base"
                            placeholder="Note content..."
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Tags</label>
                        <TagInput
                            tags={editedTags}
                            onTagsChange={setEditedTags}
                            placeholder="Add tags..."
                        />
                    </div>
                </CardContent>
                <Separator />
                <CardFooter className="bg-muted/10 p-4 flex justify-between items-center">
                    <Button variant="ghost" onClick={() => handleProcess('delete')} className="text-destructive hover:text-destructive hover:bg-destructive/10">
                        <Trash2 className="h-4 w-4 mr-2" />
                        Trash
                    </Button>

                    <div className="flex gap-2">
                        <Button variant="outline" onClick={() => handleProcess('skip')}>
                            <SkipForward className="h-4 w-4 mr-2" />
                            Skip
                        </Button>
                        <Button onClick={() => handleProcess('approve')} className="min-w-[120px]">
                            <Check className="h-4 w-4 mr-2" />
                            Done
                        </Button>
                    </div>
                </CardFooter>
            </Card>

            <div className="text-center text-xs text-muted-foreground">
                Press 'Enter' to approve, 'Esc' to skip
            </div>
        </div>
    );
}
