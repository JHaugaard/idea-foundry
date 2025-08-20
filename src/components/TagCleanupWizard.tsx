import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useTagGovernance } from '@/hooks/useTagGovernance';
import { useTags } from '@/hooks/useTags';
import { useToast } from '@/hooks/use-toast';
import { 
  Trash2, 
  GitMerge, 
  AlertTriangle, 
  Clock, 
  CheckCircle,
  Info,
  Wand2
} from 'lucide-react';

interface TagCleanupWizardProps {
  trigger?: React.ReactNode;
}

export function TagCleanupWizard({ trigger }: TagCleanupWizardProps) {
  const [open, setOpen] = useState(false);
  const [selectedInactive, setSelectedInactive] = useState<string[]>([]);
  const [selectedMerges, setSelectedMerges] = useState<Record<string, string[]>>({});
  const [processing, setProcessing] = useState(false);
  
  const { getInactiveTags, getDuplicateSuggestions, analytics } = useTagGovernance();
  const { replaceTag, mergeTags, deleteTags } = useTags();
  const { toast } = useToast();

  const inactiveTags = getInactiveTags();
  const duplicateSuggestions = getDuplicateSuggestions();
  const lowUsageTags = analytics?.filter(tag => tag.total_usage_count <= 2) || [];

  const handleDeleteInactive = async () => {
    if (selectedInactive.length === 0) return;
    
    setProcessing(true);
    try {
      await deleteTags.mutateAsync(selectedInactive);
      setSelectedInactive([]);
      toast({
        title: "Tags Deleted",
        description: `Successfully deleted ${selectedInactive.length} inactive tags.`,
      });
    } catch (error) {
      toast({
        title: "Deletion Failed",
        description: "Failed to delete some tags. Please try again.",
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleMergeTags = async () => {
    const mergeOperations = Object.entries(selectedMerges).filter(([_, duplicates]) => duplicates.length > 0);
    if (mergeOperations.length === 0) return;

    setProcessing(true);
    try {
      for (const [primary, duplicates] of mergeOperations) {
        await mergeTags.mutateAsync({ sourceTags: duplicates, targetTag: primary });
      }
      setSelectedMerges({});
      toast({
        title: "Tags Merged",
        description: `Successfully merged ${mergeOperations.length} tag groups.`,
      });
    } catch (error) {
      toast({
        title: "Merge Failed",
        description: "Failed to merge some tags. Please try again.",
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  const getTotalUsageForGroup = (primary: string, duplicates: string[]) => {
    const allTags = [primary, ...duplicates];
    return allTags.reduce((total, tag) => {
      const tagData = analytics?.find(a => a.tag_name === tag);
      return total + (tagData?.total_usage_count || 0);
    }, 0);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" className="gap-2">
            <Wand2 className="h-4 w-4" />
            Tag Cleanup Wizard
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wand2 className="h-5 w-5" />
            Tag Cleanup Wizard
          </DialogTitle>
        </DialogHeader>
        
        <Tabs defaultValue="inactive" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="inactive" className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Inactive Tags ({inactiveTags.length})
            </TabsTrigger>
            <TabsTrigger value="duplicates" className="flex items-center gap-2">
              <GitMerge className="h-4 w-4" />
              Potential Merges ({duplicateSuggestions.length})
            </TabsTrigger>
            <TabsTrigger value="low-usage" className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Low Usage ({lowUsageTags.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="inactive" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Inactive Tags
                </CardTitle>
                <CardDescription>
                  Tags that haven't been used in the last 90 days. Consider removing them to keep your tag library clean.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {inactiveTags.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
                    <p>No inactive tags found! Your tag library is well-maintained.</p>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id="select-all-inactive"
                          checked={selectedInactive.length === inactiveTags.length}
                          onCheckedChange={(checked) => {
                            setSelectedInactive(checked ? inactiveTags.map(t => t.tag_name) : []);
                          }}
                        />
                        <label htmlFor="select-all-inactive" className="text-sm font-medium">
                          Select All ({selectedInactive.length}/{inactiveTags.length})
                        </label>
                      </div>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={handleDeleteInactive}
                        disabled={selectedInactive.length === 0 || processing}
                        className="gap-2"
                      >
                        <Trash2 className="h-4 w-4" />
                        Delete Selected ({selectedInactive.length})
                      </Button>
                    </div>
                    
                    <ScrollArea className="h-64">
                      <div className="space-y-2">
                        {inactiveTags.map((tag) => (
                          <div key={tag.id} className="flex items-center justify-between p-3 border rounded-lg">
                            <div className="flex items-center gap-3">
                              <Checkbox
                                checked={selectedInactive.includes(tag.tag_name)}
                                onCheckedChange={(checked) => {
                                  setSelectedInactive(prev => 
                                    checked 
                                      ? [...prev, tag.tag_name]
                                      : prev.filter(t => t !== tag.tag_name)
                                  );
                                }}
                              />
                              <Badge variant="secondary">{tag.tag_name}</Badge>
                            </div>
                            <div className="text-sm text-muted-foreground">
                              Used {tag.total_usage_count} times
                              {tag.last_used_at && (
                                <span className="block">
                                  Last used: {new Date(tag.last_used_at).toLocaleDateString()}
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="duplicates" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <GitMerge className="h-5 w-5" />
                  Potential Tag Merges
                </CardTitle>
                <CardDescription>
                  Similar tags that could be merged to improve consistency and reduce redundancy.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {duplicateSuggestions.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
                    <p>No duplicate tags detected! Your tag naming is consistent.</p>
                  </div>
                ) : (
                  <>
                    <div className="flex justify-end mb-4">
                      <Button
                        onClick={handleMergeTags}
                        disabled={Object.keys(selectedMerges).length === 0 || processing}
                        className="gap-2"
                      >
                        <GitMerge className="h-4 w-4" />
                        Merge Selected
                      </Button>
                    </div>
                    
                    <ScrollArea className="h-64">
                      <div className="space-y-4">
                        {duplicateSuggestions.map((suggestion, index) => (
                          <div key={index} className="border rounded-lg p-4">
                            <div className="flex items-center gap-2 mb-2">
                              <Checkbox
                                checked={(selectedMerges[suggestion.primary] || []).length === suggestion.duplicates.length}
                                onCheckedChange={(checked) => {
                                  setSelectedMerges(prev => ({
                                    ...prev,
                                    [suggestion.primary]: checked ? suggestion.duplicates : []
                                  }));
                                }}
                              />
                              <span className="font-medium">Merge into:</span>
                              <Badge variant="default">{suggestion.primary}</Badge>
                            </div>
                            
                            <div className="ml-6 space-y-2">
                              <p className="text-sm text-muted-foreground">Similar tags to merge:</p>
                              <div className="flex flex-wrap gap-2">
                                {suggestion.duplicates.map((duplicate) => (
                                  <div key={duplicate} className="flex items-center gap-2">
                                    <Checkbox
                                      checked={(selectedMerges[suggestion.primary] || []).includes(duplicate)}
                                      onCheckedChange={(checked) => {
                                        setSelectedMerges(prev => {
                                          const current = prev[suggestion.primary] || [];
                                          return {
                                            ...prev,
                                            [suggestion.primary]: checked 
                                              ? [...current, duplicate]
                                              : current.filter(d => d !== duplicate)
                                          };
                                        });
                                      }}
                                    />
                                    <Badge variant="outline">{duplicate}</Badge>
                                  </div>
                                ))}
                              </div>
                              <p className="text-xs text-muted-foreground">
                                Total usage after merge: {getTotalUsageForGroup(suggestion.primary, suggestion.duplicates)} notes
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="low-usage" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  Low Usage Tags
                </CardTitle>
                <CardDescription>
                  Tags used in 2 or fewer notes. Consider if these are still relevant or should be removed.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {lowUsageTags.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
                    <p>All your tags are well-utilized!</p>
                  </div>
                ) : (
                  <ScrollArea className="h-64">
                    <div className="space-y-2">
                      {lowUsageTags.map((tag) => (
                        <div key={tag.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <Badge variant="secondary">{tag.tag_name}</Badge>
                          <div className="text-sm text-muted-foreground">
                            Used in {tag.total_usage_count} note{tag.total_usage_count !== 1 ? 's' : ''}
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            <strong>Tip:</strong> Regular cleanup helps maintain a focused and efficient tag system. 
            Consider running this wizard monthly to keep your tags organized.
          </AlertDescription>
        </Alert>
      </DialogContent>
    </Dialog>
  );
}