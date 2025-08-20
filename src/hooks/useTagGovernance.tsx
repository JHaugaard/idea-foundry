import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

export interface TagPreferences {
  id: string;
  user_id: string;
  max_tags_per_note: number;
  max_total_tags: number;
  enforce_naming_conventions: boolean;
  auto_format_tags: boolean;
  suggest_similar_tags: boolean;
  reserved_words: string[];
  created_at: string;
  updated_at: string;
}

export interface TagAnalytics {
  id: string;
  user_id: string;
  tag_name: string;
  total_usage_count: number;
  last_used_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface TagRelationship {
  id: string;
  user_id: string;
  tag_a: string;
  tag_b: string;
  co_occurrence_count: number;
  relationship_strength: number;
  created_at: string;
  updated_at: string;
}

export interface TagBackup {
  id: string;
  user_id: string;
  backup_name: string;
  backup_data: any;
  backup_type: 'manual' | 'auto' | 'export';
  created_at: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  suggestions: string[];
  formattedTag?: string;
}

export function useTagGovernance() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get user tag preferences
  const { data: preferences, isLoading: preferencesLoading } = useQuery({
    queryKey: ['tag-preferences', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      const { data, error } = await supabase
        .from('user_tag_preferences')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;
      
      // Create default preferences if none exist
      if (!data) {
        const { data: newPrefs, error: createError } = await supabase
          .from('user_tag_preferences')
          .insert({
            user_id: user.id,
            max_tags_per_note: 10,
            max_total_tags: 500,
            enforce_naming_conventions: true,
            auto_format_tags: true,
            suggest_similar_tags: true,
            reserved_words: ['system', 'admin', 'root', 'null', 'undefined', 'delete', 'new', 'edit', 'create', 'update']
          })
          .select()
          .single();
        
        if (createError) throw createError;
        return newPrefs;
      }
      
      return data;
    },
    enabled: !!user?.id,
  });

