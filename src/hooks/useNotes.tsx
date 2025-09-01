
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface Note {
  id: string;
  title: string;
  content: string | null;
  tags: string[] | null;
  summary: string | null;
  processing_flags: Record<string, any>;
  review_status: 'not_reviewed' | 'reviewed';
  created_at: string;
  updated_at: string;
  slug?: string;
}

export const useNotes = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const notesQuery = useQuery({
    queryKey: ['notes', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('notes')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  const invalidateNotes = () => {
    queryClient.invalidateQueries({ queryKey: ['notes', user?.id] });
  };

  const createNote = async () => {
    if (!user) throw new Error('User not authenticated');
    
    const { data, error } = await supabase
      .from('notes')
      .insert({
        user_id: user.id,
        title: 'New Note',
        content: '',
        tags: [],
        review_status: 'not_reviewed'
      })
      .select()
      .single();

    if (error) throw error;
    
    // Invalidate queries to refresh the lists
    invalidateNotes();
    
    return data;
  };

  return {
    notes: notesQuery.data || [],
    isLoading: notesQuery.isLoading,
    error: notesQuery.error,
    invalidateNotes,
    createNote,
  };
};
