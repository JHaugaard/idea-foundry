import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { useIsMobile } from '@/hooks/use-mobile';
import { useBracketLinking } from '@/hooks/useBracketLinking';
import { BracketSuggestions } from '@/components/BracketSuggestions';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { slugify } from '@/lib/slug';
import { useToast } from '@/hooks/use-toast';

interface BracketLinkingTextareaProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  noteId?: string; // For creating note_links entries
}

interface NoteSuggestion {
  id: string;
  title: string;
  slug: string | null;
  content: string | null;
  created_at: string;
}

export function BracketLinkingTextarea({
  value,
  onChange,
  placeholder,
  className,
  disabled,
  noteId
}: BracketLinkingTextareaProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { user } = useAuth();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  
  const [cursorPosition, setCursorPosition] = useState(0);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });
  
  const {
    activeBracket,
    searchResults,
    selectedIndex,
    isSearching,
    detectBracketPattern,
    extractBracketLinks,
    setActiveBracket,
    setSelectedIndex,
    handleKeyNavigation,
    isEnabled
  } = useBracketLinking(value);

  // Handle cursor position changes
  const handleSelectionChange = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const position = textarea.selectionStart;
    setCursorPosition(position);

    if (isEnabled) {
      const bracket = detectBracketPattern(value, position);
      setActiveBracket(bracket);

      // Calculate dropdown position
      if (bracket) {
        const rect = textarea.getBoundingClientRect();
        const textBeforeCursor = value.substring(0, bracket.start);
        const lines = textBeforeCursor.split('\n');
        const currentLine = lines.length - 1;
        const charInLine = lines[lines.length - 1].length;
        
        // Responsive positioning
        const lineHeight = isMobile ? 24 : 20;
        const charWidth = isMobile ? 10 : 8;
        
        setDropdownPosition({
          top: rect.top + (currentLine * lineHeight) + lineHeight + (isMobile ? 10 : 0),
          left: isMobile ? Math.max(10, Math.min(rect.left, window.innerWidth - 300)) : rect.left + (charInLine * charWidth)
        });
      }
    }
  }, [value, detectBracketPattern, setActiveBracket, isEnabled]);

  // Handle keyboard events
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (activeBracket && searchResults.length > 0) {
        handleKeyNavigation(e);
      }
    };

    textarea.addEventListener('keydown', handleKeyDown);
    return () => textarea.removeEventListener('keydown', handleKeyDown);
  }, [activeBracket, searchResults, handleKeyNavigation]);

  // Create note link entry
  const createNoteLink = useCallback(async (sourceNoteId: string, targetNote: NoteSuggestion, anchorText: string) => {
    if (!user) return;

    try {
      await supabase
        .from('note_links')
        .insert({
          user_id: user.id,
          source_note_id: sourceNoteId,
          target_note_id: targetNote.id,
          anchor_text: anchorText,
          canonical_title: targetNote.title,
          canonical_slug: targetNote.slug || slugify(targetNote.title)
        });
    } catch (error: any) {
      console.error('Failed to create note link:', error);
      toast({
        title: "Failed to create link",
        description: error.message,
        variant: "destructive",
      });
    }
  }, [user, toast]);

  // Handle note selection from suggestions
  const handleNoteSelect = useCallback(async (selectedNote: NoteSuggestion | null, isNewNote?: boolean) => {
    if (!activeBracket || !selectedNote) return;

    const textarea = textareaRef.current;
    if (!textarea) return;

    // Replace the bracket content with the selected note title
    const beforeBracket = value.substring(0, activeBracket.start);
    const afterBracket = value.substring(activeBracket.end);
    const newText = `${beforeBracket}[[${selectedNote.title}]]${afterBracket}`;
    
    onChange(newText);
    
    // Create note link if we have a source note ID
    if (noteId) {
      await createNoteLink(noteId, selectedNote, selectedNote.title);
    }

    // Close suggestions
    setActiveBracket(null);
    
    // Focus back to textarea and position cursor after the link
    setTimeout(() => {
      textarea.focus();
      const newCursorPos = beforeBracket.length + selectedNote.title.length + 4; // 4 for [[ and ]]
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);

    if (isNewNote) {
      toast({
        title: "Note linked",
        description: `Created and linked to "${selectedNote.title}"`,
      });
    }
  }, [activeBracket, value, onChange, noteId, createNoteLink, setActiveBracket, toast]);

  // Handle click outside to close suggestions
  const handleClickOutside = useCallback((e: MouseEvent) => {
    const target = e.target as Element;
    if (!target.closest('[data-bracket-suggestions]') && !target.closest('textarea')) {
      setActiveBracket(null);
    }
  }, [setActiveBracket]);

  useEffect(() => {
    if (activeBracket) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [activeBracket, handleClickOutside]);

  // Style bracket links in the textarea
  const getStyledContent = useCallback(() => {
    if (!isEnabled) return value;
    
    const bracketLinks = extractBracketLinks(value);
    if (bracketLinks.length === 0) return value;

    // This is a simplified approach - for full highlighting,
    // you'd want to use a more sophisticated editor like CodeMirror
    return value;
  }, [value, extractBracketLinks, isEnabled]);

  return (
    <div className="relative">
      <Textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onSelect={handleSelectionChange}
        onKeyUp={handleSelectionChange}
        onClick={handleSelectionChange}
        placeholder={placeholder}
        className={`${className} ${isEnabled ? 'bracket-linking-enabled' : ''} ${isMobile ? 'text-base' : ''}`}
        disabled={disabled}
        style={{
          fontFamily: isMobile ? 'system-ui' : 'monospace',
          minHeight: isMobile ? '120px' : '80px',
        }}
      />
      
      {isEnabled && (
        <BracketSuggestions
          isOpen={!!activeBracket && !activeBracket.isComplete}
          position={dropdownPosition}
          searchResults={searchResults}
          selectedIndex={selectedIndex}
          searchQuery={activeBracket?.text || ''}
          isSearching={isSearching}
          onSelect={handleNoteSelect}
          onClose={() => setActiveBracket(null)}
        />
      )}

      {/* CSS for highlighting bracket links */}
      <style>{`
        .bracket-linking-enabled {
          background: linear-gradient(transparent, transparent);
        }
        .bracket-link {
          background-color: hsl(var(--primary) / 0.1);
          border-radius: 4px;
          padding: 1px 2px;
          color: hsl(var(--primary));
        }
      `}</style>
    </div>
  );
}