import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Link, Trash2, Plus } from 'lucide-react';
import { useOptimisticLinks } from '@/hooks/useOptimisticLinks';
import { toast } from 'sonner';

interface BatchLinkOperationsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sourceNoteId?: string;
  selectedItems?: Array<{
    id: string;
    title: string;
    type: 'note' | 'text';
    content?: string;
  }>;
}

type BatchOperation = 'create-links' | 'delete-links' | 'update-links';

export function BatchLinkOperations({
  open,
  onOpenChange,
  sourceNoteId,
  selectedItems = [],
}: BatchLinkOperationsProps) {
  const [operation, setOperation] = useState<BatchOperation>('create-links');
  const [targetNoteTitles, setTargetNoteTitles] = useState('');
  const [anchorTexts, setAnchorTexts] = useState('');
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const { batchCreateLinks } = useOptimisticLinks(sourceNoteId);

  const handleItemSelection = (itemId: string, checked: boolean) => {
    setSelectedItemIds(prev => 
      checked 
        ? [...prev, itemId]
        : prev.filter(id => id !== itemId)
    );
  };

  const handleBatchCreateLinks = async () => {
    if (!sourceNoteId || !targetNoteTitles.trim()) {
      toast.error('Please provide target note titles');
      return;
    }

    setIsProcessing(true);
    try {
      const titles = targetNoteTitles
        .split('\n')
        .map(title => title.trim())
        .filter(title => title.length > 0);

      const anchors = anchorTexts
        ? anchorTexts
            .split('\n')
            .map(anchor => anchor.trim())
            .filter(anchor => anchor.length > 0)
        : [];

      const linksToCreate = titles.map((title, index) => ({
        target_note_id: `generated-${Date.now()}-${index}`, // This would normally be resolved
        anchor_text: anchors[index] || title,
        canonical_title: title,
        canonical_slug: title.toLowerCase().replace(/\s+/g, '-'),
        target_exists: false, // Will be validated server-side
      }));

      await batchCreateLinks(linksToCreate);
      onOpenChange(false);
      
      // Reset form
      setTargetNoteTitles('');
      setAnchorTexts('');
    } catch (error) {
      console.error('Batch operation failed:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const selectedCount = selectedItemIds.length;
  const totalItems = selectedItems.length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link className="h-5 w-5" />
            Batch Link Operations
          </DialogTitle>
          <DialogDescription>
            Perform operations on multiple links or notes at once
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Operation Type */}
          <div className="space-y-2">
            <Label>Operation Type</Label>
            <Select value={operation} onValueChange={(value) => setOperation(value as BatchOperation)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="create-links">Create Multiple Links</SelectItem>
                <SelectItem value="delete-links">Delete Selected Links</SelectItem>
                <SelectItem value="update-links">Update Link Properties</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Item Selection */}
          {selectedItems.length > 0 && (
            <div className="space-y-2">
              <Label>Selected Items ({selectedCount}/{totalItems})</Label>
              <div className="max-h-32 overflow-y-auto space-y-2 border rounded-md p-2">
                {selectedItems.map((item) => (
                  <div key={item.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={item.id}
                      checked={selectedItemIds.includes(item.id)}
                      onCheckedChange={(checked) => 
                        handleItemSelection(item.id, checked as boolean)
                      }
                    />
                    <Label htmlFor={item.id} className="flex-1 text-sm">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs">
                          {item.type}
                        </Badge>
                        <span className="truncate">{item.title}</span>
                      </div>
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Create Links Form */}
          {operation === 'create-links' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="target-titles">
                  Target Note Titles
                  <span className="text-xs text-muted-foreground ml-2">
                    (one per line)
                  </span>
                </Label>
                <Textarea
                  id="target-titles"
                  placeholder="Note Title 1&#10;Note Title 2&#10;Note Title 3"
                  value={targetNoteTitles}
                  onChange={(e) => setTargetNoteTitles(e.target.value)}
                  rows={4}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="anchor-texts">
                  Anchor Texts
                  <span className="text-xs text-muted-foreground ml-2">
                    (optional, one per line)
                  </span>
                </Label>
                <Textarea
                  id="anchor-texts"
                  placeholder="Link Text 1&#10;Link Text 2&#10;Link Text 3"
                  value={anchorTexts}
                  onChange={(e) => setAnchorTexts(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
          )}

          {/* Delete Links Warning */}
          {operation === 'delete-links' && selectedCount > 0 && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-md p-4">
              <div className="flex items-center gap-2 text-destructive mb-2">
                <Trash2 className="h-4 w-4" />
                <span className="font-medium">Warning</span>
              </div>
              <p className="text-sm text-destructive/80">
                You are about to delete {selectedCount} link{selectedCount !== 1 ? 's' : ''}. 
                This action can be undone using the undo feature.
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleBatchCreateLinks}
            disabled={isProcessing || (operation === 'create-links' && !targetNoteTitles.trim())}
          >
            {isProcessing ? (
              'Processing...'
            ) : (
              <>
                <Plus className="h-4 w-4 mr-2" />
                {operation === 'create-links' && 'Create Links'}
                {operation === 'delete-links' && 'Delete Links'}
                {operation === 'update-links' && 'Update Links'}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}