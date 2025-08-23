import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useRecentLinks } from '@/hooks/useLinkNetwork';
import { Clock, ArrowRight } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface RecentlyLinkedSectionProps {
  limit?: number;
}

export default function RecentlyLinkedSection({ limit = 10 }: RecentlyLinkedSectionProps) {
  const { data: recentLinks, isLoading } = useRecentLinks(limit);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Recent Link Activity
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

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Recent Link Activity
        </CardTitle>
      </CardHeader>
      <CardContent>
        {recentLinks?.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No recent link activity</p>
            <p className="text-sm">Links will appear here as you create connections between notes</p>
          </div>
        ) : (
          <div className="space-y-3">
            {recentLinks?.map((link) => (
              <div key={link.id} className="flex items-center gap-3 p-3 rounded-lg border bg-card">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium truncate">{link.sourceTitle}</span>
                    <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="font-medium truncate">{link.targetTitle}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    {link.anchorText && (
                      <>
                        <Badge variant="outline" className="text-xs">
                          "{link.anchorText}"
                        </Badge>
                        <span>•</span>
                      </>
                    )}
                    <span>{formatDistanceToNow(new Date(link.createdAt), { addSuffix: true })}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}