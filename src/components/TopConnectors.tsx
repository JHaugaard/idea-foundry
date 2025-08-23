import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useTopConnectors, TimeFilter } from '@/hooks/useLinkAnalytics';
import { ArrowUpRight, ArrowDownLeft, Link2 } from 'lucide-react';

interface TopConnectorsProps {
  timeFilter: TimeFilter;
  limit?: number;
}

export const TopConnectors: React.FC<TopConnectorsProps> = ({ timeFilter, limit = 10 }) => {
  const { data: connectors, isLoading } = useTopConnectors(timeFilter, limit);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Top Connected Notes</CardTitle>
          <CardDescription>
            Notes with the most connections {timeFilter === '7days' ? 'in the last 7 days' : timeFilter === '30days' ? 'in the last 30 days' : 'of all time'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-muted rounded w-1/2"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Top Connected Notes</CardTitle>
        <CardDescription>
          Notes with the most connections {timeFilter === '7days' ? 'in the last 7 days' : timeFilter === '30days' ? 'in the last 30 days' : 'of all time'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {connectors && connectors.length > 0 ? (
          <div className="space-y-4">
            {connectors.map((connector, index) => (
              <div 
                key={connector.noteId} 
                className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-semibold text-sm">
                    {index + 1}
                  </div>
                  <div>
                    <p className="font-medium truncate max-w-xs">
                      {connector.title}
                    </p>
                    <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                      <div className="flex items-center space-x-1">
                        <ArrowDownLeft className="h-3 w-3" />
                        <span>{connector.incomingCount}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <ArrowUpRight className="h-3 w-3" />
                        <span>{connector.outgoingCount}</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge variant="secondary" className="flex items-center space-x-1">
                    <Link2 className="h-3 w-3" />
                    <span>{connector.totalConnections}</span>
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex items-center justify-center h-32 text-muted-foreground">
            No connected notes found for this period
          </div>
        )}
      </CardContent>
    </Card>
  );
};