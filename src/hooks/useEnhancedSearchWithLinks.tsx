import { useState, useCallback, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useTags } from '@/hooks/useTags';
import { useLinkData } from '@/hooks/useLinkData';
import { useBacklinks } from '@/hooks/useBacklinks';
import Fuse from 'fuse.js';

export interface LinkSearchFilters {
  tags: string[];
  excludeTags: string[];
  dateRange?: { start: Date; end: Date; };
  category?: 'personal' | 'work' | 'research';
  hasAttachments?: boolean;
  isPinned?: boolean;
  // New link-based filters
  hasLinksToCurrentNote?: string; // Note ID
  linkedFromCurrentNote?: string; // Note ID
  connectionCount?: { min?: number; max?: number; };
  linkTypes?: ('incoming' | 'outgoing')[];
  mostConnected?: boolean;
  orphaned?: boolean;
}

export interface LinkSearchQuery {
  text: string;
  filters: LinkSearchFilters;
  mode: 'text' | 'tags' | 'combined' | 'similarity' | 'connections';
}

export interface EnhancedSearchResult {
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
  // Link-specific data
  linkContext?: {
    incomingCount: number;
    outgoingCount: number;
    totalConnections: number;
    connectedNotes: Array<{
      id: string;
      title: string;
      anchorText?: string;
    }>;
    backlinks: Array<{
      id: string;
      sourceTitle: string;
      anchorText?: string;
      context?: string;
    }>;
    sharedConnections?: Array<{
      noteId: string;
      title: string;
      connectionStrength: number;
    }>;
  };
  semanticSimilarity?: number;
}

