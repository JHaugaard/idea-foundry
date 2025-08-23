import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

interface OperationProgress {
  total: number;
  completed: number;
  failed: number;
}

interface BulkEmbeddingOperationsHook {
  onOperationStart: (operation: string) => void;
  onOperationComplete: () => void;
}

export const useBulkEmbeddingOperations = ({
  onOperationStart,
  onOperationComplete,
}: BulkEmbeddingOperationsHook) => {
  const { user } = useAuth();
  const [progress, setProgress] = useState<OperationProgress>({ total: 0, completed: 0, failed: 0 });
  const [isRunning, setIsRunning] = useState(false);
  const [currentOperation, setCurrentOperation] = useState<string>('');
  const [errors, setErrors] = useState<string[]>([]);
  const abortController = useRef<AbortController | null>(null);

  const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  const processNotesBatch = async (noteIds: string[], batchSize: number) => {
    const batches = [];
    for (let i = 0; i < noteIds.length; i += batchSize) {
      batches.push(noteIds.slice(i, i + batchSize));
    }

    for (const batch of batches) {
      if (abortController.current?.signal.aborted) {
        break;
      }

      const batchPromises = batch.map(async (noteId) => {
        try {
          const { error } = await supabase.functions.invoke('note-embed', {
            body: { note_id: noteId }
          });

          if (error) throw new Error(error.message || 'Unknown error');

          setProgress(prev => ({ ...prev, completed: prev.completed + 1 }));
          return { success: true, noteId };
        } catch (error) {
          const errorMessage = `Failed to process note ${noteId}: ${error instanceof Error ? error.message : 'Unknown error'}`;
          setErrors(prev => [...prev, errorMessage]);
          setProgress(prev => ({ ...prev, failed: prev.failed + 1, completed: prev.completed + 1 }));
          return { success: false, noteId, error: errorMessage };
        }
      });

      await Promise.all(batchPromises);

      // Add delay between batches to respect rate limits
      if (batches.indexOf(batch) < batches.length - 1) {
        await sleep(1000); // 1 second delay between batches
      }
    }
  };

  const startBulkGeneration = useCallback(async (noteIds: string[], batchSize: number = 25) => {
    if (!user?.id) {
      toast({
        title: 'Error',
        description: 'User not authenticated',
        variant: 'destructive',
      });
      return;
    }

    setIsRunning(true);
    setCurrentOperation(`Generating embeddings for ${noteIds.length} notes`);
    setProgress({ total: noteIds.length, completed: 0, failed: 0 });
    setErrors([]);
    abortController.current = new AbortController();

    onOperationStart('bulk-generation');

    try {
      await processNotesBatch(noteIds, batchSize);

      const successCount = progress.completed - progress.failed;
      toast({
        title: 'Bulk Operation Complete',
        description: `Successfully generated ${successCount} embeddings. ${progress.failed} failed.`,
        variant: progress.failed > 0 ? 'destructive' : 'default',
      });
    } catch (error) {
      console.error('Bulk generation error:', error);
      toast({
        title: 'Operation Failed',
        description: 'Bulk embedding generation encountered an error',
        variant: 'destructive',
      });
    } finally {
      setIsRunning(false);
      setCurrentOperation('');
      onOperationComplete();
    }
  }, [user?.id, progress.completed, progress.failed, onOperationStart, onOperationComplete]);

  const startRegenerateAll = useCallback(async (batchSize: number = 25) => {
    if (!user?.id) return;

    setIsRunning(true);
    setCurrentOperation('Fetching all notes for regeneration...');
    onOperationStart('regenerate-all');

    try {
      // Fetch all notes for the user
      const { data: notes, error } = await supabase
        .from('notes')
        .select('id')
        .eq('user_id', user.id);

      if (error) throw error;

      const noteIds = notes?.map(note => note.id) || [];
      
      if (noteIds.length === 0) {
        toast({
          title: 'No Notes Found',
          description: 'No notes available for regeneration',
        });
        return;
      }

      setCurrentOperation(`Regenerating embeddings for all ${noteIds.length} notes`);
      setProgress({ total: noteIds.length, completed: 0, failed: 0 });
      setErrors([]);

      await processNotesBatch(noteIds, batchSize);

      const successCount = progress.completed - progress.failed;
      toast({
        title: 'Regeneration Complete',
        description: `Successfully regenerated ${successCount} embeddings. ${progress.failed} failed.`,
        variant: progress.failed > 0 ? 'destructive' : 'default',
      });
    } catch (error) {
      console.error('Regenerate all error:', error);
      toast({
        title: 'Regeneration Failed',
        description: 'Failed to regenerate all embeddings',
        variant: 'destructive',
      });
    } finally {
      setIsRunning(false);
      setCurrentOperation('');
      onOperationComplete();
    }
  }, [user?.id, progress.completed, progress.failed, onOperationStart, onOperationComplete]);

  const stopOperation = useCallback(() => {
    if (abortController.current) {
      abortController.current.abort();
      setIsRunning(false);
      setCurrentOperation('');
      toast({
        title: 'Operation Stopped',
        description: 'Bulk operation was cancelled',
      });
      onOperationComplete();
    }
  }, [onOperationComplete]);

  const clearErrors = useCallback(() => {
    setErrors([]);
  }, []);

  const exportStats = useCallback(async () => {
    try {
      const { data: notes, error } = await supabase
        .from('notes')
        .select(`
          id,
          title,
          semantic_enabled,
          created_at,
          updated_at,
          note_embeddings (
            created_at,
            updated_at
          )
        `)
        .eq('user_id', user?.id);

      if (error) throw error;

      const statsData = notes?.map(note => ({
        id: note.id,
        title: note.title,
        has_embedding: Array.isArray(note.note_embeddings) && note.note_embeddings.length > 0,
        semantic_enabled: note.semantic_enabled,
        created_at: note.created_at,
        updated_at: note.updated_at,
        embedding_created_at: Array.isArray(note.note_embeddings) && note.note_embeddings[0]?.created_at || null,
        is_outdated: Array.isArray(note.note_embeddings) && note.note_embeddings[0]
          ? new Date(note.updated_at) > new Date(note.note_embeddings[0].updated_at)
          : false
      })) || [];

      // Convert to CSV
      const headers = ['ID', 'Title', 'Has Embedding', 'Semantic Enabled', 'Created At', 'Updated At', 'Embedding Created At', 'Is Outdated'];
      const csvContent = [
        headers.join(','),
        ...statsData.map(row => [
          row.id,
          `"${row.title.replace(/"/g, '""')}"`,
          row.has_embedding,
          row.semantic_enabled,
          row.created_at,
          row.updated_at,
          row.embedding_created_at || '',
          row.is_outdated
        ].join(','))
      ].join('\n');

      // Download CSV
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `embedding-stats-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: 'Export Complete',
        description: 'Embedding statistics exported successfully',
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: 'Export Failed',
        description: 'Failed to export embedding statistics',
        variant: 'destructive',
      });
    }
  }, [user?.id]);

  return {
    progress,
    isRunning,
    currentOperation,
    errors,
    startBulkGeneration,
    startRegenerateAll,
    stopOperation,
    clearErrors,
    exportStats,
  };
};