import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from '@/components/ui/context-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useTags, TagStats } from '@/hooks/useTags';
import { useToast } from '@/hooks/use-toast';
import { Tag, BarChart3, Merge, Edit3, Trash2, Search, ArrowRight, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TagManagementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const TagManagementDialog: React.FC<TagManagementDialogProps> = ({
  open,
  onOpenChange
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [mergeTarget, setMergeTarget] = useState('');
  const [renameTag, setRenameTag] = useState<{ tag: string; newName: string } | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  
  const { tagStats, isStatsLoading, replaceTag, mergeTags } = useTags();
  const { toast } = useToast();

  const filteredStats = tagStats.filter(stat => 
    stat.tag.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleTagSelect = (tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag) 
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  };

  const handleRename = async () => {
    if (!renameTag || !renameTag.newName.trim()) return;

    try {
      const updatedCount = await replaceTag.mutateAsync({
        oldTag: renameTag.tag,
        newTag: renameTag.newName.trim().toLowerCase()
      });

      toast({
        title: "Tag renamed",
        description: `Updated ${updatedCount} notes with the new tag name.`,
      });

      setRenameTag(null);
    } catch (error: any) {
      toast({
        title: "Rename failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleMergeTags = async () => {
    if (selectedTags.length < 2 || !mergeTarget.trim()) {
      toast({
        title: "Invalid merge",
        description: "Select at least 2 tags and provide a target name.",
        variant: "destructive",
      });
      return;
    }

    try {
      const updatedCount = await mergeTags.mutateAsync({
        sourceTags: selectedTags,
        targetTag: mergeTarget.trim().toLowerCase()
      });

      toast({
        title: "Tags merged",
        description: `Merged ${selectedTags.length} tags across ${updatedCount} notes.`,
      });

      setSelectedTags([]);
      setMergeTarget('');
    } catch (error: any) {
      toast({
        title: "Merge failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const TagContextMenu: React.FC<{ stat: TagStats; children: React.ReactNode }> = ({ stat, children }) => (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        {children}
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem onClick={() => setRenameTag({ tag: stat.tag, newName: stat.tag })}>
          <Edit3 className="h-4 w-4 mr-2" />
          Rename Tag
        </ContextMenuItem>
        <ContextMenuItem onClick={() => handleTagSelect(stat.tag)}>
          <Merge className="h-4 w-4 mr-2" />
          {selectedTags.includes(stat.tag) ? 'Deselect for Merge' : 'Select for Merge'}
        </ContextMenuItem>
        <ContextMenuItem 
          onClick={() => setDeleteConfirm(stat.tag)}
          className="text-destructive focus:text-destructive"
        >
          <Trash2 className="h-4 w-4 mr-2" />
          Delete Tag
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Tag className="h-5 w-5" />
              Tag Management
            </DialogTitle>
            <DialogDescription>
              Manage, merge, and organize your tags across all notes
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search tags..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="merge">Merge Tags</TabsTrigger>
                <TabsTrigger value="statistics">Statistics</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-4">
                <ScrollArea className="h-[400px]">
                  <div className="space-y-2">
                    {isStatsLoading ? (
                      <div className="text-center py-4 text-muted-foreground">
                        Loading tags...
                      </div>
                    ) : filteredStats.length === 0 ? (
                      <div className="text-center py-4 text-muted-foreground">
                        No tags found
                      </div>
                    ) : (
                      filteredStats.map((stat) => (
                        <TagContextMenu key={stat.tag} stat={stat}>
                          <div className={cn(
                            "flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 cursor-pointer transition-colors",
                            selectedTags.includes(stat.tag) && "bg-accent border-accent-foreground"
                          )}>
                            <div className="flex items-center gap-3">
                              <Badge variant="secondary" className="font-mono">
                                {stat.tag}
                              </Badge>
                              <span className="text-sm text-muted-foreground">
                                {stat.count} note{stat.count !== 1 ? 's' : ''}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <BarChart3 className="h-4 w-4 text-muted-foreground" />
                            </div>
                          </div>
                        </TagContextMenu>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </TabsContent>

              <TabsContent value="merge" className="space-y-4">
                <div className="space-y-3">
                  <div>
                    <h4 className="text-sm font-medium mb-2">Selected Tags for Merging</h4>
                    <div className="flex flex-wrap gap-2 min-h-[40px] p-2 border rounded-md">
                      {selectedTags.length === 0 ? (
                        <span className="text-sm text-muted-foreground">
                          Right-click tags in overview to select them for merging
                        </span>
                      ) : (
                        selectedTags.map(tag => (
                          <Badge key={tag} variant="outline" className="gap-1">
                            {tag}
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setSelectedTags(prev => prev.filter(t => t !== tag))}
                              className="h-3 w-3 p-0 hover:bg-destructive hover:text-destructive-foreground"
                            >
                              <X className="h-2 w-2" />
                            </Button>
                          </Badge>
                        ))
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <ArrowRight className="h-4 w-4" />
                    <Input
                      placeholder="Target tag name..."
                      value={mergeTarget}
                      onChange={(e) => setMergeTarget(e.target.value)}
                      className="flex-1"
                    />
                    <Button
                      onClick={handleMergeTags}
                      disabled={selectedTags.length < 2 || !mergeTarget.trim() || mergeTags.isPending}
                    >
                      {mergeTags.isPending ? 'Merging...' : 'Merge Tags'}
                    </Button>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="statistics" className="space-y-4">
                <ScrollArea className="h-[400px]">
                  <div className="space-y-4">
                    {filteredStats.map((stat) => (
                      <div key={stat.tag} className="p-4 border rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <Badge variant="outline">{stat.tag}</Badge>
                          <span className="text-sm font-medium">{stat.count} notes</span>
                        </div>
                        <div className="space-y-1">
                          {stat.notes.slice(0, 5).map((note) => (
                            <div key={note.id} className="text-xs text-muted-foreground truncate">
                              • {note.title}
                            </div>
                          ))}
                          {stat.notes.length > 5 && (
                            <div className="text-xs text-muted-foreground">
                              ...and {stat.notes.length - 5} more
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </TabsContent>
            </Tabs>
          </div>
        </DialogContent>
      </Dialog>

      {/* Rename Dialog */}
      <Dialog open={!!renameTag} onOpenChange={() => setRenameTag(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Tag</DialogTitle>
            <DialogDescription>
              This will rename the tag across all notes that use it.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Current name:</label>
              <p className="text-sm text-muted-foreground">{renameTag?.tag}</p>
            </div>
            
            <div>
              <label className="text-sm font-medium">New name:</label>
              <Input
                value={renameTag?.newName || ''}
                onChange={(e) => setRenameTag(prev => 
                  prev ? { ...prev, newName: e.target.value } : null
                )}
                placeholder="Enter new tag name..."
              />
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setRenameTag(null)}>
              Cancel
            </Button>
            <Button 
              onClick={handleRename}
              disabled={!renameTag?.newName.trim() || replaceTag.isPending}
            >
              {replaceTag.isPending ? 'Renaming...' : 'Rename'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Tag</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove the tag "{deleteConfirm}" from all notes? 
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={async () => {
                if (deleteConfirm) {
                  // Implement tag deletion logic here
                  setDeleteConfirm(null);
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default TagManagementDialog;