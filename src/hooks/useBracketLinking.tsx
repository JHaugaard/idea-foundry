import { useState, useEffect, useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import Fuse from 'fuse.js';

interface NoteSuggestion {
  id: string;
  title: string;
  slug: string | null;
  content: string | null;
  created_at: string;
  excerpt?: string;
}

interface BracketMatch {
  text: string;
  start: number;
  end: number;
  isComplete: boolean;
}

const BACKLINKS_ENABLED = true;

export function useBracketLinking(textContent: string) {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeBracket, setActiveBracket] = useState<BracketMatch | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isSearching, setIsSearching] = useState(false);

  // Fetch all notes for searching
  const { data: allNotes = [], isLoading } = useQuery({
    queryKey: ['notes', 'all', user?.id],
    queryFn: async (): Promise<NoteSuggestion[]> => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('notes')
        .select('id, title, slug, content, created_at')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      
      return (data || []).map(note => ({
        ...note,
        excerpt: note.content ? note.content.substring(0, 100) + '...' : ''
      }));
    },
    enabled: !!user && BACKLINKS_ENABLED,
  });

  // Initialize Fuse.js for fuzzy search
  const fuse = useMemo(() => {
    if (!allNotes.length) return null;
    
    return new Fuse(allNotes, {
      keys: [
        { name: 'title', weight: 0.7 },
        { name: 'content', weight: 0.3 }
      ],
      threshold: 0.4,
      includeScore: true,
      minMatchCharLength: 2,
    });
  }, [allNotes]);

  // Detect bracket patterns in text
  const detectBracketPattern = useCallback((text: string, cursorPosition: number): BracketMatch | null => {
    if (!BACKLINKS_ENABLED) return null;

    // Look for [[ pattern before cursor
    const beforeCursor = text.substring(0, cursorPosition);
    const lastOpenBracket = beforeCursor.lastIndexOf('[[');
    
    if (lastOpenBracket === -1) return null;

    // Check if there's a closing ]] after the opening [[
    const afterOpen = text.substring(lastOpenBracket + 2);
    const closeBracket = afterOpen.indexOf(']]');
    
    if (closeBracket === -1) {
      // Incomplete bracket - user is still typing
      const contentAfterBrackets = beforeCursor.substring(lastOpenBracket + 2);
      
      // Make sure we don't have newlines or other [[ in between
      if (contentAfterBrackets.includes('\n') || contentAfterBrackets.includes('[[')) {
        return null;
      }

      return {
        text: contentAfterBrackets,
        start: lastOpenBracket,
        end: cursorPosition,
        isComplete: false
      };
    } else {
      // Complete bracket pair
      const bracketContent = afterOpen.substring(0, closeBracket);
      const end = lastOpenBracket + 2 + closeBracket + 2;
      
      // Only return if cursor is within the brackets
      if (cursorPosition >= lastOpenBracket && cursorPosition <= end) {
        return {
          text: bracketContent,
          start: lastOpenBracket,
          end: end,
          isComplete: true
        };
      }
    }

    return null;
  }, []);

  // Debounced search functionality
  useEffect(() => {
    if (!activeBracket || !fuse) {
      setSearchQuery('');
      return;
    }

    const query = activeBracket.text.trim();
    if (query.length < 2) {
      setSearchQuery('');
      return;
    }

    setIsSearching(true);
    const timeoutId = setTimeout(() => {
      setSearchQuery(query);
      setSelectedIndex(0);
      setIsSearching(false);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [activeBracket, fuse]);

  // Get search results
  const searchResults = useMemo(() => {
    if (!searchQuery || !fuse) return [];
    
    const results = fuse.search(searchQuery);
    return results.slice(0, 8).map(result => result.item);
  }, [searchQuery, fuse]);

  // Extract all complete bracket links from text
  const extractBracketLinks = useCallback((text: string): Array<{ text: string; start: number; end: number }> => {
    if (!BACKLINKS_ENABLED) return [];

    const results: Array<{ text: string; start: number; end: number }> = [];
    const regex = /\[\[([^\[\]]+)\]\]/g;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(text)) !== null) {
      const linkText = match[1].trim();
      if (linkText) {
        results.push({
          text: linkText,
          start: match.index,
          end: match.index + match[0].length
        });
      }
    }

    return results;
  }, []);

  // Navigate suggestions with keyboard
  const handleKeyNavigation = useCallback((e: KeyboardEvent) => {
    if (!activeBracket || searchResults.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % searchResults.length);
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => prev === 0 ? searchResults.length - 1 : prev - 1);
        break;
      case 'Escape':
        e.preventDefault();
        setActiveBracket(null);
        setSearchQuery('');
        break;
    }
  }, [activeBracket, searchResults.length]);

  return {
    // State
    activeBracket,
    searchResults,
    selectedIndex,
    isSearching: isSearching || isLoading,
    allNotes,
    
    // Functions
    detectBracketPattern,
    extractBracketLinks,
    setActiveBracket,
    setSelectedIndex,
    handleKeyNavigation,
    
    // Config
    isEnabled: BACKLINKS_ENABLED,
  };
}