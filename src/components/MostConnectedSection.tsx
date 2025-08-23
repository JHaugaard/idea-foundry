import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useLinkNetworkStats } from '@/hooks/useLinkNetwork';
import { useLinkNavigation } from '@/hooks/useLinkNavigation';
import { Network, ArrowRight, ArrowLeft, ExternalLink } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface MostConnectedSectionProps {
  limit?: number;
}

export default function MostConnectedSection({ limit = 10 }: MostConnectedSectionProps) {
  const { data: networkStats, isLoading } = useLinkNetworkStats();
  const { navigateToNote } = useLinkNavigation();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Network className="h-5 w-5" />
            Most Connected Notes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const mostConnected = networkStats
    ?.filter(note => note.totalConnections > 0)
    .sort((a, b) => b.totalConnections - a.totalConnections)
    .slice(0, limit) || [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Network className="h-5 w-5" />
          Most Connected Notes
        </CardTitle>
      </CardHeader>
      <CardContent>
        {mostConnected.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Network className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No connected notes yet</p>
            <p className="text-sm">Start creating links between your notes to see connections</p>
          </div>
        ) : (
          <div className="space-y-3">
            {mostConnected.map((note) => (
              <div key={note.noteId} className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-medium truncate">{note.title}</h4>
                    <Badge variant="secondary" className="shrink-0">
                      {note.totalConnections} connections
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <ArrowLeft className="h-3 w-3" />
                      <span>{note.incomingCount} incoming</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <ArrowRight className="h-3 w-3" />
                      <span>{note.outgoingCount} outgoing</span>
                    </div>
                    <span>•</span>
                    <span>Updated {formatDistanceToNow(new Date(note.updatedAt), { addSuffix: true })}</span>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigateToNote(note.slug, note.noteId)}
                  className="ml-2 shrink-0"
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}