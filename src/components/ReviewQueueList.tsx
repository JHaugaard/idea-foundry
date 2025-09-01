
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Clock, FileText, Tag as TagIcon } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useNotes } from '@/hooks/useNotes';
import { useLinkNavigation } from '@/hooks/useLinkNavigation';

export const ReviewQueueList: React.FC = () => {
  const { notes, isLoading, error } = useNotes();
  const { navigateToNote } = useLinkNavigation();
  const navigate = useNavigate();

  const handleNoteClick = async (note: any) => {
    if (note.slug) {
      navigate(`/notes/${note.slug}`);
    } else {
      // Fallback to ID-based navigation if no slug exists
      await navigateToNote(undefined, note.id, note.title);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Review Queue
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            Loading notes...
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Review Queue
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-destructive">
            Failed to load notes: {error.message}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (notes.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Review Queue
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No notes awaiting review</p>
            <p className="text-sm">Captured notes will appear here for processing.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Review Queue
          <Badge variant="secondary" className="ml-2">
            {notes.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {notes.map((note) => (
          <Card
            key={note.id}
            className="cursor-pointer hover:shadow-md transition-shadow border-l-4 border-l-primary/20 hover:border-l-primary"
            onClick={() => handleNoteClick(note)}
          >
            <CardContent className="p-4">
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-medium text-sm leading-tight line-clamp-2">
                    {note.title || 'Untitled Note'}
                  </h3>
                  <Badge variant="outline" className="text-xs shrink-0">
                    Review
                  </Badge>
                </div>
                
                {note.content && (
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {note.content}
                  </p>
                )}

                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {formatDistanceToNow(new Date(note.created_at), { addSuffix: true })}
                  </div>

                  {note.tags && note.tags.length > 0 && (
                    <div className="flex items-center gap-1">
                      <TagIcon className="h-3 w-3" />
                      <span>{note.tags.length} tags</span>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </CardContent>
    </Card>
  );
};

export default ReviewQueueList;
