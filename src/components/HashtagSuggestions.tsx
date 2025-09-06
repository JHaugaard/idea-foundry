import React from 'react';
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent } from '@/components/ui/popover';
import { Tag, Hash } from 'lucide-react';
import { cn } from '@/lib/utils';

interface HashtagSuggestionsProps {
  isOpen: boolean;
  suggestions: string[];
  selectedIndex: number;
  onSelect: (tag: string) => void;
  position: { top: number; left: number };
  searchQuery: string;
}

const HashtagSuggestions: React.FC<HashtagSuggestionsProps> = ({
  isOpen,
  suggestions,
  selectedIndex,
  onSelect,
  position,
  searchQuery
}) => {
  if (!isOpen || suggestions.length === 0) return null;

  return (
    <div 
      className="fixed z-50 w-64 bg-popover border rounded-md shadow-lg"
      style={{ 
        top: position.top, 
        left: position.left,
        transform: 'translateY(8px)'
      }}
    >
      <Command>
        <CommandList className="max-h-48 overflow-auto">
          <CommandGroup heading={searchQuery ? "Matching Tags" : "Popular Tags"}>
            {suggestions.map((tag, index) => (
              <CommandItem
                key={tag}
                onSelect={() => onSelect(tag)}
                className={cn(
                  "cursor-pointer flex items-center px-3 py-2",
                  selectedIndex === index && "bg-accent"
                )}
              >
                <Hash className="h-4 w-4 text-muted-foreground mr-2" />
                <span>{tag}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </Command>
    </div>
  );
};

export default HashtagSuggestions;