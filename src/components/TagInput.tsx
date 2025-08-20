import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { X, Tag } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TagInputProps {
  tags: string[];
  onTagsChange: (tags: string[]) => void;
  suggestions?: string[];
  maxTags?: number;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

const TagInput: React.FC<TagInputProps> = ({
  tags,
  onTagsChange,
  suggestions = [],
  maxTags = 10,
  placeholder = "Add tags...",
  disabled = false,
  className
}) => {
  const [inputValue, setInputValue] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [filteredSuggestions, setFilteredSuggestions] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  // Debounced filtering of suggestions
  useEffect(() => {
    const timer = setTimeout(() => {
      if (inputValue.trim() && suggestions.length > 0) {
        const filtered = suggestions
          .filter(suggestion => 
            suggestion.toLowerCase().includes(inputValue.toLowerCase()) &&
            !tags.includes(suggestion)
          )
          .slice(0, 8); // Limit suggestions shown
        setFilteredSuggestions(filtered);
        setIsOpen(filtered.length > 0);
      } else {
        setFilteredSuggestions([]);
        setIsOpen(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [inputValue, suggestions, tags]);

  // Validate and format tag
  const formatTag = useCallback((tag: string): string | null => {
    const cleaned = tag.trim().toLowerCase();
    
    // Check if empty or already exists
    if (!cleaned || tags.includes(cleaned)) return null;
    
    // Replace spaces with hyphens and remove invalid characters
    const formatted = cleaned
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
    
    // Check length (max 30 characters)
    if (formatted.length === 0 || formatted.length > 30) return null;
    
    return formatted;
  }, [tags]);

  // Add tag function
  const addTag = useCallback((tag: string) => {
    if (tags.length >= maxTags) return;
    
    const formattedTag = formatTag(tag);
    if (formattedTag) {
      onTagsChange([...tags, formattedTag]);
      setInputValue('');
      setIsOpen(false);
    }
  }, [tags, maxTags, formatTag, onTagsChange]);

  // Remove tag function
  const removeTag = useCallback((tagToRemove: string) => {
    onTagsChange(tags.filter(tag => tag !== tagToRemove));
  }, [tags, onTagsChange]);

  // Handle keyboard events
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (inputValue.trim()) {
        addTag(inputValue);
      }
    } else if (e.key === 'Backspace' && !inputValue && tags.length > 0) {
      // Remove last tag when backspace is pressed on empty input
      removeTag(tags[tags.length - 1]);
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      setInputValue('');
    }
  }, [inputValue, tags, addTag, removeTag]);

  // Handle suggestion selection
  const handleSuggestionSelect = useCallback((suggestion: string) => {
    addTag(suggestion);
  }, [addTag]);

  const canAddMoreTags = tags.length < maxTags;
  const isInputInvalid = inputValue.trim() && !formatTag(inputValue);

  return (
    <div className={cn("space-y-2", className)}>
      {/* Tags display */}
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-2 p-2 min-h-[40px] border border-input rounded-md bg-background">
          {tags.map((tag) => (
            <Badge 
              key={tag} 
              variant="secondary" 
              className="text-xs h-6 px-2 bg-accent/50 text-accent-foreground hover:bg-accent/70 transition-colors"
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
          ))}
        </div>
      )}

      {/* Input with suggestions */}
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
                  if (filteredSuggestions.length > 0) {
                    setIsOpen(true);
                  }
                }}
                className={cn(
                  "pr-8",
                  isInputInvalid && "border-destructive focus-visible:ring-destructive"
                )}
                disabled={disabled}
              />
              <Tag className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            </div>
          </PopoverTrigger>
          <PopoverContent className="w-full p-0" align="start">
            <Command>
              <CommandList>
                {filteredSuggestions.length === 0 ? (
                  <CommandEmpty>No suggestions found.</CommandEmpty>
                ) : (
                  <CommandGroup>
                    {filteredSuggestions.map((suggestion) => (
                      <CommandItem
                        key={suggestion}
                        onSelect={() => handleSuggestionSelect(suggestion)}
                        className="cursor-pointer"
                      >
                        <Tag className="h-4 w-4 mr-2" />
                        {suggestion}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      )}

      {/* Validation feedback */}
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>
          {isInputInvalid && (
            <span className="text-destructive">
              Invalid format. Use lowercase letters, numbers, and hyphens only.
            </span>
          )}
        </span>
        <span className={cn(
          tags.length >= maxTags && "text-destructive"
        )}>
          {tags.length}/{maxTags} tags
        </span>
      </div>
    </div>
  );
};

export default TagInput;