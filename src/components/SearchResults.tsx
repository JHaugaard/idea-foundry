import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useEnhancedSearch } from '@/hooks/useEnhancedSearch';
import { 
  Search,
  RefreshCw,
  AlertTriangle
} from 'lucide-react';
import { SearchResultsGroup } from './SearchResultsGroup';
import { SearchMetrics } from './SearchMetrics';

interface SearchResultsProps {
  onNoteSelect?: (noteId: string) => void;
  maxResults?: number;
  showEmptyState?: boolean;
}

export function SearchResults({ 
  onNoteSelect, 
  maxResults = 50,
  showEmptyState = true 
}: SearchResultsProps) {
  const { 
    searchResults, 
    isLoading, 
    isEnhancing, 
    searchQuery, 
    highlightContent 
  } = useEnhancedSearch();

  // Group results by tier
  const groupedResults = React.useMemo(() => {
    const groups = {
      exact: searchResults.filter(r => r.tier === 'exact'),
      high: searchResults.filter(r => r.tier === 'high'),
      medium: searchResults.filter(r => r.tier === 'medium'),
      related: searchResults.filter(r => r.tier === 'related'),
    };
    return groups;
  }, [searchResults]);

  // Calculate metrics
  const totalResults = searchResults.length;
  const semanticResults = searchResults.filter(r => 
    r.search_type === 'semantic' || r.search_type === 'hybrid'
  ).length;
  const hasSemanticSearch = searchQuery.text.trim().length > 0;
  const searchType = semanticResults > 0 ? 'hybrid' : 'fuzzy';

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="space-y-3">
                <div className="h-4 bg-muted rounded w-3/4"></div>
                <div className="h-3 bg-muted rounded w-full"></div>
                <div className="h-3 bg-muted rounded w-2/3"></div>
                <div className="flex gap-2">
                  <div className="h-5 bg-muted rounded w-16"></div>
                  <div className="h-5 bg-muted rounded w-20"></div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (searchResults.length === 0) {
    if (!showEmptyState) return null;
    
    return (
      <div className="space-y-4">
        {/* Show search metrics even with no results */}
        {searchQuery.text.trim() && (
          <SearchMetrics
            totalResults={0}
            totalNotes={0}
            notesWithEmbeddings={0}
            searchType={searchType}
          />
        )}
        
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Search className="h-16 w-16 text-muted-foreground mb-6" />
            <h3 className="text-xl font-medium mb-2">No results found</h3>
            <p className="text-muted-foreground mb-6 max-w-md">
              {searchQuery.text || searchQuery.filters.tags.length > 0
                ? "We couldn't find any notes matching your search criteria"
                : "Start searching to find your notes"}
            </p>
            
            {(searchQuery.text || searchQuery.filters.tags.length > 0) && (
              <div className="text-sm text-muted-foreground bg-muted/50 p-4 rounded-lg max-w-md">
                <p className="font-medium mb-2">Try these suggestions:</p>
                <ul className="text-left space-y-1">
                  <li>• Check your spelling</li>
                  <li>• Use different keywords</li>
                  <li>• Remove some filters</li>
                  <li>• Search for broader terms</li>
                  <li>• Enable semantic search for better matches</li>
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Enhancement indicator */}
      {isEnhancing && hasSemanticSearch && (
        <Card className="border-search-accent/50 bg-search-accent/5 animate-pulse-glow">
          <CardContent className="flex items-center gap-3 py-4">
            <div className="animate-spin">
              <RefreshCw className="h-4 w-4 text-search-accent" />
            </div>
            <span className="text-sm font-medium text-search-accent">
              Enhancing results with semantic analysis...
            </span>
          </CardContent>
        </Card>
      )}

      {/* Search Metrics */}
      <SearchMetrics
        totalResults={totalResults}
        totalNotes={100} // This should come from a notes count query
        notesWithEmbeddings={semanticResults}
        searchType={searchType}
        hasSemanticFallback={hasSemanticSearch && semanticResults === 0}
      />

      {/* Error state for semantic search failures */}
      {hasSemanticSearch && semanticResults === 0 && searchResults.length > 0 && (
        <Card className="border-orange-200 bg-orange-50/50">
          <CardContent className="flex items-center gap-3 py-4">
            <AlertTriangle className="h-4 w-4 text-orange-600" />
            <span className="text-sm text-orange-700">
              Semantic search unavailable - showing fuzzy results only
            </span>
            <Button variant="outline" size="sm" className="ml-auto">
              <RefreshCw className="h-3 w-3 mr-1" />
              Retry
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Grouped Results */}
      <div className="space-y-4">
        <SearchResultsGroup
          title="Exact Matches"
          tier="exact"
          results={groupedResults.exact}
          isOpen={true}
          onNoteSelect={onNoteSelect}
          highlightContent={highlightContent}
          searchText={searchQuery.text}
        />

        <SearchResultsGroup
          title="Highly Related"
          tier="high"
          results={groupedResults.high}
          isOpen={groupedResults.exact.length === 0}
          onNoteSelect={onNoteSelect}
          highlightContent={highlightContent}
          searchText={searchQuery.text}
        />

        <SearchResultsGroup
          title="Related Content"
          tier="medium"
          results={groupedResults.medium}
          isOpen={false}
          onNoteSelect={onNoteSelect}
          highlightContent={highlightContent}
          searchText={searchQuery.text}
        />

        <SearchResultsGroup
          title="Loosely Related"
          tier="related"
          results={groupedResults.related}
          isOpen={false}
          maxVisible={3}
          onNoteSelect={onNoteSelect}
          highlightContent={highlightContent}
          searchText={searchQuery.text}
        />
      </div>

      {/* Results summary */}
      {totalResults > maxResults && (
        <Card>
          <CardContent className="text-center py-4">
            <p className="text-sm text-muted-foreground">
              Showing top {maxResults} of {totalResults} results
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}