import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface LinkData {
  id: string;
  target_note_id: string;
  anchor_text: string;
  canonical_title: string;
  canonical_slug: string;
  target_exists: boolean;
}

export const useLinkData = (sourceNoteId?: string) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['note-links', sourceNoteId, user?.id],
    queryFn: async (): Promise<LinkData[]> => {
      if (!user || !sourceNoteId) return [];

      // Get all outgoing links from the current note
      const { data: links, error } = await supabase
        .from('note_links')
        .select(`
          id,
          target_note_id,
          anchor_text,
          canonical_title,
          canonical_slug
        `)
        .eq('user_id', user.id)
        .eq('source_note_id', sourceNoteId);

      if (error) throw error;

      if (!links || links.length === 0) return [];

      // Check which target notes still exist
      const targetIds = links.map(link => link.target_note_id);
      const { data: existingNotes, error: notesError } = await supabase
        .from('notes')
        .select('id')
        .eq('user_id', user.id)
        .in('id', targetIds);

      if (notesError) throw notesError;

      const existingNoteIds = new Set(existingNotes?.map(note => note.id) || []);

      return links.map(link => ({
        ...link,
        target_exists: existingNoteIds.has(link.target_note_id)
      }));
    },
    enabled: !!user && !!sourceNoteId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useNotePreview = (noteId?: string) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['note-preview', noteId, user?.id],
    queryFn: async () => {
      if (!user || !noteId) return null;

      const { data: note, error } = await supabase
        .from('notes')
        .select('id, title, content, slug')
        .eq('user_id', user.id)
        .eq('id', noteId)
        .single();

      if (error) throw error;

      return {
        ...note,
        excerpt: note.content 
          ? note.content.slice(0, 150) + (note.content.length > 150 ? '...' : '')
          : 'No content available'
      };
    },
    enabled: !!user && !!noteId,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
};