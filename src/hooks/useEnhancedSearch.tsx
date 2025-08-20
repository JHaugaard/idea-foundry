import { useState, useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useTags } from '@/hooks/useTags';
import Fuse from 'fuse.js';

export interface SearchFilters {
  tags: string[];
  excludeTags: string[];
  dateRange?: {
    start: Date;
    end: Date;
  };
  category?: 'personal' | 'work' | 'research';
  hasAttachments?: boolean;
  isPinned?: boolean;
}

export interface SearchQuery {
  text: string;
  filters: SearchFilters;
  mode: 'text' | 'tags' | 'combined';
}

export interface SavedSearch {
  id: string;
  name: string;
  query: SearchQuery;
  created_at: string;
  last_used: string;
  use_count: number;
}

export interface SearchResult {
  id: string;
  title: string;
  content: string;
  tags: string[];
  created_at: string;
  updated_at: string;
  slug: string;
  category_type: string;
  pinned: boolean;
  score: number;
  matchedTags: string[];
  highlightedContent?: string;
}

export function useEnhancedSearch() {
  const { user } = useAuth();
  const { tags } = useTags();
  const queryClient = useQueryClient();
  
  const [searchQuery, setSearchQuery] = useState<SearchQuery>({
    text: '',
    filters: { tags: [], excludeTags: [] },
    mode: 'combined'
  });
  
  const [recentSearches, setRecentSearches] = useState<SearchQuery[]>([]);

  // Get all notes for searching
  const { data: allNotes = [], isLoading: notesLoading } = useQuery({
    queryKey: ['search-notes', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('notes')
        .select('id, title, content, tags, created_at, updated_at, slug, category_type, pinned')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
    staleTime: 2 * 60 * 1000, // Cache for 2 minutes
  });

  // Get saved searches
  const { data: savedSearches = [] } = useQuery({
    queryKey: ['saved-searches', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const savedSearchesData = localStorage.getItem(`saved-searches-${user.id}`);
      return savedSearchesData ? JSON.parse(savedSearchesData) : [];
    },
    enabled: !!user?.id,
  });

  // Fuse.js setup for fuzzy search
  const fuse = useMemo(() => {
    if (!allNotes.length) return null;
    
    return new Fuse(allNotes, {
      keys: [
        { name: 'title', weight: 0.4 },
        { name: 'content', weight: 0.3 },
        { name: 'tags', weight: 0.3 }
      ],
      threshold: 0.3,
      includeScore: true,
      includeMatches: true
    });
  }, [allNotes]);

  // Enhanced search function
  const performSearch = useCallback((query: SearchQuery): SearchResult[] => {
    if (!allNotes.length) return [];

    let results: SearchResult[] = [];

    // Handle different search modes
    if (query.mode === 'tags' || (query.mode === 'combined' && query.text.startsWith('#'))) {
      // Tag-first search
      const tagQuery = query.text.replace(/^#/, '').toLowerCase();
      results = allNotes
        .filter(note => {
          if (tagQuery && !note.tags?.some(tag => 
            tag.toLowerCase().includes(tagQuery)
          )) return false;
          return true;
        })
        .map(note => ({
          ...note,
          score: 1,
          matchedTags: note.tags?.filter(tag => 
            tag.toLowerCase().includes(tagQuery)
          ) || []
        }));
    } else if (query.text.trim() && fuse) {
      // Fuzzy text search
      const fuseResults = fuse.search(query.text);
      results = fuseResults.map(result => ({
        ...result.item,
        score: 1 - (result.score || 0),
        matchedTags: result.item.tags?.filter(tag =>
          tag.toLowerCase().includes(query.text.toLowerCase())
        ) || []
      }));
    } else {
      // Show all notes if no search text
      results = allNotes.map(note => ({
        ...note,
        score: 1,
        matchedTags: []
      }));
    }

    // Apply filters
    results = results.filter(note => {
      // Tag filters (AND logic)
      if (query.filters.tags.length > 0) {
        const hasAllTags = query.filters.tags.every(tag =>
          note.tags?.includes(tag)
        );
        if (!hasAllTags) return false;
      }

      // Exclude tags
      if (query.filters.excludeTags.length > 0) {
        const hasExcludedTag = query.filters.excludeTags.some(tag =>
          note.tags?.includes(tag)
        );
        if (hasExcludedTag) return false;
      }

      // Date range filter
      if (query.filters.dateRange) {
        const noteDate = new Date(note.created_at);
        if (noteDate < query.filters.dateRange.start || 
            noteDate > query.filters.dateRange.end) {
          return false;
        }
      }

      // Category filter
      if (query.filters.category && note.category_type !== query.filters.category) {
        return false;
      }

      // Pinned filter
      if (query.filters.isPinned !== undefined && 
          note.pinned !== query.filters.isPinned) {
        return false;
      }

      return true;
    });

    // Sort by relevance score and recency
    results.sort((a, b) => {
      if (a.score !== b.score) return b.score - a.score;
      return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
    });

    return results;
  }, [allNotes, fuse]);

  // Get search results
  const searchResults = useMemo(() => {
    return performSearch(searchQuery);
  }, [searchQuery, performSearch]);

  // Save search mutation
  const saveSearchMutation = useMutation({
    mutationFn: async ({ name, query }: { name: string; query: SearchQuery }) => {
      if (!user?.id) throw new Error('User not authenticated');
      
      const newSavedSearch: SavedSearch = {
        id: crypto.randomUUID(),
        name,
        query,
        created_at: new Date().toISOString(),
        last_used: new Date().toISOString(),
        use_count: 1
      };

      const updatedSavedSearches = [...savedSearches, newSavedSearch];
      localStorage.setItem(
        `saved-searches-${user.id}`, 
        JSON.stringify(updatedSavedSearches)
      );
      
      return newSavedSearch;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saved-searches'] });
    },
  });

  // Delete saved search
  const deleteSavedSearchMutation = useMutation({
    mutationFn: async (searchId: string) => {
      if (!user?.id) throw new Error('User not authenticated');
      
      const updatedSavedSearches = savedSearches.filter(s => s.id !== searchId);
      localStorage.setItem(
        `saved-searches-${user.id}`, 
        JSON.stringify(updatedSavedSearches)
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saved-searches'] });
    },
  });

  // Update search query and add to recent searches
  const updateSearchQuery = useCallback((newQuery: SearchQuery) => {
    setSearchQuery(newQuery);
    
    // Add to recent searches if it has content
    if (newQuery.text.trim() || newQuery.filters.tags.length > 0) {
      setRecentSearches(prev => {
        const filtered = prev.filter(search => 
          search.text !== newQuery.text || 
          JSON.stringify(search.filters) !== JSON.stringify(newQuery.filters)
        );
        return [newQuery, ...filtered].slice(0, 10); // Keep last 10
      });
    }
  }, []);

  // Tag suggestions based on current search
  const getTagSuggestions = useCallback((input: string): string[] => {
    if (!input.trim()) return tags.slice(0, 10);
    
    const inputLower = input.toLowerCase();
    return tags
      .filter(tag => tag.toLowerCase().includes(inputLower))
      .sort((a, b) => {
        // Prioritize tags that start with the input
        const aStarts = a.toLowerCase().startsWith(inputLower);
        const bStarts = b.toLowerCase().startsWith(inputLower);
        if (aStarts && !bStarts) return -1;
        if (!aStarts && bStarts) return 1;
        return a.localeCompare(b);
      })
      .slice(0, 8);
  }, [tags]);

  // Highlight matched content
  const highlightContent = useCallback((content: string, searchText: string): string => {
    if (!searchText.trim()) return content;
    
    const regex = new RegExp(`(${searchText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    return content.replace(regex, '<mark>$1</mark>');
  }, []);

  return {
    searchQuery,
    updateSearchQuery,
    searchResults,
    isLoading: notesLoading,
    savedSearches,
    recentSearches,
    saveSearch: saveSearchMutation.mutate,
    deleteSavedSearch: deleteSavedSearchMutation.mutate,
    getTagSuggestions,
    highlightContent,
    isSaving: saveSearchMutation.isPending,
  };
}