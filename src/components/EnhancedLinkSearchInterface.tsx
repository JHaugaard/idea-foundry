import { useState, useMemo } from 'react';
import { Search, Command, Plus, Link, FileText, Hash } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useNotes } from '@/hooks/useNotes';
import { useTags } from '@/hooks/useTags';
import { useGlobalShortcuts } from '@/hooks/useKeyboardShortcuts';
import { useDebouncedSearch } from '@/hooks/useDebounced';
import { SearchResultSkeleton } from './LoadingSkeleton';
import { ErrorBoundary } from './ErrorBoundary';

interface EnhancedLinkSearchInterfaceProps {
  onSelectNote?: (noteId: string, title: string) => void;
  onCreateNote?: (title: string) => void;
  currentNoteId?: string;
  trigger?: React.ReactNode;
}

interface SearchResult {
  id: string;
  title: string;
  content?: string;
  tags: string[];
  type: 'note' | 'tag' | 'create';
  relevance?: number;
}

export function EnhancedLinkSearchInterface({
  onSelectNote,
  onCreateNote,
  currentNoteId,
  trigger,
}: EnhancedLinkSearchInterfaceProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { notes = [] } = useNotes();
  const { tags = [] } = useTags();
  
  const { searchQuery, setSearchQuery, debouncedQuery } = useDebouncedSearch((query) => {
    // Search is handled in the useMemo below
  });

  // Setup keyboard shortcut
  useGlobalShortcuts(
    () => setIsOpen(true), // Cmd+K to open search
    () => {} // Cmd+B is handled in BacklinkPanel
  );

  const searchResults = useMemo((): SearchResult[] => {
    if (!debouncedQuery.trim()) {
      // Show recent notes when no search query
      return notes
        .filter(note => note.id !== currentNoteId)
        .slice(0, 10)
        .map(note => ({
          id: note.id,
          title: note.title,
          content: note.content,
          tags: note.tags || [],
          type: 'note' as const,
          relevance: 1,
        }));
    }

    const query = debouncedQuery.toLowerCase();
    const results: SearchResult[] = [];

    // Search through notes
    notes.forEach(note => {
      if (note.id === currentNoteId) return;
      
      let relevance = 0;
      const titleLower = note.title.toLowerCase();
      const contentLower = note.content?.toLowerCase() || '';
      
      // Title matches get highest relevance
      if (titleLower.includes(query)) {
        relevance += titleLower.indexOf(query) === 0 ? 10 : 5;
      }
      
      // Content matches get medium relevance
      if (contentLower.includes(query)) {
        relevance += 2;
      }
      
      // Tag matches get medium-high relevance
      note.tags?.forEach(tag => {
        if (tag.toLowerCase().includes(query)) {
          relevance += 4;
        }
      });
      
      if (relevance > 0) {
        results.push({
          id: note.id,
          title: note.title,
          content: note.content,
          tags: note.tags || [],
          type: 'note',
          relevance,
        });
      }
    });

    // Search through tags
    tags.forEach(tag => {
      if (tag.toLowerCase().includes(query)) {
        results.push({
          id: `tag-${tag}`,
          title: `#${tag}`,
          content: `All notes tagged with "${tag}"`,
          tags: [],
          type: 'tag',
          relevance: tag.toLowerCase().indexOf(query) === 0 ? 8 : 3,
        });
      }
    });

    // Add "create new note" option
    if (debouncedQuery.trim()) {
      results.push({
        id: 'create-new',
        title: `Create "${debouncedQuery}"`,
        content: 'Create a new note with this title',
        tags: [],
        type: 'create',
        relevance: 1,
      });
    }

    // Sort by relevance
    return results
      .sort((a, b) => (b.relevance || 0) - (a.relevance || 0))
      .slice(0, 20);
  }, [debouncedQuery, notes, tags, currentNoteId]);

  const handleSelectResult = (result: SearchResult) => {
    if (result.type === 'create') {
      onCreateNote?.(debouncedQuery.trim());
    } else if (result.type === 'note') {
      onSelectNote?.(result.id, result.title);
    } else if (result.type === 'tag') {
      // Could implement tag-based filtering/navigation
      console.log('Tag selected:', result.title);
    }
    
    setIsOpen(false);
    setSearchQuery('');
  };

  const highlightMatch = (text: string, query: string) => {
    if (!query.trim()) return text;
    
    const index = text.toLowerCase().indexOf(query.toLowerCase());
    if (index === -1) return text;
    
    return (
      <>
        {text.slice(0, index)}
        <mark className="bg-primary/20 text-primary-foreground">
          {text.slice(index, index + query.length)}
        </mark>
        {text.slice(index + query.length)}
      </>
    );
  };

  return (
    <ErrorBoundary>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          {trigger || (
            <Button variant="outline" size="sm" className="gap-2">
              <Search className="h-4 w-4" />
              <span className="hidden sm:inline">Search & Link</span>
              <Badge variant="secondary" className="hidden lg:inline text-xs">
                ⌘K
              </Badge>
            </Button>
          )}
        </DialogTrigger>
        
        <DialogContent className="max-w-2xl p-0">
          <DialogHeader className="p-4 pb-0">
            <DialogTitle className="flex items-center gap-2">
              <Command className="h-5 w-5" />
              Link to Note or Create New
            </DialogTitle>
          </DialogHeader>

          <div className="p-4 pt-2">
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search notes, tags, or type to create new..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
                autoFocus
              />
            </div>

            <ScrollArea className="max-h-96">
              <div className="space-y-2">
                {!debouncedQuery && searchResults.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <FileText className="h-8 w-8 mx-auto mb-2" />
                    <p>Start typing to search for notes</p>
                  </div>
                )}

                {debouncedQuery && searchResults.length === 0 && (
                  <div className="space-y-2">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <SearchResultSkeleton key={i} />
                    ))}
                  </div>
                )}

                {searchResults.map((result, index) => (
                  <Card
                    key={result.id}
                    className="cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => handleSelectResult(result)}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-start gap-3">
                        <div className="mt-1">
                          {result.type === 'note' && (
                            <FileText className="h-4 w-4 text-muted-foreground" />
                          )}
                          {result.type === 'tag' && (
                            <Hash className="h-4 w-4 text-muted-foreground" />
                          )}
                          {result.type === 'create' && (
                            <Plus className="h-4 w-4 text-primary" />
                          )}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-medium text-sm truncate">
                              {highlightMatch(result.title, debouncedQuery)}
                            </h4>
                            {result.type === 'create' && (
                              <Badge className="text-xs">New</Badge>
                            )}
                          </div>
                          
                          {result.content && (
                            <p className="text-xs text-muted-foreground line-clamp-2">
                              {highlightMatch(
                                result.content.slice(0, 100) + 
                                (result.content.length > 100 ? '...' : ''), 
                                debouncedQuery
                              )}
                            </p>
                          )}
                          
                          {result.tags.length > 0 && (
                            <div className="flex gap-1 mt-2">
                              {result.tags.slice(0, 3).map(tag => (
                                <Badge 
                                  key={tag} 
                                  variant="outline" 
                                  className="text-xs"
                                >
                                  #{tag}
                                </Badge>
                              ))}
                              {result.tags.length > 3 && (
                                <Badge variant="outline" className="text-xs">
                                  +{result.tags.length - 3}
                                </Badge>
                              )}
                            </div>
                          )}
                        </div>
                        
                        <div className="text-xs text-muted-foreground">
                          {index === 0 && '↵'}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>

            <div className="mt-4 flex justify-between items-center text-xs text-muted-foreground">
              <div className="flex items-center gap-4">
                <span>↵ Select</span>
                <span>Esc Close</span>
              </div>
              <div className="flex items-center gap-2">
                <Link className="h-3 w-3" />
                <span>⌘K to search • ⌘B for backlinks</span>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </ErrorBoundary>
  );
}