import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EmbeddingStatsCards } from './EmbeddingStatsCards';
import { EmbeddingDataTable } from './EmbeddingDataTable';
import { BulkEmbeddingOperations } from './BulkEmbeddingOperations';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface NoteWithEmbedding {
  id: string;
  title: string;
  semantic_enabled: boolean;
  created_at: string;
  updated_at: string;
  note_embeddings: Array<{
    id: string;
    created_at: string;
    updated_at: string;
  }> | null;
}

export const EmbeddingAdminDashboard = () => {
  const { user } = useAuth();
  const [selectedNotes, setSelectedNotes] = useState<string[]>([]);
  const [activeOperation, setActiveOperation] = useState<string | null>(null);

  // Fetch comprehensive embedding stats
  const { data: embeddingStats, refetch: refetchStats } = useQuery({
    queryKey: ['embedding-stats', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      // Get all notes with embedding status
      const { data: notes, error: notesError } = await supabase
        .from('notes')
        .select(`
          id,
          title,
          semantic_enabled,
          created_at,
          updated_at,
          note_embeddings (
            id,
            created_at,
            updated_at
          )
        `)
        .eq('user_id', user.id);

      if (notesError) throw notesError;

      // Transform the data to ensure note_embeddings is always an array
      const transformedNotes: NoteWithEmbedding[] = (notes || []).map(note => ({
        ...note,
        note_embeddings: note.note_embeddings ? [note.note_embeddings].flat() : null
      }));

      const totalNotes = transformedNotes.length;
      const notesWithEmbeddings = transformedNotes.filter(note => 
        note.semantic_enabled && note.note_embeddings && note.note_embeddings.length > 0
      ).length;
      
      const failedNotes = transformedNotes.filter(note => 
        note.semantic_enabled && (!note.note_embeddings || note.note_embeddings.length === 0)
      ).length;

      const outdatedNotes = transformedNotes.filter(note => {
        if (!note.note_embeddings || !note.note_embeddings[0]) return false;
        return new Date(note.updated_at) > new Date(note.note_embeddings[0].updated_at);
      }).length;

      // Calculate success rate
      const successRate = totalNotes > 0 ? (notesWithEmbeddings / totalNotes) * 100 : 0;

      // Get last batch run info
      const lastBatchRun = transformedNotes
        ?.filter(note => note.note_embeddings && note.note_embeddings.length > 0)
        ?.sort((a, b) => {
          const aEmbedding = a.note_embeddings?.[0];
          const bEmbedding = b.note_embeddings?.[0];
          if (!aEmbedding || !bEmbedding) return 0;
          return new Date(bEmbedding.created_at).getTime() - new Date(aEmbedding.created_at).getTime();
        })?.[0]?.note_embeddings?.[0]?.created_at;

      return {
        totalNotes,
        notesWithEmbeddings,
        failedNotes,
        outdatedNotes,
        successRate,
        lastBatchRun,
        estimatedCost: notesWithEmbeddings * 0.00001, // Rough estimate for text-embedding-3-small
        allNotes: transformedNotes
      };
    },
    enabled: !!user?.id,
    refetchInterval: activeOperation ? 2000 : false, // Refresh during operations
  });

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Embedding Management</h1>
          <p className="text-muted-foreground">
            Manage semantic search embeddings for your notes
          </p>
        </div>
      </div>

      <EmbeddingStatsCards 
        stats={embeddingStats} 
        isLoading={!embeddingStats} 
        activeOperation={activeOperation}
      />

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="manage">Manage Notes</TabsTrigger>
          <TabsTrigger value="operations">Bulk Operations</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Embedding Status Overview</CardTitle>
              <CardDescription>
                Current status of semantic embeddings across all your notes
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <div className="flex flex-col items-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold text-success">
                    {embeddingStats?.successRate.toFixed(1) || 0}%
                  </div>
                  <div className="text-sm text-muted-foreground">Success Rate</div>
                </div>
                <div className="flex flex-col items-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold text-warning">
                    {embeddingStats?.outdatedNotes || 0}
                  </div>
                  <div className="text-sm text-muted-foreground">Outdated</div>
                </div>
                <div className="flex flex-col items-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold text-destructive">
                    {embeddingStats?.failedNotes || 0}
                  </div>
                  <div className="text-sm text-muted-foreground">Failed</div>
                </div>
                <div className="flex flex-col items-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold text-muted-foreground">
                    ${embeddingStats?.estimatedCost.toFixed(4) || 0}
                  </div>
                  <div className="text-sm text-muted-foreground">Est. Cost</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="manage" className="space-y-6">
          <EmbeddingDataTable 
            notes={embeddingStats?.allNotes || []}
            selectedNotes={selectedNotes}
            onSelectionChange={setSelectedNotes}
            onRefresh={refetchStats}
          />
        </TabsContent>

        <TabsContent value="operations" className="space-y-6">
          <BulkEmbeddingOperations
            selectedNotes={selectedNotes}
            onOperationStart={setActiveOperation}
            onOperationComplete={() => {
              setActiveOperation(null);
              refetchStats();
            }}
            totalNotes={embeddingStats?.totalNotes || 0}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};