import { useState, useCallback } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useTags } from '@/hooks/useTags';

export interface TagSuggestion {
  tag: string;
  confidence: 'high' | 'medium' | 'low';
  reason: 'content' | 'similarity' | 'pattern';
  similarNotes?: Array<{ id: string; title: string; similarity: number }>;
}

export interface BulkTagOperation {
  id: string;
  type: 'add' | 'remove' | 'replace';
  tags: string[];
  noteIds: string[];
  preview: {
    affected: number;
    changes: Array<{
      noteId: string;
      noteTitle: string;
      before: string[];
      after: string[];
    }>;
  };
}

export function useTagAutomation() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { tags } = useTags();
  const [operationHistory, setOperationHistory] = useState<BulkTagOperation[]>([]);

  // AI-powered content-based suggestions
  const contentSuggestionsMutation = useMutation({
    mutationFn: async ({ content, title, existingTags }: {
      content: string;
      title: string;
      existingTags: string[];
    }): Promise<TagSuggestion[]> => {
      const { data, error } = await supabase.functions.invoke('suggest-tags', {
        body: { content, title, existingTags }
      });

      if (error) throw error;
      
      return data.suggestions.map((tag: string) => ({
        tag,
        confidence: data.confidence,
        reason: 'content' as const
      }));
    },
  });

  // Vector similarity-based suggestions
  const similarityMutation = useMutation({
    mutationFn: async (noteId: string): Promise<TagSuggestion[]> => {
      if (!user?.id) throw new Error('User not authenticated');

      // Get the target note
      const { data: targetNote, error: noteError } = await supabase
        .from('notes')
        .select('id, title, content, tags')
        .eq('id', noteId)
        .eq('user_id', user.id)
        .single();

      if (noteError) throw noteError;

      // Find similar notes using vector search if embeddings exist
      const { data: similarNotes, error: similarError } = await supabase
        .rpc('match_notes', {
          query_embedding: null, // Would need actual embedding here
          match_threshold: 0.7,
          match_count: 5
        });

      if (similarError) {
        console.warn('Vector search failed, falling back to text similarity');
        
        // Fallback: text-based similarity using existing notes
        const { data: allNotes } = await supabase
          .from('notes')
          .select('id, title, content, tags')
          .eq('user_id', user.id)
          .neq('id', noteId);

        if (!allNotes) return [];

        // Simple text similarity based on common words
        const targetWords = new Set(
          `${targetNote.title} ${targetNote.content}`
            .toLowerCase()
            .match(/\b\w{3,}\b/g) || []
        );

        const similarities = allNotes
          .map(note => {
            const noteWords = new Set(
              `${note.title} ${note.content}`
                .toLowerCase()
                .match(/\b\w{3,}\b/g) || []
            );
            
            const intersection = new Set([...targetWords].filter(x => noteWords.has(x)));
            const union = new Set([...targetWords, ...noteWords]);
            const similarity = intersection.size / union.size;
            
            return { ...note, similarity };
          })
          .filter(note => note.similarity > 0.1)
          .sort((a, b) => b.similarity - a.similarity)
          .slice(0, 5);

        // Extract suggested tags from similar notes
        const suggestedTagsMap = new Map<string, number>();
        similarities.forEach(note => {
          note.tags?.forEach(tag => {
            if (!targetNote.tags?.includes(tag)) {
              suggestedTagsMap.set(tag, (suggestedTagsMap.get(tag) || 0) + note.similarity);
            }
          });
        });

        return Array.from(suggestedTagsMap.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([tag, score]) => ({
            tag,
            confidence: score > 0.3 ? 'high' : score > 0.15 ? 'medium' : 'low' as const,
            reason: 'similarity' as const,
            similarNotes: similarities
              .filter(note => note.tags?.includes(tag))
              .map(note => ({
                id: note.id,
                title: note.title,
                similarity: note.similarity
              }))
          }));
      }

      // Process vector search results (when available)
      const suggestedTagsMap = new Map<string, { score: number; notes: any[] }>();
      similarNotes?.forEach(similar => {
        // Would extract tags from similar notes here
      });

      return [];
    },
  });

  // Create bulk operation preview
  const createBulkOperation = useCallback(async (
    type: 'add' | 'remove' | 'replace',
    tags: string[],
    noteIds: string[]
  ): Promise<BulkTagOperation> => {
    if (!user?.id) throw new Error('User not authenticated');

    const { data: notes, error } = await supabase
      .from('notes')
      .select('id, title, tags')
      .in('id', noteIds)
      .eq('user_id', user.id);

    if (error) throw error;

    const changes = notes?.map(note => {
      const before = note.tags || [];
      let after: string[];

      switch (type) {
        case 'add':
          after = [...new Set([...before, ...tags])];
          break;
        case 'remove':
          after = before.filter(tag => !tags.includes(tag));
          break;
        case 'replace':
          after = tags;
          break;
        default:
          after = before;
      }

      return {
        noteId: note.id,
        noteTitle: note.title,
        before,
        after
      };
    }) || [];

    const operation: BulkTagOperation = {
      id: crypto.randomUUID(),
      type,
      tags,
      noteIds,
      preview: {
        affected: changes.filter(c => JSON.stringify(c.before) !== JSON.stringify(c.after)).length,
        changes
      }
    };

    return operation;
  }, [user?.id]);

  // Execute bulk operation
  const executeBulkOperation = useMutation({
    mutationFn: async (operation: BulkTagOperation) => {
      if (!user?.id) throw new Error('User not authenticated');

      const updates = operation.preview.changes
        .filter(change => JSON.stringify(change.before) !== JSON.stringify(change.after))
        .map(change => ({
          id: change.noteId,
          tags: change.after
        }));

      if (updates.length === 0) {
        throw new Error('No changes to apply');
      }

      const results = await Promise.allSettled(
        updates.map(update =>
          supabase
            .from('notes')
            .update({ tags: update.tags })
            .eq('id', update.id)
            .eq('user_id', user.id)
        )
      );

      const failed = results.filter(r => r.status === 'rejected');
      if (failed.length > 0) {
        throw new Error(`${failed.length} updates failed`);
      }

      // Add to history for undo
      setOperationHistory(prev => [operation, ...prev.slice(0, 9)]); // Keep last 10

      return { updated: updates.length };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes'] });
      queryClient.invalidateQueries({ queryKey: ['tags'] });
    },
  });

  // Undo last operation
  const undoOperation = useMutation({
    mutationFn: async (operationId: string) => {
      if (!user?.id) throw new Error('User not authenticated');

      const operation = operationHistory.find(op => op.id === operationId);
      if (!operation) throw new Error('Operation not found');

      const restoreUpdates = operation.preview.changes
        .filter(change => JSON.stringify(change.before) !== JSON.stringify(change.after))
        .map(change => ({
          id: change.noteId,
          tags: change.before
        }));

      const results = await Promise.allSettled(
        restoreUpdates.map(update =>
          supabase
            .from('notes')
            .update({ tags: update.tags })
            .eq('id', update.id)
            .eq('user_id', user.id)
        )
      );

      const failed = results.filter(r => r.status === 'rejected');
      if (failed.length > 0) {
        throw new Error(`${failed.length} undo operations failed`);
      }

      // Remove from history
      setOperationHistory(prev => prev.filter(op => op.id !== operationId));

      return { restored: restoreUpdates.length };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes'] });
      queryClient.invalidateQueries({ queryKey: ['tags'] });
    },
  });

  return {
    // AI suggestions
    getContentSuggestions: contentSuggestionsMutation.mutate,
    isGettingContentSuggestions: contentSuggestionsMutation.isPending,
    
    // Similarity suggestions  
    getSimilaritySuggestions: similarityMutation.mutate,
    isGettingSimilaritySuggestions: similarityMutation.isPending,

    // Bulk operations
    createBulkOperation,
    executeBulkOperation: executeBulkOperation.mutate,
    isExecutingBulkOperation: executeBulkOperation.isPending,
    
    // Undo
    undoOperation: undoOperation.mutate,
    isUndoing: undoOperation.isPending,
    operationHistory,
    
    // Clear history
    clearHistory: () => setOperationHistory([])
  };
}