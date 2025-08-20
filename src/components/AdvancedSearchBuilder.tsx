import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useEnhancedSearch, SearchQuery } from '@/hooks/useEnhancedSearch';
import { useTags } from '@/hooks/useTags';
import { 
  Plus, 
  Minus, 
  X, 
  Settings, 
  Tag as TagIcon,
  Calendar,
  Filter,
  Save,
  ChevronDown,
  Check
} from 'lucide-react';

interface TagCondition {
  id: string;
  tags: string[];
  operator: 'AND' | 'OR';
  exclude: boolean;
}

interface AdvancedSearchBuilderProps {
  onApplySearch?: (query: SearchQuery) => void;
  trigger?: React.ReactNode;
}

export function AdvancedSearchBuilder({ onApplySearch, trigger }: AdvancedSearchBuilderProps) {
  const [open, setOpen] = useState(false);
  const { searchQuery, updateSearchQuery, saveSearch } = useEnhancedSearch();
  const { tags, tagStats } = useTags();
  
  const [textQuery, setTextQuery] = useState(searchQuery.text);
  const [tagConditions, setTagConditions] = useState<TagCondition[]>([]);
  const [dateRange, setDateRange] = useState(searchQuery.filters.dateRange);
  const [category, setCategory] = useState(searchQuery.filters.category);
  const [isPinned, setIsPinned] = useState(searchQuery.filters.isPinned);
  const [searchName, setSearchName] = useState('');

  const addTagCondition = () => {
    const newCondition: TagCondition = {
      id: crypto.randomUUID(),
      tags: [],
      operator: 'AND',
      exclude: false
    };
    setTagConditions([...tagConditions, newCondition]);
  };

  const updateTagCondition = (id: string, updates: Partial<TagCondition>) => {
    setTagConditions(conditions =>
      conditions.map(condition =>
        condition.id === id ? { ...condition, ...updates } : condition
      )
    );
  };

  const removeTagCondition = (id: string) => {
    setTagConditions(conditions => conditions.filter(c => c.id !== id));
  };

  const addTagToCondition = (conditionId: string, tag: string) => {
    updateTagCondition(conditionId, {
      tags: [...(tagConditions.find(c => c.id === conditionId)?.tags || []), tag]
    });
  };

  const removeTagFromCondition = (conditionId: string, tag: string) => {
    const condition = tagConditions.find(c => c.id === conditionId);
    if (condition) {
      updateTagCondition(conditionId, {
        tags: condition.tags.filter(t => t !== tag)
      });
    }
  };

  const buildSearchQuery = (): SearchQuery => {
    // Flatten tag conditions into simple arrays for now
    // In a more advanced implementation, you'd preserve the complex logic
    const allIncludeTags = tagConditions
      .filter(c => !c.exclude)
      .flatMap(c => c.tags);
    
    const allExcludeTags = tagConditions
      .filter(c => c.exclude)
      .flatMap(c => c.tags);

    return {
      text: textQuery,
      filters: {
        tags: [...new Set(allIncludeTags)],
        excludeTags: [...new Set(allExcludeTags)],
        dateRange,
        category,
        isPinned
      },
      mode: 'combined'
    };
  };

  const applySearch = () => {
    const query = buildSearchQuery();
    updateSearchQuery(query);
    if (onApplySearch) {
      onApplySearch(query);
    }
    setOpen(false);
  };

  const saveCurrentSearch = () => {
    if (!searchName.trim()) return;
    
    const query = buildSearchQuery();
    saveSearch({ name: searchName.trim(), query });
    setSearchName('');
  };

  const resetSearch = () => {
    setTextQuery('');
    setTagConditions([]);
    setDateRange(undefined);
    setCategory(undefined);
    setIsPinned(undefined);
  };

  // Get tag usage stats for popularity indicators
  const getTagUsage = (tag: string) => {
    return tagStats.find(stat => stat.tag === tag)?.count || 0;
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" className="gap-2">
            <Settings className="h-4 w-4" />
            Advanced Search
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Advanced Search Builder
          </DialogTitle>
        </DialogHeader>
        
        <ScrollArea className="max-h-[75vh]">
          <div className="space-y-6 p-1">
            {/* Text Search */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Text Search</CardTitle>
              </CardHeader>
              <CardContent>
                <Input
                  placeholder="Search in titles and content..."
                  value={textQuery}
                  onChange={(e) => setTextQuery(e.target.value)}
                />
              </CardContent>
            </Card>

            {/* Tag Conditions */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center justify-between">
                  Tag Conditions
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={addTagCondition}
                    className="gap-1"
                  >
                    <Plus className="h-3 w-3" />
                    Add Condition
                  </Button>
                </CardTitle>
                <CardDescription>
                  Build complex tag queries with AND/OR logic
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {tagConditions.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No tag conditions added. Click "Add Condition" to start building complex tag queries.
                  </p>
                ) : (
                  tagConditions.map((condition, index) => (
                    <div key={condition.id} className="space-y-3">
                      {index > 0 && <Separator />}
                      
                      <div className="flex items-center gap-2">
                        <Select
                          value={condition.exclude ? 'EXCLUDE' : condition.operator}
                          onValueChange={(value) => {
                            if (value === 'EXCLUDE') {
                              updateTagCondition(condition.id, { exclude: true });
                            } else {
                              updateTagCondition(condition.id, { 
                                exclude: false, 
                                operator: value as 'AND' | 'OR' 
                              });
                            }
                          }}
                        >
                          <SelectTrigger className="w-24">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="AND">AND</SelectItem>
                            <SelectItem value="OR">OR</SelectItem>
                            <SelectItem value="EXCLUDE">EXCLUDE</SelectItem>
                          </SelectContent>
                        </Select>

                        <div className="flex-1">
                          <TagSelector
                            selectedTags={condition.tags}
                            onTagAdd={(tag) => addTagToCondition(condition.id, tag)}
                            onTagRemove={(tag) => removeTagFromCondition(condition.id, tag)}
                            availableTags={tags}
                            getTagUsage={getTagUsage}
                          />
                        </div>

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeTagCondition(condition.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>

                      {condition.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 ml-26">
                          {condition.tags.map((tag) => (
                            <Badge
                              key={tag}
                              variant={condition.exclude ? "destructive" : "default"}
                              className="gap-1"
                            >
                              {condition.exclude && <Minus className="h-2 w-2" />}
                              <TagIcon className="h-2 w-2" />
                              {tag}
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => removeTagFromCondition(condition.id, tag)}
                                className="h-auto p-0 ml-1 hover:bg-transparent"
                              >
                                <X className="h-2 w-2" />
                              </Button>
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            {/* Additional Filters */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Additional Filters</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Date Range */}
                <div className="space-y-2">
                  <Label className="text-xs font-medium">Date Range</Label>
                  <div className="flex gap-2">
                    <Input
                      type="date"
                      value={dateRange?.start.toISOString().split('T')[0] || ''}
                      onChange={(e) => {
                        const start = e.target.value ? new Date(e.target.value) : undefined;
                        setDateRange(start && dateRange?.end ? { start, end: dateRange.end } : undefined);
                      }}
                      className="text-xs"
                    />
                    <Input
                      type="date"
                      value={dateRange?.end.toISOString().split('T')[0] || ''}
                      onChange={(e) => {
                        const end = e.target.value ? new Date(e.target.value) : undefined;
                        setDateRange(end && dateRange?.start ? { start: dateRange.start, end } : undefined);
                      }}
                      className="text-xs"
                    />
                  </div>
                </div>

                {/* Category */}
                <div className="space-y-2">
                  <Label className="text-xs font-medium">Category</Label>
                  <Select value={category || 'all'} onValueChange={(value) => setCategory(value === 'all' ? undefined : value as any)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      <SelectItem value="personal">Personal</SelectItem>
                      <SelectItem value="work">Work</SelectItem>
                      <SelectItem value="research">Research</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Pinned Status */}
                <div className="space-y-2">
                  <Label className="text-xs font-medium">Pinned Status</Label>
                  <Select 
                    value={isPinned === undefined ? 'all' : isPinned ? 'pinned' : 'unpinned'} 
                    onValueChange={(value) => {
                      setIsPinned(value === 'all' ? undefined : value === 'pinned');
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Notes</SelectItem>
                      <SelectItem value="pinned">Pinned Only</SelectItem>
                      <SelectItem value="unpinned">Unpinned Only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Save Search */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Save Search</CardTitle>
                <CardDescription>
                  Save this search configuration for future use
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  <Input
                    placeholder="Search name..."
                    value={searchName}
                    onChange={(e) => setSearchName(e.target.value)}
                  />
                  <Button
                    onClick={saveCurrentSearch}
                    disabled={!searchName.trim()}
                    className="gap-2"
                  >
                    <Save className="h-4 w-4" />
                    Save
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </ScrollArea>

        {/* Actions */}
        <div className="flex justify-between pt-4 border-t">
          <Button variant="outline" onClick={resetSearch}>
            Reset All
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={applySearch}>
              Apply Search
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface TagSelectorProps {
  selectedTags: string[];
  onTagAdd: (tag: string) => void;
  onTagRemove: (tag: string) => void;
  availableTags: string[];
  getTagUsage: (tag: string) => number;
}

function TagSelector({ selectedTags, onTagAdd, onTagRemove, availableTags, getTagUsage }: TagSelectorProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const filteredTags = availableTags.filter(tag => 
    !selectedTags.includes(tag) &&
    tag.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="justify-between"
        >
          {selectedTags.length === 0 
            ? "Select tags..." 
            : `${selectedTags.length} tag${selectedTags.length !== 1 ? 's' : ''} selected`
          }
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-0">
        <Command>
          <CommandInput 
            placeholder="Search tags..." 
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            <CommandEmpty>No tags found.</CommandEmpty>
            <CommandGroup>
              {filteredTags.map((tag) => (
                <CommandItem
                  key={tag}
                  onSelect={() => {
                    onTagAdd(tag);
                    setSearch("");
                  }}
                  className="flex items-center justify-between"
                >
                  <div className="flex items-center gap-2">
                    <TagIcon className="h-3 w-3" />
                    {tag}
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {getTagUsage(tag)}
                  </Badge>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}