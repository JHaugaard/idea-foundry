import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Badge } from '@/components/ui/badge';
import { 
  ChevronDown, 
  ChevronRight, 
  Target,
  TrendingUp,
  Link2,
  Search
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { SearchResult } from '@/hooks/useEnhancedSearch';
import { EnhancedSearchResultCard } from './EnhancedSearchResultCard';

interface SearchResultsGroupProps {
  title: string;
  tier: 'exact' | 'high' | 'medium' | 'related';
  results: SearchResult[];
  maxVisible?: number;
  isOpen?: boolean;
  onNoteSelect?: (noteId: string) => void;
  highlightContent: (content: string, searchText: string) => string;
  searchText: string;
  className?: string;
}

export function SearchResultsGroup({
  title,
  tier,
  results,
  maxVisible = 5,
  isOpen = true,
  onNoteSelect,
  highlightContent,
  searchText,
  className
}: SearchResultsGroupProps) {
  const [isCollapsed, setIsCollapsed] = useState(!isOpen);
  const [showAll, setShowAll] = useState(false);

  if (results.length === 0) {
    return (
      <Card className={cn("border-muted", className)}>
        <CardContent className="p-8 text-center">
          <div className="flex flex-col items-center gap-3 text-muted-foreground">
            <Search className="h-8 w-8" />
            <div>
              <h3 className="font-medium text-sm">No {title.toLowerCase()} found</h3>
              <p className="text-xs mt-1">
                {tier === 'exact' && "Try different search terms for exact matches"}
                {tier === 'high' && "Adjust your query to find highly related content"}
                {tier === 'medium' && "Broaden your search for more related results"}
                {tier === 'related' && "Consider using more general keywords"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const visibleResults = showAll ? results : results.slice(0, maxVisible);
  const hasMore = results.length > maxVisible;

  const getTierIcon = (tier: string) => {
    switch (tier) {
      case 'exact': return Target;
      case 'high': return TrendingUp;
      case 'medium': return Link2;
      case 'related': return Search;
      default: return Search;
    }
  };

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'exact': return 'text-similarity-high';
      case 'high': return 'text-search-accent';
      case 'medium': return 'text-similarity-medium';
      case 'related': return 'text-similarity-low';
      default: return 'text-muted-foreground';
    }
  };

  const Icon = getTierIcon(tier);

  return (
    <Card className={cn("animate-fade-in", className)}>
      <Collapsible open={!isCollapsed} onOpenChange={setIsCollapsed}>
        <CollapsibleTrigger asChild>
          <CardHeader className="pb-2 hover:bg-muted/50 transition-colors cursor-pointer">
            <CardTitle className="text-base flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Icon className={cn("h-4 w-4", getTierColor(tier))} />
                <span>{title}</span>
                <Badge variant="outline" className="text-xs">
                  {results.length}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                {isCollapsed ? (
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
            </CardTitle>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="pt-0">
            <div className="space-y-3">
              {visibleResults.map((result, index) => (
                <div 
                  key={result.id}
                  className="animate-scale-in"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <EnhancedSearchResultCard
                    result={result}
                    onSelect={onNoteSelect}
                    highlightContent={highlightContent}
                    searchText={searchText}
                  />
                </div>
              ))}
              
              {hasMore && (
                <div className="pt-2 text-center">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowAll(!showAll)}
                    className="text-xs"
                  >
                    {showAll 
                      ? `Show less` 
                      : `Show ${results.length - maxVisible} more results`
                    }
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}