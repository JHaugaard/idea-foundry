import React, { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, X, Edit3, Check, AlertCircle } from 'lucide-react';
import { useTags } from '@/hooks/useTags';
import { useToast } from '@/hooks/use-toast';
import TagInput from '@/components/TagInput';
import { cn } from '@/lib/utils';

interface InlineTagEditorProps {
  noteId: string;
  tags: string[];
  onTagsUpdate?: (newTags: string[]) => void;
  className?: string;
  maxTags?: number;
  compact?: boolean;
}

const InlineTagEditor: React.FC<InlineTagEditorProps> = ({
  noteId,
  tags,
  onTagsUpdate,
  className,
  maxTags = 10,
  compact = false
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editingTags, setEditingTags] = useState<string[]>(tags);
  const { toast } = useToast();
  const { tags: existingTags, updateNoteTags } = useTags();

  useEffect(() => {
    setEditingTags(tags);
  }, [tags]);

  const handleSave = async () => {
    try {
      await updateNoteTags.mutateAsync({ 
        noteId, 
        tags: editingTags.filter(Boolean) 
      });
      
      setIsEditing(false);
      onTagsUpdate?.(editingTags);
      
      toast({
        title: "Tags updated",
        description: "Note tags have been saved successfully.",
      });
    } catch (error: any) {
      toast({
        title: "Update failed",
        description: error.message || "Failed to update tags",
        variant: "destructive",
      });
    }
  };

  const handleCancel = () => {
    setEditingTags(tags);
    setIsEditing(false);
  };

  const removeTag = (tagToRemove: string) => {
    setEditingTags(prev => prev.filter(tag => tag !== tagToRemove));
  };

  if (isEditing) {
    return (
      <div className={cn("space-y-3", className)}>
        <TagInput
          tags={editingTags}
          onTagsChange={setEditingTags}
          suggestions={existingTags}
          maxTags={maxTags}
          placeholder="Edit tags..."
        />
        
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={handleSave}
            disabled={updateNoteTags.isPending}
            className="h-7 px-3"
          >
            <Check className="h-3 w-3 mr-1" />
            Save
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handleCancel}
            disabled={updateNoteTags.isPending}
            className="h-7 px-3"
          >
            Cancel
          </Button>
          {updateNoteTags.isPending && (
            <span className="text-xs text-muted-foreground">Saving...</span>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={cn("group relative", className)}>
      <div className="flex items-center gap-2 flex-wrap">
        {tags.length > 0 ? (
          <>
            {tags.slice(0, compact ? 2 : undefined).map((tag) => (
              <Badge 
                key={tag} 
                variant="secondary" 
                className="text-xs h-6 px-2 bg-accent/50 hover:bg-accent/70 transition-colors"
              >
                {tag}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeTag(tag);
                    setIsEditing(true);
                  }}
                  className="ml-1 hover:text-destructive transition-colors opacity-0 group-hover:opacity-100"
                  aria-label={`Remove ${tag} tag`}
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
            
            {compact && tags.length > 2 && (
              <Badge variant="outline" className="text-xs h-6 px-2">
                +{tags.length - 2}
              </Badge>
            )}
          </>
        ) : (
          <span className="text-xs text-muted-foreground">No tags</span>
        )}
        
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setIsEditing(true)}
          className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
        >
          {tags.length > 0 ? (
            <Edit3 className="h-3 w-3" />
          ) : (
            <Plus className="h-3 w-3" />
          )}
        </Button>
      </div>
    </div>
  );
};

export default InlineTagEditor;