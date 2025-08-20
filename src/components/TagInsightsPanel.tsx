import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { 
  AlertTriangle, 
  CheckCircle, 
  Info, 
  TrendingDown, 
  TrendingUp,
  Lightbulb
} from 'lucide-react';
import { TagInsight } from '@/hooks/useTagAnalytics';

interface TagInsightsPanelProps {
  insights: TagInsight[];
}

export const TagInsightsPanel: React.FC<TagInsightsPanelProps> = ({ insights }) => {
  const getInsightIcon = (type: TagInsight['type']) => {
    switch (type) {
      case 'overused':
        return <AlertTriangle className="h-4 w-4" />;
      case 'underused':
        return <TrendingDown className="h-4 w-4" />;
      case 'effective':
        return <CheckCircle className="h-4 w-4" />;
      case 'redundant':
        return <Info className="h-4 w-4" />;
      case 'missing':
        return <TrendingUp className="h-4 w-4" />;
      default:
        return <Lightbulb className="h-4 w-4" />;
    }
  };

  const getInsightVariant = (type: TagInsight['type']) => {
    switch (type) {
      case 'overused':
      case 'redundant':
        return 'destructive' as const;
      case 'underused':
        return 'default' as const;
      case 'effective':
        return 'default' as const;
      case 'missing':
        return 'default' as const;
      default:
        return 'default' as const;
    }
  };

  const getImpactColor = (impact: TagInsight['impact']) => {
    switch (impact) {
      case 'high':
        return 'text-red-600 bg-red-50';
      case 'medium':
        return 'text-yellow-600 bg-yellow-50';
      case 'low':
        return 'text-blue-600 bg-blue-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  const getInsightTitle = (type: TagInsight['type']) => {
    switch (type) {
      case 'overused':
        return 'Overused Tags';
      case 'underused':
        return 'Cleanup Opportunity';
      case 'effective':
        return 'Effective Strategy';
      case 'redundant':
        return 'Redundant Tags';
      case 'missing':
        return 'Missing Tags';
      default:
        return 'Insight';
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5" />
            Tag Usage Insights
          </CardTitle>
          <CardDescription>
            AI-powered recommendations to improve your tag organization
          </CardDescription>
        </CardHeader>
        <CardContent>
          {insights.length > 0 ? (
            <div className="space-y-4">
              {insights.map((insight, index) => (
                <Alert key={index} variant={getInsightVariant(insight.type)}>
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-0.5">
                      {getInsightIcon(insight.type)}
                    </div>
                    <div className="flex-1 space-y-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-semibold">{insight.title}</h4>
                          <Badge 
                            variant="outline" 
                            className={`text-xs ${getImpactColor(insight.impact)}`}
                          >
                            {insight.impact} impact
                          </Badge>
                        </div>
                        <AlertDescription className="text-sm">
                          {insight.description}
                        </AlertDescription>
                      </div>

                      {insight.tags.length > 0 && (
                        <div>
                          <p className="text-sm font-medium mb-2">Related Tags:</p>
                          <div className="flex flex-wrap gap-1">
                            {insight.tags.slice(0, 8).map(tag => (
                              <Badge key={tag} variant="secondary" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                            {insight.tags.length > 8 && (
                              <Badge variant="outline" className="text-xs">
                                +{insight.tags.length - 8} more
                              </Badge>
                            )}
                          </div>
                        </div>
                      )}

                      <div className="bg-muted/50 rounded-md p-3">
                        <p className="text-sm font-medium mb-1">💡 Recommendation:</p>
                        <p className="text-sm text-muted-foreground">
                          {insight.recommendation}
                        </p>
                      </div>
                    </div>
                  </div>
                </Alert>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">Great Job!</h3>
              <p className="text-muted-foreground mb-4">
                Your tag usage looks healthy. No immediate improvements needed.
              </p>
              <p className="text-sm text-muted-foreground">
                Keep using tags consistently to maintain good organization.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      {insights.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>
              Take action on your tag insights
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm">
                Clean up unused tags
              </Button>
              <Button variant="outline" size="sm">
                Merge similar tags
              </Button>
              <Button variant="outline" size="sm">
                Create tag templates
              </Button>
              <Button variant="outline" size="sm">
                Export tag backup
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};