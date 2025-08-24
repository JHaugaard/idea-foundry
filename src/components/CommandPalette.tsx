import React, { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useEnhancedSearch } from '@/hooks/useEnhancedSearch';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { QueryProcessor } from '@/utils/queryProcessor';
import { SimilarityBadge } from '@/components/SimilarityBadge';
import { 
  Search, 
  FileText, 
  Hash, 
  Clock, 
  TrendingUp,
  Calendar,
  Users,
  Zap,
  ArrowRight
} from 'lucide-react';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onNoteSelect?: (noteId: string) => void;
}

interface CommandItem {
  id: string;
  title: string;
  description?: string;
  type: 'note' | 'action' | 'suggestion';
  icon: React.ReactNode;
  similarity?: number;
  action: () => void;
}

export function CommandPalette({ isOpen, onClose, onNoteSelect }: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [commands, setCommands] = useState<CommandItem[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  
  const { 
    searchResults, 
    updateSearchQuery,
    isLoading,
    recentSearches
  } = useEnhancedSearch();

  // Reset state when opening/closing
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  // Process query and update commands
  useEffect(() => {
    if (!query.trim()) {
      generateDefaultCommands();
    } else {
      processQueryAndGenerateCommands(query);
    }
  }, [query, searchResults, recentSearches]);

  // Handle keyboard navigation
  useKeyboardShortcuts([
    {
      key: 'ArrowDown',
      action: () => {
        if (isOpen) {
          setSelectedIndex(prev => (prev + 1) % commands.length);
        }
      },
      preventDefault: true
    },
    {
      key: 'ArrowUp',
      action: () => {
        if (isOpen) {
          setSelectedIndex(prev => prev === 0 ? commands.length - 1 : prev - 1);
        }
      },
      preventDefault: true
    },
    {
      key: 'Enter',
      action: () => {
        if (isOpen && commands[selectedIndex]) {
          commands[selectedIndex].action();
        }
      },
      preventDefault: true
    },
    {
      key: 'Escape',
      action: () => {
        if (isOpen) {
          onClose();
        }
      }
    }
  ]);

  const generateDefaultCommands = () => {
    const defaultCommands: CommandItem[] = [];

    // Recent searches
    recentSearches.slice(0, 3).forEach((recentQuery, index) => {
      defaultCommands.push({
        id: `recent-${index}`,
        title: recentQuery.text || 'Tag search',
        description: 'Recent search',
        type: 'suggestion',
        icon: <Clock className="h-4 w-4" />,
        action: () => {
          updateSearchQuery(recentQuery);
          onClose();
        }
      });
    });

    // Quick actions
    defaultCommands.push({
      id: 'search-all',
      title: 'Search all notes',
      description: 'Browse all your notes',
      type: 'action',
      icon: <Search className="h-4 w-4" />,
      action: () => {
        updateSearchQuery({ text: '', filters: { tags: [], excludeTags: [] }, mode: 'combined' });
        onClose();
      }
    });

    setCommands(defaultCommands);
  };

  const processQueryAndGenerateCommands = (searchQuery: string) => {
    const processedQuery = QueryProcessor.processQuery(searchQuery);
    const newCommands: CommandItem[] = [];

    // Update search with processed query
    updateSearchQuery({
      text: processedQuery.processedQuery,
      filters: {
        ...processedQuery.filters,
        dateRange: processedQuery.temporal ? {
          start: processedQuery.temporal.start!,
          end: processedQuery.temporal.end!
        } : undefined
      },
      mode: processedQuery.semantic ? 'combined' : 'text'
    });

    // Add search results as commands
    searchResults.slice(0, 8).forEach(result => {
      newCommands.push({
        id: result.id,
        title: result.title,
        description: truncateContent(result.content, 80),
        type: 'note',
        icon: <FileText className="h-4 w-4" />,
        similarity: result.similarity_score,
        action: () => {
          if (onNoteSelect) {
            onNoteSelect(result.id);
          }
          onClose();
        }
      });
    });

    // Add query suggestions based on intent
    if (processedQuery.intent === 'find_similar') {
      newCommands.unshift({
        id: 'semantic-search',
        title: `Find notes similar to "${processedQuery.processedQuery}"`,
        description: 'Using semantic search',
        type: 'action',
        icon: <Zap className="h-4 w-4" />,
        action: () => {
          updateSearchQuery({
            text: processedQuery.processedQuery,
            filters: processedQuery.filters,
            mode: 'combined'
          });
          onClose();
        }
      });
    }

    // Add temporal suggestions
    if (processedQuery.temporal) {
      newCommands.unshift({
        id: 'temporal-search',
        title: `Notes from ${processedQuery.temporal.description}`,
        description: `${processedQuery.temporal.start?.toLocaleDateString()} - ${processedQuery.temporal.end?.toLocaleDateString()}`,
        type: 'action',
        icon: <Calendar className="h-4 w-4" />,
        action: () => {
          updateSearchQuery({
            text: processedQuery.processedQuery,
            filters: {
              ...processedQuery.filters,
              dateRange: {
                start: processedQuery.temporal!.start!,
                end: processedQuery.temporal!.end!
              }
            },
            mode: 'combined'
          });
          onClose();
        }
      });
    }

    // Add entity suggestions
    processedQuery.entities.forEach(entity => {
      newCommands.push({
        id: `entity-${entity}`,
        title: `Search for "${entity}"`,
        description: 'Entity search',
        type: 'suggestion',
        icon: <Users className="h-4 w-4" />,
        action: () => {
          updateSearchQuery({
            text: entity,
            filters: processedQuery.filters,
            mode: 'combined'
          });
          onClose();
        }
      });
    });

    setCommands(newCommands);
    setSelectedIndex(0);
  };

  const truncateContent = (content: string, maxLength: number): string => {
    if (content.length <= maxLength) return content;
    return content.substring(0, maxLength) + '...';
  };

  const handleInputChange = (value: string) => {
    setQuery(value);
    setSelectedIndex(0);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl p-0">
        <div className="flex flex-col h-96">
          {/* Search Input */}
          <div className="p-4 border-b">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Type to search notes, or try 'find similar to project alpha'..."
                value={query}
                onChange={(e) => handleInputChange(e.target.value)}
                className="pl-10 border-0 focus-visible:ring-0 shadow-none text-base"
                autoFocus
              />
            </div>
          </div>

          {/* Results */}
          <ScrollArea className="flex-1">
            <div className="p-2">
              {isLoading ? (
                <div className="p-4 text-center text-muted-foreground">
                  <Search className="h-6 w-6 mx-auto mb-2 animate-spin" />
                  Searching...
                </div>
              ) : commands.length === 0 ? (
                <div className="p-4 text-center text-muted-foreground">
                  <FileText className="h-6 w-6 mx-auto mb-2" />
                  No results found
                </div>
              ) : (
                <div className="space-y-1">
                  {commands.map((command, index) => (
                    <div
                      key={command.id}
                      className={`flex items-center gap-3 p-3 rounded-md cursor-pointer transition-colors ${
                        index === selectedIndex 
                          ? 'bg-muted' 
                          : 'hover:bg-muted/50'
                      }`}
                      onClick={command.action}
                    >
                      <div className="flex-shrink-0 text-muted-foreground">
                        {command.icon}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium truncate">
                            {command.title}
                          </span>
                          {command.similarity && (
                            <SimilarityBadge score={command.similarity} />
                          )}
                        </div>
                        {command.description && (
                          <p className="text-sm text-muted-foreground truncate">
                            {command.description}
                          </p>
                        )}
                      </div>
                      
                      <div className="flex-shrink-0 flex items-center gap-2">
                        <Badge 
                          variant="outline" 
                          className="text-xs capitalize"
                        >
                          {command.type}
                        </Badge>
                        <ArrowRight className="h-3 w-3 text-muted-foreground" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Footer */}
          <div className="p-3 border-t bg-muted/30">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Use ↑↓ to navigate, Enter to select, Esc to close</span>
              <span>{commands.length} result{commands.length !== 1 ? 's' : ''}</span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}