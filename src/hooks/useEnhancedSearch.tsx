import React, { useState, useCallback, useMemo, useEffect } from 'react';
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
  similarity_score?: number;
  search_type: 'fuzzy' | 'semantic' | 'hybrid';
  tier?: 'exact' | 'high' | 'medium' | 'related';
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
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [hybridResults, setHybridResults] = useState<SearchResult[]>([]);
  const [searchMetrics, setSearchMetrics] = useState<{
    totalNotes: number;
    notesWithEmbeddings: number;
    searchTime: number;
    searchType: 'fuzzy' | 'semantic' | 'hybrid';
    hasSemanticFallback: boolean;
  } | null>(null);

  // Get all notes for searching with improved caching
  const { data: allNotes = [], isLoading: notesLoading } = useQuery({
    queryKey: ['search-notes', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('notes')
        .select('id, title, content, tags, created_at, updated_at, slug, category_type, pinned, semantic_enabled')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
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

  // Fuzzy search function (immediate results)
  const performFuzzySearch = useCallback((query: SearchQuery): SearchResult[] => {
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
          search_type: 'fuzzy' as const,
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
        search_type: 'fuzzy' as const,
        matchedTags: result.item.tags?.filter(tag =>
          tag.toLowerCase().includes(query.text.toLowerCase())
        ) || []
      }));
    } else {
      // Show all notes if no search text
      results = allNotes.map(note => ({
        ...note,
        score: 1,
        search_type: 'fuzzy' as const,
        matchedTags: []
      }));
    }

    return applyFiltersAndSort(results, query);
  }, [allNotes, fuse]);

  // Semantic search function
  const performSemanticSearch = useCallback(async (query: SearchQuery, embeddingProvider?: any): Promise<SearchResult[]> => {
    if (!query.text.trim() || !user?.id) return [];

    try {
      let queryEmbedding: number[];
      
      // Generate embedding for the query using the embedding provider
      if (embeddingProvider) {
        const embeddingResult = await embeddingProvider.generateEmbedding(query.text);
        queryEmbedding = embeddingResult.embedding;
      } else {
        // Fallback to OpenAI edge function
        const { data: embeddingData, error: embeddingError } = await supabase.functions.invoke('query-embed', {
          body: { query: query.text }
        });

        if (embeddingError || !embeddingData?.embedding) {
          console.warn('Failed to generate embedding for search:', embeddingError);
          return [];
        }

        queryEmbedding = embeddingData.embedding;
      }

      // Call match_notes function with the embedding
      const { data: semanticResults, error: searchError } = await supabase.rpc('match_notes', {
        query_embedding: `[${queryEmbedding.join(',')}]`,
        match_threshold: 0.3, // Lower threshold for broader results
        match_count: 20
      });

      if (searchError) {
        console.warn('Semantic search failed:', searchError);
        return [];
      }

      if (!semanticResults?.length) return [];

      // Convert to SearchResult format by joining with allNotes
      const results: SearchResult[] = semanticResults
        .map(result => {
          const note = allNotes.find(n => n.id === result.note_id);
          if (!note) return null;

          return {
            ...note,
            score: result.similarity,
            similarity_score: result.similarity,
            search_type: 'semantic' as const,
            matchedTags: note.tags?.filter(tag =>
              tag.toLowerCase().includes(query.text.toLowerCase())
            ) || []
          };
        })
        .filter(Boolean) as SearchResult[];

      return results;
    } catch (error) {
      console.warn('Semantic search error:', error);
      return [];
    }
  }, [allNotes, user?.id]);

  // Apply filters and sorting
  const applyFiltersAndSort = useCallback((results: SearchResult[], query: SearchQuery): SearchResult[] => {
    // Apply filters
    let filteredResults = results.filter(note => {
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

    // Boost recent notes (last 30 days) by 10%
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    filteredResults = filteredResults.map(result => ({
      ...result,
      score: new Date(result.updated_at) > thirtyDaysAgo 
        ? result.score * 1.1 
        : result.score
    }));

    // Sort by relevance score and recency
    filteredResults.sort((a, b) => {
      if (a.score !== b.score) return b.score - a.score;
      return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
    });

    return filteredResults;
  }, []);

  // Merge and rank hybrid results
  const mergeHybridResults = useCallback((fuzzyResults: SearchResult[], semanticResults: SearchResult[]): SearchResult[] => {
    const seenIds = new Set<string>();
    const merged: SearchResult[] = [];

    // Combine results with weighted scoring: 60% semantic + 40% fuzzy
    const allResults = [...fuzzyResults, ...semanticResults];
    
    allResults.forEach(result => {
      if (seenIds.has(result.id)) {
        // Merge duplicate results
        const existingIndex = merged.findIndex(r => r.id === result.id);
        if (existingIndex >= 0) {
          const existing = merged[existingIndex];
          const fuzzyScore = existing.search_type === 'fuzzy' ? existing.score : result.score;
          const semanticScore = result.search_type === 'semantic' ? result.score : existing.score;
          
          merged[existingIndex] = {
            ...existing,
            score: (semanticScore * 0.6) + (fuzzyScore * 0.4),
            search_type: 'hybrid' as const,
            similarity_score: result.similarity_score || existing.similarity_score,
          };
        }
      } else {
        seenIds.add(result.id);
        merged.push(result);
      }
    });

    // Assign result tiers based on score
    const tieredResults = merged.map(result => ({
      ...result,
      tier: result.score > 0.9 ? 'exact' as const :
            result.score > 0.7 ? 'high' as const :
            result.score > 0.5 ? 'medium' as const :
            'related' as const
    }));

    // Sort by score descending
    tieredResults.sort((a, b) => b.score - a.score);

    return tieredResults;
  }, []);

  // Enhanced hybrid search with progressive loading and performance tracking
  const performHybridSearch = useCallback(async (query: SearchQuery, embeddingProvider?: any) => {
    const startTime = performance.now();
    
    if (!query.text.trim()) {
      const fuzzyResults = performFuzzySearch(query);
      setHybridResults(fuzzyResults);
      
      // Set metrics for empty query
      setSearchMetrics({
        totalNotes: allNotes.length,
        notesWithEmbeddings: allNotes.filter(n => n.semantic_enabled).length,
        searchTime: performance.now() - startTime,
        searchType: 'fuzzy',
        hasSemanticFallback: false
      });
      return;
    }

    setIsEnhancing(true);
    
    // Get immediate fuzzy results
    const fuzzyResults = performFuzzySearch(query);
    setHybridResults(fuzzyResults);

    let finalSearchType: 'fuzzy' | 'semantic' | 'hybrid' = 'fuzzy';
    let hasSemanticFallback = false;

    try {
      // Perform semantic search in parallel
      const semanticResults = await performSemanticSearch(query, embeddingProvider);
      
      if (semanticResults.length > 0) {
        // Merge results with weighted scoring
        const mergedResults = mergeHybridResults(fuzzyResults, semanticResults);
        setHybridResults(mergedResults);
        finalSearchType = mergedResults.some(r => r.search_type === 'hybrid') ? 'hybrid' : 'semantic';
      } else {
        hasSemanticFallback = true;
      }
    } catch (error) {
      console.warn('Hybrid search enhancement failed:', error);
      hasSemanticFallback = true;
    } finally {
      const searchTime = performance.now() - startTime;
      
      // Update search metrics
      setSearchMetrics({
        totalNotes: allNotes.length,
        notesWithEmbeddings: allNotes.filter(n => n.semantic_enabled).length,
        searchTime,
        searchType: finalSearchType,
        hasSemanticFallback
      });

      setIsEnhancing(false);
    }
  }, [performFuzzySearch, performSemanticSearch, mergeHybridResults, allNotes]);

  const executeSearch = useCallback(async (embeddingProvider?: any) => {
    await performHybridSearch(searchQuery, embeddingProvider);
  }, [searchQuery, performHybridSearch]);

  // Note: Search execution is handled by components when needed, not automatically triggered

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
    searchResults: hybridResults,
    isLoading: notesLoading,
    isEnhancing,
    savedSearches,
    recentSearches,
    saveSearch: saveSearchMutation.mutate,
    deleteSavedSearch: deleteSavedSearchMutation.mutate,
    getTagSuggestions,
    highlightContent,
    isSaving: saveSearchMutation.isPending,
    searchMetrics,
    executeSearch,
  };
}