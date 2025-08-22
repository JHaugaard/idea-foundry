import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface BacklinkData {
  id: string;
  source_note_id: string;
  anchor_text: string | null;
  canonical_title: string;
  source_note: {
    id: string;
    title: string;
    content: string | null;
    slug: string | null;
  };
}

export function useBacklinks(targetNoteId: string | null) {
  return useQuery({
    queryKey: ['backlinks', targetNoteId],
    queryFn: async (): Promise<BacklinkData[]> => {
      if (!targetNoteId) return [];

      const { data, error } = await supabase
        .from('note_links')
        .select(`
          id,
          source_note_id,
          anchor_text,
          canonical_title,
          source_note:notes!source_note_id (
            id,
            title,
            content,
            slug
          )
        `)
        .eq('target_note_id', targetNoteId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!targetNoteId,
  });
}