  // Get tag analytics
  const { data: analytics } = useQuery({
    queryKey: ['tag-analytics', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('tag_analytics')
        .select('*')
        .eq('user_id', user.id)
        .order('total_usage_count', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  // Get tag relationships
  const { data: relationships } = useQuery({
    queryKey: ['tag-relationships', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('tag_relationships')
        .select('*')
        .eq('user_id', user.id)
        .order('relationship_strength', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  // Get tag backups
  const { data: backups } = useQuery({
    queryKey: ['tag-backups', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('tag_backups')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  // Update preferences mutation
  const updatePreferencesMutation = useMutation({
    mutationFn: async (updates: Partial<TagPreferences>) => {
      if (!user?.id || !preferences?.id) throw new Error('User not authenticated');
      
      const { data, error } = await supabase
        .from('user_tag_preferences')
        .update(updates)
        .eq('id', preferences.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tag-preferences'] });
      toast({
        title: "Preferences Updated",
        description: "Your tag preferences have been saved successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Update Failed",
        description: "Failed to update tag preferences. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Validate tag function
  const validateTag = async (tag: string, existingTags: string[] = []): Promise<ValidationResult> => {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      suggestions: [],
    };

    if (!preferences) {
      result.errors.push('Tag preferences not loaded');
      result.isValid = false;
      return result;
    }

    // Auto-format if enabled
    let processedTag = tag;
    if (preferences.auto_format_tags) {
      const { data: formattedTag, error } = await supabase.rpc('format_tag_name', { tag_name: tag });
      if (!error && formattedTag) {
        processedTag = formattedTag;
        result.formattedTag = formattedTag;
        if (formattedTag !== tag) {
          result.warnings.push(`Tag will be auto-formatted to: "${formattedTag}"`);
        }
      }
    }

    // Validate naming conventions
    if (preferences.enforce_naming_conventions) {
      const { data: isValid, error } = await supabase.rpc('validate_tag_name', { tag_name: processedTag });
      if (error || !isValid) {
        result.errors.push('Tag must be 2-30 characters, lowercase, and hyphen-separated (e.g., "web-development")');
        result.isValid = false;
      }
    }

    // Check reserved words
    if (preferences.reserved_words.includes(processedTag.toLowerCase())) {
      result.errors.push(`"${processedTag}" is a reserved word and cannot be used as a tag`);
      result.isValid = false;
    }

    // Check for duplicates (case-insensitive)
    const existingLowerCase = existingTags.map(t => t.toLowerCase());
    if (existingLowerCase.includes(processedTag.toLowerCase())) {
      result.errors.push('This tag already exists (tags are case-insensitive)');
      result.isValid = false;
    }

    // Check total tag limits
    if (analytics && analytics.length >= preferences.max_total_tags) {
      result.errors.push(`You have reached the maximum of ${preferences.max_total_tags} total tags`);
      result.isValid = false;
    }

    // Suggest similar tags
    if (preferences.suggest_similar_tags && analytics) {
      const similarTags = analytics
        .filter(a => a.tag_name.includes(processedTag) || processedTag.includes(a.tag_name))
        .slice(0, 3)
        .map(a => a.tag_name);
      
      if (similarTags.length > 0) {
        result.suggestions = similarTags;
        result.warnings.push(`Similar tags found: ${similarTags.join(', ')}`);
      }
    }

    return result;
  };

  // Get inactive tags (not used in 90+ days)
  const getInactiveTags = () => {
    if (!analytics) return [];
    
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    
    return analytics.filter(tag => {
      if (!tag.last_used_at) return true;
      return new Date(tag.last_used_at) < ninetyDaysAgo;
    });
  };

  // Get duplicate suggestions (similar tags that could be merged)
  const getDuplicateSuggestions = () => {
    if (!analytics) return [];
    
    const suggestions: Array<{ primary: string; duplicates: string[] }> = [];
    const processed = new Set<string>();
    
    analytics.forEach(tag => {
      if (processed.has(tag.tag_name)) return;
      
      const similar = analytics.filter(other => 
        other.tag_name !== tag.tag_name &&
        !processed.has(other.tag_name) &&
        (other.tag_name.includes(tag.tag_name) || 
         tag.tag_name.includes(other.tag_name) ||
         levenshteinDistance(tag.tag_name, other.tag_name) <= 2)
      );
      
      if (similar.length > 0) {
        suggestions.push({
          primary: tag.tag_name,
          duplicates: similar.map(s => s.tag_name)
        });
        processed.add(tag.tag_name);
        similar.forEach(s => processed.add(s.tag_name));
      }
    });
    
    return suggestions;
  };

  // Create backup mutation
  const createBackupMutation = useMutation({
    mutationFn: async ({ name, type = 'manual' }: { name: string; type?: 'manual' | 'auto' | 'export' }) => {
      if (!user?.id) throw new Error('User not authenticated');
      
      // Get all user data for backup
      const backupData = {
        tags: analytics,
        relationships: relationships,
        preferences: preferences,
        timestamp: new Date().toISOString()
      };
      
      const { data, error } = await supabase
        .from('tag_backups')
        .insert({
          user_id: user.id,
          backup_name: name,
          backup_data: backupData,
          backup_type: type
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tag-backups'] });
      toast({
        title: "Backup Created",
        description: "Your tag library has been backed up successfully.",
      });
    },
  });

  return {
    preferences,
    analytics,
    relationships,
    backups,
    preferencesLoading,
    updatePreferences: updatePreferencesMutation.mutate,
    validateTag,
    getInactiveTags,
    getDuplicateSuggestions,
    createBackup: createBackupMutation.mutate,
    isUpdating: updatePreferencesMutation.isPending,
  };
}

// Helper function for string similarity
function levenshteinDistance(str1: string, str2: string): number {
  const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));
  
  for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
  for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;
  
  for (let j = 1; j <= str2.length; j++) {
    for (let i = 1; i <= str1.length; i++) {
      const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1,
        matrix[j - 1][i] + 1,
        matrix[j - 1][i - 1] + indicator
      );
    }
  }
  
  return matrix[str2.length][str1.length];
}