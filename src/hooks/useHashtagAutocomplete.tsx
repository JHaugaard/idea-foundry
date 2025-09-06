import { useState, useEffect, useCallback, useMemo } from 'react';
import { useTags } from '@/hooks/useTags';

interface HashtagMatch {
  text: string;
  start: number;
  end: number;
  isComplete: boolean;
}

export function useHashtagAutocomplete(textContent: string) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeHashtag, setActiveHashtag] = useState<HashtagMatch | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isSearching, setIsSearching] = useState(false);

  const { tags: allTags, tagStats } = useTags();

  // Get frequent tags for suggestions
  const frequentTags = useMemo(() => {
    if (!tagStats) return [];
    return tagStats
      .sort((a, b) => b.count - a.count)
      .slice(0, 20)
      .map(stat => stat.tag);
  }, [tagStats]);

  // Detect hashtag patterns in text
  const detectHashtagPattern = useCallback((text: string, cursorPosition: number): HashtagMatch | null => {
    // Look for # pattern before cursor
    const beforeCursor = text.substring(0, cursorPosition);
    const lastHashIndex = beforeCursor.lastIndexOf('#');
    
    if (lastHashIndex === -1) return null;

    // Check if the # is at start of word (not preceded by alphanumeric)
    const charBeforeHash = lastHashIndex > 0 ? beforeCursor[lastHashIndex - 1] : ' ';
    if (/[a-zA-Z0-9]/.test(charBeforeHash)) return null;

    // Get text after the #
    const afterHash = beforeCursor.substring(lastHashIndex + 1);
    
    // Check if we have a word boundary after cursor or end of text
    const afterCursor = text.substring(cursorPosition);
    const nextWordBoundary = afterCursor.search(/[\s\n\r]|$/) + cursorPosition;
    
    // Make sure we don't have spaces or other # in the hashtag
    if (afterHash.includes(' ') || afterHash.includes('\n') || afterHash.includes('#')) {
      return null;
    }

    return {
      text: afterHash,
      start: lastHashIndex,
      end: nextWordBoundary,
      isComplete: false
    };
  }, []);

  // Debounced search functionality
  useEffect(() => {
    if (!activeHashtag) {
      setSearchQuery('');
      return;
    }

    const query = activeHashtag.text.trim();
    if (query.length < 1) {
      setSearchQuery('');
      return;
    }

    setIsSearching(true);
    const timeoutId = setTimeout(() => {
      setSearchQuery(query);
      setSelectedIndex(0);
      setIsSearching(false);
    }, 200);

    return () => clearTimeout(timeoutId);
  }, [activeHashtag]);

  // Get search results
  const searchResults = useMemo(() => {
    if (!searchQuery) {
      // Show most frequent tags when no query
      return frequentTags.slice(0, 8);
    }
    
    // Filter tags that start with or contain the query
    const filtered = allTags.filter(tag => 
      tag.toLowerCase().includes(searchQuery.toLowerCase())
    );
    
    // Sort by relevance (starts with query first, then contains)
    const sorted = filtered.sort((a, b) => {
      const aStarts = a.toLowerCase().startsWith(searchQuery.toLowerCase());
      const bStarts = b.toLowerCase().startsWith(searchQuery.toLowerCase());
      
      if (aStarts && !bStarts) return -1;
      if (!aStarts && bStarts) return 1;
      
      // If both start with query or neither does, sort by frequency
      const aCount = tagStats?.find(s => s.tag === a)?.count || 0;
      const bCount = tagStats?.find(s => s.tag === b)?.count || 0;
      return bCount - aCount;
    });
    
    return sorted.slice(0, 8);
  }, [searchQuery, allTags, frequentTags, tagStats]);

  // Extract all complete hashtags from text
  const extractHashtags = useCallback((text: string): Array<{ text: string; start: number; end: number }> => {
    const results: Array<{ text: string; start: number; end: number }> = [];
    const regex = /#([a-zA-Z][a-zA-Z0-9_-]*)/g;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(text)) !== null) {
      const tagText = match[1];
      if (tagText) {
        results.push({
          text: tagText,
          start: match.index,
          end: match.index + match[0].length
        });
      }
    }

    return results;
  }, []);

  // Navigate suggestions with keyboard
  const handleKeyNavigation = useCallback((e: KeyboardEvent) => {
    if (!activeHashtag || searchResults.length === 0) return;

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
        setActiveHashtag(null);
        setSearchQuery('');
        break;
    }
  }, [activeHashtag, searchResults.length]);

  return {
    // State
    activeHashtag,
    searchResults,
    selectedIndex,
    isSearching,
    
    // Functions
    detectHashtagPattern,
    extractHashtags,
    setActiveHashtag,
    setSelectedIndex,
    handleKeyNavigation,
  };
}