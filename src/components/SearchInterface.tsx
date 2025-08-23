import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { EnhancedSearch } from '@/components/EnhancedSearch';
import { SearchResults } from '@/components/SearchResults';
import { TagFilterSidebar } from '@/components/TagFilterSidebar';
import { AdvancedSearchBuilder } from '@/components/AdvancedSearchBuilder';
import LinkSearchInterface from '@/components/LinkSearchInterface';
import LinkSearchResults from '@/components/LinkSearchResults';
import { useEnhancedSearch } from '@/hooks/useEnhancedSearch';
import { 
  Search, 
  SidebarClose, 
  SidebarOpen, 
  Settings, 
  LayoutGrid,
  List,
  ArrowUpDown,
  Network,
  Zap
} from 'lucide-react';

interface SearchInterfaceProps {
  currentNoteId?: string;
  onNoteSelect?: (noteId: string) => void;
}

export function SearchInterface({ currentNoteId, onNoteSelect }: SearchInterfaceProps) {
  const [showSidebar, setShowSidebar] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [sortBy, setSortBy] = useState<'relevance' | 'date' | 'title'>('relevance');
  const [searchMode, setSearchMode] = useState<'standard' | 'links'>('standard');
  
  const { searchResults, searchQuery } = useEnhancedSearch();

  const hasActiveSearch = Boolean(
    searchQuery.text.trim() || 
    searchQuery.filters.tags.length > 0 || 
    searchQuery.filters.excludeTags.length > 0 ||
    searchQuery.filters.dateRange ||
    searchQuery.filters.category ||
    searchQuery.filters.isPinned !== undefined
  );

  return (
    <div className="flex gap-6 h-full">
      {/* Sidebar */}
      {showSidebar && (
        <div className="w-80 flex-shrink-0">
          <TagFilterSidebar />
        </div>
      )}

      {/* Main Search Area */}
      <div className="flex-1 min-w-0 space-y-6">
        {/* Search Header */}
        <Card>
          <CardContent className="p-4">
            <div className="space-y-4">
              {/* Search Mode Toggle */}
              <div className="flex items-center gap-2">
                <Button
                  variant={searchMode === 'standard' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSearchMode('standard')}
                  className="gap-2"
                >
                  <Search className="h-4 w-4" />
                  Standard Search
                </Button>
                <Button
                  variant={searchMode === 'links' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSearchMode('links')}
                  className="gap-2"
                >
                  <Network className="h-4 w-4" />
                  Link-Enhanced Search
                </Button>
                {currentNoteId && (
                  <Badge variant="secondary" className="text-xs">
                    Current note context available
                  </Badge>
                )}
              </div>
              
              {/* Search Input */}
              {searchMode === 'standard' ? (
                <EnhancedSearch onNoteSelect={onNoteSelect} />
              ) : (
                <div className="space-y-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input
                      placeholder="Search with links... (# for tags)"
                      className="w-full pl-10 pr-4 py-2 border rounded-md"
                    />
                  </div>
                  <p className="text-sm text-muted-foreground">Link-enhanced search coming soon...</p>
                </div>
              )}
              
              {/* Search Controls */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowSidebar(!showSidebar)}
                    className="gap-2"
                  >
                    {showSidebar ? (
                      <SidebarClose className="h-4 w-4" />
                    ) : (
                      <SidebarOpen className="h-4 w-4" />
                    )}
                    {showSidebar ? 'Hide' : 'Show'} Filters
                  </Button>
                  
                  <AdvancedSearchBuilder />
                </div>

                <div className="flex items-center gap-2">
                  {/* Sort Options */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const options = ['relevance', 'date', 'title'] as const;
                      const currentIndex = options.indexOf(sortBy);
                      setSortBy(options[(currentIndex + 1) % options.length]);
                    }}
                    className="gap-2"
                  >
                    <ArrowUpDown className="h-4 w-4" />
                    Sort: {sortBy}
                  </Button>

                  {/* View Mode */}
                  <div className="flex border rounded-md">
                    <Button
                      variant={viewMode === 'list' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setViewMode('list')}
                      className="px-2 rounded-r-none"
                    >
                      <List className="h-4 w-4" />
                    </Button>
                    <Button
                      variant={viewMode === 'grid' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setViewMode('grid')}
                      className="px-2 rounded-l-none border-l"
                    >
                      <LayoutGrid className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Search Summary */}
        {hasActiveSearch && (
          <Card>
            <CardContent className="p-3">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-4">
                  <span className="text-muted-foreground">
                    {searchResults.length} result{searchResults.length !== 1 ? 's' : ''}
                  </span>
                  
                  {searchQuery.text && (
                    <div className="flex items-center gap-1">
                      <span className="text-muted-foreground">for</span>
                      <Badge variant="outline">"{searchQuery.text}"</Badge>
                    </div>
                  )}
                  
                  {searchQuery.filters.tags.length > 0 && (
                    <div className="flex items-center gap-1">
                      <span className="text-muted-foreground">with tags</span>
                      <div className="flex gap-1">
                        {searchQuery.filters.tags.slice(0, 3).map(tag => (
                          <Badge key={tag} variant="default" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                        {searchQuery.filters.tags.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{searchQuery.filters.tags.length - 3}
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {searchQuery.filters.excludeTags.length > 0 && (
                    <div className="flex items-center gap-1">
                      <span className="text-muted-foreground">excluding</span>
                      <div className="flex gap-1">
                        {searchQuery.filters.excludeTags.slice(0, 2).map(tag => (
                          <Badge key={tag} variant="destructive" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                        {searchQuery.filters.excludeTags.length > 2 && (
                          <Badge variant="outline" className="text-xs">
                            +{searchQuery.filters.excludeTags.length - 2}
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}
                </div>
                
                <Badge variant="outline" className="text-xs">
                  Sorted by {sortBy}
                </Badge>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Search Results */}
        <div className={viewMode === 'grid' ? 'grid grid-cols-2 gap-4' : 'space-y-4'}>
          {searchMode === 'standard' ? (
            <SearchResults 
              onNoteSelect={onNoteSelect}
              maxResults={viewMode === 'grid' ? 20 : 50}
              showEmptyState={hasActiveSearch}
            />
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Network className="h-8 w-8 mx-auto mb-2" />
              <p>Link-enhanced search results coming soon...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}