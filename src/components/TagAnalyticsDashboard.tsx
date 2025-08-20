import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Download, TrendingUp, Target, Lightbulb, BarChart3, Network } from 'lucide-react';
import { useTagAnalytics } from '@/hooks/useTagAnalytics';
import { TagDistributionChart } from './TagDistributionChart';
import { TagGrowthChart } from './TagGrowthChart';
import { TagRelationshipNetwork } from './TagRelationshipNetwork';
import { TagCombinationsTable } from './TagCombinationsTable';
import { TagInsightsPanel } from './TagInsightsPanel';
import { useToast } from '@/hooks/use-toast';

export const TagAnalyticsDashboard: React.FC = () => {
  const { analytics, isLoading, error } = useTagAnalytics();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('overview');

  const exportData = (format: 'json' | 'csv') => {
    if (!analytics) return;

    try {
      const filename = `tag-analytics-${new Date().toISOString().split('T')[0]}`;
      
      if (format === 'json') {
        const blob = new Blob([JSON.stringify(analytics.exportData, null, 2)], {
          type: 'application/json'
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${filename}.json`;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        // Convert to CSV format
        const csvData = [
          'Metric,Value',
          `Total Tags,${analytics.totalTags}`,
          `Tagged Notes,${analytics.totalTaggedNotes}`,
          `Average Tags per Note,${analytics.averageTagsPerNote.toFixed(2)}`,
          `Health Score,${analytics.healthScore}`,
          `Most Used Tag,${analytics.mostUsedTag?.tag || 'N/A'}`,
          `Most Used Tag Count,${analytics.mostUsedTag?.count || 0}`,
          '',
          'Tag Combinations,Count,Effectiveness',
          ...analytics.topCombinations.map(combo => 
            `"${combo.tags.join(' + ')}",${combo.count},${combo.effectiveness.toFixed(1)}%`
          )
        ].join('\n');

        const blob = new Blob([csvData], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${filename}.csv`;
        a.click();
        URL.revokeObjectURL(url);
      }

      toast({
        title: 'Export Successful',
        description: `Analytics data exported as ${format.toUpperCase()}`,
      });
    } catch (err) {
      toast({
        title: 'Export Failed',
        description: 'Failed to export analytics data',
        variant: 'destructive',
      });
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Tag Analytics</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="space-y-0 pb-2">
                <div className="h-4 bg-muted animate-pulse rounded" />
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-muted animate-pulse rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error || !analytics) {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          Failed to load tag analytics. Please try again later.
        </AlertDescription>
      </Alert>
    );
  }

  const getHealthScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getHealthScoreLabel = (score: number) => {
    if (score >= 80) return 'Excellent';
    if (score >= 60) return 'Good';
    if (score >= 40) return 'Fair';
    return 'Needs Improvement';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Tag Analytics Dashboard</h2>
          <p className="text-muted-foreground">
            Insights into your tag usage patterns and effectiveness
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => exportData('csv')}
          >
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => exportData('json')}
          >
            <Download className="h-4 w-4 mr-2" />
            Export JSON
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tags</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.totalTags}</div>
            <p className="text-xs text-muted-foreground">
              Across {analytics.totalTaggedNotes} notes
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Tags/Note</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analytics.averageTagsPerNote.toFixed(1)}
            </div>
            <p className="text-xs text-muted-foreground">
              {analytics.averageTagsPerNote > 3 ? 'Well organized' : 'Could be improved'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Most Used Tag</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analytics.mostUsedTag?.tag || 'None'}
            </div>
            <p className="text-xs text-muted-foreground">
              Used {analytics.mostUsedTag?.count || 0} times
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Health Score</CardTitle>
            <Lightbulb className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getHealthScoreColor(analytics.healthScore)}`}>
              {analytics.healthScore}%
            </div>
            <div className="flex items-center gap-2 mt-2">
              <Progress value={analytics.healthScore} className="flex-1" />
              <span className="text-xs text-muted-foreground">
                {getHealthScoreLabel(analytics.healthScore)}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="combinations">Combinations</TabsTrigger>
          <TabsTrigger value="relationships">Relationships</TabsTrigger>
          <TabsTrigger value="growth">Growth</TabsTrigger>
          <TabsTrigger value="insights">Insights</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <TagDistributionChart data={analytics.tagDistribution} />
            <Card>
              <CardHeader>
                <CardTitle>Tag Usage Summary</CardTitle>
                <CardDescription>
                  Distribution of tag usage patterns
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Single-use tags</span>
                  <Badge variant="secondary">
                    {analytics.leastUsedTags.length}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Top combinations</span>
                  <Badge variant="secondary">
                    {analytics.topCombinations.length}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Tag relationships</span>
                  <Badge variant="secondary">
                    {analytics.tagRelationships.length}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="combinations" className="space-y-6">
          <TagCombinationsTable combinations={analytics.topCombinations} />
        </TabsContent>

        <TabsContent value="relationships" className="space-y-6">
          <TagRelationshipNetwork relationships={analytics.tagRelationships} />
        </TabsContent>

        <TabsContent value="growth" className="space-y-6">
          <TagGrowthChart data={analytics.tagGrowth} />
        </TabsContent>

        <TabsContent value="insights" className="space-y-6">
          <TagInsightsPanel insights={analytics.insights} />
        </TabsContent>
      </Tabs>
    </div>
  );
};