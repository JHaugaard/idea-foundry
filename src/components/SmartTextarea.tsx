import React, { useRef, useState, useCallback, useEffect } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { useBracketLinking } from '@/hooks/useBracketLinking';
import { useHashtagAutocomplete } from '@/hooks/useHashtagAutocomplete';
import { BracketSuggestions } from '@/components/BracketSuggestions';
import HashtagSuggestions from '@/components/HashtagSuggestions';
import { parseHashtags, normalizeTag } from '@/lib/tags';
import { cn } from '@/lib/utils';

interface SmartTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  onTagsDetected?: (tags: string[]) => void;
  onContentChange?: (content: string) => void;
}

const SmartTextarea: React.FC<SmartTextareaProps> = ({
  value = '',
  onChange,
  onTagsDetected,
  onContentChange,
  className,
  ...props
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [cursorPosition, setCursorPosition] = useState(0);
  const [suggestionPosition, setSuggestionPosition] = useState({ top: 0, left: 0 });

  // Hooks for autocomplete
  const bracketLinking = useBracketLinking(value as string);
  const hashtagAutocomplete = useHashtagAutocomplete(value as string);

  // Handle cursor position changes
  const handleSelectionChange = useCallback(() => {
    if (!textareaRef.current) return;
    
    const cursor = textareaRef.current.selectionStart;
    setCursorPosition(cursor);

    // Update suggestion position
    if (textareaRef.current) {
      const rect = textareaRef.current.getBoundingClientRect();
      const style = window.getComputedStyle(textareaRef.current);
      const lineHeight = parseInt(style.lineHeight) || 20;
      
      // Approximate position - this could be improved with a more sophisticated algorithm
      setSuggestionPosition({
        top: rect.bottom + 4,
        left: rect.left + 12
      });
    }
  }, []);

  // Handle text changes
  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    onChange?.(e);
    onContentChange?.(newValue);

    // Extract hashtags and notify parent
    const hashtags = parseHashtags(newValue);
    onTagsDetected?.(hashtags);

    // Update cursor position after change
    setTimeout(handleSelectionChange, 0);
  }, [onChange, onContentChange, onTagsDetected, handleSelectionChange]);

  // Handle bracket link selection
  const handleBracketSelect = useCallback((note: any) => {
    const noteTitle = typeof note === 'string' ? note : note.title;
    if (!textareaRef.current || !bracketLinking.activeBracket) return;

    const textarea = textareaRef.current;
    const { start, end } = bracketLinking.activeBracket;
    const beforeMatch = textarea.value.substring(0, start);
    const afterMatch = textarea.value.substring(end);
    
    const newValue = `${beforeMatch}[[${noteTitle}]]${afterMatch}`;
    
    // Create synthetic event
    const syntheticEvent = {
      target: { value: newValue }
    } as React.ChangeEvent<HTMLTextAreaElement>;
    
    handleChange(syntheticEvent);
    
    // Set cursor position after the inserted link
    setTimeout(() => {
      const newCursorPos = start + `[[${noteTitle}]]`.length;
      textarea.setSelectionRange(newCursorPos, newCursorPos);
      textarea.focus();
      bracketLinking.setActiveBracket(null);
    }, 0);
  }, [bracketLinking.activeBracket, bracketLinking.setActiveBracket, handleChange]);

  // Handle hashtag selection
  const handleHashtagSelect = useCallback((tag: string) => {
    if (!textareaRef.current || !hashtagAutocomplete.activeHashtag) return;

    const textarea = textareaRef.current;
    const { start, end } = hashtagAutocomplete.activeHashtag;
    const beforeMatch = textarea.value.substring(0, start);
    const afterMatch = textarea.value.substring(end);
    
    const normalizedTag = normalizeTag(tag);
    const newValue = `${beforeMatch}#${normalizedTag}${afterMatch}`;
    
    // Create synthetic event
    const syntheticEvent = {
      target: { value: newValue }
    } as React.ChangeEvent<HTMLTextAreaElement>;
    
    handleChange(syntheticEvent);
    
    // Set cursor position after the inserted hashtag
    setTimeout(() => {
      const newCursorPos = start + `#${normalizedTag}`.length;
      textarea.setSelectionRange(newCursorPos, newCursorPos);
      textarea.focus();
      hashtagAutocomplete.setActiveHashtag(null);
    }, 0);
  }, [hashtagAutocomplete.activeHashtag, hashtagAutocomplete.setActiveHashtag, handleChange]);

  // Handle key events
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const textarea = e.target as HTMLTextAreaElement;
    const cursor = textarea.selectionStart;

    // Handle bracket link navigation
    if (bracketLinking.activeBracket && bracketLinking.searchResults.length > 0) {
      switch (e.key) {
        case 'ArrowDown':
        case 'ArrowUp':
        case 'Escape':
          bracketLinking.handleKeyNavigation(e.nativeEvent as KeyboardEvent);
          return;
        case 'Enter':
        case 'Tab':
          e.preventDefault();
          const selectedBracketResult = bracketLinking.searchResults[bracketLinking.selectedIndex];
          if (selectedBracketResult) {
            handleBracketSelect(selectedBracketResult);
          }
          return;
      }
    }

    // Handle hashtag navigation
    if (hashtagAutocomplete.activeHashtag && hashtagAutocomplete.searchResults.length > 0) {
      switch (e.key) {
        case 'ArrowDown':
        case 'ArrowUp':
        case 'Escape':
          hashtagAutocomplete.handleKeyNavigation(e.nativeEvent as KeyboardEvent);
          return;
        case 'Enter':
        case 'Tab':
          e.preventDefault();
          const selectedHashtagResult = hashtagAutocomplete.searchResults[hashtagAutocomplete.selectedIndex];
          if (selectedHashtagResult) {
            handleHashtagSelect(selectedHashtagResult);
          }
          return;
      }
    }

    // Detect patterns on regular key presses
    setTimeout(() => {
      const newCursor = textarea.selectionStart;
      
      // Detect bracket pattern
      const bracketMatch = bracketLinking.detectBracketPattern(textarea.value, newCursor);
      bracketLinking.setActiveBracket(bracketMatch);
      
      // Detect hashtag pattern
      const hashtagMatch = hashtagAutocomplete.detectHashtagPattern(textarea.value, newCursor);
      hashtagAutocomplete.setActiveHashtag(hashtagMatch);
    }, 0);

    props.onKeyDown?.(e);
  }, [
    bracketLinking,
    hashtagAutocomplete,
    handleBracketSelect,
    handleHashtagSelect,
    props.onKeyDown
  ]);

  // Update patterns when cursor moves
  useEffect(() => {
    const bracketMatch = bracketLinking.detectBracketPattern(value as string, cursorPosition);
    bracketLinking.setActiveBracket(bracketMatch);
    
    const hashtagMatch = hashtagAutocomplete.detectHashtagPattern(value as string, cursorPosition);
    hashtagAutocomplete.setActiveHashtag(hashtagMatch);
  }, [value, cursorPosition, bracketLinking.detectBracketPattern, hashtagAutocomplete.detectHashtagPattern]);

  return (
    <div className="relative">
      <Textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onSelect={handleSelectionChange}
        onClick={handleSelectionChange}
        className={cn(className)}
        {...props}
      />
      
      {/* Bracket link suggestions */}
      <BracketSuggestions
        isOpen={!!bracketLinking.activeBracket && bracketLinking.searchResults.length > 0}
        position={suggestionPosition}
        searchResults={bracketLinking.searchResults}
        selectedIndex={bracketLinking.selectedIndex}
        searchQuery={bracketLinking.activeBracket?.text || ''}
        isSearching={bracketLinking.isSearching}
        onSelect={handleBracketSelect}
        onClose={() => bracketLinking.setActiveBracket(null)}
      />
      
      {/* Hashtag suggestions */}
      <HashtagSuggestions
        isOpen={!!hashtagAutocomplete.activeHashtag && hashtagAutocomplete.searchResults.length > 0}
        suggestions={hashtagAutocomplete.searchResults}
        selectedIndex={hashtagAutocomplete.selectedIndex}
        onSelect={handleHashtagSelect}
        position={suggestionPosition}
        searchQuery={hashtagAutocomplete.activeHashtag?.text || ''}
      />
    </div>
  );
};

export default SmartTextarea;