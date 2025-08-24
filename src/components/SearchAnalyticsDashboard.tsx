import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Download, Search, TrendingUp, Clock, Target } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { usePerformanceMonitor } from '@/utils/performanceMonitor';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';

interface SearchAnalytics {
  id: string;
  query_text: string;
  query_type: 'fuzzy' | 'semantic' | 'hybrid';
  results_count: number;
  search_duration_ms: number;
  clicked_result_id?: string;
  created_at: string;
}

interface AnalyticsStats {
  totalSearches: number;
  avgDuration: number;
  successRate: number;
  topQueries: Array<{ query: string; count: number }>;
  typeDistribution: Record<string, number>;
}

export function SearchAnalyticsDashboard() {
  const { user } = useAuth();
  const { getSummary, exportMetrics } = usePerformanceMonitor();
  const [timeRange, setTimeRange] = useState<'24h' | '7d' | '30d'>('7d');

  // Calculate date range
  const endDate = new Date();
  const startDate = subDays(endDate, timeRange === '24h' ? 1 : timeRange === '7d' ? 7 : 30);

  // Fetch analytics data
  const { data: analytics = [], isLoading } = useQuery({
    queryKey: ['search-analytics', user?.id, timeRange],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('search_analytics')
        .select('*')
        .eq('user_id', user.id)
        .gte('created_at', startOfDay(startDate).toISOString())
        .lte('created_at', endOfDay(endDate).toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as SearchAnalytics[];
    },
    enabled: !!user?.id,
  });

  // Calculate statistics
  const stats: AnalyticsStats = {
    totalSearches: analytics.length,
    avgDuration: analytics.length > 0 
      ? analytics.reduce((sum, a) => sum + a.search_duration_ms, 0) / analytics.length
      : 0,
    successRate: analytics.length > 0 
      ? (analytics.filter(a => a.results_count > 0).length / analytics.length) * 100
      : 0,
    topQueries: Object.entries(
      analytics.reduce((acc, a) => {
        acc[a.query_text] = (acc[a.query_text] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    )
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([query, count]) => ({ query, count })),
    typeDistribution: analytics.reduce((acc, a) => {
      acc[a.query_type] = (acc[a.query_type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>)
  };

  const handleExport = () => {
    const exportData = {
      timeRange,
      period: `${format(startDate, 'yyyy-MM-dd')} to ${format(endDate, 'yyyy-MM-dd')}`,
      stats,
      analytics,
      performanceMetrics: getSummary()
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json'
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `search-analytics-${format(new Date(), 'yyyy-MM-dd-HHmm')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Search Analytics</h2>
          <p className="text-muted-foreground">
            Monitor search performance and user behavior
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={timeRange} onValueChange={(value: any) => setTimeRange(value)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="24h">Last 24h</SelectItem>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={handleExport} variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Searches</CardTitle>
            <Search className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalSearches}</div>
            <p className="text-xs text-muted-foreground">
              {timeRange === '24h' ? 'in last 24 hours' : `in last ${timeRange === '7d' ? '7 days' : '30 days'}`}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Duration</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Math.round(stats.avgDuration)}ms</div>
            <p className="text-xs text-muted-foreground">
              per search query
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.successRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">
              searches with results
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Search Types</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex gap-1 flex-wrap">
              {Object.entries(stats.typeDistribution).map(([type, count]) => (
                <Badge key={type} variant="secondary" className="text-xs">
                  {type}: {count}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="queries" className="space-y-4">
        <TabsList>
          <TabsTrigger value="queries">Top Queries</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="recent">Recent Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="queries">
          <Card>
            <CardHeader>
              <CardTitle>Most Searched Queries</CardTitle>
              <CardDescription>
                Popular search terms in the selected time period
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {stats.topQueries.map(({ query, count }, index) => (
                  <div key={query} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-6 h-6 rounded-full bg-muted text-xs font-medium">
                        {index + 1}
                      </div>
                      <span className="font-medium truncate max-w-[300px]">{query}</span>
                    </div>
                    <Badge variant="outline">{count} searches</Badge>
                  </div>
                ))}
                {stats.topQueries.length === 0 && (
                  <p className="text-muted-foreground text-center py-8">
                    No search queries in this time period
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance">
          <Card>
            <CardHeader>
              <CardTitle>Performance Metrics</CardTitle>
              <CardDescription>
                Client-side performance monitoring data
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Object.entries(getSummary()).map(([operation, metrics]) => {
                  const typedMetrics = metrics as { count: number; avgDuration: number; maxDuration: number };
                  return (
                    <div key={operation} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">{operation.replace(/_/g, ' ')}</p>
                        <p className="text-sm text-muted-foreground">
                          {typedMetrics.count} operations
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{typedMetrics.avgDuration.toFixed(1)}ms avg</p>
                        <p className="text-sm text-muted-foreground">
                          {typedMetrics.maxDuration.toFixed(1)}ms max
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="recent">
          <Card>
            <CardHeader>
              <CardTitle>Recent Search Activity</CardTitle>
              <CardDescription>
                Latest search queries and their performance
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {analytics.slice(0, 20).map((search) => (
                  <div key={search.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{search.query_text}</p>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Badge variant="outline" className="text-xs">
                          {search.query_type}
                        </Badge>
                        <span>{search.results_count} results</span>
                        <span>{search.search_duration_ms}ms</span>
                        <span>{format(new Date(search.created_at), 'MMM d, HH:mm')}</span>
                      </div>
                    </div>
                  </div>
                ))}
                {analytics.length === 0 && (
                  <p className="text-muted-foreground text-center py-8">
                    No recent search activity
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}