import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useEnhancedSearch, SearchResult } from '@/hooks/useEnhancedSearch';
import { formatDistanceToNow } from 'date-fns';
import { 
  FileText, 
  Calendar, 
  Tag as TagIcon, 
  Pin, 
  ExternalLink,
  Search
} from 'lucide-react';

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
  const { searchResults, isLoading, searchQuery, highlightContent } = useEnhancedSearch();

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-4">
              <div className="space-y-2">
                <div className="h-4 bg-muted rounded w-3/4"></div>
                <div className="h-3 bg-muted rounded w-full"></div>
                <div className="h-3 bg-muted rounded w-2/3"></div>
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
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <Search className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">No results found</h3>
          <p className="text-muted-foreground mb-4">
            {searchQuery.text || searchQuery.filters.tags.length > 0
              ? "Try adjusting your search terms or filters"
              : "Start searching to find your notes"}
          </p>
          {(searchQuery.text || searchQuery.filters.tags.length > 0) && (
            <div className="text-sm text-muted-foreground">
              <p className="mb-2">Suggestions:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Check your spelling</li>
                <li>Try different keywords</li>
                <li>Remove some filters</li>
                <li>Search for broader terms</li>
              </ul>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  const displayResults = searchResults.slice(0, maxResults);

  return (
    <div className="space-y-4">
      {displayResults.map((result) => (
        <SearchResultCard
          key={result.id}
          result={result}
          onSelect={onNoteSelect}
          highlightContent={highlightContent}
          searchText={searchQuery.text}
        />
      ))}
      
      {searchResults.length > maxResults && (
        <Card>
          <CardContent className="text-center py-4">
            <p className="text-sm text-muted-foreground">
              Showing {maxResults} of {searchResults.length} results
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

interface SearchResultCardProps {
  result: SearchResult;
  onSelect?: (noteId: string) => void;
  highlightContent: (content: string, searchText: string) => string;
  searchText: string;
}

function SearchResultCard({ result, onSelect, highlightContent, searchText }: SearchResultCardProps) {
  const handleClick = () => {
    if (onSelect) {
      onSelect(result.id);
    } else {
      // Navigate to note (could be handled by router)
      window.location.href = `/notes/${result.slug}`;
    }
  };

  // Prepare content preview
  const contentPreview = result.content?.length > 200 
    ? result.content.substring(0, 200) + '...'
    : result.content || '';

  // Highlight matched content
  const highlightedTitle = highlightContent(result.title, searchText);
  const highlightedPreview = highlightContent(contentPreview, searchText);

  return (
    <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={handleClick}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle 
              className="text-base mb-1 flex items-center gap-2"
              dangerouslySetInnerHTML={{ __html: highlightedTitle }}
            />
            <CardDescription className="flex items-center gap-4 text-xs">
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {formatDistanceToNow(new Date(result.updated_at), { addSuffix: true })}
              </span>
              <span className="flex items-center gap-1">
                <FileText className="h-3 w-3" />
                {result.category_type}
              </span>
              {result.pinned && (
                <span className="flex items-center gap-1 text-yellow-600">
                  <Pin className="h-3 w-3" />
                  Pinned
                </span>
              )}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {result.score && (
              <Badge variant="outline" className="text-xs">
                {Math.round(result.score * 100)}%
              </Badge>
            )}
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
              <ExternalLink className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        {/* Content Preview */}
        {contentPreview && (
          <div 
            className="text-sm text-muted-foreground mb-3 line-clamp-2"
            dangerouslySetInnerHTML={{ __html: highlightedPreview }}
          />
        )}
        
        {/* Tags */}
        {result.tags && result.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {result.tags.map((tag) => (
              <Badge 
                key={tag} 
                variant={result.matchedTags.includes(tag) ? "default" : "secondary"}
                className="text-xs gap-1"
              >
                <TagIcon className="h-2 w-2" />
                {tag}
              </Badge>
            ))}
          </div>
        )}
        
        {/* Matched tags highlight */}
        {result.matchedTags.length > 0 && (
          <div className="text-xs text-muted-foreground">
            Matched tags: {result.matchedTags.join(', ')}
          </div>
        )}
      </CardContent>
    </Card>
  );
}