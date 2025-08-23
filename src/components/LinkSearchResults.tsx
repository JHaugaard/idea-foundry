import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useEnhancedSearchWithLinks, EnhancedSearchResult } from '@/hooks/useEnhancedSearchWithLinks';
import { formatDistanceToNow } from 'date-fns';
import { 
  FileText, 
  Calendar, 
  Tag as TagIcon, 
  Pin, 
  ExternalLink,
  Search,
  Network,
  Link,
  ArrowRight,
  ArrowLeft,
  GitBranch,
  ChevronDown,
  ChevronRight,
  Download,
  Share
} from 'lucide-react';

interface LinkSearchResultsProps {
  currentNoteId?: string;
  onNoteSelect?: (noteId: string) => void;
  maxResults?: number;
  showEmptyState?: boolean;
  showExportOptions?: boolean;
}

export default function LinkSearchResults({ 
  currentNoteId,
  onNoteSelect, 
  maxResults = 50,
  showEmptyState = true,
  showExportOptions = false
}: LinkSearchResultsProps) {
  const { searchResults, isLoading, searchQuery, highlightContent } = useEnhancedSearchWithLinks(currentNoteId);
  const [showLinkContext, setShowLinkContext] = useState(true);

  // Export functionality
  const exportResults = async (format: 'csv' | 'json' | 'markdown') => {
    const results = searchResults.slice(0, maxResults);
    
    if (format === 'csv') {
      const headers = [
        'Title', 'Content Preview', 'Tags', 'Connections', 
        'Incoming Links', 'Outgoing Links', 'Created', 'Updated'
      ];
      const rows = results.map(result => [
        result.title,
        result.content?.slice(0, 100).replace(/"/g, '""') || '',
        result.tags?.join('; ') || '',
        result.linkContext?.totalConnections || 0,
        result.linkContext?.incomingCount || 0,
        result.linkContext?.outgoingCount || 0,
        result.created_at,
        result.updated_at
      ]);
      
      const csvContent = [headers, ...rows]
        .map(row => row.map(cell => `"${cell}"`).join(','))
        .join('\n');
      
      downloadFile(csvContent, 'search-results.csv', 'text/csv');
    }
    else if (format === 'json') {
      const jsonContent = JSON.stringify(results, null, 2);
      downloadFile(jsonContent, 'search-results.json', 'application/json');
    }
    else if (format === 'markdown') {
      const markdown = results.map(result => {
        const linkInfo = result.linkContext;
        return `# ${result.title}

**Connections:** ${linkInfo?.totalConnections || 0} (${linkInfo?.incomingCount || 0} incoming, ${linkInfo?.outgoingCount || 0} outgoing)

**Tags:** ${result.tags?.map(tag => `#${tag}`).join(' ') || 'None'}

**Created:** ${new Date(result.created_at).toLocaleDateString()}

**Content Preview:**
${result.content?.slice(0, 200) || 'No content'}...

${linkInfo?.backlinks.length ? `**Backlinks:**
${linkInfo.backlinks.map(bl => `- From: ${bl.sourceTitle}${bl.anchorText ? ` (via "${bl.anchorText}")` : ''}`).join('\n')}` : ''}

---
`;
      }).join('\n');
      
      downloadFile(markdown, 'search-results.md', 'text/markdown');
    }
  };

  const downloadFile = (content: string, filename: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

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
                <div className="flex gap-2 mt-3">
                  <div className="h-6 bg-muted rounded w-16"></div>
                  <div className="h-6 bg-muted rounded w-20"></div>
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
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <Search className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">No results found</h3>
          <p className="text-muted-foreground mb-4">
            {searchQuery.text || 
             searchQuery.filters.tags.length > 0 || 
             searchQuery.filters.hasLinksToCurrentNote ||
             searchQuery.filters.linkedFromCurrentNote
              ? "Try adjusting your search terms or link filters"
              : "Start searching to find connected notes"}
          </p>
          <div className="text-sm text-muted-foreground">
            <p className="mb-2">Search tips:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Use # for tag searches</li>
              <li>Try connection filters for the current note</li>
              <li>Use similarity mode to find related content</li>
              <li>Check "Most Connected" for hub notes</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    );
  }

  const displayResults = searchResults.slice(0, maxResults);

  return (
    <div className="space-y-4">
      {/* Export Options */}
      {showExportOptions && searchResults.length > 0 && (
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Export Results</span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => exportResults('csv')}
                  className="gap-2"
                >
                  <Download className="h-3 w-3" />
                  CSV
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => exportResults('markdown')}
                  className="gap-2"
                >
                  <Download className="h-3 w-3" />
                  Markdown
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => exportResults('json')}
                  className="gap-2"
                >
                  <Download className="h-3 w-3" />
                  JSON
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Display Options */}
      <div className="flex items-center gap-2 text-sm">
        <span className="text-muted-foreground">Show:</span>
        <Button
          variant={showLinkContext ? 'default' : 'outline'}
          size="sm"
          onClick={() => setShowLinkContext(!showLinkContext)}
          className="gap-2 h-7"
        >
          <Network className="h-3 w-3" />
          Link Context
        </Button>
      </div>

      {/* Results */}
      {displayResults.map((result) => (
        <LinkSearchResultCard
          key={result.id}
          result={result}
          currentNoteId={currentNoteId}
          onSelect={onNoteSelect}
          highlightContent={highlightContent}
          searchText={searchQuery.text}
          showLinkContext={showLinkContext}
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

interface LinkSearchResultCardProps {
  result: EnhancedSearchResult;
  currentNoteId?: string;
  onSelect?: (noteId: string) => void;
  highlightContent: (content: string, searchText: string) => string;
  searchText: string;
  showLinkContext: boolean;
}

function LinkSearchResultCard({ 
  result, 
  currentNoteId,
  onSelect, 
  highlightContent, 
  searchText,
  showLinkContext
}: LinkSearchResultCardProps) {
  const [showDetails, setShowDetails] = useState(false);

  const handleClick = () => {
    if (onSelect) {
      onSelect(result.id);
    } else {
      window.location.href = `/notes/${result.slug}`;
    }
  };

  const contentPreview = result.content?.length > 200 
    ? result.content.substring(0, 200) + '...'
    : result.content || '';

  const highlightedTitle = highlightContent(result.title, searchText);
  const highlightedPreview = highlightContent(contentPreview, searchText);

  const linkContext = result.linkContext;
  const isCurrentNote = result.id === currentNoteId;

  return (
    <Card className={`hover:shadow-md transition-shadow cursor-pointer ${isCurrentNote ? 'ring-2 ring-primary/50' : ''}`}>
      <CardHeader className="pb-2" onClick={handleClick}>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <CardTitle 
                className="text-base"
                dangerouslySetInnerHTML={{ __html: highlightedTitle }}
              />
              {isCurrentNote && (
                <Badge variant="outline" className="text-xs">Current</Badge>
              )}
              {result.semanticSimilarity && (
                <Badge variant="secondary" className="text-xs gap-1">
                  <GitBranch className="h-2 w-2" />
                  {Math.round(result.semanticSimilarity * 100)}% similar
                </Badge>
              )}
            </div>
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
              {linkContext && (
                <span className="flex items-center gap-1 text-primary">
                  <Network className="h-3 w-3" />
                  {linkContext.totalConnections} connections
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
            {showLinkContext && linkContext && (
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowDetails(!showDetails);
                }}
                className="h-6 w-6 p-0"
              >
                {showDetails ? (
                  <ChevronDown className="h-3 w-3" />
                ) : (
                  <ChevronRight className="h-3 w-3" />
                )}
              </Button>
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
          <div className="flex flex-wrap gap-1 mb-3">
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

        {/* Link Context Summary */}
        {showLinkContext && linkContext && (
          <div className="space-y-2">
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              {linkContext.incomingCount > 0 && (
                <span className="flex items-center gap-1">
                  <ArrowRight className="h-3 w-3" />
                  {linkContext.incomingCount} incoming
                </span>
              )}
              {linkContext.outgoingCount > 0 && (
                <span className="flex items-center gap-1">
                  <ArrowLeft className="h-3 w-3" />
                  {linkContext.outgoingCount} outgoing
                </span>
              )}
              {linkContext.sharedConnections && linkContext.sharedConnections.length > 0 && (
                <span className="flex items-center gap-1 text-primary">
                  <GitBranch className="h-3 w-3" />
                  {linkContext.sharedConnections.length} shared
                </span>
              )}
            </div>

            {/* Detailed Link Context */}
            <Collapsible open={showDetails} onOpenChange={setShowDetails}>
              <CollapsibleContent className="space-y-3">
                {/* Backlinks with Context */}
                {linkContext.backlinks.length > 0 && (
                  <div>
                    <h5 className="text-xs font-medium mb-2 flex items-center gap-1">
                      <ArrowRight className="h-3 w-3" />
                      Referenced by:
                    </h5>
                    <div className="space-y-1">
                      {linkContext.backlinks.slice(0, 3).map((backlink) => (
                        <div key={backlink.id} className="text-xs p-2 bg-muted/30 rounded">
                          <div className="font-medium">{backlink.sourceTitle}</div>
                          {backlink.anchorText && (
                            <div className="text-muted-foreground">
                              via "{backlink.anchorText}"
                            </div>
                          )}
                          {backlink.context && (
                            <div className="text-muted-foreground mt-1 italic">
                              ...{backlink.context}...
                            </div>
                          )}
                        </div>
                      ))}
                      {linkContext.backlinks.length > 3 && (
                        <div className="text-xs text-muted-foreground">
                          +{linkContext.backlinks.length - 3} more backlinks
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Connected Notes */}
                {linkContext.connectedNotes.length > 0 && (
                  <div>
                    <h5 className="text-xs font-medium mb-2 flex items-center gap-1">
                      <ArrowLeft className="h-3 w-3" />
                      Links to:
                    </h5>
                    <div className="flex flex-wrap gap-1">
                      {linkContext.connectedNotes.slice(0, 5).map((connected) => (
                        <Badge 
                          key={connected.id} 
                          variant="outline" 
                          className="text-xs cursor-pointer hover:bg-muted"
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelect?.(connected.id);
                          }}
                        >
                          {connected.title}
                          {connected.anchorText && (
                            <span className="ml-1 text-muted-foreground">
                              ({connected.anchorText})
                            </span>
                          )}
                        </Badge>
                      ))}
                      {linkContext.connectedNotes.length > 5 && (
                        <Badge variant="outline" className="text-xs">
                          +{linkContext.connectedNotes.length - 5}
                        </Badge>
                      )}
                    </div>
                  </div>
                )}
              </CollapsibleContent>
            </Collapsible>
          </div>
        )}
      </CardContent>
    </Card>
  );
}