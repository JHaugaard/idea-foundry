import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { SimilarityBadge } from '@/components/SimilarityBadge';
import { 
  Network, 
  ExternalLink, 
  Clock,
  AlertTriangle
} from 'lucide-react';

interface SimilarNotesWidgetProps {
  currentNoteId: string;
  onNavigateToNote?: (noteId: string) => void;
  maxResults?: number;
}

interface SimilarNote {
  note_id: string;
  title: string;
  slug: string;
  similarity: number;
  content_preview?: string;
  updated_at: string;
}

export function SimilarNotesWidget({ 
  currentNoteId, 
  onNavigateToNote,
  maxResults = 5 
}: SimilarNotesWidgetProps) {
  const { user } = useAuth();

  // Get current note details
  const { data: currentNote } = useQuery({
    queryKey: ['note', currentNoteId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notes')
        .select('title, content, semantic_enabled')
        .eq('id', currentNoteId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!currentNoteId
  });

  // Find similar notes using semantic search
  const { 
    data: similarNotes = [], 
    isLoading, 
    error 
  } = useQuery({
    queryKey: ['similar-notes', currentNoteId],
    queryFn: async () => {
      if (!currentNote?.semantic_enabled) {
        return [];
      }

      // Get current note's embedding
      const { data: embedding, error: embeddingError } = await supabase
        .from('note_embeddings')
        .select('embedding')
        .eq('note_id', currentNoteId)
        .single();

      if (embeddingError || !embedding) {
        throw new Error('No embedding found for current note');
      }

      // Find similar notes
      const { data, error } = await supabase.rpc('match_notes', {
        query_embedding: embedding.embedding,
        match_threshold: 0.7,
        match_count: maxResults + 1 // +1 to exclude current note
      });

      if (error) throw error;

      // Filter out current note and return results
      return data
        .filter((note: any) => note.note_id !== currentNoteId)
        .slice(0, maxResults)
        .map((note: any) => ({
          ...note,
          content_preview: note.content?.substring(0, 100) + '...'
        }));
    },
    enabled: !!currentNote && !!currentNote.semantic_enabled,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  // Check for potential duplicates (very high similarity)
  const potentialDuplicates = similarNotes.filter(note => note.similarity > 0.95);

  const handleNoteClick = (noteId: string) => {
    if (onNavigateToNote) {
      onNavigateToNote(noteId);
    }
  };

  if (!currentNote) {
    return null;
  }

  if (!currentNote.semantic_enabled) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Network className="h-4 w-4" />
            Similar Notes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <AlertTriangle className="h-8 w-8 mx-auto mb-2 text-warning" />
            <p className="text-sm text-muted-foreground">
              Semantic search not enabled for this note
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Generate embeddings to find similar content
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Network className="h-4 w-4" />
            Similar Notes
          </CardTitle>
          {potentialDuplicates.length > 0 && (
            <Badge variant="destructive" className="text-xs">
              {potentialDuplicates.length} potential duplicate{potentialDuplicates.length !== 1 ? 's' : ''}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-4">
            <AlertTriangle className="h-6 w-6 mx-auto mb-2 text-destructive" />
            <p className="text-sm text-muted-foreground">
              Failed to find similar notes
            </p>
          </div>
        ) : similarNotes.length === 0 ? (
          <div className="text-center py-4">
            <Network className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              No similar notes found
            </p>
          </div>
        ) : (
          <ScrollArea className="max-h-64">
            <div className="space-y-3">
              {similarNotes.map((note) => (
                <div 
                  key={note.note_id}
                  className={`p-3 rounded-lg border ${
                    note.similarity > 0.95 
                      ? 'border-destructive/50 bg-destructive/5' 
                      : 'border-border hover:border-border/80'
                  } transition-colors`}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h4 className="text-sm font-medium line-clamp-1">
                      {note.title}
                    </h4>
                    <SimilarityBadge score={note.similarity} />
                  </div>
                  
                  {note.content_preview && (
                    <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                      {note.content_preview}
                    </p>
                  )}
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {new Date(note.updated_at).toLocaleDateString()}
                    </div>
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleNoteClick(note.note_id)}
                      className="h-6 px-2 text-xs"
                    >
                      <ExternalLink className="h-3 w-3 mr-1" />
                      Open
                    </Button>
                  </div>
                  
                  {note.similarity > 0.95 && (
                    <div className="mt-2 pt-2 border-t border-destructive/20">
                      <p className="text-xs text-destructive font-medium">
                        ⚠️ Potential duplicate content detected
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}