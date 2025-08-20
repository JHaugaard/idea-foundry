import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface TagAnalytics {
  totalTags: number;
  totalTaggedNotes: number;
  averageTagsPerNote: number;
  mostUsedTag: { tag: string; count: number } | null;
  leastUsedTags: Array<{ tag: string; count: number }>;
  tagGrowth: Array<{ month: string; count: number }>;
  tagDistribution: Array<{ range: string; count: number }>;
}

export const useTagAnalytics = () => {
  const { user } = useAuth();

  const {
    data: analytics,
    isLoading,
    error
  } = useQuery({
    queryKey: ['tag-analytics', user?.id],
    queryFn: async (): Promise<TagAnalytics> => {
      if (!user) throw new Error('User not authenticated');

      // Get all notes with tags
      const { data: notes, error } = await supabase
        .from('notes')
        .select('tags, created_at')
        .eq('user_id', user.id)
        .not('tags', 'is', null);

      if (error) throw error;

      // Calculate analytics
      const tagCounts = new Map<string, number>();
      const taggedNotes = notes.filter(note => note.tags && note.tags.length > 0);
      
      let totalTagInstances = 0;
      
      taggedNotes.forEach(note => {
        note.tags?.forEach((tag: string) => {
          tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
          totalTagInstances++;
        });
      });

      const tagCountArray = Array.from(tagCounts.entries())
        .map(([tag, count]) => ({ tag, count }))
        .sort((a, b) => b.count - a.count);

      // Most used tag
      const mostUsedTag = tagCountArray.length > 0 ? tagCountArray[0] : null;

      // Least used tags (used only once)
      const leastUsedTags = tagCountArray.filter(t => t.count === 1);

      // Tag growth over time (simplified - by month)
      const monthlyGrowth = new Map<string, Set<string>>();
      taggedNotes.forEach(note => {
        const month = new Date(note.created_at).toISOString().slice(0, 7); // YYYY-MM
        if (!monthlyGrowth.has(month)) {
          monthlyGrowth.set(month, new Set());
        }
        note.tags?.forEach((tag: string) => {
          monthlyGrowth.get(month)!.add(tag);
        });
      });

      const tagGrowth = Array.from(monthlyGrowth.entries())
        .map(([month, tags]) => ({ month, count: tags.size }))
        .sort((a, b) => a.month.localeCompare(b.month));

      // Tag distribution by usage frequency
      const distribution = [
        { range: '1 use', count: tagCountArray.filter(t => t.count === 1).length },
        { range: '2-5 uses', count: tagCountArray.filter(t => t.count >= 2 && t.count <= 5).length },
        { range: '6-10 uses', count: tagCountArray.filter(t => t.count >= 6 && t.count <= 10).length },
        { range: '11+ uses', count: tagCountArray.filter(t => t.count > 10).length },
      ];

      return {
        totalTags: tagCounts.size,
        totalTaggedNotes: taggedNotes.length,
        averageTagsPerNote: taggedNotes.length > 0 
          ? totalTagInstances / taggedNotes.length 
          : 0,
        mostUsedTag,
        leastUsedTags,
        tagGrowth,
        tagDistribution: distribution,
      };
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  return {
    analytics,
    isLoading,
    error
  };
};