import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface TagStats {
  tag: string;
  count: number;
  notes: Array<{ id: string; title: string; }>;
}

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

  // Get tag usage statistics
  const {
    data: tagStats = [],
    isLoading: isStatsLoading
  } = useQuery({
    queryKey: ['tag-stats', user?.id],
    queryFn: async (): Promise<TagStats[]> => {
      if (!user) return [];

      const { data, error } = await supabase
        .from('notes')
        .select('id, title, tags')
        .eq('user_id', user.id)
        .not('tags', 'is', null);

      if (error) throw error;

      // Calculate statistics
      const tagMap = new Map<string, TagStats>();
      
      data.forEach(note => {
        note.tags?.forEach((tag: string) => {
          if (!tagMap.has(tag)) {
            tagMap.set(tag, {
              tag,
              count: 0,
              notes: []
            });
          }
          const stats = tagMap.get(tag)!;
          stats.count++;
          stats.notes.push({ id: note.id, title: note.title });
        });
      });

      return Array.from(tagMap.values()).sort((a, b) => b.count - a.count);
    },
    enabled: !!user,
    staleTime: 2 * 60 * 1000, // Cache for 2 minutes
  });

  // Mutation to update note tags
  const updateNoteTags = useMutation({
    mutationFn: async ({ noteId, tags }: { noteId: string; tags: string[] }) => {
      if (!user) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('notes')
        .update({ tags: tags.length > 0 ? tags : null })
        .eq('id', noteId)
        .eq('user_id', user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-tags'] });
      queryClient.invalidateQueries({ queryKey: ['tag-stats'] });
    },
  });

  // Mutation for batch tag operations
  const batchUpdateTags = useMutation({
    mutationFn: async ({ 
      noteIds, 
      operation, 
      tags 
    }: { 
      noteIds: string[]; 
      operation: 'add' | 'remove' | 'replace'; 
      tags: string[] 
    }) => {
      if (!user) throw new Error('User not authenticated');

      if (operation === 'replace') {
        // Replace all tags
        const { error } = await supabase
          .from('notes')
          .update({ tags: tags.length > 0 ? tags : null })
          .in('id', noteIds)
          .eq('user_id', user.id);

        if (error) throw error;
      } else {
        // For add/remove, we need to fetch current tags first
        const { data: notes, error: fetchError } = await supabase
          .from('notes')
          .select('id, tags')
          .in('id', noteIds)
          .eq('user_id', user.id);

        if (fetchError) throw fetchError;

        const updates = notes.map(note => {
          const currentTags = note.tags || [];
          let newTags: string[];

          if (operation === 'add') {
            newTags = [...new Set([...currentTags, ...tags])];
          } else { // remove
            newTags = currentTags.filter(tag => !tags.includes(tag));
          }

          return {
            id: note.id,
            tags: newTags.length > 0 ? newTags : null
          };
        });

        // Update each note
        for (const update of updates) {
          const { error } = await supabase
            .from('notes')
            .update({ tags: update.tags })
            .eq('id', update.id)
            .eq('user_id', user.id);

          if (error) throw error;
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-tags'] });
      queryClient.invalidateQueries({ queryKey: ['tag-stats'] });
    },
  });

  // Mutation to replace a tag across all notes
  const replaceTag = useMutation({
    mutationFn: async ({ oldTag, newTag }: { oldTag: string; newTag: string }) => {
      if (!user) throw new Error('User not authenticated');

      // Find all notes with the old tag
      const { data: notes, error: fetchError } = await supabase
        .from('notes')
        .select('id, tags')
        .eq('user_id', user.id)
        .contains('tags', [oldTag]);

      if (fetchError) throw fetchError;

      // Update each note
      for (const note of notes) {
        const currentTags = note.tags || [];
        const newTags = currentTags.map(tag => tag === oldTag ? newTag : tag);
        
        const { error } = await supabase
          .from('notes')
          .update({ tags: newTags })
          .eq('id', note.id)
          .eq('user_id', user.id);

        if (error) throw error;
      }

      return notes.length;
    },
    onSuccess: (updatedCount) => {
      queryClient.invalidateQueries({ queryKey: ['user-tags'] });
      queryClient.invalidateQueries({ queryKey: ['tag-stats'] });
      return updatedCount;
    },
  });

  // Mutation to merge tags
  const mergeTags = useMutation({
    mutationFn: async ({ sourceTags, targetTag }: { sourceTags: string[]; targetTag: string }) => {
      if (!user) throw new Error('User not authenticated');

      // Find all notes with any of the source tags
      const { data: notes, error: fetchError } = await supabase
        .from('notes')
        .select('id, tags')
        .eq('user_id', user.id)
        .or(sourceTags.map(tag => `tags.cs.{${tag}}`).join(','));

      if (fetchError) throw fetchError;

      let updatedCount = 0;
      
      // Update each note
      for (const note of notes) {
        const currentTags = note.tags || [];
        const hasSourceTag = sourceTags.some(tag => currentTags.includes(tag));
        
        if (hasSourceTag) {
          // Remove source tags and add target tag
          const newTags = [
            ...currentTags.filter(tag => !sourceTags.includes(tag)),
            targetTag
          ];
          
          // Remove duplicates
          const uniqueTags = [...new Set(newTags)];
          
          const { error } = await supabase
            .from('notes')
            .update({ tags: uniqueTags })
            .eq('id', note.id)
            .eq('user_id', user.id);

          if (error) throw error;
          updatedCount++;
        }
      }

      return updatedCount;
    },
    onSuccess: (updatedCount) => {
      queryClient.invalidateQueries({ queryKey: ['user-tags'] });
      queryClient.invalidateQueries({ queryKey: ['tag-stats'] });
      return updatedCount;
    },
  });

  // Mutation to delete tags completely from all notes
  const deleteTags = useMutation({
    mutationFn: async (tagsToDelete: string[]) => {
      if (!user) throw new Error('User not authenticated');

      let deletedCount = 0;
      
      for (const tag of tagsToDelete) {
        // Find all notes with this tag
        const { data: notes, error: fetchError } = await supabase
          .from('notes')
          .select('id, tags')
          .eq('user_id', user.id)
          .contains('tags', [tag]);

        if (fetchError) throw fetchError;

        // Remove the tag from each note
        for (const note of notes) {
          const currentTags = note.tags || [];
          const newTags = currentTags.filter(t => t !== tag);
          
          const { error } = await supabase
            .from('notes')
            .update({ tags: newTags.length > 0 ? newTags : null })
            .eq('id', note.id)
            .eq('user_id', user.id);

          if (error) throw error;
          deletedCount++;
        }
      }

      return deletedCount;
    },
    onSuccess: (deletedCount) => {
      queryClient.invalidateQueries({ queryKey: ['user-tags'] });
      queryClient.invalidateQueries({ queryKey: ['tag-stats'] });
      return deletedCount;
    },
  });

  return {
    tags,
    isLoading,
    error,
    tagStats,
    isStatsLoading,
    invalidateTags,
    getTagSuggestions,
    updateNoteTags,
    batchUpdateTags,
    replaceTag,
    mergeTags,
    deleteTags,
  };
};