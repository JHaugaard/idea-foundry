import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export const useTags = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Query to get all unique tags from user's notes
  const {
    data: tags = [],
    isLoading,
    error
  } = useQuery({
    queryKey: ['user-tags', user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from('notes')
        .select('tags')
        .eq('user_id', user.id)
        .not('tags', 'is', null);

      if (error) throw error;

      // Extract and flatten all tags, then get unique values
      const allTags = data
        .flatMap(note => note.tags || [])
        .filter(Boolean) // Remove null/undefined values
        .sort();

      // Return unique tags
      return [...new Set(allTags)];
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  // Function to invalidate tags query (call after creating/updating notes)
  const invalidateTags = () => {
    queryClient.invalidateQueries({ queryKey: ['user-tags'] });
  };

  // Get tag suggestions based on note content
  const getTagSuggestions = async (noteTitle: string, noteContent?: string): Promise<string[]> => {
    if (!user) return [];

    try {
      // Simple keyword extraction for now
      // In the future, this could call an AI service for smarter suggestions
      const text = `${noteTitle} ${noteContent || ''}`.toLowerCase();
      const words = text
        .split(/\s+/)
        .map(word => word.replace(/[^a-z0-9]/g, ''))
        .filter(word => word.length > 2 && word.length < 20);

      // Filter existing tags that might be relevant
      const relevantTags = tags.filter(tag => 
        words.some(word => 
          word.includes(tag) || tag.includes(word)
        )
      );

      // Combine with simple keyword suggestions
      const keywordSuggestions = words
        .filter(word => !tags.includes(word))
        .slice(0, 3); // Limit to prevent overwhelming

      return [...new Set([...relevantTags, ...keywordSuggestions])].slice(0, 6);
    } catch (error) {
      console.error('Error getting tag suggestions:', error);
      return [];
    }
  };

  return {
    tags,
    isLoading,
    error,
    invalidateTags,
    getTagSuggestions
  };
};