import { FixedSizeList as List } from 'react-window';
import { BacklinkSkeleton } from './LoadingSkeleton';

interface BacklinkData {
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
}

interface VirtualizedBacklinkListProps {
  backlinks: BacklinkData[];
  onNavigateToNote?: (noteId: string) => void;
  height: number;
  isLoading?: boolean;
}

interface BacklinkItemProps {
  index: number;
  style: React.CSSProperties;
  data: {
    backlinks: BacklinkData[];
    onNavigateToNote?: (noteId: string) => void;
  };
}

function BacklinkItem({ index, style, data }: BacklinkItemProps) {
  const { backlinks, onNavigateToNote } = data;
  const backlink = backlinks[index];

  if (!backlink) {
    return (
      <div style={style} className="px-4">
        <BacklinkSkeleton />
      </div>
    );
  }

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
    <div style={style} className="px-4 py-2">
      <div
        className="p-3 bg-card border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
        onClick={() => onNavigateToNote?.(backlink.source_note_id)}
      >
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="font-medium text-sm truncate">
                {backlink.source_note.title}
              </h4>
            </div>
            
            {backlink.anchor_text && (
              <div className="mb-2">
                <span className="inline-block px-2 py-1 bg-secondary text-secondary-foreground text-xs rounded">
                  {backlink.anchor_text}
                </span>
              </div>
            )}
            
            {context && (
              <div className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                ...{context}...
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function VirtualizedBacklinkList({ 
  backlinks, 
  onNavigateToNote, 
  height,
  isLoading = false 
}: VirtualizedBacklinkListProps) {
  if (isLoading) {
    return (
      <div className="space-y-4 p-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <BacklinkSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (backlinks.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-sm text-muted-foreground mb-1">
          No backlinks yet
        </p>
        <p className="text-xs text-muted-foreground">
          This note hasn't been referenced by other notes
        </p>
      </div>
    );
  }

  return (
    <List
      height={height}
      itemCount={backlinks.length}
      itemSize={120} // Approximate height per item
      itemData={{
        backlinks,
        onNavigateToNote,
      }}
    >
      {BacklinkItem}
    </List>
  );
}