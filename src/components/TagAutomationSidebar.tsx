import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { useTags } from '@/hooks/useTags';
import { useTagAutomation } from '@/hooks/useTagAutomation';
import BatchTagOperations from '@/components/BatchTagOperations';
import TagAutomationPanel from '@/components/TagAutomationPanel';
import { 
  Sparkles, 
  Zap, 
  TrendingUp,
  Clock,
  BarChart3,
  Settings,
  RefreshCw
} from 'lucide-react';

interface TagAutomationSidebarProps {
  selectedNotes?: Array<{ id: string; title: string; tags: string[] }>;
}

export default function TagAutomationSidebar({ selectedNotes = [] }: TagAutomationSidebarProps) {
  const { tags, tagStats, isLoading, invalidateTags } = useTags();
  const { operationHistory, clearHistory } = useTagAutomation();
  
  const [showBatchOperations, setShowBatchOperations] = useState(false);
  const [showAutomationPanel, setShowAutomationPanel] = useState(false);

  const totalNotes = tagStats?.reduce((sum, stat) => sum + stat.count, 0) || 0;
  const averageTagsPerNote = totalNotes > 0 ? (tags.length / totalNotes).toFixed(1) : '0';
  
  // Get most popular tags
  const popularTags = tagStats
    ?.sort((a, b) => b.count - a.count)
    .slice(0, 5) || [];

  // Get recent operations
  const recentOperations = operationHistory.slice(0, 3);

  return (
    <div className="w-80 border-l bg-sidebar p-4 space-y-4 overflow-y-auto">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-sidebar-foreground">Tag Automation</h3>
        <Button
          size="sm"
          variant="ghost"
          onClick={invalidateTags}
          disabled={isLoading}
          className="text-sidebar-foreground hover:bg-sidebar-accent"
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {/* Quick Stats */}
      <Card className="bg-sidebar-accent border-sidebar-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm text-sidebar-foreground">Quick Stats</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between items-center text-sm">
            <span className="text-sidebar-foreground">Total Tags</span>
            <Badge variant="secondary" className="bg-sidebar-primary text-sidebar-primary-foreground">
              {tags.length}
            </Badge>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="text-sidebar-foreground">Total Notes</span>
            <Badge variant="secondary" className="bg-sidebar-primary text-sidebar-primary-foreground">
              {totalNotes}
            </Badge>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="text-sidebar-foreground">Avg Tags/Note</span>
            <Badge variant="outline" className="border-sidebar-border text-sidebar-foreground">
              {averageTagsPerNote}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Popular Tags */}
      {popularTags.length > 0 && (
        <Card className="bg-sidebar-accent border-sidebar-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-sidebar-foreground flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Popular Tags
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {popularTags.map((tagStat) => {
              const percentage = totalNotes > 0 ? (tagStat.count / totalNotes) * 100 : 0;
              return (
                <div key={tagStat.tag} className="space-y-1">
                  <div className="flex justify-between items-center text-xs">
                    <Badge 
                      variant="outline" 
                      className="border-sidebar-border text-sidebar-foreground max-w-24 truncate"
                    >
                      {tagStat.tag}
                    </Badge>
                    <span className="text-sidebar-foreground">{tagStat.count}</span>
                  </div>
                  <Progress 
                    value={percentage} 
                    className="h-1 bg-sidebar-border [&>div]:bg-sidebar-primary" 
                  />
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Automation Actions */}
      <Card className="bg-sidebar-accent border-sidebar-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm text-sidebar-foreground flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            Smart Actions
          </CardTitle>
          <CardDescription className="text-xs text-sidebar-foreground/70">
            AI-powered tag suggestions and bulk operations
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowAutomationPanel(true)}
            className="w-full justify-start border-sidebar-border text-sidebar-foreground hover:bg-sidebar-primary hover:text-sidebar-primary-foreground"
          >
            <Zap className="h-4 w-4 mr-2" />
            Get AI Suggestions
          </Button>
          
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowBatchOperations(true)}
            disabled={selectedNotes.length === 0}
            className="w-full justify-start border-sidebar-border text-sidebar-foreground hover:bg-sidebar-primary hover:text-sidebar-primary-foreground"
          >
            <Settings className="h-4 w-4 mr-2" />
            Batch Operations
            {selectedNotes.length > 0 && (
              <Badge className="ml-2 bg-sidebar-primary text-sidebar-primary-foreground">
                {selectedNotes.length}
              </Badge>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Recent Operations */}
      {recentOperations.length > 0 && (
        <Card className="bg-sidebar-accent border-sidebar-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-sidebar-foreground flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Recent Operations
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {recentOperations.map((operation) => (
              <div key={operation.id} className="text-xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-sidebar-foreground/80 capitalize">
                    {operation.type} tags
                  </span>
                  <Badge variant="outline" className="border-sidebar-border text-sidebar-foreground">
                    {operation.preview.affected}
                  </Badge>
                </div>
                <div className="text-sidebar-foreground/60 truncate">
                  {operation.tags.slice(0, 2).join(', ')}
                  {operation.tags.length > 2 && `, +${operation.tags.length - 2}`}
                </div>
              </div>
            ))}
            
            <Separator className="bg-sidebar-border" />
            
            <Button
              size="sm"
              variant="ghost"
              onClick={clearHistory}
              className="w-full text-xs text-sidebar-foreground/70 hover:bg-sidebar-primary hover:text-sidebar-primary-foreground"
            >
              Clear History
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Dialogs */}
      <BatchTagOperations
        open={showBatchOperations}
        onOpenChange={setShowBatchOperations}
        notes={selectedNotes}
        onCompleted={() => setShowBatchOperations(false)}
      />

      {showAutomationPanel && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="max-w-2xl w-full">
            <TagAutomationPanel
              onTagsApplied={() => setShowAutomationPanel(false)}
            />
            <div className="mt-4 flex justify-end">
              <Button 
                variant="outline" 
                onClick={() => setShowAutomationPanel(false)}
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}