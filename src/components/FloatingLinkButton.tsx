import { useState, useRef, useEffect, useCallback } from 'react';
import { Link, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useIsMobile } from '@/hooks/use-mobile';
import { useToast } from '@/hooks/use-toast';

interface FloatingLinkButtonProps {
  onCreateLink?: (selectedText: string) => void;
  className?: string;
}

export function FloatingLinkButton({ onCreateLink, className }: FloatingLinkButtonProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [selectedText, setSelectedText] = useState('');
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const isMobile = useIsMobile();
  const { toast } = useToast();
  const timeoutRef = useRef<NodeJS.Timeout>();

  const handleTextSelection = useCallback(() => {
    const selection = window.getSelection();
    const text = selection?.toString().trim();

    if (text && text.length > 0 && text.length < 200) {
      setSelectedText(text);
      
      // Get selection position
      const range = selection?.getRangeAt(0);
      const rect = range?.getBoundingClientRect();
      
      if (rect) {
        setPosition({
          x: rect.left + rect.width / 2,
          y: rect.top - 60
        });
        setIsVisible(true);

        // Auto-hide after 5 seconds
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
        timeoutRef.current = setTimeout(() => {
          setIsVisible(false);
        }, 5000);
      }
    } else {
      setIsVisible(false);
    }
  }, []);

  const handleLongPress = useCallback((e: Event) => {
    if (!isMobile) return;
    
    // Prevent default context menu
    e.preventDefault();
    
    // Trigger selection handling after a small delay
    setTimeout(handleTextSelection, 100);
  }, [isMobile, handleTextSelection]);

  const handleCreateLink = useCallback(() => {
    if (selectedText && onCreateLink) {
      onCreateLink(selectedText);
      toast({
        title: "Link created",
        description: `Created link for "${selectedText.substring(0, 30)}${selectedText.length > 30 ? '...' : ''}"`,
      });
    }
    setIsVisible(false);
    setSelectedText('');
  }, [selectedText, onCreateLink, toast]);

  const handleDismiss = useCallback(() => {
    setIsVisible(false);
    setSelectedText('');
    window.getSelection()?.removeAllRanges();
  }, []);

  useEffect(() => {
    // Listen for text selection
    document.addEventListener('selectionchange', handleTextSelection);
    
    // Listen for long press on mobile
    if (isMobile) {
      document.addEventListener('contextmenu', handleLongPress);
    }

    return () => {
      document.removeEventListener('selectionchange', handleTextSelection);
      if (isMobile) {
        document.removeEventListener('contextmenu', handleLongPress);
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [handleTextSelection, handleLongPress, isMobile]);

  if (!isVisible || !selectedText) return null;

  return (
    <div
      className={`fixed z-50 ${className}`}
      style={{
        left: Math.max(10, Math.min(position.x - 80, window.innerWidth - 170)),
        top: Math.max(10, position.y),
      }}
    >
      <Card className="shadow-lg border bg-background/95 backdrop-blur-sm">
        <CardContent className="p-2">
          <div className="flex items-center gap-2">
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground mb-1">Selected text:</p>
              <p className="text-xs font-medium truncate max-w-32">
                {selectedText}
              </p>
            </div>
            
            <div className="flex gap-1">
              <Button
                size="sm"
                onClick={handleCreateLink}
                className="h-8 w-8 p-0"
                title="Create link"
              >
                <Plus className="h-3 w-3" />
              </Button>
              
              <Button
                size="sm"
                variant="ghost"
                onClick={handleDismiss}
                className="h-8 w-8 p-0"
                title="Dismiss"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          </div>
          
          {isMobile && (
            <p className="text-xs text-muted-foreground mt-2 text-center">
              Long press text to create links
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}