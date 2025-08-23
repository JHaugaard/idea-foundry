import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useLinkStats, TimeFilter } from '@/hooks/useLinkAnalytics';
import { Network, FileText, Link2, Unlink } from 'lucide-react';

interface LinkStatsProps {
  timeFilter: TimeFilter;
}

export const LinkStats: React.FC<LinkStatsProps> = ({ timeFilter }) => {
  const { data: stats, isLoading } = useLinkStats(timeFilter);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="animate-pulse">
                <div className="h-4 bg-muted rounded w-1/2 mb-2"></div>
                <div className="h-8 bg-muted rounded w-3/4"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!stats) return null;

  const statCards = [
    {
      title: 'Total Notes',
      value: stats.totalNotes.toLocaleString(),
      description: 'Notes in your knowledge base',
      icon: FileText,
      color: 'text-primary',
    },
    {
      title: 'Total Connections',
      value: stats.totalConnections.toLocaleString(),
      description: 'Links between notes',
      icon: Link2,
      color: 'text-secondary',
    },
    {
      title: 'Avg Connections',
      value: stats.averageConnectionsPerNote.toFixed(1),
      description: 'Connections per note',
      icon: Network,
      color: 'text-accent',
    },
    {
      title: 'Orphaned Notes',
      value: stats.orphanedNotes.toLocaleString(),
      description: 'Notes without connections',
      icon: Unlink,
      color: 'text-muted-foreground',
    },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat) => {
          const IconComponent = stat.icon;
          return (
            <Card key={stat.title}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                <IconComponent className={`h-4 w-4 ${stat.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <p className="text-xs text-muted-foreground">
                  {stat.description}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>
      
      {stats.mostConnectedNote && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Most Connected Note</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">{stats.mostConnectedNote.title}</p>
                <p className="text-xs text-muted-foreground">
                  {stats.mostConnectedNote.connectionCount} connections
                </p>
              </div>
              <Badge variant="secondary">
                Hub
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};