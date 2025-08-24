import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Search, 
  Clock, 
  TrendingUp, 
  Hash, 
  Calendar,
  Users,
  FileText,
  ArrowRight
} from 'lucide-react';

interface SearchSuggestionsProps {
  query: string;
  onSuggestionSelect: (suggestion: string) => void;
  onClose: () => void;
  isVisible: boolean;
}

interface Suggestion {
  text: string;
  type: 'recent' | 'popular' | 'expansion' | 'temporal' | 'entity';
  icon: React.ReactNode;
  description?: string;
}

export function SearchSuggestions({ query, onSuggestionSelect, onClose, isVisible }: SearchSuggestionsProps) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isVisible || !query.trim()) {
      setSuggestions([]);
      return;
    }

    generateSuggestions(query);
  }, [query, isVisible]);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isVisible) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isVisible, onClose]);

  const generateSuggestions = (searchQuery: string) => {
    const newSuggestions: Suggestion[] = [];
    
    // Recent searches from localStorage
    const recentSearches = getRecentSearches();
    const matchingRecent = recentSearches
      .filter(search => search.toLowerCase().includes(searchQuery.toLowerCase()))
      .slice(0, 3);
    
    matchingRecent.forEach(search => {
      newSuggestions.push({
        text: search,
        type: 'recent',
        icon: <Clock className="h-3 w-3" />,
        description: 'Recent search'
      });
    });

    // Query expansions based on common terms
    const expansions = getQueryExpansions(searchQuery);
    expansions.forEach(expansion => {
      newSuggestions.push({
        text: expansion,
        type: 'expansion',
        icon: <ArrowRight className="h-3 w-3" />,
        description: 'Related terms'
      });
    });

    // Temporal suggestions
    const temporalSuggestions = getTemporalSuggestions(searchQuery);
    temporalSuggestions.forEach(suggestion => {
      newSuggestions.push({
        text: suggestion,
        type: 'temporal',
        icon: <Calendar className="h-3 w-3" />,
        description: 'Time-based search'
      });
    });

    // Entity suggestions
    const entitySuggestions = getEntitySuggestions(searchQuery);
    entitySuggestions.forEach(suggestion => {
      newSuggestions.push({
        text: suggestion,
        type: 'entity',
        icon: <Users className="h-3 w-3" />,
        description: 'People or projects'
      });
    });

    // Popular searches
    const popularSuggestions = getPopularSuggestions(searchQuery);
    popularSuggestions.forEach(suggestion => {
      newSuggestions.push({
        text: suggestion,
        type: 'popular',
        icon: <TrendingUp className="h-3 w-3" />,
        description: 'Popular search'
      });
    });

    setSuggestions(newSuggestions.slice(0, 8));
  };

  const getRecentSearches = (): string[] => {
    try {
      const recent = localStorage.getItem('recent-searches');
      return recent ? JSON.parse(recent) : [];
    } catch {
      return [];
    }
  };

  const getQueryExpansions = (query: string): string[] => {
    const expansionMap: Record<string, string[]> = {
      'marketing': ['advertising', 'campaigns', 'promotion', 'branding'],
      'project': ['task', 'milestone', 'deadline', 'planning'],
      'meeting': ['discussion', 'agenda', 'notes', 'minutes'],
      'design': ['ui', 'ux', 'mockup', 'wireframe'],
      'code': ['programming', 'development', 'bug', 'feature'],
      'research': ['analysis', 'study', 'investigation', 'findings'],
      'finance': ['budget', 'cost', 'expense', 'revenue'],
      'team': ['collaboration', 'member', 'role', 'responsibility']
    };

    const lowerQuery = query.toLowerCase();
    const expansions: string[] = [];

    Object.entries(expansionMap).forEach(([key, values]) => {
      if (key.includes(lowerQuery) || lowerQuery.includes(key)) {
        values.forEach(value => {
          if (!value.includes(lowerQuery)) {
            expansions.push(`${query} ${value}`);
          }
        });
      }
    });

    return expansions.slice(0, 2);
  };

  const getTemporalSuggestions = (query: string): string[] => {
    const temporalPatterns = [
      'last week',
      'this month',
      'yesterday',
      'recent',
      'today',
      'last month'
    ];

    if (query.length < 3) return [];

    return temporalPatterns
      .filter(pattern => !query.toLowerCase().includes(pattern))
      .map(pattern => `${query} from ${pattern}`)
      .slice(0, 2);
  };

  const getEntitySuggestions = (query: string): string[] => {
    // This would typically come from your notes data
    const commonEntities = [
      'project alpha',
      'john smith',
      'quarterly review',
      'team meeting',
      'client feedback'
    ];

    return commonEntities
      .filter(entity => entity.toLowerCase().includes(query.toLowerCase()) && entity !== query)
      .slice(0, 2);
  };

  const getPopularSuggestions = (query: string): string[] => {
    // This would come from analytics data
    const popularSearches = [
      'meeting notes',
      'project updates',
      'task list',
      'weekly review',
      'team goals'
    ];

    return popularSearches
      .filter(search => search.toLowerCase().includes(query.toLowerCase()) && search !== query)
      .slice(0, 2);
  };

  const handleSuggestionClick = (suggestion: Suggestion) => {
    // Store in recent searches
    const recentSearches = getRecentSearches();
    const updatedRecent = [suggestion.text, ...recentSearches.filter(s => s !== suggestion.text)].slice(0, 10);
    localStorage.setItem('recent-searches', JSON.stringify(updatedRecent));

    onSuggestionSelect(suggestion.text);
    onClose();
  };

  if (!isVisible || suggestions.length === 0) {
    return null;
  }

  return (
    <Card ref={containerRef} className="absolute top-full left-0 right-0 z-50 mt-1 shadow-lg border">
      <CardContent className="p-0">
        <ScrollArea className="max-h-64">
          <div className="py-2">
            {suggestions.map((suggestion, index) => (
              <div key={index}>
                <Button
                  variant="ghost"
                  onClick={() => handleSuggestionClick(suggestion)}
                  className="w-full justify-start px-3 py-2 h-auto hover:bg-muted/50"
                >
                  <div className="flex items-center gap-3 w-full">
                    <div className="flex-shrink-0 text-muted-foreground">
                      {suggestion.icon}
                    </div>
                    <div className="flex-1 text-left">
                      <div className="text-sm">{suggestion.text}</div>
                      {suggestion.description && (
                        <div className="text-xs text-muted-foreground">{suggestion.description}</div>
                      )}
                    </div>
                    <Badge 
                      variant="secondary" 
                      className="text-xs capitalize flex-shrink-0"
                    >
                      {suggestion.type}
                    </Badge>
                  </div>
                </Button>
                {index < suggestions.length - 1 && (
                  <Separator className="mx-3" />
                )}
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}