
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { ReviewQueueList } from '@/components/ReviewQueueList';
import RecentNotes from '@/components/RecentNotes';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useQueryClient } from '@tanstack/react-query';

export default function Index() {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const handleCreateNote = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('notes')
        .insert({
          user_id: user.id,
          title: 'New Note',
          content: '',
          tags: [],
          review_status: 'not_reviewed'
        })
        .select()
        .single();

      if (error) throw error;

      // Invalidate notes queries to refresh the lists
      queryClient.invalidateQueries({ queryKey: ['notes'] });
      
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
