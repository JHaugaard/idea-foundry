import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNotes } from '@/hooks/useNotes';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { FileText, Clock, MoreHorizontal, Tags, Users, Edit3 } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { useLinkNavigation } from '@/hooks/useLinkNavigation';
import TagManagementDialog from '@/components/TagManagementDialog';
import BatchTagOperations from '@/components/BatchTagOperations';

interface Note {
  id: string;
  title: string;
  content: string | null;
  tags: string[] | null;
  created_at: string;
  updated_at: string;
  slug?: string;
}

const RecentNotes = () => {
  const [tagManagementOpen, setTagManagementOpen] = useState(false);
  const [batchOperationsOpen, setBatchOperationsOpen] = useState(false);
  
  const { user } = useAuth();
  const { toast } = useToast();
  const { notes, isLoading, invalidateNotes } = useNotes();
  const { navigateToNote } = useLinkNavigation();

  const handleNoteClick = (note: Note) => {
    navigateToNote(note.id, note.slug || null);
  };

  const handleTagsUpdate = (noteId: string, newTags: string[]) => {
    // Invalidate to refetch latest data
    invalidateNotes();
  };

  if (isLoading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Review
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground">Loading...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="w-full">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              <CardTitle>Recent Captures</CardTitle>
            </div>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => setTagManagementOpen(true)}>
                  <Tags className="h-4 w-4 mr-2" />
                  Manage Tags
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setBatchOperationsOpen(true)}>
                  <Users className="h-4 w-4 mr-2" />
                  Batch Operations
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={invalidateNotes}>
                  <Edit3 className="h-4 w-4 mr-2" />
                  Refresh Notes
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <CardDescription>
            Your most recent captures
          </CardDescription>
        </CardHeader>
        <CardContent>
          {notes.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No ideas captured yet.</p>
              <p className="text-sm">Use Quick Capture to add your first idea!</p>
            </div>
          ) : (
            <ScrollArea className="h-[300px]">
              <div className="space-y-1">
                 {notes.slice(0, 10).map((note) => (
                  <div 
                    key={note.id}
                    className="flex items-center justify-between gap-2 p-2 hover:bg-muted/50 transition-colors cursor-pointer rounded-md"
                    onClick={() => handleNoteClick(note)}
                  >
                    <h4 className="font-medium text-sm leading-tight line-clamp-1 flex-1">
                      {note.title}
                    </h4>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground flex-shrink-0">
                      <Clock className="h-3 w-3" />
                      {format(new Date(note.created_at), 'MM/dd/yyyy')}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      <TagManagementDialog
        open={tagManagementOpen}
        onOpenChange={setTagManagementOpen}
      />

      <BatchTagOperations
        open={batchOperationsOpen}
        onOpenChange={setBatchOperationsOpen}
        notes={notes}
        onCompleted={() => {
          invalidateNotes();
          setBatchOperationsOpen(false);
        }}
      />
    </>
  );
};

export default RecentNotes;