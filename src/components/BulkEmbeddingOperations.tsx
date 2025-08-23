import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Play, Square, RefreshCw, Trash2, Download } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useBulkEmbeddingOperations } from '@/hooks/useBulkEmbeddingOperations';

interface BulkEmbeddingOperationsProps {
  selectedNotes: string[];
  onOperationStart: (operation: string) => void;
  onOperationComplete: () => void;
  totalNotes: number;
}

export const BulkEmbeddingOperations = ({
  selectedNotes,
  onOperationStart,
  onOperationComplete,
  totalNotes,
}: BulkEmbeddingOperationsProps) => {
  const [batchSize, setBatchSize] = useState('25');
  const [showRegenerateDialog, setShowRegenerateDialog] = useState(false);
  
  const {
    progress,
    isRunning,
    currentOperation,
    errors,
    startBulkGeneration,
    startRegenerateAll,
    stopOperation,
    clearErrors,
    exportStats
  } = useBulkEmbeddingOperations({
    onOperationStart,
    onOperationComplete,
  });

  const handleBulkGenerate = async () => {
    if (selectedNotes.length === 0) {
      toast({
        title: 'No Notes Selected',
        description: 'Please select notes to generate embeddings for.',
        variant: 'destructive',
      });
      return;
    }

    await startBulkGeneration(selectedNotes, parseInt(batchSize));
  };

  const handleRegenerateAll = async () => {
    setShowRegenerateDialog(false);
    await startRegenerateAll(parseInt(batchSize));
  };

  const handleDeleteEmbeddings = async () => {
    if (selectedNotes.length === 0) {
      toast({
        title: 'No Notes Selected',
        description: 'Please select notes to delete embeddings for.',
        variant: 'destructive',
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('note_embeddings')
        .delete()
        .in('note_id', selectedNotes);

      if (error) throw error;

      // Also disable semantic_enabled flag
      await supabase
        .from('notes')
        .update({ semantic_enabled: false })
        .in('id', selectedNotes);

      toast({
        title: 'Success',
        description: `Deleted embeddings for ${selectedNotes.length} notes`,
      });

      onOperationComplete();
    } catch (error) {
      console.error('Error deleting embeddings:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete embeddings',
        variant: 'destructive',
      });
    }
  };

  const progressPercentage = progress.total > 0 ? (progress.completed / progress.total) * 100 : 0;
  const estimatedCost = selectedNotes.length * 0.00001; // Rough estimate

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Bulk Operations</span>
            {isRunning && (
              <Button onClick={stopOperation} variant="destructive" size="sm">
                <Square className="h-4 w-4 mr-2" />
                Stop
              </Button>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Batch Configuration */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="batch-size">Batch Size</Label>
              <Select value={batchSize} onValueChange={setBatchSize} disabled={isRunning}>
                <SelectTrigger id="batch-size">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10 notes per batch</SelectItem>
                  <SelectItem value="25">25 notes per batch</SelectItem>
                  <SelectItem value="50">50 notes per batch</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Selected Notes</Label>
              <div className="flex items-center space-x-2">
                <Badge variant="secondary">{selectedNotes.length} selected</Badge>
                {selectedNotes.length > 0 && (
                  <span className="text-sm text-muted-foreground">
                    Est. cost: ${estimatedCost.toFixed(4)}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Operation Buttons */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Button 
              onClick={handleBulkGenerate} 
              disabled={isRunning || selectedNotes.length === 0}
              className="w-full"
            >
              <Play className="h-4 w-4 mr-2" />
              Generate Selected
            </Button>

            <AlertDialog open={showRegenerateDialog} onOpenChange={setShowRegenerateDialog}>
              <AlertDialogTrigger asChild>
                <Button variant="outline" disabled={isRunning} className="w-full">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Regenerate All
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Regenerate All Embeddings</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will regenerate embeddings for all {totalNotes} notes. 
                    This operation may take some time and cost approximately ${(totalNotes * 0.00001).toFixed(4)}.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleRegenerateAll}>
                    Continue
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button 
                  variant="destructive" 
                  disabled={isRunning || selectedNotes.length === 0}
                  className="w-full"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Selected
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Embeddings</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will delete embeddings for {selectedNotes.length} selected notes. 
                    This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDeleteEmbeddings} className="bg-destructive">
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <Button variant="outline" onClick={exportStats} className="w-full">
              <Download className="h-4 w-4 mr-2" />
              Export Stats
            </Button>
          </div>

          {/* Progress Display */}
          {isRunning && (
            <div className="space-y-3 p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{currentOperation}</span>
                <Badge variant="secondary" className="animate-pulse">
                  Running
                </Badge>
              </div>
              
              <Progress value={progressPercentage} className="h-2" />
              
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>
                  {progress.completed} of {progress.total} completed
                </span>
                <span>{progressPercentage.toFixed(1)}%</span>
              </div>
              
              {progress.failed > 0 && (
                <div className="text-sm text-destructive">
                  {progress.failed} failed
                </div>
              )}
            </div>
          )}

          {/* Error Display */}
          {errors.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-destructive">
                  {errors.length} Errors Occurred
                </span>
                <Button onClick={clearErrors} size="sm" variant="outline">
                  Clear
                </Button>
              </div>
              <div className="max-h-32 overflow-y-auto space-y-1 text-sm">
                {errors.slice(0, 5).map((error, index) => (
                  <div key={index} className="p-2 bg-destructive/10 rounded text-destructive">
                    {error}
                  </div>
                ))}
                {errors.length > 5 && (
                  <div className="text-muted-foreground">
                    ... and {errors.length - 5} more errors
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};