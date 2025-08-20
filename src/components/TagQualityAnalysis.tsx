import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAITagPreferences } from '@/hooks/useAITagPreferences';
import { useTags } from '@/hooks/useTags';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  BarChart3, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle, 
  Merge, 
  Loader2,
  RefreshCw,
  Target
} from 'lucide-react';

interface QualityAnalysisResult {
  overall_quality: number;
  tag_analysis: Array<{
    tag: string;
    quality_score: number;
    issues: string[];
    suggestions: string[];
    merge_candidates: string[];
  }>;
  duplicates: Array<{
    group: string[];
    suggested_merge: string;
    confidence: number;
  }>;
  recommendations: string[];
}

interface CleanupResult {
  duplicates: Array<{
    group: string[];
    suggested_merge: string;
    confidence: number;
    reason: string;
  }>;
  inconsistencies: Array<{
    tags: string[];
    issue: string;
    suggested_fix: string;
  }>;
  underused: Array<{
    tag: string;
    usage_count: number;
    suggested_action: string;
  }>;
  recommendations: {
    priority: 'high' | 'medium' | 'low';
    summary: string;
  };
}

export default function TagQualityAnalysis() {
  const { tags } = useTags();
  const { qualityAnalysis } = useAITagPreferences();
  const { toast } = useToast();
  
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<QualityAnalysisResult | null>(null);
  const [cleanupResult, setCleanupResult] = useState<CleanupResult | null>(null);

  const runQualityAnalysis = async () => {
    if (!tags || tags.length === 0) {
      toast({
        title: "No tags found",
        description: "You need some tags before running quality analysis",
        variant: "destructive",
      });
      return;
    }

    setIsAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke('suggest-tags', {
        body: {
          mode: 'quality_analysis',
          existingTags: tags.slice(0, 50), // Analyze first 50 tags
          allUserTags: tags
        }
      });

      if (error) throw error;
      setAnalysisResult(data);
      
      toast({
        title: "Analysis complete",
        description: `Analyzed ${tags.length} tags for quality issues`,
      });
    } catch (error) {
      toast({
        title: "Analysis failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const runCleanupAnalysis = async () => {
    if (!tags || tags.length === 0) return;

    setIsAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke('suggest-tags', {
        body: {
          mode: 'cleanup',
          allUserTags: tags
        }
      });

      if (error) throw error;
      setCleanupResult(data);
      
      toast({
        title: "Cleanup analysis complete",
        description: "Found cleanup opportunities for your tags",
      });
    } catch (error) {
      toast({
        title: "Cleanup analysis failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getQualityColor = (score: number) => {
    if (score >= 0.8) return 'text-green-600';
    if (score >= 0.6) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getQualityBadgeVariant = (score: number) => {
    if (score >= 0.8) return 'default';
    if (score >= 0.6) return 'secondary';
    return 'destructive';
  };

  const getIssueIcon = (issue: string) => {
    switch (issue) {
      case 'duplicate':
        return <Merge className="h-3 w-3" />;
      case 'too_generic':
        return <Target className="h-3 w-3" />;
      default:
        return <AlertTriangle className="h-3 w-3" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Analysis Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Tag Quality Analysis
          </CardTitle>
          <CardDescription>
            Analyze your tags for quality issues and get improvement suggestions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Button 
              onClick={runQualityAnalysis}
              disabled={isAnalyzing || !tags || tags.length === 0}
              className="flex items-center gap-2"
            >
              {isAnalyzing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <TrendingUp className="h-4 w-4" />
              )}
              Quality Analysis
            </Button>
            <Button 
              onClick={runCleanupAnalysis}
              disabled={isAnalyzing || !tags || tags.length === 0}
              variant="outline"
              className="flex items-center gap-2"
            >
              {isAnalyzing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              Cleanup Analysis
            </Button>
          </div>
          
          {(!tags || tags.length === 0) && (
            <Alert className="mt-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                You need to create some tags before running quality analysis.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Results */}
      {(analysisResult || cleanupResult) && (
        <Card>
          <CardHeader>
            <CardTitle>Analysis Results</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="quality" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="quality">Quality Analysis</TabsTrigger>
                <TabsTrigger value="cleanup">Cleanup Suggestions</TabsTrigger>
              </TabsList>

              <TabsContent value="quality" className="space-y-4">
                {analysisResult ? (
                  <>
                    {/* Overall Quality Score */}
                    <Card>
                      <CardContent className="pt-6">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium">Overall Quality Score</span>
                          <span className={`text-2xl font-bold ${getQualityColor(analysisResult.overall_quality)}`}>
                            {(analysisResult.overall_quality * 100).toFixed(0)}%
                          </span>
                        </div>
                        <Progress value={analysisResult.overall_quality * 100} className="h-2" />
                      </CardContent>
                    </Card>

                    {/* Individual Tag Analysis */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Individual Tag Analysis</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ScrollArea className="h-64">
                          <div className="space-y-3">
                            {analysisResult.tag_analysis.map((analysis) => (
                              <div key={analysis.tag} className="border rounded-lg p-3 space-y-2">
                                <div className="flex items-center justify-between">
                                  <Badge variant="outline">{analysis.tag}</Badge>
                                  <Badge variant={getQualityBadgeVariant(analysis.quality_score)}>
                                    {(analysis.quality_score * 100).toFixed(0)}%
                                  </Badge>
                                </div>
                                
                                {analysis.issues.length > 0 && (
                                  <div className="space-y-1">
                                    <div className="text-xs font-medium text-muted-foreground">Issues:</div>
                                    <div className="flex flex-wrap gap-1">
                                      {analysis.issues.map((issue, index) => (
                                        <Badge key={index} variant="destructive" className="text-xs flex items-center gap-1">
                                          {getIssueIcon(issue)}
                                          {issue.replace(/_/g, ' ')}
                                        </Badge>
                                      ))}
                                    </div>
                                  </div>
                                )}
                                
                                {analysis.suggestions.length > 0 && (
                                  <div className="space-y-1">
                                    <div className="text-xs font-medium text-muted-foreground">Suggestions:</div>
                                    <div className="flex flex-wrap gap-1">
                                      {analysis.suggestions.map((suggestion, index) => (
                                        <Badge key={index} variant="secondary" className="text-xs">
                                          {suggestion}
                                        </Badge>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </ScrollArea>
                      </CardContent>
                    </Card>

                    {/* Duplicate Groups */}
                    {analysisResult.duplicates.length > 0 && (
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-lg flex items-center gap-2">
                            <Merge className="h-4 w-4" />
                            Duplicate Groups
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-3">
                            {analysisResult.duplicates.map((duplicate, index) => (
                              <div key={index} className="border rounded-lg p-3">
                                <div className="flex items-center justify-between mb-2">
                                  <span className="text-sm font-medium">Merge Suggestion</span>
                                  <Badge variant="outline">
                                    {(duplicate.confidence * 100).toFixed(0)}% confidence
                                  </Badge>
                                </div>
                                <div className="space-y-2">
                                  <div className="flex flex-wrap gap-1">
                                    {duplicate.group.map((tag, tagIndex) => (
                                      <Badge key={tagIndex} variant="secondary">{tag}</Badge>
                                    ))}
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm text-muted-foreground">→</span>
                                    <Badge variant="default">{duplicate.suggested_merge}</Badge>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    Run quality analysis to see results here
                  </div>
                )}
              </TabsContent>

              <TabsContent value="cleanup" className="space-y-4">
                {cleanupResult ? (
                  <>
                    {/* Priority Summary */}
                    <Card>
                      <CardContent className="pt-6">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-sm font-medium">Priority:</span>
                          <Badge variant={
                            cleanupResult.recommendations.priority === 'high' ? 'destructive' :
                            cleanupResult.recommendations.priority === 'medium' ? 'secondary' : 'outline'
                          }>
                            {cleanupResult.recommendations.priority}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {cleanupResult.recommendations.summary}
                        </p>
                      </CardContent>
                    </Card>

                    {/* Cleanup Categories */}
                    <div className="grid gap-4">
                      {cleanupResult.duplicates.length > 0 && (
                        <Card>
                          <CardHeader>
                            <CardTitle className="text-lg">Duplicates</CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-3">
                            {cleanupResult.duplicates.map((duplicate, index) => (
                              <div key={index} className="border rounded-lg p-3">
                                <div className="flex items-center justify-between mb-2">
                                  <span className="text-sm font-medium">{duplicate.reason}</span>
                                  <Badge variant="outline">
                                    {(duplicate.confidence * 100).toFixed(0)}% confidence
                                  </Badge>
                                </div>
                                <div className="space-y-2">
                                  <div className="flex flex-wrap gap-1">
                                    {duplicate.group.map((tag, tagIndex) => (
                                      <Badge key={tagIndex} variant="secondary">{tag}</Badge>
                                    ))}
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm text-muted-foreground">→</span>
                                    <Badge variant="default">{duplicate.suggested_merge}</Badge>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </CardContent>
                        </Card>
                      )}

                      {cleanupResult.inconsistencies.length > 0 && (
                        <Card>
                          <CardHeader>
                            <CardTitle className="text-lg">Inconsistencies</CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-3">
                            {cleanupResult.inconsistencies.map((inconsistency, index) => (
                              <div key={index} className="border rounded-lg p-3">
                                <div className="space-y-2">
                                  <div className="text-sm font-medium">{inconsistency.issue}</div>
                                  <div className="flex items-center gap-2">
                                    <Badge variant="destructive">{inconsistency.tags[0]}</Badge>
                                    <span className="text-sm text-muted-foreground">→</span>
                                    <Badge variant="default">{inconsistency.suggested_fix}</Badge>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </CardContent>
                        </Card>
                      )}

                      {cleanupResult.underused.length > 0 && (
                        <Card>
                          <CardHeader>
                            <CardTitle className="text-lg">Underused Tags</CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-3">
                            {cleanupResult.underused.map((underused, index) => (
                              <div key={index} className="border rounded-lg p-3">
                                <div className="flex items-center justify-between">
                                  <Badge variant="outline">{underused.tag}</Badge>
                                  <span className="text-sm text-muted-foreground">
                                    Used {underused.usage_count} time{underused.usage_count !== 1 ? 's' : ''}
                                  </span>
                                </div>
                                <div className="mt-2 text-sm text-muted-foreground">
                                  {underused.suggested_action.replace(/_/g, ' ')}
                                </div>
                              </div>
                            ))}
                          </CardContent>
                        </Card>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    Run cleanup analysis to see suggestions here
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}
    </div>
  );
}