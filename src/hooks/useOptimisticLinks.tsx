import { useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { LinkData } from './useLinkData';

interface OptimisticLinkData extends Omit<LinkData, 'id'> {
  id: string;
  isOptimistic?: boolean;
}

export const useOptimisticLinks = (sourceNoteId?: string) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [undoStack, setUndoStack] = useState<Array<{ action: string; data: any }>>([]);

  const updateOptimistically = useCallback((updater: (current: LinkData[]) => LinkData[]) => {
    if (!sourceNoteId || !user) return;

    queryClient.setQueryData(
      ['note-links', sourceNoteId, user.id],
      (old: LinkData[] = []) => updater(old)
    );
  }, [queryClient, sourceNoteId, user]);

  const createLink = useCallback(async (linkData: Omit<OptimisticLinkData, 'id' | 'isOptimistic'>) => {
    if (!sourceNoteId || !user) return;

    const optimisticId = `temp-${Date.now()}`;
    const optimisticLink: OptimisticLinkData = {
      ...linkData,
      id: optimisticId,
      isOptimistic: true,
    };

    // Optimistic update
    updateOptimistically((current) => [...current, optimisticLink]);

    try {
      const { data: newLink, error } = await supabase
        .from('note_links')
        .insert({
          user_id: user.id,
          source_note_id: sourceNoteId,
          ...linkData,
        })
        .select('*')
        .single();

      if (error) throw error;

      // Replace optimistic with real data
      updateOptimistically((current) =>
        current.map((link) =>
          link.id === optimisticId 
            ? { ...newLink, target_exists: true }
            : link
        )
      );

      toast.success('Link created successfully');
      return newLink;
    } catch (error) {
      console.error('Failed to create link:', error);
      
      // Remove optimistic update
      updateOptimistically((current) =>
        current.filter((link) => link.id !== optimisticId)
      );
      
      toast.error('Failed to create link');
      throw error;
    }
  }, [sourceNoteId, user, updateOptimistically]);

  const deleteLink = useCallback(async (linkId: string) => {
    if (!sourceNoteId || !user) return;

    // Find the link to delete for undo functionality
    const currentLinks = queryClient.getQueryData<LinkData[]>(['note-links', sourceNoteId, user.id]) || [];
    const linkToDelete = currentLinks.find(link => link.id === linkId);
    
    if (!linkToDelete) return;

    // Optimistic update
    updateOptimistically((current) =>
      current.filter((link) => link.id !== linkId)
    );

    // Add to undo stack
    setUndoStack(prev => [...prev, { action: 'delete', data: linkToDelete }]);

    try {
      const { error } = await supabase
        .from('note_links')
        .delete()
        .eq('id', linkId)
        .eq('user_id', user.id);

      if (error) throw error;

      toast.success('Link deleted', {
        action: {
          label: 'Undo',
          onClick: () => undoDelete(linkToDelete),
        },
      });
    } catch (error) {
      console.error('Failed to delete link:', error);
      
      // Revert optimistic update
      updateOptimistically((current) => [...current, linkToDelete]);
      
      // Remove from undo stack
      setUndoStack(prev => prev.slice(0, -1));
      
      toast.error('Failed to delete link');
      throw error;
    }
  }, [sourceNoteId, user, updateOptimistically, queryClient]);

  const undoDelete = useCallback(async (linkData: LinkData) => {
    if (!sourceNoteId || !user) return;

    try {
      const { data: restoredLink, error } = await supabase
        .from('note_links')
        .insert({
          user_id: user.id,
          source_note_id: sourceNoteId,
          target_note_id: linkData.target_note_id,
          anchor_text: linkData.anchor_text,
          canonical_title: linkData.canonical_title,
          canonical_slug: linkData.canonical_slug,
        })
        .select('*')
        .single();

      if (error) throw error;

      // Add back to optimistic state
      updateOptimistically((current) => [...current, { ...restoredLink, target_exists: true }]);

      // Remove from undo stack
      setUndoStack(prev => prev.filter(item => item.data.id !== linkData.id));

      toast.success('Link restored');
    } catch (error) {
      console.error('Failed to undo delete:', error);
      toast.error('Failed to restore link');
    }
  }, [sourceNoteId, user, updateOptimistically]);

  const batchCreateLinks = useCallback(async (linksData: Array<Omit<OptimisticLinkData, 'id' | 'isOptimistic'>>) => {
    if (!sourceNoteId || !user || linksData.length === 0) return;

    const optimisticLinks: OptimisticLinkData[] = linksData.map((linkData, index) => ({
      ...linkData,
      id: `temp-batch-${Date.now()}-${index}`,
      isOptimistic: true,
    }));

    // Optimistic update
    updateOptimistically((current) => [...current, ...optimisticLinks]);

    try {
      const { data: newLinks, error } = await supabase
        .from('note_links')
        .insert(
          linksData.map(linkData => ({
            user_id: user.id,
            source_note_id: sourceNoteId,
            ...linkData,
          }))
        )
        .select('*');

      if (error) throw error;

      // Replace optimistic with real data
      updateOptimistically((current) => {
        let linkIndex = 0;
        return current.map((link) => {
          const isOptimistic = 'isOptimistic' in link && link.isOptimistic;
          if (isOptimistic && link.id.startsWith('temp-batch-')) {
            return { ...newLinks[linkIndex++], target_exists: true };
          }
          return link;
        });
      });

      toast.success(`${newLinks.length} links created successfully`);
      return newLinks;
    } catch (error) {
      console.error('Failed to create batch links:', error);
      
      // Remove optimistic updates
      updateOptimistically((current) =>
        current.filter((link) => !link.id.startsWith('temp-batch-'))
      );
      
      toast.error('Failed to create links');
      throw error;
    }
  }, [sourceNoteId, user, updateOptimistically]);

  return {
    createLink,
    deleteLink,
    batchCreateLinks,
    undoStack,
  };
};