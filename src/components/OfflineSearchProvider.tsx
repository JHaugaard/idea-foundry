import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { SearchResult } from '@/hooks/useEnhancedSearch';
import { useToast } from '@/components/ui/use-toast';

interface OfflineSearchContextType {
  isOffline: boolean;
  cachedResults: SearchResult[];
  addToCache: (query: string, results: SearchResult[]) => void;
  searchCache: (query: string) => SearchResult[] | null;
  clearCache: () => void;
  cacheSize: number;
}

const OfflineSearchContext = createContext<OfflineSearchContextType | undefined>(undefined);

interface OfflineSearchProviderProps {
  children: ReactNode;
  maxCacheSize?: number;
}

interface CachedSearch {
  query: string;
  results: SearchResult[];
  timestamp: number;
  expiresAt: number;
}

export function OfflineSearchProvider({ 
  children, 
  maxCacheSize = 50 
}: OfflineSearchProviderProps) {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [searchCache, setSearchCache] = useState<Map<string, CachedSearch>>(new Map());
  const { toast } = useToast();

  // Cache expiry time (5 minutes)
  const CACHE_EXPIRY = 5 * 60 * 1000;

  useEffect(() => {
    // Load cache from localStorage on mount
    try {
      const savedCache = localStorage.getItem('search-cache');
      if (savedCache) {
        const parsed = JSON.parse(savedCache) as Array<[string, CachedSearch]>;
        const now = Date.now();
        
        // Filter out expired entries
        const validEntries = parsed.filter(([, cached]) => cached.expiresAt > now);
        setSearchCache(new Map(validEntries));
      }
    } catch (error) {
      console.warn('Failed to load search cache:', error);
    }

    // Set up online/offline event listeners
    const handleOnline = () => {
      setIsOffline(false);
      toast({
        title: "Back online",
        description: "Search functionality has been restored.",
      });
    };

    const handleOffline = () => {
      setIsOffline(true);
      toast({
        title: "You're offline",
        description: "Showing cached search results only.",
        variant: "destructive"
      });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [toast]);

  // Save cache to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem('search-cache', JSON.stringify([...searchCache]));
    } catch (error) {
      console.warn('Failed to save search cache:', error);
    }
  }, [searchCache]);

  const addToCache = (query: string, results: SearchResult[]) => {
    const normalizedQuery = query.toLowerCase().trim();
    if (!normalizedQuery || results.length === 0) return;

    const now = Date.now();
    const cached: CachedSearch = {
      query: normalizedQuery,
      results,
      timestamp: now,
      expiresAt: now + CACHE_EXPIRY
    };

    setSearchCache(prev => {
      const newCache = new Map(prev);
      
      // Add new entry
      newCache.set(normalizedQuery, cached);
      
      // Ensure cache doesn't exceed max size
      if (newCache.size > maxCacheSize) {
        // Remove oldest entries
        const entries = [...newCache.entries()].sort((a, b) => a[1].timestamp - b[1].timestamp);
        const toRemove = entries.slice(0, newCache.size - maxCacheSize);
        toRemove.forEach(([key]) => newCache.delete(key));
      }
      
      return newCache;
    });
  };

  const searchCacheForQuery = (query: string): SearchResult[] | null => {
    const normalizedQuery = query.toLowerCase().trim();
    if (!normalizedQuery) return null;

    // Clean up expired entries
    const now = Date.now();
    setSearchCache(prev => {
      const newCache = new Map(prev);
      for (const [key, cached] of newCache.entries()) {
        if (cached.expiresAt <= now) {
          newCache.delete(key);
        }
      }
      return newCache;
    });

    // Look for exact match first
    const exactMatch = searchCache.get(normalizedQuery);
    if (exactMatch && exactMatch.expiresAt > now) {
      return exactMatch.results;
    }

    // Look for partial matches
    for (const [cachedQuery, cached] of searchCache.entries()) {
      if (cached.expiresAt > now && 
          (cachedQuery.includes(normalizedQuery) || normalizedQuery.includes(cachedQuery))) {
        // Filter results to better match the current query
        const filteredResults = cached.results.filter(result => 
          result.title.toLowerCase().includes(normalizedQuery) ||
          result.content.toLowerCase().includes(normalizedQuery) ||
          result.tags?.some(tag => tag.toLowerCase().includes(normalizedQuery))
        );
        
        if (filteredResults.length > 0) {
          return filteredResults;
        }
      }
    }

    return null;
  };

  const clearCache = () => {
    setSearchCache(new Map());
    localStorage.removeItem('search-cache');
    toast({
      title: "Cache cleared",
      description: "All cached search results have been removed.",
    });
  };

  const getAllCachedResults = (): SearchResult[] => {
    const allResults: SearchResult[] = [];
    const now = Date.now();
    
    for (const cached of searchCache.values()) {
      if (cached.expiresAt > now) {
        allResults.push(...cached.results);
      }
    }
    
    // Remove duplicates based on ID
    const uniqueResults = allResults.filter((result, index, arr) => 
      arr.findIndex(r => r.id === result.id) === index
    );
    
    return uniqueResults;
  };

  const contextValue: OfflineSearchContextType = {
    isOffline,
    cachedResults: getAllCachedResults(),
    addToCache,
    searchCache: searchCacheForQuery,
    clearCache,
    cacheSize: searchCache.size
  };

  return (
    <OfflineSearchContext.Provider value={contextValue}>
      {children}
    </OfflineSearchContext.Provider>
  );
}

export function useOfflineSearch() {
  const context = useContext(OfflineSearchContext);
  if (context === undefined) {
    throw new Error('useOfflineSearch must be used within an OfflineSearchProvider');
  }
  return context;
}