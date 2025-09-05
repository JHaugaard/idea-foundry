import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { X, Tag, Sparkles, TrendingUp, Link } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTagAutomation, type TagSuggestion } from '@/hooks/useTagAutomation';
import { useTags } from '@/hooks/useTags';

interface TagInputProps {
  tags: string[];
  onTagsChange: (tags: string[]) => void;
  suggestions?: string[];
  maxTags?: number;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  // Enhanced features
  noteContent?: string;
  noteTitle?: string;
  showConfidenceScores?: boolean;
  showRelatedTags?: boolean;
}

const TagInput: React.FC<TagInputProps> = ({
  tags,
  onTagsChange,
  suggestions = [],
  maxTags = 10,
  placeholder = "Add tags...",
  disabled = false,
  className,
  noteContent,
  noteTitle,
  showConfidenceScores = true,
  showRelatedTags = true
}) => {
  const [inputValue, setInputValue] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [aiSuggestions, setAiSuggestions] = useState<TagSuggestion[]>([]);
  const [recentTags, setRecentTags] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const { getContentSuggestions, isGettingContentSuggestions } = useTagAutomation();
  const { tags: allTags, tagStats } = useTags();

  // Get recently used tags (sorted by usage frequency)
  useEffect(() => {
    if (tagStats) {
      const recent = tagStats
        .sort((a, b) => b.count - a.count) // Sort by usage count instead
        .slice(0, 10)
        .map(stat => stat.tag)
        .filter(tag => !tags.includes(tag));
      setRecentTags(recent);
    }
  }, [tagStats, tags]);

  // Get AI suggestions when content changes
  useEffect(() => {
    if (noteContent && noteTitle && inputValue.length > 2) {
      const timer = setTimeout(() => {
        getContentSuggestions(
          { content: noteContent, title: noteTitle, existingTags: tags },
          {
            onSuccess: (suggestions: TagSuggestion[]) => {
              setAiSuggestions(suggestions.filter(s => !tags.includes(s.tag)));
            },
            onError: () => setAiSuggestions([])
          }
        );
      }, 500);
      return () => clearTimeout(timer);
    } else {
      setAiSuggestions([]);
    }
  }, [noteContent, noteTitle, inputValue, tags, getContentSuggestions]);

  // Combined suggestions with prioritization
  const combinedSuggestions = React.useMemo(() => {
    const filtered = new Set<string>();
    const results: Array<{ tag: string; type: 'ai' | 'recent' | 'basic'; confidence?: string; related?: string[] }> = [];

    // Add AI suggestions first (highest priority)
    aiSuggestions.forEach(suggestion => {
      if (!filtered.has(suggestion.tag) && !tags.includes(suggestion.tag) && 
          suggestion.tag.toLowerCase().includes(inputValue.toLowerCase())) {
        filtered.add(suggestion.tag);
        results.push({
          tag: suggestion.tag,
          type: 'ai',
          confidence: suggestion.confidence,
          related: suggestion.similarNotes?.map(n => n.title) || []
        });
      }
    });

    // Add recent tags (medium priority)
    recentTags.forEach(tag => {
      if (!filtered.has(tag) && !tags.includes(tag) && 
          tag.toLowerCase().includes(inputValue.toLowerCase())) {
        filtered.add(tag);
        results.push({ tag, type: 'recent' });
      }
    });

    // Add basic suggestions (lowest priority)
    suggestions.forEach(tag => {
      if (!filtered.has(tag) && !tags.includes(tag) && 
          tag.toLowerCase().includes(inputValue.toLowerCase())) {
        filtered.add(tag);
        results.push({ tag, type: 'basic' });
      }
    });

    return results.slice(0, 8);
  }, [aiSuggestions, recentTags, suggestions, tags, inputValue]);

  // Update suggestions visibility
  useEffect(() => {
    setIsOpen(inputValue.length > 0 && combinedSuggestions.length > 0);
    setSelectedIndex(-1);
  }, [inputValue, combinedSuggestions]);

  // Enhanced keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => 
        prev < combinedSuggestions.length - 1 ? prev + 1 : 0
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => 
        prev > 0 ? prev - 1 : combinedSuggestions.length - 1
      );
    } else if (e.key === 'Tab' && selectedIndex >= 0) {
      e.preventDefault();
      addTag(combinedSuggestions[selectedIndex].tag);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedIndex >= 0) {
        addTag(combinedSuggestions[selectedIndex].tag);
      } else if (inputValue.trim()) {
        addTag(inputValue);
      }
    } else if (e.key === 'Backspace' && !inputValue && tags.length > 0) {
      removeTag(tags[tags.length - 1]);
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      setInputValue('');
      setSelectedIndex(-1);
    }
  }, [inputValue, tags, selectedIndex, combinedSuggestions]);

  // Rest of the functions remain similar but enhanced
  const formatTag = useCallback((tag: string): { formatted: string | null; error?: string } => {
    const cleaned = tag.trim().toLowerCase();
    
    if (!cleaned) return { formatted: null, error: 'Tag cannot be empty' };
    if (tags.includes(cleaned)) return { formatted: null, error: 'Tag already exists' };
    
    const formatted = cleaned
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
    
    if (formatted.length === 0) return { formatted: null, error: 'Invalid characters' };
    if (formatted.length > 30) return { formatted: null, error: 'Tag too long (max 30 chars)' };
    
    return { formatted };
  }, [tags]);

  const addTag = useCallback((tag: string) => {
    if (tags.length >= maxTags) return;
    
    const { formatted } = formatTag(tag);
    if (formatted) {
      onTagsChange([...tags, formatted]);
      setInputValue('');
      setIsOpen(false);
      setSelectedIndex(-1);
    }
  }, [tags, maxTags, formatTag, onTagsChange]);

  const removeTag = useCallback((tagToRemove: string) => {
    onTagsChange(tags.filter(tag => tag !== tagToRemove));
  }, [tags, onTagsChange]);

  const canAddMoreTags = tags.length < maxTags;
  const validation = inputValue.trim() ? formatTag(inputValue) : null;
  const isInputInvalid = validation && !validation.formatted;

  const getConfidenceIcon = (confidence: string) => {
    switch (confidence) {
      case 'high': return <Sparkles className="h-3 w-3 text-green-500" />;
      case 'medium': return <TrendingUp className="h-3 w-3 text-yellow-500" />;
      default: return <Tag className="h-3 w-3 text-blue-500" />;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'ai': return <Sparkles className="h-4 w-4 text-purple-500" />;
      case 'recent': return <TrendingUp className="h-4 w-4 text-blue-500" />;
      default: return <Tag className="h-4 w-4 text-muted-foreground" />;
    }
  };

  return (
    <div className={cn("space-y-2", className)}>
      {/* Tags display with enhanced hover info */}
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-2 p-2 min-h-[40px] border border-input rounded-md bg-background">
          {tags.map((tag) => (
            <HoverCard key={tag} openDelay={showRelatedTags ? 300 : 10000}>
              <HoverCardTrigger asChild>
                <Badge 
                  variant="secondary" 
                  className="text-xs h-6 px-2 bg-accent/50 text-accent-foreground hover:bg-accent/70 transition-colors cursor-help"
                >
                  <Tag className="h-3 w-3 mr-1" />
                  {tag}
                  {!disabled && (
                    <button
                      type="button"
                      onClick={() => removeTag(tag)}
                      className="ml-1 hover:text-destructive transition-colors"
                      aria-label={`Remove ${tag} tag`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </Badge>
              </HoverCardTrigger>
              {showRelatedTags && (
                <HoverCardContent className="w-80" side="top">
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Tag className="h-4 w-4" />
                      <h4 className="text-sm font-semibold">{tag}</h4>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Used in {tagStats?.find(s => s.tag === tag)?.count || 0} notes
                    </div>
                    {tagStats?.find(s => s.tag === tag)?.notes?.slice(0, 3).map(note => (
                      <div key={note.id} className="text-xs text-muted-foreground">
                        <Link className="h-3 w-3 inline mr-1" />
                        {note.title}
                      </div>
                    ))}
                  </div>
                </HoverCardContent>
              )}
            </HoverCard>
          ))}
        </div>
      )}

      {/* Enhanced input with contextual suggestions */}
      {canAddMoreTags && !disabled && (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
          <PopoverTrigger asChild>
            <div className="relative">
              <Input
                ref={inputRef}
                type="text"
                placeholder={placeholder}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                onFocus={() => {
                  if (combinedSuggestions.length > 0) {
                    setIsOpen(true);
                  }
                }}
                className={cn(
                  "pr-8",
                  isInputInvalid && "border-destructive focus-visible:ring-destructive"
                )}
                disabled={disabled}
              />
              {isGettingContentSuggestions ? (
                <Sparkles className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-purple-500 animate-pulse" />
              ) : (
                <Tag className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              )}
            </div>
          </PopoverTrigger>
          <PopoverContent 
            className="w-full p-0 z-50 bg-popover border shadow-md" 
            align="start"
          >
            <Command>
              <CommandList className="max-h-64 overflow-auto">
                {combinedSuggestions.length === 0 ? (
                  <CommandEmpty>
                    {isGettingContentSuggestions ? "Getting AI suggestions..." : "No suggestions found."}
                  </CommandEmpty>
                ) : (
                  <>
                    {/* AI Suggestions */}
                    {combinedSuggestions.filter(s => s.type === 'ai').length > 0 && (
                      <CommandGroup heading="AI Suggestions">
                        {combinedSuggestions.filter(s => s.type === 'ai').map((suggestion, index) => (
                          <CommandItem
                            key={`ai-${suggestion.tag}`}
                            onSelect={() => addTag(suggestion.tag)}
                            className={cn(
                              "cursor-pointer flex items-center justify-between",
                              selectedIndex === combinedSuggestions.indexOf(suggestion) && "bg-accent"
                            )}
                          >
                            <div className="flex items-center">
                              {getTypeIcon(suggestion.type)}
                              <span className="ml-2">{suggestion.tag}</span>
                              {showConfidenceScores && suggestion.confidence && (
                                <div className="ml-2 flex items-center">
                                  {getConfidenceIcon(suggestion.confidence)}
                                </div>
                              )}
                            </div>
                            {suggestion.related && suggestion.related.length > 0 && (
                              <div className="text-xs text-muted-foreground">
                                {suggestion.related.length} similar
                              </div>
                            )}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    )}

                    {/* Recent Tags */}
                    {combinedSuggestions.filter(s => s.type === 'recent').length > 0 && (
                      <CommandGroup heading="Recently Used">
                        {combinedSuggestions.filter(s => s.type === 'recent').map((suggestion) => (
                          <CommandItem
                            key={`recent-${suggestion.tag}`}
                            onSelect={() => addTag(suggestion.tag)}
                            className={cn(
                              "cursor-pointer flex items-center",
                              selectedIndex === combinedSuggestions.indexOf(suggestion) && "bg-accent"
                            )}
                          >
                            {getTypeIcon(suggestion.type)}
                            <span className="ml-2">{suggestion.tag}</span>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    )}

                    {/* Basic Suggestions */}
                    {combinedSuggestions.filter(s => s.type === 'basic').length > 0 && (
                      <CommandGroup heading="Suggestions">
                        {combinedSuggestions.filter(s => s.type === 'basic').map((suggestion) => (
                          <CommandItem
                            key={`basic-${suggestion.tag}`}
                            onSelect={() => addTag(suggestion.tag)}
                            className={cn(
                              "cursor-pointer flex items-center",
                              selectedIndex === combinedSuggestions.indexOf(suggestion) && "bg-accent"
                            )}
                          >
                            {getTypeIcon(suggestion.type)}
                            <span className="ml-2">{suggestion.tag}</span>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    )}
                  </>
                )}
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      )}

      {/* Enhanced validation feedback */}
      <div className="flex justify-between text-xs">
        <span>
          {isInputInvalid && validation?.error && (
            <span className="text-destructive">
              {validation.error}
            </span>
          )}
          {isGettingContentSuggestions && (
            <span className="text-purple-500 flex items-center">
              <Sparkles className="h-3 w-3 mr-1 animate-pulse" />
              Getting AI suggestions...
            </span>
          )}
        </span>
        <span className={cn(
          "text-muted-foreground",
          tags.length >= maxTags && "text-destructive"
        )}>
          {tags.length}/{maxTags} tags
        </span>
      </div>

      {/* Keyboard shortcuts hint */}
      {isOpen && (
        <div className="text-xs text-muted-foreground">
          Use ↑↓ to navigate, Tab/Enter to select, Esc to close
        </div>
      )}
    </div>
  );
};

export default TagInput;