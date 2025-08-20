import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useTags, TagStats } from '@/hooks/useTags';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Progress } from '@/components/ui/progress';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import UserMenu from '@/components/UserMenu';
import Fuse from 'fuse.js';
import { 
  ArrowLeft, Tag, Search, Download, Upload, MoreHorizontal, 
  TrendingUp, TrendingDown, AlertTriangle, Trash2, Edit3, 
  SortAsc, SortDesc, Calendar, Hash, BarChart3, PieChart as PieChartIcon,
  Merge, FileText, Settings, RefreshCw, Users
} from 'lucide-react';
import { cn } from '@/lib/utils';

type SortOption = 'alphabetical' | 'usage' | 'recent';
type SortDirection = 'asc' | 'desc';

interface CleanupSuggestion {
  type: 'duplicate' | 'low-usage' | 'formatting' | 'orphaned';
  title: string;
  description: string;
  tags: string[];
  severity: 'low' | 'medium' | 'high';
}

const TagLibrary = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const { toast } = useToast();
  const { tagStats, isStatsLoading, mergeTags, replaceTag } = useTags();
  
  // State management
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('usage');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());
  const [confirmAction, setConfirmAction] = useState<{
    type: 'delete' | 'merge';
    data?: any;
  } | null>(null);

  // Redirect if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  // Fuzzy search setup
  const fuse = useMemo(() => {
    if (!tagStats.length) return null;
    
    return new Fuse(tagStats, {
      keys: ['tag'],
      threshold: 0.3,
      includeScore: true
    });
  }, [tagStats]);

  // Filter and sort tags
  const processedTags = useMemo(() => {
    let filtered = tagStats;

    // Apply search filter
    if (searchQuery.trim() && fuse) {
      const results = fuse.search(searchQuery.trim());
      filtered = results.map(result => result.item);
    } else if (searchQuery.trim()) {
      // Fallback to simple filtering if fuse is not ready
      filtered = tagStats.filter(tag => 
        tag.tag.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply sorting
    const sorted = [...filtered].sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'alphabetical':
          comparison = a.tag.localeCompare(b.tag);
          break;
        case 'usage':
          comparison = a.count - b.count;
          break;
        case 'recent':
          // For now, use alphabetical as we don't have creation dates
          // This could be enhanced with actual creation date tracking
          comparison = a.tag.localeCompare(b.tag);
          break;
      }
      
      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return sorted;
  }, [tagStats, searchQuery, sortBy, sortDirection, fuse]);

  // Generate cleanup suggestions
  const cleanupSuggestions = useMemo((): CleanupSuggestion[] => {
    const suggestions: CleanupSuggestion[] = [];
    
    // Find potential duplicates (similar names)
    const tagNames = tagStats.map(t => t.tag);
    const duplicateGroups = new Map<string, string[]>();
    
    tagNames.forEach(tag => {
      const normalized = tag.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (!duplicateGroups.has(normalized)) {
        duplicateGroups.set(normalized, []);
      }
      duplicateGroups.get(normalized)!.push(tag);
    });

    duplicateGroups.forEach((tags, normalized) => {
      if (tags.length > 1) {
        suggestions.push({
          type: 'duplicate',
          title: 'Potential Duplicates',
          description: `Similar tags that might be duplicates: ${tags.join(', ')}`,
          tags,
          severity: 'medium'
        });
      }
    });

    // Find low usage tags
    const lowUsageTags = tagStats.filter(t => t.count === 1);
    if (lowUsageTags.length > 0) {
      suggestions.push({
        type: 'low-usage',
        title: 'Single-Use Tags',
        description: `${lowUsageTags.length} tags are only used once`,
        tags: lowUsageTags.map(t => t.tag),
        severity: 'low'
      });
    }

    // Find formatting issues
    const formattingIssues = tagStats.filter(t => 
      t.tag.includes(' ') || 
      t.tag.includes('_') || 
      t.tag !== t.tag.toLowerCase()
    );
    if (formattingIssues.length > 0) {
      suggestions.push({
        type: 'formatting',
        title: 'Formatting Issues',
        description: `${formattingIssues.length} tags have formatting inconsistencies`,
        tags: formattingIssues.map(t => t.tag),
        severity: 'low'
      });
    }

    return suggestions;
  }, [tagStats]);

  // Chart data preparation
  const chartData = useMemo(() => {
    const topTags = processedTags.slice(0, 10);
    return {
      bar: topTags.map(tag => ({
        name: tag.tag,
        count: tag.count
      })),
      pie: topTags.map((tag, index) => ({
        name: tag.tag,
        value: tag.count,
        fill: `hsl(${index * 36}, 70%, 60%)`
      }))
    };
  }, [processedTags]);

  // Export functionality
  const exportTags = () => {
    const exportData = {
      exported_at: new Date().toISOString(),
      total_tags: tagStats.length,
      tags: tagStats.map(tag => ({
        tag: tag.tag,
        count: tag.count,
        notes: tag.notes
      }))
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json'
    });
    
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tag-library-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: "Tags exported",
      description: "Your tag library has been downloaded as JSON.",
    });
  };

  // Import functionality placeholder
  const importTags = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        // TODO: Implement import logic
        toast({
          title: "Import feature",
          description: "Import functionality will be implemented in a future update.",
        });
      } catch (error) {
        toast({
          title: "Import failed",
          description: "Invalid JSON file format.",
          variant: "destructive",
        });
      }
    };
    reader.readAsText(file);
    
    // Reset input
    event.target.value = '';
  };

  // Bulk operations
  const handleBulkDelete = async () => {
    // TODO: Implement bulk delete
    toast({
      title: "Bulk operations",
      description: "Bulk delete will be implemented in a future update.",
    });
    setSelectedTags(new Set());
    setConfirmAction(null);
  };

  const handleBulkMerge = async (targetTag: string) => {
    if (selectedTags.size < 2) return;

    try {
      await mergeTags.mutateAsync({
        sourceTags: Array.from(selectedTags),
        targetTag
      });

      toast({
        title: "Tags merged",
        description: `Successfully merged ${selectedTags.size} tags.`,
      });
      
      setSelectedTags(new Set());
      setConfirmAction(null);
    } catch (error: any) {
      toast({
        title: "Merge failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const toggleTagSelection = (tag: string) => {
    setSelectedTags(prev => {
      const newSet = new Set(prev);
      if (newSet.has(tag)) {
        newSet.delete(tag);
      } else {
        newSet.add(tag);
      }
      return newSet;
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <h2 className="text-xl">Loading...</h2>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              onClick={() => navigate('/')}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Dashboard
            </Button>
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-2">
                <Tag className="h-8 w-8" />
                Tag Library
              </h1>
              <p className="text-muted-foreground">
                Manage and analyze your tag collection
              </p>
            </div>
          </div>
          <UserMenu />
        </div>

        {/* Controls */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex flex-wrap items-center gap-4">
              {/* Search */}
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search tags (fuzzy matching)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Sort controls */}
              <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="alphabetical">Alphabetical</SelectItem>
                  <SelectItem value="usage">Usage Count</SelectItem>
                  <SelectItem value="recent">Recently Used</SelectItem>
                </SelectContent>
              </Select>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')}
              >
                {sortDirection === 'asc' ? <SortAsc className="h-4 w-4" /> : <SortDesc className="h-4 w-4" />}
              </Button>

              {/* Actions */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <MoreHorizontal className="h-4 w-4 mr-2" />
                    Actions
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={exportTags}>
                    <Download className="h-4 w-4 mr-2" />
                    Export as JSON
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <label className="flex items-center cursor-pointer">
                      <Upload className="h-4 w-4 mr-2" />
                      Import JSON
                      <input
                        type="file"
                        accept=".json"
                        onChange={importTags}
                        className="hidden"
                      />
                    </label>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  {selectedTags.size > 0 && (
                    <>
                      <DropdownMenuItem
                        onClick={() => setConfirmAction({ type: 'merge' })}
                        disabled={selectedTags.size < 2}
                      >
                        <Merge className="h-4 w-4 mr-2" />
                        Merge Selected ({selectedTags.size})
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => setConfirmAction({ type: 'delete' })}
                        className="text-destructive"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete Selected ({selectedTags.size})
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Selection info */}
            {selectedTags.size > 0 && (
              <div className="mt-4 p-3 bg-accent/50 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">
                    {selectedTags.size} tag{selectedTags.size !== 1 ? 's' : ''} selected
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedTags(new Set())}
                  >
                    Clear Selection
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="cleanup">Cleanup</TabsTrigger>
            <TabsTrigger value="bulk">Bulk Operations</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              {/* Stats Cards */}
              <div className="lg:col-span-1 space-y-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Total Tags</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{tagStats.length}</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Most Used</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {tagStats.length > 0 && (
                      <div>
                        <div className="text-lg font-semibold">{tagStats[0]?.tag}</div>
                        <div className="text-sm text-muted-foreground">
                          {tagStats[0]?.count} note{tagStats[0]?.count !== 1 ? 's' : ''}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Cleanup Items</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-orange-600">{cleanupSuggestions.length}</div>
                  </CardContent>
                </Card>
              </div>

              {/* Tag List */}
              <div className="lg:col-span-3">
                <Card>
                  <CardHeader>
                    <CardTitle>All Tags ({processedTags.length})</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {isStatsLoading ? (
                      <div className="text-center py-8 text-muted-foreground">
                        Loading tags...
                      </div>
                    ) : processedTags.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        No tags found
                      </div>
                    ) : (
                      <ScrollArea className="h-[600px]">
                        <div className="space-y-2">
                          {processedTags.map((stat) => (
                            <div
                              key={stat.tag}
                              className={cn(
                                "flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 cursor-pointer transition-colors",
                                selectedTags.has(stat.tag) && "bg-accent border-accent-foreground"
                              )}
                              onClick={() => toggleTagSelection(stat.tag)}
                            >
                              <div className="flex items-center gap-3">
                                <Badge variant="secondary" className="font-mono">
                                  {stat.tag}
                                </Badge>
                                <span className="text-sm text-muted-foreground">
                                  {stat.count} note{stat.count !== 1 ? 's' : ''}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Progress 
                                  value={(stat.count / Math.max(...tagStats.map(t => t.count))) * 100} 
                                  className="w-20 h-2"
                                />
                                <span className="text-xs text-muted-foreground min-w-[30px]">
                                  {Math.round((stat.count / tagStats.reduce((sum, t) => sum + t.count, 0)) * 100)}%
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Top Tags by Usage
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={chartData.bar}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="name" 
                        angle={-45}
                        textAnchor="end"
                        height={60}
                      />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="count" fill="hsl(var(--primary))" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <PieChartIcon className="h-5 w-5" />
                    Tag Distribution
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={chartData.pie}
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      >
                        {chartData.pie.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Cleanup Tab */}
          <TabsContent value="cleanup">
            <div className="space-y-4">
              {cleanupSuggestions.length === 0 ? (
                <Card>
                  <CardContent className="text-center py-8">
                    <div className="text-green-600 mb-2">
                      <Settings className="h-12 w-12 mx-auto" />
                    </div>
                    <h3 className="text-lg font-semibold mb-2">No Issues Found</h3>
                    <p className="text-muted-foreground">
                      Your tag library looks clean and well-organized!
                    </p>
                  </CardContent>
                </Card>
              ) : (
                cleanupSuggestions.map((suggestion, index) => (
                  <Card key={index}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-2">
                          <AlertTriangle className={cn(
                            "h-5 w-5",
                            suggestion.severity === 'high' && "text-red-500",
                            suggestion.severity === 'medium' && "text-orange-500",
                            suggestion.severity === 'low' && "text-yellow-500"
                          )} />
                          {suggestion.title}
                        </CardTitle>
                        <Badge variant={
                          suggestion.severity === 'high' ? 'destructive' :
                          suggestion.severity === 'medium' ? 'default' : 'secondary'
                        }>
                          {suggestion.severity}
                        </Badge>
                      </div>
                      <CardDescription>{suggestion.description}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-2 mb-4">
                        {suggestion.tags.slice(0, 10).map(tag => (
                          <Badge key={tag} variant="outline">{tag}</Badge>
                        ))}
                        {suggestion.tags.length > 10 && (
                          <Badge variant="secondary">+{suggestion.tags.length - 10} more</Badge>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline">
                          Review
                        </Button>
                        {suggestion.type === 'duplicate' && (
                          <Button size="sm">
                            <Merge className="h-4 w-4 mr-2" />
                            Merge Duplicates
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          {/* Bulk Operations Tab */}
          <TabsContent value="bulk">
            <Card>
              <CardHeader>
                <CardTitle>Bulk Operations</CardTitle>
                <CardDescription>
                  Select tags from the Overview tab to perform bulk operations
                </CardDescription>
              </CardHeader>
              <CardContent>
                {selectedTags.size === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No tags selected</p>
                    <p className="text-sm">Go to the Overview tab and click on tags to select them</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-medium mb-2">Selected Tags ({selectedTags.size})</h4>
                      <div className="flex flex-wrap gap-2">
                        {Array.from(selectedTags).map(tag => (
                          <Badge key={tag} variant="secondary">
                            {tag}
                            <button
                              onClick={() => toggleTagSelection(tag)}
                              className="ml-1 hover:text-destructive"
                            >
                              ×
                            </button>
                          </Badge>
                        ))}
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      <Button
                        onClick={() => setConfirmAction({ type: 'merge' })}
                        disabled={selectedTags.size < 2}
                      >
                        <Merge className="h-4 w-4 mr-2" />
                        Merge Tags
                      </Button>
                      <Button
                        variant="destructive"
                        onClick={() => setConfirmAction({ type: 'delete' })}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete Tags
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Confirmation Dialogs */}
        <AlertDialog open={!!confirmAction} onOpenChange={() => setConfirmAction(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {confirmAction?.type === 'delete' ? 'Delete Tags' : 'Merge Tags'}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {confirmAction?.type === 'delete' 
                  ? `Are you sure you want to delete ${selectedTags.size} selected tags? This action cannot be undone.`
                  : `Are you sure you want to merge ${selectedTags.size} selected tags into a single tag?`
                }
              </AlertDialogDescription>
            </AlertDialogHeader>
            
            {confirmAction?.type === 'merge' && (
              <div className="py-4">
                <Input
                  placeholder="Enter target tag name..."
                  onChange={(e) => setConfirmAction(prev => prev ? { ...prev, data: e.target.value } : prev)}
                />
              </div>
            )}
            
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  if (confirmAction?.type === 'delete') {
                    handleBulkDelete();
                  } else if (confirmAction?.type === 'merge' && confirmAction.data) {
                    handleBulkMerge(confirmAction.data);
                  }
                }}
                className={confirmAction?.type === 'delete' ? 'bg-destructive hover:bg-destructive/90' : ''}
              >
                {confirmAction?.type === 'delete' ? 'Delete' : 'Merge'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
};

export default TagLibrary;