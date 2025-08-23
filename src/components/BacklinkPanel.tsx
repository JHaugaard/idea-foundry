import { useState, useCallback, useRef, useEffect } from 'react';
import { ChevronLeft, ExternalLink, FileText, Link, RefreshCw, Eye } from 'lucide-react';
import { useBacklinks } from '@/hooks/useBacklinks';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  ScrollArea,
} from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import LinkifiedContent from '@/components/LinkifiedContent';

interface BacklinkPanelProps {
  noteId: string | null;
  noteTitle?: string;
  onNavigateToNote?: (noteId: string) => void;
}

interface BacklinkEntryProps {
  backlink: {
    id: string;
    source_note_id: string;
    anchor_text: string | null;
    canonical_title: string;
    source_note: {
      id: string;
      title: string;
      content: string | null;
      slug: string | null;
    };
  };
  onNavigateToNote?: (noteId: string) => void;
}

function BacklinkEntry({ backlink, onNavigateToNote }: BacklinkEntryProps) {
  const isMobile = useIsMobile();
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const startX = useRef(0);
  const currentX = useRef(0);
  const isDragging = useRef(false);

  const getContextSentences = (content: string | null, anchorText: string | null): string => {
    if (!content || !anchorText) return '';
    
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const targetSentenceIndex = sentences.findIndex(sentence => 
      sentence.toLowerCase().includes(anchorText.toLowerCase())
    );
    
    if (targetSentenceIndex === -1) return '';
    
    const start = Math.max(0, targetSentenceIndex - 1);
    const end = Math.min(sentences.length, targetSentenceIndex + 2);
    
    return sentences.slice(start, end).join('. ').trim();
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (!isMobile) return;
    startX.current = e.touches[0].clientX;
    isDragging.current = true;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isMobile || !isDragging.current) return;
    currentX.current = e.touches[0].clientX;
    const diff = currentX.current - startX.current;
    setSwipeOffset(Math.max(-120, Math.min(120, diff)));
  };

  const handleTouchEnd = () => {
    if (!isMobile || !isDragging.current) return;
    isDragging.current = false;
    
    if (swipeOffset > 60) {
      // Swipe right - navigate to note
      onNavigateToNote?.(backlink.source_note_id);
    } else if (swipeOffset < -60) {
      // Swipe left - show preview
      setIsPreviewMode(true);
      setTimeout(() => setIsPreviewMode(false), 2000);
    }
    
    setSwipeOffset(0);
  };

  const context = getContextSentences(backlink.source_note.content, backlink.anchor_text);

  return (
    <Card 
      className={`mb-3 transition-all duration-200 cursor-pointer relative overflow-hidden ${
        isPreviewMode ? 'ring-2 ring-primary/50' : 'hover:bg-muted/50'
      }`}
      style={isMobile ? { transform: `translateX(${swipeOffset}px)` } : undefined}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onClick={() => !isDragging.current && onNavigateToNote?.(backlink.source_note_id)}
    >
      {/* Swipe indicators for mobile */}
      {isMobile && (
        <>
          <div className="absolute left-2 top-1/2 -translate-y-1/2 opacity-50">
            <Eye className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="absolute right-2 top-1/2 -translate-y-1/2 opacity-50">
            <ExternalLink className="h-4 w-4 text-muted-foreground" />
          </div>
        </>
      )}
      
      <CardContent className={isMobile ? "p-3" : "p-4"}>
        <div className="flex items-start gap-3">
          <FileText className={`${isMobile ? 'h-3 w-3' : 'h-4 w-4'} text-muted-foreground mt-1 flex-shrink-0`} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h4 className={`font-medium ${isMobile ? 'text-xs' : 'text-sm'} truncate`}>
                {backlink.source_note.title}
              </h4>
              {!isMobile && <ExternalLink className="h-3 w-3 text-muted-foreground flex-shrink-0" />}
            </div>
            
            {backlink.anchor_text && (
              <div className="mb-2">
                <Badge variant="secondary" className={`${isMobile ? 'text-xs px-1.5 py-0.5' : 'text-xs'}`}>
                  {backlink.anchor_text}
                </Badge>
              </div>
            )}
            
            {context && !isMobile && (
              <LinkifiedContent
                content={`...${context}...`}
                sourceNoteId={backlink.source_note_id}
                className="text-xs text-muted-foreground leading-relaxed"
              />
            )}
            
            {/* Preview mode content for mobile */}
            {isPreviewMode && isMobile && context && (
              <div className="mt-2 p-2 bg-muted/30 rounded text-xs text-muted-foreground">
                {context}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function BacklinkContent({ noteId, noteTitle, onNavigateToNote }: BacklinkPanelProps) {
  const { data: backlinks, isLoading, error, refetch } = useBacklinks(noteId);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const isMobile = useIsMobile();
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const handlePullToRefresh = useCallback(async () => {
    if (!isMobile || isRefreshing) return;
    
    setIsRefreshing(true);
    try {
      await refetch();
    } finally {
      setIsRefreshing(false);
    }
  }, [isMobile, isRefreshing, refetch]);

  if (isLoading) {
    return (
      <div className="p-4 space-y-4">
        <div className="space-y-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-24" />
        </div>
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i} className="p-4">
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-3/4" />
            </div>
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4">
        <Alert>
          <AlertDescription>
            Failed to load backlinks. Please try again.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const backlinkCount = backlinks?.length || 0;

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b">
        <div className="flex items-center gap-2 mb-2">
          <Link className="h-4 w-4" />
          <h3 className="font-medium">Backlinks</h3>
        </div>
        {noteTitle && (
          <p className="text-sm text-muted-foreground mb-2 truncate">
            {noteTitle}
          </p>
        )}
        <p className="text-xs text-muted-foreground">
          Referenced in {backlinkCount} {backlinkCount === 1 ? 'note' : 'notes'}
        </p>
      </div>

      <ScrollArea className="flex-1" ref={scrollAreaRef}>
        {/* Pull to refresh indicator */}
        {isMobile && isRefreshing && (
          <div className="flex items-center justify-center p-4 border-b">
            <RefreshCw className="h-4 w-4 animate-spin mr-2" />
            <span className="text-sm text-muted-foreground">Refreshing...</span>
          </div>
        )}
        
        <div className={`${isMobile ? 'p-3' : 'p-4'}`}>
          {backlinkCount === 0 ? (
            <div className="text-center py-8">
              <Link className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground mb-1">
                No backlinks yet
              </p>
              <p className="text-xs text-muted-foreground">
                This note hasn't been referenced by other notes
              </p>
              {isMobile && (
                <p className="text-xs text-muted-foreground mt-4">
                  Pull down to refresh
                </p>
              )}
            </div>
          ) : (
            <>
              {isMobile && (
                <div className="mb-4 p-3 bg-muted/30 rounded-lg">
                  <p className="text-xs text-muted-foreground text-center">
                    Swipe right to open • Swipe left to preview
                  </p>
                </div>
              )}
              <div className={isMobile ? 'space-y-2' : 'space-y-3'}>
                {backlinks?.map((backlink) => (
                  <BacklinkEntry
                    key={backlink.id}
                    backlink={backlink}
                    onNavigateToNote={onNavigateToNote}
                  />
                ))}
              </div>
            </>
          )}
          
          {/* Pull to refresh area for mobile */}
          {isMobile && (
            <div 
              className="flex items-center justify-center py-4"
              onTouchStart={(e) => {
                const touch = e.touches[0];
                const scrollTop = scrollAreaRef.current?.scrollTop || 0;
                if (scrollTop === 0) {
                  // At top, prepare for pull to refresh
                }
              }}
            >
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handlePullToRefresh}
                disabled={isRefreshing}
                className="text-xs"
              >
                {isRefreshing ? (
                  <>
                    <RefreshCw className="h-3 w-3 animate-spin mr-2" />
                    Refreshing...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-3 w-3 mr-2" />
                    Refresh backlinks
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

export function BacklinkPanel({ noteId, noteTitle, onNavigateToNote }: BacklinkPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const isMobile = useIsMobile();

  if (!noteId) return null;

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button 
          variant="outline" 
          size="sm" 
          className="gap-2"
        >
          <Link className="h-4 w-4" />
          {!isMobile && "Backlinks"}
        </Button>
      </SheetTrigger>
      
      <SheetContent 
        side={isMobile ? "bottom" : "right"} 
        className={isMobile ? "h-[85vh] rounded-t-xl" : "w-96"}
      >
        <SheetHeader className="pb-4">
          <div className="flex items-center gap-2">
            {isMobile && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsOpen(false)}
                className="p-1 h-8 w-8"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
            )}
            <SheetTitle>Backlinks</SheetTitle>
          </div>
        </SheetHeader>
        
        <BacklinkContent
          noteId={noteId}
          noteTitle={noteTitle}
          onNavigateToNote={(targetNoteId) => {
            onNavigateToNote?.(targetNoteId);
            setIsOpen(false);
          }}
        />
      </SheetContent>
    </Sheet>
  );
}