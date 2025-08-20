import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface TagCombination {
  tags: string[];
  count: number;
  effectiveness: number; // Based on retrieval success rate
  lastUsed: string;
}

export interface TagRelationship {
  tagA: string;
  tagB: string;
  coOccurrence: number;
  strength: number;
  notes: Array<{ id: string; title: string }>;
}

export interface TagInsight {
  type: 'overused' | 'underused' | 'effective' | 'redundant' | 'missing';
  title: string;
  description: string;
  tags: string[];
  impact: 'high' | 'medium' | 'low';
  recommendation: string;
}

export interface TagAnalytics {
  // Basic stats
  totalTags: number;
  totalTaggedNotes: number;
  averageTagsPerNote: number;
  mostUsedTag: { tag: string; count: number } | null;
  leastUsedTags: Array<{ tag: string; count: number }>;
  tagGrowth: Array<{ month: string; count: number }>;
  tagDistribution: Array<{ range: string; count: number }>;
  
  // Advanced analytics
  topCombinations: TagCombination[];
  tagRelationships: TagRelationship[];
  insights: TagInsight[];
  healthScore: number; // Overall tag system health (0-100)
  
  // Export data
  exportData: {
    analytics: any;
    relationships: any;
    combinations: any;
    insights: any;
  };
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

      // Get all notes with tags and titles for relationship analysis
      const { data: notes, error } = await supabase
        .from('notes')
        .select('id, title, tags, created_at, updated_at')
        .eq('user_id', user.id)
        .not('tags', 'is', null);

      if (error) throw error;

      // Calculate basic analytics
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

      // Calculate tag combinations
      const combinationCounts = new Map<string, { count: number; notes: any[]; lastUsed: string }>();
      taggedNotes.forEach(note => {
        if (note.tags && note.tags.length > 1) {
          const sortedTags = [...note.tags].sort();
          for (let i = 0; i < sortedTags.length - 1; i++) {
            for (let j = i + 1; j < sortedTags.length; j++) {
              const combo = `${sortedTags[i]}|${sortedTags[j]}`;
              const existing = combinationCounts.get(combo) || { count: 0, notes: [], lastUsed: '' };
              combinationCounts.set(combo, {
                count: existing.count + 1,
                notes: [...existing.notes, note],
                lastUsed: note.updated_at > existing.lastUsed ? note.updated_at : existing.lastUsed
              });
            }
          }
        }
      });

      const topCombinations: TagCombination[] = Array.from(combinationCounts.entries())
        .map(([combo, data]) => ({
          tags: combo.split('|'),
          count: data.count,
          effectiveness: Math.min(data.count / taggedNotes.length * 100, 100), // Simple effectiveness score
          lastUsed: data.lastUsed
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      // Calculate tag relationships
      const relationships = new Map<string, { coOccurrence: number; notes: any[] }>();
      taggedNotes.forEach(note => {
        if (note.tags && note.tags.length > 1) {
          for (let i = 0; i < note.tags.length - 1; i++) {
            for (let j = i + 1; j < note.tags.length; j++) {
              const key = [note.tags[i], note.tags[j]].sort().join('|');
              const existing = relationships.get(key) || { coOccurrence: 0, notes: [] };
              relationships.set(key, {
                coOccurrence: existing.coOccurrence + 1,
                notes: [...existing.notes, { id: note.id, title: note.title }]
              });
            }
          }
        }
      });

      const tagRelationships: TagRelationship[] = Array.from(relationships.entries())
        .map(([key, data]) => {
          const [tagA, tagB] = key.split('|');
          const tagACount = tagCounts.get(tagA) || 0;
          const tagBCount = tagCounts.get(tagB) || 0;
          const strength = data.coOccurrence / Math.min(tagACount, tagBCount);
          
          return {
            tagA,
            tagB,
            coOccurrence: data.coOccurrence,
            strength,
            notes: data.notes.slice(0, 5) // Limit to 5 examples
          };
        })
        .sort((a, b) => b.strength - a.strength)
        .slice(0, 20);

      // Generate insights
      const insights: TagInsight[] = [];
      
      // Overused tags insight
      const overusedTags = tagCountArray.filter(t => t.count > taggedNotes.length * 0.5);
      if (overusedTags.length > 0) {
        insights.push({
          type: 'overused',
          title: 'Overused Tags Detected',
          description: `${overusedTags.length} tags are used in more than half of your notes`,
          tags: overusedTags.map(t => t.tag),
          impact: 'medium',
          recommendation: 'Consider creating more specific sub-tags to improve organization'
        });
      }

      // Underused tags insight
      if (leastUsedTags.length > tagCounts.size * 0.3) {
        insights.push({
          type: 'underused',
          title: 'Many Single-Use Tags',
          description: `${leastUsedTags.length} tags are only used once`,
          tags: leastUsedTags.slice(0, 10).map(t => t.tag),
          impact: 'low',
          recommendation: 'Consider consolidating or removing rarely used tags'
        });
      }

      // Effective combinations insight
      if (topCombinations.length > 0) {
        insights.push({
          type: 'effective',
          title: 'Effective Tag Combinations',
          description: `Found ${topCombinations.length} frequently used tag combinations`,
          tags: topCombinations[0].tags,
          impact: 'high',
          recommendation: 'Continue using these effective combinations for better organization'
        });
      }

      // Calculate health score
      const uniqueTagRatio = tagCounts.size / Math.max(totalTagInstances, 1);
      const avgTagsScore = Math.min(totalTagInstances / Math.max(taggedNotes.length, 1) / 5, 1);
      const combinationScore = Math.min(topCombinations.length / 10, 1);
      const healthScore = Math.round((uniqueTagRatio * 40 + avgTagsScore * 30 + combinationScore * 30) * 100);

      // Prepare export data
      const exportData = {
        analytics: {
          totalTags: tagCounts.size,
          totalTaggedNotes: taggedNotes.length,
          averageTagsPerNote: totalTagInstances / Math.max(taggedNotes.length, 1),
          healthScore,
          generatedAt: new Date().toISOString()
        },
        relationships: tagRelationships,
        combinations: topCombinations,
        insights: insights
      };

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
        topCombinations,
        tagRelationships,
        insights,
        healthScore,
        exportData
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