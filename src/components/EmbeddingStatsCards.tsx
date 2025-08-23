import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Brain, Clock, TrendingUp, DollarSign, AlertTriangle, CheckCircle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface EmbeddingStats {
  totalNotes: number;
  notesWithEmbeddings: number;
  failedNotes: number;
  outdatedNotes: number;
  successRate: number;
  lastBatchRun?: string;
  estimatedCost: number;
}

interface EmbeddingStatsCardsProps {
  stats: EmbeddingStats | null | undefined;
  isLoading: boolean;
  activeOperation: string | null;
}

export const EmbeddingStatsCards = ({ stats, isLoading, activeOperation }: EmbeddingStatsCardsProps) => {
  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-4 rounded" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-7 w-16 mb-1" />
              <Skeleton className="h-3 w-20" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!stats) return null;

  const completionRate = stats.totalNotes > 0 ? (stats.notesWithEmbeddings / stats.totalNotes) * 100 : 0;
  
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card className="relative">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Notes</CardTitle>
          <Brain className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.totalNotes}</div>
          <div className="flex items-center space-x-2 text-xs text-muted-foreground mt-1">
            <span>{stats.notesWithEmbeddings} with embeddings</span>
            {activeOperation && (
              <Badge variant="secondary" className="animate-pulse">
                Processing...
              </Badge>
            )}
          </div>
          <Progress value={completionRate} className="mt-2 h-2" />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-success">
            {stats.successRate.toFixed(1)}%
          </div>
          <div className="flex items-center space-x-1 text-xs text-muted-foreground mt-1">
            <CheckCircle className="h-3 w-3" />
            <span>{stats.notesWithEmbeddings} successful</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Issues</CardTitle>
          <AlertTriangle className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-warning">
            {stats.failedNotes + stats.outdatedNotes}
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            {stats.failedNotes} failed, {stats.outdatedNotes} outdated
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Estimated Cost</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            ${stats.estimatedCost.toFixed(4)}
          </div>
          <div className="flex items-center space-x-1 text-xs text-muted-foreground mt-1">
            <Clock className="h-3 w-3" />
            <span>
              {stats.lastBatchRun 
                ? `Last run ${new Date(stats.lastBatchRun).toLocaleDateString()}`
                : 'Never run'
              }
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};