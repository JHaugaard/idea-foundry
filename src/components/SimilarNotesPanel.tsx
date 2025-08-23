import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useEnhancedSearchWithLinks } from '@/hooks/useEnhancedSearchWithLinks';
import { 
  GitBranch, 
  Network, 
  ExternalLink,
  TrendingUp,
  Zap
} from 'lucide-react';

interface SimilarNotesPanelProps {
  currentNoteId: string;
  onNavigateToNote?: (noteId: string) => void;
}

export function SimilarNotesPanel({ 
  currentNoteId, 
  onNavigateToNote 
}: SimilarNotesPanelProps) {
  const { findSimilarNotes, getMostLinkedNotes } = useEnhancedSearchWithLinks(currentNoteId);
  
  const similarNotes = findSimilarNotes(currentNoteId);
  const mostLinkedNotes = getMostLinkedNotes();

  return (
    <div className="space-y-4">
      {/* Similar Notes Based on Connections */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <GitBranch className="h-4 w-4" />
            Similar Notes
          </CardTitle>
          <CardDescription className="text-xs">
            Notes with shared connections to this one
          </CardDescription>
        </CardHeader>
        <CardContent>
          {similarNotes.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              <Network className="h-8 w-8 mx-auto mb-2" />
              <p className="text-sm">No similar notes found</p>
              <p className="text-xs">Add more links to discover connections</p>
            </div>
          ) : (
            <ScrollArea className="max-h-64">
              <div className="space-y-2">
                {similarNotes.map((note) => (
                  <div
                    key={note.noteId}
                    className="flex items-center justify-between p-2 hover:bg-muted/50 rounded cursor-pointer"
                    onClick={() => onNavigateToNote?.(note.noteId)}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">
                        {note.title}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Network className="h-3 w-3" />
                          {Math.round(note.connectionStrength * 100)}% similar
                        </span>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                      <ExternalLink className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Most Connected Notes */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Hub Notes
          </CardTitle>
          <CardDescription className="text-xs">
            Most connected notes in your knowledge graph
          </CardDescription>
        </CardHeader>
        <CardContent>
          {mostLinkedNotes.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              <Network className="h-8 w-8 mx-auto mb-2" />
              <p className="text-sm">No connected notes yet</p>
              <p className="text-xs">Start linking notes to build your graph</p>
            </div>
          ) : (
            <ScrollArea className="max-h-64">
              <div className="space-y-2">
                {mostLinkedNotes.slice(0, 8).map((note) => (
                  <div
                    key={note.id}
                    className="flex items-center justify-between p-2 hover:bg-muted/50 rounded cursor-pointer"
                    onClick={() => onNavigateToNote?.(note.id)}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">
                        {note.title}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs">
                        {note.connectionCount}
                      </Badge>
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                        <ExternalLink className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}