export function useEnhancedSearchWithLinks(currentNoteId?: string) {
  const { user } = useAuth();
  const { tags } = useTags();
  const queryClient = useQueryClient();
  
  const [searchQuery, setSearchQuery] = useState<LinkSearchQuery>({
    text: '',
    filters: { tags: [], excludeTags: [] },
    mode: 'combined'
  });
  
  const [recentSearches, setRecentSearches] = useState<LinkSearchQuery[]>([]);

  // Get all notes with link data
  const { data: allNotes = [], isLoading: notesLoading } = useQuery({
    queryKey: ['enhanced-search-notes', user?.id],
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
    staleTime: 2 * 60 * 1000,
  });

  // Get all link relationships
  const { data: linkData = [], isLoading: linksLoading } = useQuery({
    queryKey: ['all-link-data', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('note_links')
        .select(`
          id,
          source_note_id,
          target_note_id,
          anchor_text,
          canonical_title,
          source_note:notes!source_note_id (id, title, content),
          target_note:notes!target_note_id (id, title)
        `)
        .eq('user_id', user.id);

      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
  });

  // Create connection graph
  const connectionGraph = useMemo(() => {
    const graph = new Map<string, {
      incoming: Array<{ id: string; title: string; anchorText?: string; context?: string; }>;
      outgoing: Array<{ id: string; title: string; anchorText?: string; }>;
    }>();

    allNotes.forEach(note => {
      graph.set(note.id, { incoming: [], outgoing: [] });
    });

    linkData.forEach(link => {
      const sourceConnections = graph.get(link.source_note_id);
      const targetConnections = graph.get(link.target_note_id);

      if (sourceConnections && link.target_note) {
        sourceConnections.outgoing.push({
          id: link.target_note_id,
          title: link.target_note.title,
          anchorText: link.anchor_text || undefined,
        });
      }

      if (targetConnections && link.source_note) {
        const contextSentences = link.source_note.content ? 
          extractContext(link.source_note.content, link.anchor_text) : undefined;
        
        targetConnections.incoming.push({
          id: link.source_note_id,
          title: link.source_note.title,
          anchorText: link.anchor_text || undefined,
          context: contextSentences,
        });
      }
    });

    return graph;
  }, [allNotes, linkData]);

  // Extract context around link mentions
  const extractContext = (content: string, anchorText: string | null): string => {
    if (!content || !anchorText) return '';
    
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const targetIndex = sentences.findIndex(sentence => 
      sentence.toLowerCase().includes(anchorText.toLowerCase())
    );
    
    if (targetIndex === -1) return '';
    
    const start = Math.max(0, targetIndex - 1);
    const end = Math.min(sentences.length, targetIndex + 2);
    
    return sentences.slice(start, end).join('. ').trim();
  };

  // Find similar notes based on shared connections
  const findSimilarNotes = useCallback((noteId: string): Array<{
    noteId: string;
    title: string;
    connectionStrength: number;
  }> => {
    const targetConnections = connectionGraph.get(noteId);
    if (!targetConnections) return [];

    const similarities = new Map<string, number>();
    const targetConnectionIds = new Set([
      ...targetConnections.incoming.map(c => c.id),
      ...targetConnections.outgoing.map(c => c.id)
    ]);

    // Calculate Jaccard similarity based on shared connections
    allNotes.forEach(note => {
      if (note.id === noteId) return;
      
      const noteConnections = connectionGraph.get(note.id);
      if (!noteConnections) return;

      const noteConnectionIds = new Set([
        ...noteConnections.incoming.map(c => c.id),
        ...noteConnections.outgoing.map(c => c.id)
      ]);

      const intersection = new Set([...targetConnectionIds].filter(id => noteConnectionIds.has(id)));
      const union = new Set([...targetConnectionIds, ...noteConnectionIds]);

      if (union.size > 0) {
        const similarity = intersection.size / union.size;
        if (similarity > 0) {
          similarities.set(note.id, similarity);
        }
      }
    });

    return Array.from(similarities.entries())
      .map(([id, strength]) => ({
        noteId: id,
        title: allNotes.find(n => n.id === id)?.title || '',
        connectionStrength: strength
      }))
      .sort((a, b) => b.connectionStrength - a.connectionStrength)
      .slice(0, 10);
  }, [connectionGraph, allNotes]);

  // Fuse.js setup with link data
  const fuse = useMemo(() => {
    if (!allNotes.length) return null;
    
    const searchableNotes = allNotes.map(note => {
      const connections = connectionGraph.get(note.id);
      const linkTexts = connections ? [
        ...connections.incoming.map(c => c.anchorText).filter(Boolean),
        ...connections.outgoing.map(c => c.anchorText).filter(Boolean),
      ] : [];

      return {
        ...note,
        linkTexts: linkTexts.join(' '),
        connectionCount: connections ? 
          connections.incoming.length + connections.outgoing.length : 0
      };
    });
    
    return new Fuse(searchableNotes, {
      keys: [
        { name: 'title', weight: 0.4 },
        { name: 'content', weight: 0.3 },
        { name: 'tags', weight: 0.2 },
        { name: 'linkTexts', weight: 0.1 }
      ],
      threshold: 0.3,
      includeScore: true,
      includeMatches: true
    });
  }, [allNotes, connectionGraph]);

  // Enhanced search function with link context
  const performSearch = useCallback((query: LinkSearchQuery): EnhancedSearchResult[] => {
    if (!allNotes.length) return [];

    let results: EnhancedSearchResult[] = [];

    // Handle similarity search mode
    if (query.mode === 'similarity' && currentNoteId) {
      const similarNotes = findSimilarNotes(currentNoteId);
      results = similarNotes.map(sim => {
        const note = allNotes.find(n => n.id === sim.noteId)!;
        return {
          ...note,
          score: sim.connectionStrength,
          matchedTags: [],
          semanticSimilarity: sim.connectionStrength
        };
      });
    }
    // Handle connections-only search
    else if (query.mode === 'connections') {
      results = allNotes
        .map(note => {
          const connections = connectionGraph.get(note.id);
          const connectionCount = connections ? 
            connections.incoming.length + connections.outgoing.length : 0;
          
          return {
            ...note,
            score: connectionCount / 10, // Normalize score
            matchedTags: [],
            connectionCount
          };
        })
        .filter(note => (note as any).connectionCount > 0)
        .sort((a, b) => (b as any).connectionCount - (a as any).connectionCount);
    }
    // Regular search with fuse
    else if (query.text.trim() && fuse) {
      const fuseResults = fuse.search(query.text);
      results = fuseResults.map(result => ({
        ...result.item,
        score: 1 - (result.score || 0),
        matchedTags: result.item.tags?.filter(tag =>
          tag.toLowerCase().includes(query.text.toLowerCase())
        ) || []
      }));
    }
    // Tag search
    else if (query.mode === 'tags' || (query.mode === 'combined' && query.text.startsWith('#'))) {
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
    }
    else {
      // Show all notes
      results = allNotes.map(note => ({
        ...note,
        score: 1,
        matchedTags: []
      }));
    }

    // Apply link-based filters
    results = results.filter(note => {
      const connections = connectionGraph.get(note.id);
      
      // Filter by connection to current note
      if (query.filters.hasLinksToCurrentNote) {
        const hasIncomingFromCurrent = connections?.incoming.some(
          c => c.id === query.filters.hasLinksToCurrentNote
        );
        if (!hasIncomingFromCurrent) return false;
      }

      if (query.filters.linkedFromCurrentNote) {
        const hasOutgoingToCurrent = connections?.outgoing.some(
          c => c.id === query.filters.linkedFromCurrentNote
        );
        if (!hasOutgoingToCurrent) return false;
      }

      // Filter by connection count
      if (query.filters.connectionCount) {
        const totalConnections = connections ? 
          connections.incoming.length + connections.outgoing.length : 0;
        
        if (query.filters.connectionCount.min && totalConnections < query.filters.connectionCount.min) return false;
        if (query.filters.connectionCount.max && totalConnections > query.filters.connectionCount.max) return false;
      }

      // Filter orphaned notes
      if (query.filters.orphaned) {
        const totalConnections = connections ? 
          connections.incoming.length + connections.outgoing.length : 0;
        if (totalConnections > 0) return false;
      }

      // Apply existing filters (tags, date, etc.)
      if (query.filters.tags.length > 0) {
        const hasAllTags = query.filters.tags.every(tag =>
          note.tags?.includes(tag)
        );
        if (!hasAllTags) return false;
      }

      if (query.filters.excludeTags.length > 0) {
        const hasExcludedTag = query.filters.excludeTags.some(tag =>
          note.tags?.includes(tag)
        );
        if (hasExcludedTag) return false;
      }

      if (query.filters.dateRange) {
        const noteDate = new Date(note.created_at);
        if (noteDate < query.filters.dateRange.start || 
            noteDate > query.filters.dateRange.end) {
          return false;
        }
      }

      if (query.filters.category && note.category_type !== query.filters.category) {
        return false;
      }

      if (query.filters.isPinned !== undefined && 
          note.pinned !== query.filters.isPinned) {
        return false;
      }

      return true;
    });

    // Add link context to results
    results = results.map(note => {
      const connections = connectionGraph.get(note.id);
      const incomingCount = connections?.incoming.length || 0;
      const outgoingCount = connections?.outgoing.length || 0;
      
      let sharedConnections: Array<{
        noteId: string;
        title: string;
        connectionStrength: number;
      }> | undefined;

      if (currentNoteId && currentNoteId !== note.id) {
        sharedConnections = findSimilarNotes(note.id)
          .filter(sim => sim.noteId === currentNoteId)
          .slice(0, 5);
      }

      return {
        ...note,
        linkContext: {
          incomingCount,
          outgoingCount,
          totalConnections: incomingCount + outgoingCount,
          connectedNotes: connections?.outgoing.slice(0, 5) || [],
          backlinks: connections?.incoming.map(c => ({
            id: c.id,
            sourceTitle: c.title,
            anchorText: c.anchorText,
            context: c.context
          })).slice(0, 5) || [],
          sharedConnections
        }
      };
    });

    // Sort results
    if (query.filters.mostConnected) {
      results.sort((a, b) => 
        (b.linkContext?.totalConnections || 0) - (a.linkContext?.totalConnections || 0)
      );
    } else {
      results.sort((a, b) => {
        if (a.score !== b.score) return b.score - a.score;
        return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
      });
    }

    return results;
  }, [allNotes, connectionGraph, findSimilarNotes, fuse, currentNoteId]);

  // Get search results
  const searchResults = useMemo(() => {
    return performSearch(searchQuery);
  }, [searchQuery, performSearch]);

  // Update search query and add to recent searches
  const updateSearchQuery = useCallback((newQuery: LinkSearchQuery) => {
    setSearchQuery(newQuery);
    
    // Add to recent searches if it has content
    if (newQuery.text.trim() || 
        newQuery.filters.tags.length > 0 || 
        newQuery.filters.hasLinksToCurrentNote ||
        newQuery.filters.linkedFromCurrentNote ||
        newQuery.mode === 'similarity') {
      setRecentSearches(prev => {
        const filtered = prev.filter(search => 
          JSON.stringify(search) !== JSON.stringify(newQuery)
        );
        return [newQuery, ...filtered].slice(0, 10);
      });
    }
  }, []);

  // Get most linked notes for suggestions
  const getMostLinkedNotes = useCallback((): Array<{
    id: string;
    title: string;
    connectionCount: number;
  }> => {
    return allNotes
      .map(note => {
        const connections = connectionGraph.get(note.id);
        const connectionCount = connections ? 
          connections.incoming.length + connections.outgoing.length : 0;
        return { id: note.id, title: note.title, connectionCount };
      })
      .filter(note => note.connectionCount > 0)
      .sort((a, b) => b.connectionCount - a.connectionCount)
      .slice(0, 10);
  }, [allNotes, connectionGraph]);

  // Tag suggestions based on current search
  const getTagSuggestions = useCallback((input: string): string[] => {
    if (!input.trim()) return tags.slice(0, 10);
    
    const inputLower = input.toLowerCase();
    return tags
      .filter(tag => tag.toLowerCase().includes(inputLower))
      .sort((a, b) => {
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
    return content.replace(regex, '<mark class="bg-primary/20">$1</mark>');
  }, []);

  return {
    searchQuery,
    updateSearchQuery,
    searchResults,
    isLoading: notesLoading || linksLoading,
    recentSearches,
    getTagSuggestions,
    highlightContent,
    getMostLinkedNotes,
    findSimilarNotes,
    connectionGraph,
  };
}