import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useOrphanedNotes } from '@/hooks/useLinkNetwork';
import { useLinkNavigation } from '@/hooks/useLinkNavigation';
import { AlertCircle, ExternalLink } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface OrphanedNotesSectionProps {
  limit?: number;
}

export default function OrphanedNotesSection({ limit = 10 }: OrphanedNotesSectionProps) {
  const { data: orphanedNotes, isLoading } = useOrphanedNotes();
  const { navigateToNote } = useLinkNavigation();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            Orphaned Notes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-12 bg-muted animate-pulse rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const displayNotes = orphanedNotes?.slice(0, limit) || [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertCircle className="h-5 w-5" />
          Orphaned Notes
          {orphanedNotes && orphanedNotes.length > 0 && (
            <span className="text-sm font-normal text-muted-foreground">
              ({orphanedNotes.length})
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {displayNotes.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No orphaned notes</p>
            <p className="text-sm">All your notes are connected to the network</p>
          </div>
        ) : (
          <div className="space-y-3">
            {displayNotes.map((note) => (
              <div key={note.id} className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium truncate mb-1">{note.title}</h4>
                  <p className="text-sm text-muted-foreground">
                    Updated {formatDistanceToNow(new Date(note.updatedAt), { addSuffix: true })}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigateToNote(note.slug, note.id)}
                  className="ml-2 shrink-0"
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </div>
            ))}
            {orphanedNotes && orphanedNotes.length > limit && (
              <div className="text-center pt-2">
                <p className="text-sm text-muted-foreground">
                  And {orphanedNotes.length - limit} more orphaned notes
                </p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}