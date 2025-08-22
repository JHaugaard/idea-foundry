import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Check, Plus, FileText, Calendar, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { slugify } from '@/lib/slug';
import { useToast } from '@/hooks/use-toast';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
} from '@/components/ui/popover';
import { Card } from '@/components/ui/card';

interface NoteSuggestion {
  id: string;
  title: string;
  slug: string | null;
  content: string | null;
  created_at: string;
  excerpt?: string;
}

interface BracketSuggestionsProps {
  isOpen: boolean;
  position: { top: number; left: number };
  searchResults: NoteSuggestion[];
  selectedIndex: number;
  searchQuery: string;
  isSearching: boolean;
  onSelect: (note: NoteSuggestion | null, isNewNote?: boolean) => void;
  onClose: () => void;
}

export function BracketSuggestions({
  isOpen,
  position,
  searchResults,
  selectedIndex,
  searchQuery,
  isSearching,
  onSelect,
  onClose
}: BracketSuggestionsProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isCreatingNote, setIsCreatingNote] = useState(false);

  const handleCreateNote = useCallback(async () => {
    if (!user || !searchQuery.trim()) return;

    setIsCreatingNote(true);
    try {
      const title = searchQuery.trim();
      const slug = slugify(title);

      const { data: newNote, error } = await supabase
        .from('notes')
        .insert({
          user_id: user.id,
          title,
          slug,
          content: '',
          review_status: 'not_reviewed'
        })
        .select('id, title, slug, content, created_at')
        .single();

      if (error) throw error;

      onSelect(newNote, true);
      
      toast({
        title: "Note created",
        description: `Created new note "${title}"`,
      });
    } catch (error: any) {
      toast({
        title: "Failed to create note",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsCreatingNote(false);
    }
  }, [user, searchQuery, onSelect, toast]);

  // Handle keyboard selection
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === 'Enter') {
        e.preventDefault();
        if (selectedIndex < searchResults.length) {
          onSelect(searchResults[selectedIndex]);
        } else if (searchQuery.trim()) {
          handleCreateNote();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, selectedIndex, searchResults, searchQuery, onSelect, handleCreateNote]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed z-50"
      style={{
        top: position.top + 20,
        left: position.left,
        maxWidth: '320px',
        minWidth: '280px'
      }}
    >
      <Card className="shadow-lg border bg-popover p-0">
        <Command className="rounded-lg border-none">
          <CommandList className="max-h-64">
            {isSearching ? (
              <div className="flex items-center justify-center p-4 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Searching notes...
              </div>
            ) : (
              <>
                {searchResults.length > 0 && (
                  <CommandGroup heading="Existing Notes">
                    {searchResults.map((note, index) => (
                      <CommandItem
                        key={note.id}
                        className={`p-3 cursor-pointer ${
                          index === selectedIndex ? 'bg-accent' : ''
                        }`}
                        onMouseEnter={() => {}}
                        onSelect={() => onSelect(note)}
                      >
                        <div className="flex items-start gap-3 w-full">
                          <FileText className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm truncate mb-1">
                              {note.title}
                            </div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                              <Calendar className="h-3 w-3" />
                              {format(new Date(note.created_at), 'MMM d, yyyy')}
                            </div>
                            {note.excerpt && (
                              <div className="text-xs text-muted-foreground line-clamp-2">
                                {note.excerpt}
                              </div>
                            )}
                          </div>
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}
                
                {searchQuery.trim() && (
                  <CommandGroup heading="Create New">
                    <CommandItem
                      className={`p-3 cursor-pointer ${
                        selectedIndex === searchResults.length ? 'bg-accent' : ''
                      }`}
                      onSelect={handleCreateNote}
                      disabled={isCreatingNote}
                    >
                      <div className="flex items-center gap-3 w-full">
                        {isCreatingNote ? (
                          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                        ) : (
                          <Plus className="h-4 w-4 text-muted-foreground" />
                        )}
                        <div className="flex-1">
                          <div className="font-medium text-sm">
                            Create "{searchQuery.trim()}"
                          </div>
                          <div className="text-xs text-muted-foreground">
                            New note will be created
                          </div>
                        </div>
                      </div>
                    </CommandItem>
                  </CommandGroup>
                )}

                {!isSearching && searchResults.length === 0 && !searchQuery.trim() && (
                  <CommandEmpty className="py-6 text-center text-sm text-muted-foreground">
                    Start typing to search notes...
                  </CommandEmpty>
                )}

                {!isSearching && searchResults.length === 0 && searchQuery.trim() && (
                  <CommandEmpty className="py-6 text-center text-sm text-muted-foreground">
                    No notes found. Press Enter to create a new one.
                  </CommandEmpty>
                )}
              </>
            )}
          </CommandList>
        </Command>
      </Card>
    </div>
  );
}