import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface AITagPreferences {
  id?: string;
  user_id?: string;
  
  // AI Generation Settings
  auto_suggest_enabled: boolean;
  confidence_threshold: number;
  max_suggestions_per_note: number;
  manual_review_required: boolean;
  
  // Multi-language Settings  
  primary_language: string;
  auto_translate_tags: boolean;
  normalize_tags: boolean;
  
  // Quality and Cleanup Settings
  duplicate_detection_enabled: boolean;
  quality_scoring_enabled: boolean;
  auto_cleanup_suggestions: boolean;
  
  // Learning Settings
  learn_from_rejections: boolean;
  learn_from_acceptances: boolean;
  personalization_level: 'low' | 'medium' | 'high';
  
  // Blacklist/Whitelist
  blacklisted_tags: string[];
  whitelisted_patterns: string[];
}

const defaultPreferences: AITagPreferences = {
  auto_suggest_enabled: true,
  confidence_threshold: 0.6,
  max_suggestions_per_note: 5,
  manual_review_required: false,
  primary_language: 'en',
  auto_translate_tags: false,
  normalize_tags: true,
  duplicate_detection_enabled: true,
  quality_scoring_enabled: true,
  auto_cleanup_suggestions: true,
  learn_from_rejections: true,
  learn_from_acceptances: true,
  personalization_level: 'medium',
  blacklisted_tags: [],
  whitelisted_patterns: []
};

export function useAITagPreferences() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch user preferences
  const { data: preferences, isLoading, error } = useQuery({
    queryKey: ['ai-tag-preferences', user?.id],
    queryFn: async () => {
      if (!user?.id) return defaultPreferences;

      const { data, error } = await supabase
        .from('ai_tag_preferences')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') { // Not found error
        throw error;
      }

      return data || defaultPreferences;
    },
    enabled: !!user?.id,
  });

  // Update preferences
  const updatePreferences = useMutation({
    mutationFn: async (newPreferences: Partial<AITagPreferences>) => {
      if (!user?.id) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('ai_tag_preferences')
        .upsert({
          user_id: user.id,
          ...preferences,
          ...newPreferences
        }, {
          onConflict: 'user_id'
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-tag-preferences'] });
      toast({
        title: "Preferences updated",
        description: "Your AI tag preferences have been saved successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Update failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Add to blacklist
  const addToBlacklist = useMutation({
    mutationFn: async (tag: string) => {
      const currentBlacklist = preferences?.blacklisted_tags || [];
      if (currentBlacklist.includes(tag)) return;

      await updatePreferences.mutateAsync({
        blacklisted_tags: [...currentBlacklist, tag]
      });
    },
  });

  // Remove from blacklist
  const removeFromBlacklist = useMutation({
    mutationFn: async (tag: string) => {
      const currentBlacklist = preferences?.blacklisted_tags || [];
      await updatePreferences.mutateAsync({
        blacklisted_tags: currentBlacklist.filter(t => t !== tag)
      });
    },
  });

  // Get interaction history
  const { data: interactionHistory } = useQuery({
    queryKey: ['tag-interaction-history', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('tag_interaction_history')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  // Record tag interaction
  const recordInteraction = useMutation({
    mutationFn: async ({
      suggestedTag,
      noteId,
      action,
      modifiedTo,
      suggestionSource,
      confidence,
      noteContentSnippet,
      otherNoteTags
    }: {
      suggestedTag: string;
      noteId: string;
      action: 'accepted' | 'rejected' | 'modified';
      modifiedTo?: string;
      suggestionSource: string;
      confidence: number;
      noteContentSnippet?: string;
      otherNoteTags?: string[];
    }) => {
      if (!user?.id) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('tag_interaction_history')
        .insert({
          user_id: user.id,
          suggested_tag: suggestedTag,
          note_id: noteId,
          suggestion_source: suggestionSource,
          suggestion_confidence: confidence,
          action,
          modified_to: modifiedTo,
          note_content_snippet: noteContentSnippet,
          other_note_tags: otherNoteTags
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tag-interaction-history'] });
    },
  });

  // Get tag quality analysis
  const { data: qualityAnalysis } = useQuery({
    queryKey: ['tag-quality-analysis', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('tag_quality_analysis')
        .select('*')
        .eq('user_id', user.id)
        .order('quality_score', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  return {
    preferences: preferences || defaultPreferences,
    isLoading,
    error,
    
    // Mutations
    updatePreferences: updatePreferences.mutate,
    isUpdating: updatePreferences.isPending,
    
    // Blacklist management
    addToBlacklist: addToBlacklist.mutate,
    removeFromBlacklist: removeFromBlacklist.mutate,
    
    // Interaction tracking
    recordInteraction: recordInteraction.mutate,
    interactionHistory,
    
    // Quality analysis
    qualityAnalysis,
    
    // Helper functions
    isTagBlacklisted: (tag: string) => preferences?.blacklisted_tags?.includes(tag) || false,
    getAcceptanceRate: (tag: string) => {
      if (!interactionHistory) return 0;
      const interactions = interactionHistory.filter(h => h.suggested_tag === tag);
      if (interactions.length === 0) return 0;
      const accepted = interactions.filter(h => h.action === 'accepted').length;
      return accepted / interactions.length;
    },
    getRejectionRate: (tag: string) => {
      if (!interactionHistory) return 0;
      const interactions = interactionHistory.filter(h => h.suggested_tag === tag);
      if (interactions.length === 0) return 0;
      const rejected = interactions.filter(h => h.action === 'rejected').length;
      return rejected / interactions.length;
    }
  };
}