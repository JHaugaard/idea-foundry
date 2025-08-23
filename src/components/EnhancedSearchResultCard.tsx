import React from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  ExternalLink,
  Copy,
  Search,
  Calendar,
  Clock,
  FileText,
  Pin,
  Tag as TagIcon,
  Zap
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { SearchResult } from '@/hooks/useEnhancedSearch';
import { SimilarityBadge } from './SimilarityBadge';

interface EnhancedSearchResultCardProps {
  result: SearchResult;
  onSelect?: (noteId: string) => void;
  highlightContent: (content: string, searchText: string) => string;
  searchText: string;
  className?: string;
}

export function EnhancedSearchResultCard({ 
  result, 
  onSelect, 
  highlightContent, 
  searchText,
  className 
}: EnhancedSearchResultCardProps) {
  const handleClick = () => {
    if (onSelect) {
      onSelect(result.id);
    } else {
      window.location.href = `/notes/${result.slug}`;
    }
  };

  const handleCopyLink = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const url = `${window.location.origin}/notes/${result.slug}`;
    await navigator.clipboard.writeText(url);
  };

  const handleFindSimilar = (e: React.MouseEvent) => {
    e.stopPropagation();
    // This would trigger a search for similar content
    console.log('Find similar to:', result.id);
  };

  // Content preview with highlighting
  const contentPreview = result.content?.length > 150 
    ? result.content.substring(0, 150) + '...'
    : result.content || '';
  
  const highlightedTitle = highlightContent(result.title, searchText);
  const highlightedPreview = highlightContent(contentPreview, searchText);
  
  // Word count estimation
  const wordCount = result.content ? result.content.split(/\s+/).length : 0;
  
  // Why this matched explanation
  const getMatchReason = () => {
    const reasons = [];
    
    if (result.matchedTags.length > 0) {
      reasons.push(`Tags: ${result.matchedTags.slice(0, 2).join(', ')}`);
    }
    
    if (result.similarity_score && result.similarity_score > 0.7) {
      reasons.push('High semantic similarity');
    }
    
    if (result.title.toLowerCase().includes(searchText.toLowerCase())) {
      reasons.push('Title match');
    }
    
    return reasons.length > 0 ? reasons.join(' • ') : 'Content similarity';
  };

  return (
    <Card 
      className={cn(
        "hover:shadow-md transition-all duration-200 cursor-pointer group hover:border-search-accent/50",
        className
      )} 
      onClick={handleClick}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            {/* Title with highlighting */}
            <h3 
              className="font-medium text-base mb-2 group-hover:text-search-accent transition-colors"
              dangerouslySetInnerHTML={{ __html: highlightedTitle }}
            />
            
            {/* Metadata row */}
            <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground mb-2">
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {formatDistanceToNow(new Date(result.updated_at), { addSuffix: true })}
              </span>
              
              <span className="flex items-center gap-1">
                <FileText className="h-3 w-3" />
                {result.category_type}
              </span>
              
              {wordCount > 0 && (
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  ~{Math.ceil(wordCount / 200)} min read
                </span>
              )}
              
              {result.pinned && (
                <span className="flex items-center gap-1 text-yellow-600">
                  <Pin className="h-3 w-3" />
                  Pinned
                </span>
              )}
            </div>
            
            {/* Why this matched */}
            <div className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
              <Zap className="h-3 w-3" />
              <span>{getMatchReason()}</span>
            </div>
          </div>

          {/* Similarity score and actions */}
          <div className="flex flex-col items-end gap-2 flex-shrink-0">
            {result.similarity_score && (
              <SimilarityBadge score={result.similarity_score} />
            )}
            
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-7 w-7 p-0"
                      onClick={handleCopyLink}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Copy link</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-7 w-7 p-0"
                      onClick={handleFindSimilar}
                    >
                      <Search className="h-3 w-3" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Find similar</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                      <ExternalLink className="h-3 w-3" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Open note</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        {/* Content Preview with highlighting */}
        {contentPreview && (
          <div 
            className="text-sm text-muted-foreground mb-3 line-clamp-2 bg-search-highlight/10 p-3 rounded-md"
            dangerouslySetInnerHTML={{ __html: highlightedPreview }}
          />
        )}
        
        {/* Tags */}
        {result.tags && result.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {result.tags.slice(0, 6).map((tag) => (
              <Badge 
                key={tag} 
                variant={result.matchedTags.includes(tag) ? "default" : "secondary"}
                className={cn(
                  "text-xs gap-1",
                  result.matchedTags.includes(tag) && "animate-pulse-glow"
                )}
              >
                <TagIcon className="h-2 w-2" />
                {tag}
              </Badge>
            ))}
            {result.tags.length > 6 && (
              <Badge variant="outline" className="text-xs">
                +{result.tags.length - 6} more
              </Badge>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}