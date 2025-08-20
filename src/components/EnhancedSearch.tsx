import React, { useState, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { useEnhancedSearch } from '@/hooks/useEnhancedSearch';
import { 
  Search, 
  Hash, 
  Filter, 
  Clock, 
  Bookmark, 
  X, 
  Plus,
  Calendar,
  Tag as TagIcon,
  Minus
} from 'lucide-react';

interface EnhancedSearchProps {
  onNoteSelect?: (noteId: string) => void;
  compact?: boolean;
}

export function EnhancedSearch({ onNoteSelect, compact = false }: EnhancedSearchProps) {
  const {
    searchQuery,
    updateSearchQuery,
    searchResults,
    isLoading,
    savedSearches,
    recentSearches,
    getTagSuggestions,
    highlightContent,
  } = useEnhancedSearch();

  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const [tagSuggestions, setTagSuggestions] = useState<string[]>([]);

  // Update input value when search query changes
  useEffect(() => {
    setInputValue(searchQuery.text);
  }, [searchQuery.text]);

  // Handle input change and show suggestions
  const handleInputChange = (value: string) => {
    setInputValue(value);
    
    // Detect tag-first search mode
    const isTagMode = value.startsWith('#');
    const searchText = isTagMode ? value.slice(1) : value;
    
    if (isTagMode) {
      setTagSuggestions(getTagSuggestions(searchText));
      setShowSuggestions(true);
    } else {
      setShowSuggestions(false);
    }

    // Update search query
    updateSearchQuery({
      ...searchQuery,
      text: value,
      mode: isTagMode ? 'tags' : 'combined'
    });
  };

  // Handle tag selection
  const handleTagSelect = (tag: string) => {
    const isIncluded = searchQuery.filters.tags.includes(tag);
    const newTags = isIncluded 
      ? searchQuery.filters.tags.filter(t => t !== tag)
      : [...searchQuery.filters.tags, tag];

    updateSearchQuery({
      ...searchQuery,
      filters: {
        ...searchQuery.filters,
        tags: newTags
      }
    });
  };

  // Handle exclude tag
  const handleExcludeTag = (tag: string) => {
    const isExcluded = searchQuery.filters.excludeTags.includes(tag);
    const newExcludeTags = isExcluded
      ? searchQuery.filters.excludeTags.filter(t => t !== tag)
      : [...searchQuery.filters.excludeTags, tag];

    updateSearchQuery({
      ...searchQuery,
      filters: {
        ...searchQuery.filters,
        excludeTags: newExcludeTags
      }
    });
  };

  // Load saved search
  const loadSavedSearch = (savedSearch: any) => {
    updateSearchQuery(savedSearch.query);
    setShowSuggestions(false);
  };

  if (compact) {
    return (
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          ref={inputRef}
          placeholder="Search notes... (start with # for tags)"
          value={inputValue}
          onChange={(e) => handleInputChange(e.target.value)}
          className="pl-10 pr-10"
        />
        {searchQuery.filters.tags.length > 0 && (
          <Badge variant="secondary" className="absolute right-2 top-1/2 transform -translate-y-1/2 text-xs">
            {searchQuery.filters.tags.length}
          </Badge>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search Input */}
      <div className="relative">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            ref={inputRef}
            placeholder="Search notes... (start with # for tags)"
            value={inputValue}
            onChange={(e) => handleInputChange(e.target.value)}
            onFocus={() => setShowSuggestions(!!inputValue.startsWith('#'))}
            className="pl-10 pr-20"
          />
          <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className={`h-7 px-2 ${showFilters ? 'bg-muted' : ''}`}
            >
              <Filter className="h-3 w-3" />
            </Button>
          </div>
        </div>

        {/* Tag Suggestions */}
        {showSuggestions && tagSuggestions.length > 0 && (
          <Card className="absolute top-full left-0 right-0 z-50 mt-1">
            <CardContent className="p-2">
              <div className="flex flex-wrap gap-1">
                {tagSuggestions.map((tag) => (
                  <Button
                    key={tag}
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setInputValue(`#${tag}`);
                      handleInputChange(`#${tag}`);
                      setShowSuggestions(false);
                    }}
                    className="h-7 px-2 text-xs"
                  >
                    <Hash className="h-3 w-3 mr-1" />
                    {tag}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Active Filters */}
      {(searchQuery.filters.tags.length > 0 || searchQuery.filters.excludeTags.length > 0) && (
        <div className="flex flex-wrap gap-2">
          {searchQuery.filters.tags.map((tag) => (
            <Badge key={tag} variant="default" className="gap-1">
              <TagIcon className="h-3 w-3" />
              {tag}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleTagSelect(tag)}
                className="h-auto p-0 ml-1 hover:bg-transparent"
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          ))}
          {searchQuery.filters.excludeTags.map((tag) => (
            <Badge key={tag} variant="destructive" className="gap-1">
              <Minus className="h-3 w-3" />
              {tag}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleExcludeTag(tag)}
                className="h-auto p-0 ml-1 hover:bg-transparent text-destructive-foreground"
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          ))}
        </div>
      )}

      {/* Advanced Filters */}
      {showFilters && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Advanced Filters</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Date Range */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Date Range</label>
              <div className="flex gap-2">
                <Input
                  type="date"
                  value={searchQuery.filters.dateRange?.start.toISOString().split('T')[0] || ''}
                  onChange={(e) => {
                    const start = e.target.value ? new Date(e.target.value) : undefined;
                    updateSearchQuery({
                      ...searchQuery,
                      filters: {
                        ...searchQuery.filters,
                        dateRange: start && searchQuery.filters.dateRange?.end ? {
                          start,
                          end: searchQuery.filters.dateRange.end
                        } : undefined
                      }
                    });
                  }}
                  className="text-xs"
                />
                <Input
                  type="date"
                  value={searchQuery.filters.dateRange?.end.toISOString().split('T')[0] || ''}
                  onChange={(e) => {
                    const end = e.target.value ? new Date(e.target.value) : undefined;
                    updateSearchQuery({
                      ...searchQuery,
                      filters: {
                        ...searchQuery.filters,
                        dateRange: end && searchQuery.filters.dateRange?.start ? {
                          start: searchQuery.filters.dateRange.start,
                          end
                        } : undefined
                      }
                    });
                  }}
                  className="text-xs"
                />
              </div>
            </div>

            {/* Category Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Category</label>
              <div className="flex gap-2">
                {['personal', 'work', 'research'].map((category) => (
                  <Button
                    key={category}
                    variant={searchQuery.filters.category === category ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => {
                      updateSearchQuery({
                        ...searchQuery,
                        filters: {
                          ...searchQuery.filters,
                          category: searchQuery.filters.category === category ? undefined : category as any
                        }
                      });
                    }}
                    className="text-xs capitalize"
                  >
                    {category}
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Access */}
      {(savedSearches.length > 0 || recentSearches.length > 0) && (
        <div className="flex gap-4">
          {/* Saved Searches */}
          {savedSearches.length > 0 && (
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <Bookmark className="h-4 w-4" />
                  Saved ({savedSearches.length})
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80">
                <div className="space-y-2">
                  <h4 className="font-medium text-sm">Saved Searches</h4>
                  <ScrollArea className="h-32">
                    {savedSearches.map((search: any) => (
                      <Button
                        key={search.id}
                        variant="ghost"
                        size="sm"
                        onClick={() => loadSavedSearch(search)}
                        className="w-full justify-start text-xs"
                      >
                        {search.name}
                      </Button>
                    ))}
                  </ScrollArea>
                </div>
              </PopoverContent>
            </Popover>
          )}

          {/* Recent Searches */}
          {recentSearches.length > 0 && (
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <Clock className="h-4 w-4" />
                  Recent ({recentSearches.length})
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80">
                <div className="space-y-2">
                  <h4 className="font-medium text-sm">Recent Searches</h4>
                  <ScrollArea className="h-32">
                    {recentSearches.map((search, index) => (
                      <Button
                        key={index}
                        variant="ghost"
                        size="sm"
                        onClick={() => updateSearchQuery(search)}
                        className="w-full justify-start text-xs"
                      >
                        {search.text || `${search.filters.tags.length} tags`}
                      </Button>
                    ))}
                  </ScrollArea>
                </div>
              </PopoverContent>
            </Popover>
          )}
        </div>
      )}

      {/* Search Results Summary */}
      {searchResults.length > 0 && (
        <div className="text-sm text-muted-foreground">
          Found {searchResults.length} result{searchResults.length !== 1 ? 's' : ''}
          {searchQuery.text && ` for "${searchQuery.text}"`}
        </div>
      )}
    </div>
  );
}