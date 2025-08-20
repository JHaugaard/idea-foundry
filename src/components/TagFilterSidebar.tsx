import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useEnhancedSearch } from '@/hooks/useEnhancedSearch';
import { useTags } from '@/hooks/useTags';
import { 
  Search, 
  Tag as TagIcon, 
  ChevronDown, 
  ChevronRight,
  X,
  Filter,
  Star,
  Calendar,
  Folder,
  Hash
} from 'lucide-react';

interface TagGroup {
  name: string;
  tags: Array<{
    name: string;
    count: number;
    percentage: number;
  }>;
  expanded: boolean;
}

interface TagFilterSidebarProps {
  className?: string;
}

export function TagFilterSidebar({ className = "" }: TagFilterSidebarProps) {
  const { searchQuery, updateSearchQuery } = useEnhancedSearch();
  const { tagStats } = useTags();
  
  const [tagSearch, setTagSearch] = useState('');
  const [groupStates, setGroupStates] = useState<Record<string, boolean>>({
    popular: true,
    recent: false,
    alphabetical: false,
    categories: false
  });

  // Group tags by categories
  const tagGroups = useMemo((): TagGroup[] => {
    if (!tagStats.length) return [];

    const maxUsage = Math.max(...tagStats.map(t => t.count));
    
    // Filter tags based on search
    const filteredStats = tagStats.filter(stat =>
      stat.tag.toLowerCase().includes(tagSearch.toLowerCase())
    );

    // Popular tags (top 20% by usage)
    const popularThreshold = maxUsage * 0.2;
    const popularTags = filteredStats
      .filter(stat => stat.count >= popularThreshold)
      .slice(0, 15)
      .map(stat => ({
        name: stat.tag,
        count: stat.count,
        percentage: (stat.count / maxUsage) * 100
      }));

    // Recent tags (by creation/usage patterns - simplified)
    const recentTags = filteredStats
      .slice(0, 20)
      .map(stat => ({
        name: stat.tag,
        count: stat.count,
        percentage: (stat.count / maxUsage) * 100
      }));

    // Alphabetical
    const alphabeticalTags = [...filteredStats]
      .sort((a, b) => a.tag.localeCompare(b.tag))
      .slice(0, 50)
      .map(stat => ({
        name: stat.tag,
        count: stat.count,
        percentage: (stat.count / maxUsage) * 100
      }));

    // Category-based grouping (by tag patterns)
    const categoryTags = {
      'Development': filteredStats.filter(s => 
        /^(code|dev|tech|programming|web|api|database|frontend|backend|react|js|css|html|typescript|python|node)/.test(s.tag)
      ),
      'Work': filteredStats.filter(s => 
        /^(meeting|project|task|deadline|client|team|office|business|planning|presentation)/.test(s.tag)
      ),
      'Personal': filteredStats.filter(s => 
        /^(personal|life|health|fitness|travel|hobby|family|friends|goals|learning)/.test(s.tag)
      ),
      'Research': filteredStats.filter(s => 
        /^(research|study|paper|article|book|reference|analysis|data|experiment|theory)/.test(s.tag)
      )
    };

    return [
      {
        name: 'Popular Tags',
        tags: popularTags,
        expanded: groupStates.popular
      },
      {
        name: 'Recent',
        tags: recentTags,
        expanded: groupStates.recent
      },
      {
        name: 'All Tags (A-Z)',
        tags: alphabeticalTags,
        expanded: groupStates.alphabetical
      },
      ...Object.entries(categoryTags)
        .filter(([_, tags]) => tags.length > 0)
        .map(([category, stats]) => ({
          name: category,
          tags: stats.map(stat => ({
            name: stat.tag,
            count: stat.count,
            percentage: (stat.count / maxUsage) * 100
          })),
          expanded: groupStates.categories
        }))
    ];
  }, [tagStats, tagSearch, groupStates]);

  const toggleGroup = (groupName: string) => {
    setGroupStates(prev => ({
      ...prev,
      [groupName.toLowerCase().replace(/\s+/g, '')]: !prev[groupName.toLowerCase().replace(/\s+/g, '')]
    }));
  };

  const handleTagToggle = (tag: string, isExclude: boolean = false) => {
    const currentTags = isExclude ? searchQuery.filters.excludeTags : searchQuery.filters.tags;
    const otherTags = isExclude ? searchQuery.filters.tags : searchQuery.filters.excludeTags;
    
    // Remove from other list if present
    const filteredOtherTags = otherTags.filter(t => t !== tag);
    
    const newTags = currentTags.includes(tag)
      ? currentTags.filter(t => t !== tag)
      : [...currentTags, tag];

    updateSearchQuery({
      ...searchQuery,
      filters: {
        ...searchQuery.filters,
        tags: isExclude ? filteredOtherTags : newTags,
        excludeTags: isExclude ? newTags : filteredOtherTags
      }
    });
  };

  const clearAllFilters = () => {
    updateSearchQuery({
      ...searchQuery,
      filters: {
        ...searchQuery.filters,
        tags: [],
        excludeTags: []
      }
    });
  };

  const activeFiltersCount = searchQuery.filters.tags.length + searchQuery.filters.excludeTags.length;

  return (
    <Card className={`h-fit ${className}`}>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Tag Filters
          </span>
          {activeFiltersCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearAllFilters}
              className="text-xs h-6 px-2"
            >
              Clear ({activeFiltersCount})
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3 w-3 text-muted-foreground" />
          <Input
            placeholder="Filter tags..."
            value={tagSearch}
            onChange={(e) => setTagSearch(e.target.value)}
            className="pl-7 h-8 text-xs"
          />
        </div>

        {/* Active Filters */}
        {activeFiltersCount > 0 && (
          <div className="space-y-2">
            <div className="text-xs font-medium text-muted-foreground">Active Filters</div>
            <div className="flex flex-wrap gap-1">
              {searchQuery.filters.tags.map(tag => (
                <Badge key={tag} variant="default" className="gap-1 text-xs">
                  <TagIcon className="h-2 w-2" />
                  {tag}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleTagToggle(tag, false)}
                    className="h-auto p-0 ml-1 hover:bg-transparent"
                  >
                    <X className="h-2 w-2" />
                  </Button>
                </Badge>
              ))}
              {searchQuery.filters.excludeTags.map(tag => (
                <Badge key={tag} variant="destructive" className="gap-1 text-xs">
                  <X className="h-2 w-2" />
                  {tag}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleTagToggle(tag, true)}
                    className="h-auto p-0 ml-1 hover:bg-transparent text-destructive-foreground"
                  >
                    <X className="h-2 w-2" />
                  </Button>
                </Badge>
              ))}
            </div>
            <Separator />
          </div>
        )}

        {/* Tag Groups */}
        <ScrollArea className="h-96">
          <div className="space-y-3">
            {tagGroups.map((group) => (
              <Collapsible
                key={group.name}
                open={group.expanded}
                onOpenChange={() => toggleGroup(group.name)}
              >
                <CollapsibleTrigger asChild>
                  <Button
                    variant="ghost"
                    className="w-full justify-between p-2 h-auto text-xs font-medium"
                  >
                    <span className="flex items-center gap-2">
                      {group.name === 'Popular Tags' && <Star className="h-3 w-3" />}
                      {group.name === 'Recent' && <Calendar className="h-3 w-3" />}
                      {group.name === 'All Tags (A-Z)' && <Hash className="h-3 w-3" />}
                      {!['Popular Tags', 'Recent', 'All Tags (A-Z)'].includes(group.name) && <Folder className="h-3 w-3" />}
                      {group.name}
                      <Badge variant="outline" className="text-xs">
                        {group.tags.length}
                      </Badge>
                    </span>
                    {group.expanded ? (
                      <ChevronDown className="h-3 w-3" />
                    ) : (
                      <ChevronRight className="h-3 w-3" />
                    )}
                  </Button>
                </CollapsibleTrigger>
                
                <CollapsibleContent className="space-y-1 ml-2">
                  {group.tags.map((tag) => {
                    const isIncluded = searchQuery.filters.tags.includes(tag.name);
                    const isExcluded = searchQuery.filters.excludeTags.includes(tag.name);
                    
                    return (
                      <div
                        key={tag.name}
                        className="flex items-center justify-between p-1 rounded hover:bg-muted/50 group"
                      >
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <Checkbox
                            checked={isIncluded}
                            onCheckedChange={() => handleTagToggle(tag.name, false)}
                            className="h-3 w-3"
                          />
                          <span className="text-xs truncate flex-1">
                            {tag.name}
                          </span>
                          <div className="flex items-center gap-1">
                            <Badge variant="outline" className="text-xs px-1 py-0">
                              {tag.count}
                            </Badge>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleTagToggle(tag.name, true)}
                              className={`h-4 w-4 p-0 opacity-0 group-hover:opacity-100 transition-opacity ${
                                isExcluded ? 'opacity-100 text-destructive' : ''
                              }`}
                              title="Exclude this tag"
                            >
                              <X className="h-2 w-2" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </CollapsibleContent>
              </Collapsible>
            ))}
          </div>
        </ScrollArea>

        {/* Quick Stats */}
        <Separator />
        <div className="text-xs text-muted-foreground space-y-1">
          <div>Total tags: {tagStats.length}</div>
          <div>Active filters: {activeFiltersCount}</div>
          {searchQuery.filters.tags.length > 0 && (
            <div>Including: {searchQuery.filters.tags.length} tags</div>
          )}
          {searchQuery.filters.excludeTags.length > 0 && (
            <div>Excluding: {searchQuery.filters.excludeTags.length} tags</div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}