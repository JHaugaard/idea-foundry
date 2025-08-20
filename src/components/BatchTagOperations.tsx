import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useTags } from '@/hooks/useTags';
import { useToast } from '@/hooks/use-toast';
import TagInput from '@/components/TagInput';
import { Plus, Minus, RotateCcw, Search } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Note {
  id: string;
  title: string;
  tags: string[] | null;
}

interface BatchTagOperationsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  notes: Note[];
  onCompleted?: () => void;
}

const BatchTagOperations: React.FC<BatchTagOperationsProps> = ({
  open,
  onOpenChange,
  notes,
  onCompleted
}) => {
  const [selectedNotes, setSelectedNotes] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [operationTags, setOperationTags] = useState<string[]>([]);
  const [activeOperation, setActiveOperation] = useState<'add' | 'remove' | 'replace'>('add');
  
  const { tags: existingTags, batchUpdateTags } = useTags();
  const { toast } = useToast();

  const filteredNotes = notes.filter(note =>
    note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    note.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleNoteToggle = (noteId: string) => {
    setSelectedNotes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(noteId)) {
        newSet.delete(noteId);
      } else {
        newSet.add(noteId);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    if (selectedNotes.size === filteredNotes.length) {
      setSelectedNotes(new Set());
    } else {
      setSelectedNotes(new Set(filteredNotes.map(note => note.id)));
    }
  };

  const handleApplyOperation = async () => {
    if (selectedNotes.size === 0) {
      toast({
        title: "No notes selected",
        description: "Please select at least one note to apply changes.",
        variant: "destructive",
      });
      return;
    }

    if (operationTags.length === 0) {
      toast({
        title: "No tags specified",
        description: "Please add at least one tag for the operation.",
        variant: "destructive",
      });
      return;
    }

    try {
      await batchUpdateTags.mutateAsync({
        noteIds: Array.from(selectedNotes),
        operation: activeOperation,
        tags: operationTags
      });

      const operationNames = {
        add: 'added to',
        remove: 'removed from',
        replace: 'replaced in'
      };

      toast({
        title: "Batch operation completed",
        description: `Tags ${operationNames[activeOperation]} ${selectedNotes.size} notes.`,
      });

      setSelectedNotes(new Set());
      setOperationTags([]);
      onCompleted?.();
    } catch (error: any) {
      toast({
        title: "Operation failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const getOperationDescription = () => {
    switch (activeOperation) {
      case 'add':
        return 'Add tags to selected notes (preserves existing tags)';
      case 'remove':
        return 'Remove tags from selected notes (keeps other tags)';
      case 'replace':
        return 'Replace all tags in selected notes with new tags';
      default:
        return '';
    }
  };

  const getOperationIcon = () => {
    switch (activeOperation) {
      case 'add': return <Plus className="h-4 w-4" />;
      case 'remove': return <Minus className="h-4 w-4" />;
      case 'replace': return <RotateCcw className="h-4 w-4" />;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Batch Tag Operations</DialogTitle>
          <DialogDescription>
            Apply tag changes to multiple notes at once
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Tabs value={activeOperation} onValueChange={(v) => setActiveOperation(v as any)}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="add" className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Add Tags
              </TabsTrigger>
              <TabsTrigger value="remove" className="flex items-center gap-2">
                <Minus className="h-4 w-4" />
                Remove Tags
              </TabsTrigger>
              <TabsTrigger value="replace" className="flex items-center gap-2">
                <RotateCcw className="h-4 w-4" />
                Replace Tags
              </TabsTrigger>
            </TabsList>

            <div className="mt-4">
              <p className="text-sm text-muted-foreground mb-3">
                {getOperationDescription()}
              </p>

              <TagInput
                tags={operationTags}
                onTagsChange={setOperationTags}
                suggestions={existingTags}
                placeholder={`Select tags to ${activeOperation}...`}
                maxTags={10}
              />
            </div>
          </Tabs>

          {/* Note Selection */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium">Select Notes</h4>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleSelectAll}
                  className="h-8"
                >
                  {selectedNotes.size === filteredNotes.length ? 'Deselect All' : 'Select All'}
                </Button>
                <span className="text-xs text-muted-foreground">
                  {selectedNotes.size} of {notes.length} selected
                </span>
              </div>
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search notes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            <ScrollArea className="h-[300px] border rounded-md p-2">
              <div className="space-y-2">
                {filteredNotes.length === 0 ? (
                  <div className="text-center py-4 text-muted-foreground">
                    No notes found
                  </div>
                ) : (
                  filteredNotes.map((note) => (
                    <div
                      key={note.id}
                      className={cn(
                        "flex items-start gap-3 p-3 rounded-lg border cursor-pointer hover:bg-muted/50 transition-colors",
                        selectedNotes.has(note.id) && "bg-accent border-accent-foreground"
                      )}
                      onClick={() => handleNoteToggle(note.id)}
                    >
                      <Checkbox 
                        checked={selectedNotes.has(note.id)}
                        onChange={() => handleNoteToggle(note.id)}
                        className="mt-0.5"
                      />
                      
                      <div className="flex-1 space-y-1">
                        <h5 className="text-sm font-medium line-clamp-1">
                          {note.title}
                        </h5>
                        
                        {note.tags && note.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {note.tags.slice(0, 5).map((tag) => (
                              <Badge key={tag} variant="secondary" className="text-xs h-5 px-2">
                                {tag}
                              </Badge>
                            ))}
                            {note.tags.length > 5 && (
                              <Badge variant="outline" className="text-xs h-5 px-2">
                                +{note.tags.length - 5}
                              </Badge>
                            )}
                          </div>
                        )}
                        
                        {(!note.tags || note.tags.length === 0) && (
                          <span className="text-xs text-muted-foreground">No tags</span>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleApplyOperation}
              disabled={selectedNotes.size === 0 || operationTags.length === 0 || batchUpdateTags.isPending}
              className="flex items-center gap-2"
            >
              {getOperationIcon()}
              {batchUpdateTags.isPending ? 'Applying...' : `Apply to ${selectedNotes.size} Notes`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BatchTagOperations;