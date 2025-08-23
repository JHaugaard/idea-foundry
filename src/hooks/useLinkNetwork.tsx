import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface LinkNetworkStats {
  noteId: string;
  title: string;
  slug: string | null;
  updatedAt: string;
  incomingCount: number;
  outgoingCount: number;
  totalConnections: number;
}

interface RecentLink {
  id: string;
  sourceTitle: string;
  targetTitle: string;
  createdAt: string;
  anchorText: string | null;
}

interface OrphanedNote {
  id: string;
  title: string;
  slug: string | null;
  updatedAt: string;
}

export const useLinkNetworkStats = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['link-network-stats', user?.id],
    queryFn: async (): Promise<LinkNetworkStats[]> => {
      if (!user) return [];

      const { data: notes, error: notesError } = await supabase
        .from('notes')
        .select('id, title, slug, updated_at')
        .eq('user_id', user.id);

      if (notesError) throw notesError;

      const { data: incomingLinks, error: incomingError } = await supabase
        .from('note_links')
        .select('target_note_id')
        .eq('user_id', user.id);

      if (incomingError) throw incomingError;

      const { data: outgoingLinks, error: outgoingError } = await supabase
        .from('note_links')
        .select('source_note_id')
        .eq('user_id', user.id);

      if (outgoingError) throw outgoingError;

      // Count incoming and outgoing links per note
      const incomingCounts = new Map<string, number>();
      const outgoingCounts = new Map<string, number>();

      incomingLinks?.forEach(link => {
        const count = incomingCounts.get(link.target_note_id) || 0;
        incomingCounts.set(link.target_note_id, count + 1);
      });

      outgoingLinks?.forEach(link => {
        const count = outgoingCounts.get(link.source_note_id) || 0;
        outgoingCounts.set(link.source_note_id, count + 1);
      });

      return notes?.map(note => {
        const incoming = incomingCounts.get(note.id) || 0;
        const outgoing = outgoingCounts.get(note.id) || 0;
        return {
          noteId: note.id,
          title: note.title,
          slug: note.slug,
          updatedAt: note.updated_at,
          incomingCount: incoming,
          outgoingCount: outgoing,
          totalConnections: incoming + outgoing,
        };
      }) || [];
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useRecentLinks = (limit = 10) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['recent-links', user?.id, limit],
    queryFn: async (): Promise<RecentLink[]> => {
      if (!user) return [];

      const { data: links, error } = await supabase
        .from('note_links')
        .select(`
          id,
          anchor_text,
          created_at,
          source_note:notes!source_note_id (title),
          target_note:notes!target_note_id (title)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      return links?.map(link => ({
        id: link.id,
        sourceTitle: (link.source_note as any)?.title || 'Unknown',
        targetTitle: (link.target_note as any)?.title || 'Unknown',
        createdAt: link.created_at,
        anchorText: link.anchor_text,
      })) || [];
    },
    enabled: !!user,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
};

export const useOrphanedNotes = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['orphaned-notes', user?.id],
    queryFn: async (): Promise<OrphanedNote[]> => {
      if (!user) return [];

      // Get all notes
      const { data: allNotes, error: notesError } = await supabase
        .from('notes')
        .select('id, title, slug, updated_at')
        .eq('user_id', user.id);

      if (notesError) throw notesError;

      // Get all notes that have links (either incoming or outgoing)
      const { data: linkedNotes, error: linksError } = await supabase
        .from('note_links')
        .select('source_note_id, target_note_id')
        .eq('user_id', user.id);

      if (linksError) throw linksError;

      // Create set of all note IDs that have links
      const connectedNoteIds = new Set<string>();
      linkedNotes?.forEach(link => {
        connectedNoteIds.add(link.source_note_id);
        connectedNoteIds.add(link.target_note_id);
      });

      // Filter notes that have no links
      return allNotes?.filter(note => !connectedNoteIds.has(note.id)).map(note => ({
        id: note.id,
        title: note.title,
        slug: note.slug,
        updatedAt: note.updated_at,
      })) || [];
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useSearchNotesByLinks = (searchTerm: string) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['search-notes-by-links', user?.id, searchTerm],
    queryFn: async (): Promise<LinkNetworkStats[]> => {
      if (!user || !searchTerm.trim()) return [];

      // Search for notes that link to notes matching the search term
      const { data: matchingNotes, error: searchError } = await supabase
        .from('notes')
        .select('id, title')
        .eq('user_id', user.id)
        .ilike('title', `%${searchTerm}%`);

      if (searchError) throw searchError;

      if (!matchingNotes || matchingNotes.length === 0) return [];

      const targetIds = matchingNotes.map(note => note.id);

      // Find notes that link to these matching notes
      const { data: linkingNotes, error: linksError } = await supabase
        .from('note_links')
        .select(`
          source_note_id,
          source_note:notes!source_note_id (id, title, slug, updated_at)
        `)
        .eq('user_id', user.id)
        .in('target_note_id', targetIds);

      if (linksError) throw linksError;

      // Get connection counts for these notes
      const noteIds = Array.from(new Set(linkingNotes?.map(l => l.source_note_id) || []));
      
      if (noteIds.length === 0) return [];

      // Manually get stats for the filtered notes
      const { data: allNotes, error: allNotesError } = await supabase
        .from('notes')
        .select('id, title, slug, updated_at')
        .eq('user_id', user.id)
        .in('id', noteIds);

      if (allNotesError) throw allNotesError;

      const { data: incomingLinks, error: incomingError } = await supabase
        .from('note_links')
        .select('target_note_id')
        .eq('user_id', user.id)
        .in('target_note_id', noteIds);

      if (incomingError) throw incomingError;

      const { data: outgoingLinks, error: outgoingError } = await supabase
        .from('note_links')
        .select('source_note_id')
        .eq('user_id', user.id)
        .in('source_note_id', noteIds);

      if (outgoingError) throw outgoingError;

      // Count incoming and outgoing links per note
      const incomingCounts = new Map<string, number>();
      const outgoingCounts = new Map<string, number>();

      incomingLinks?.forEach(link => {
        const count = incomingCounts.get(link.target_note_id) || 0;
        incomingCounts.set(link.target_note_id, count + 1);
      });

      outgoingLinks?.forEach(link => {
        const count = outgoingCounts.get(link.source_note_id) || 0;
        outgoingCounts.set(link.source_note_id, count + 1);
      });

      return allNotes?.map(note => {
        const incoming = incomingCounts.get(note.id) || 0;
        const outgoing = outgoingCounts.get(note.id) || 0;
        return {
          noteId: note.id,
          title: note.title,
          slug: note.slug,
          updatedAt: note.updated_at,
          incomingCount: incoming,
          outgoingCount: outgoing,
          totalConnections: incoming + outgoing,
        };
      }) || [];
    },
    enabled: !!user && searchTerm.trim().length > 0,
    staleTime: 1 * 60 * 1000, // 1 minute
  });
};