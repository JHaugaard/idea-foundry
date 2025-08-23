import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ArrowLeft, Calendar, Tag, ExternalLink } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import LinkifiedContent from '@/components/LinkifiedContent';
import { BacklinkPanel } from '@/components/BacklinkPanel';

interface Note {
  id: string;
  title: string;
  content: string | null;
  tags: string[] | null;
  created_at: string;
  updated_at: string;
  slug?: string;
}

interface NoteDetailViewProps {
  note: Note;
  onBack: () => void;
  className?: string;
}

export const NoteDetailView: React.FC<NoteDetailViewProps> = ({
  note,
  onBack,
  className = ""
}) => {
  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onBack}
                  className="flex items-center gap-2"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back
                </Button>
              </div>
              <CardTitle className="text-2xl font-bold leading-tight">
                {note.title}
              </CardTitle>
            </div>
          </div>

          {/* Metadata */}
          <div className="flex items-center gap-4 text-sm text-muted-foreground mt-4">
            <div className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              Created {formatDistanceToNow(new Date(note.created_at), { addSuffix: true })}
            </div>
            {note.updated_at !== note.created_at && (
              <div className="flex items-center gap-1">
                <ExternalLink className="h-4 w-4" />
                Updated {formatDistanceToNow(new Date(note.updated_at), { addSuffix: true })}
              </div>
            )}
          </div>

          {/* Tags */}
          {note.tags && note.tags.length > 0 && (
            <div className="flex items-center gap-2 mt-4">
              <Tag className="h-4 w-4 text-muted-foreground" />
              <div className="flex flex-wrap gap-1">
                {note.tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Content</CardTitle>
            </CardHeader>
            <CardContent>
              {note.content ? (
                <ScrollArea className="max-h-[600px]">
                  <LinkifiedContent
                    content={note.content}
                    sourceNoteId={note.id}
                    className="prose prose-sm max-w-none leading-relaxed whitespace-pre-wrap"
                  />
                </ScrollArea>
              ) : (
                <div className="text-center text-muted-foreground py-8">
                  <p>This note has no content.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar with Backlinks */}
        <div className="space-y-4">
          <BacklinkPanel
            noteId={note.id}
            noteTitle={note.title}
            onNavigateToNote={(targetNoteId) => {
              // This would be handled by the parent component
              console.log('Navigate to note:', targetNoteId);
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default NoteDetailView;