import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { TrendingUp, Plus } from 'lucide-react';
import { useTags } from '@/hooks/useTags';

interface TagSuggestionsPanelProps {
  currentTags: string[];
  onAddTag: (tag: string) => void;
  maxTags?: number;
}

const TagSuggestionsPanel: React.FC<TagSuggestionsPanelProps> = ({
  currentTags,
  onAddTag,
  maxTags = 10
}) => {
  const { tagStats } = useTags();

  // Get 5 most popular tags that aren't already applied
  const popularTags = React.useMemo(() => {
    if (!tagStats) return [];
    
    return tagStats
      .filter(stat => !currentTags.includes(stat.tag))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [tagStats, currentTags]);

  const canAddMoreTags = currentTags.length < maxTags;

  if (popularTags.length === 0) {
    return null;
  }

  return (
    <Card className="h-fit">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <TrendingUp className="h-4 w-4" />
          Popular Tags
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <ScrollArea className="h-[120px]">
          <div className="space-y-2">
            {popularTags.map((tagStat) => (
              <div
                key={tagStat.tag}
                className="flex items-center justify-between text-sm"
              >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <Badge 
                    variant="outline" 
                    className="text-xs h-5 px-2 flex-shrink-0"
                  >
                    {tagStat.tag}
                  </Badge>
                  <span className="text-xs text-muted-foreground truncate">
                    {tagStat.count} notes
                  </span>
                </div>
                {canAddMoreTags && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 w-6 p-0 flex-shrink-0"
                    onClick={() => onAddTag(tagStat.tag)}
                    title={`Add "${tagStat.tag}" tag`}
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>
        {!canAddMoreTags && (
          <div className="text-xs text-muted-foreground text-center mt-2">
            Maximum tags reached
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TagSuggestionsPanel;