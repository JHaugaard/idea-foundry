
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { useNotes } from '@/hooks/useNotes';
import { useToast } from '@/hooks/use-toast';
import { ReviewQueueList } from '@/components/ReviewQueueList';
import { RecentNotes } from '@/components/RecentNotes';

export default function Index() {
  const { createNote } = useNotes();
  const { toast } = useToast();

  const handleCreateNote = async () => {
    try {
      const newNote = await createNote();
      toast({
        title: "Note created",
        description: "Your new note is ready for editing"
      });
    } catch (error: any) {
      toast({
        title: "Failed to create note",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Notes</h1>
            <p className="text-muted-foreground">Manage and organize your notes</p>
          </div>
          <Button onClick={handleCreateNote} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            New Note
          </Button>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Review Queue */}
          <Card>
            <CardHeader>
              <CardTitle>Review Queue</CardTitle>
            </CardHeader>
            <CardContent>
              <ReviewQueueList />
            </CardContent>
          </Card>

          {/* Recent Notes */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <RecentNotes />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
