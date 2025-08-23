import { useState } from 'react';
import { ChevronLeft, ExternalLink, FileText, Link } from 'lucide-react';
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

  const context = getContextSentences(backlink.source_note.content, backlink.anchor_text);

  return (
    <Card className="mb-3 hover:bg-muted/50 transition-colors cursor-pointer" 
          onClick={() => onNavigateToNote?.(backlink.source_note_id)}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <FileText className="h-4 w-4 text-muted-foreground mt-1 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <h4 className="font-medium text-sm truncate">
                {backlink.source_note.title}
              </h4>
              <ExternalLink className="h-3 w-3 text-muted-foreground flex-shrink-0" />
            </div>
            
            {backlink.anchor_text && (
              <div className="mb-2">
                <span className="text-xs text-muted-foreground">Linked as: </span>
                <span className="text-xs font-medium bg-primary/10 px-2 py-1 rounded">
                  {backlink.anchor_text}
                </span>
              </div>
            )}
            
            {context && (
              <LinkifiedContent
                content={`...${context}...`}
                sourceNoteId={backlink.source_note_id}
                className="text-xs text-muted-foreground leading-relaxed"
              />
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function BacklinkContent({ noteId, noteTitle, onNavigateToNote }: BacklinkPanelProps) {
  const { data: backlinks, isLoading, error } = useBacklinks(noteId);

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

      <ScrollArea className="flex-1">
        <div className="p-4">
          {backlinkCount === 0 ? (
            <div className="text-center py-8">
              <Link className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground mb-1">
                No backlinks yet
              </p>
              <p className="text-xs text-muted-foreground">
                This note hasn't been referenced by other notes
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {backlinks?.map((backlink) => (
                <BacklinkEntry
                  key={backlink.id}
                  backlink={backlink}
                  onNavigateToNote={onNavigateToNote}
                />
              ))}
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
        className={isMobile ? "h-[80vh]" : "w-96"}
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