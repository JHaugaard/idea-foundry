import { useState, useMemo } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Search, RefreshCw, Calendar, FileText } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface Note {
  id: string;
  title: string;
  semantic_enabled: boolean;
  created_at: string;
  updated_at: string;
  note_embeddings?: Array<{
    id: string;
    created_at: string;
    updated_at: string;
  }> | null;
}

interface EmbeddingDataTableProps {
  notes: Note[];
  selectedNotes: string[];
  onSelectionChange: (notes: string[]) => void;
  onRefresh: () => void;
}

type FilterType = 'all' | 'missing' | 'failed' | 'outdated' | 'completed';

export const EmbeddingDataTable = ({ 
  notes, 
  selectedNotes, 
  onSelectionChange, 
  onRefresh 
}: EmbeddingDataTableProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [isGenerating, setIsGenerating] = useState<string | null>(null);

  const getEmbeddingStatus = (note: Note) => {
    const hasEmbedding = Array.isArray(note.note_embeddings) && note.note_embeddings.length > 0;
    
    if (!note.semantic_enabled) return 'missing';
    if (note.semantic_enabled && !hasEmbedding) return 'failed';
    if (hasEmbedding && note.note_embeddings?.[0]) {
      const noteUpdated = new Date(note.updated_at);
      const embeddingUpdated = new Date(note.note_embeddings[0].updated_at);
      return noteUpdated > embeddingUpdated ? 'outdated' : 'completed';
    }
    return 'missing';
  };

  const filteredNotes = useMemo(() => {
    let filtered = notes;

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(note =>
        note.title.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply status filter
    if (filterType !== 'all') {
      filtered = filtered.filter(note => getEmbeddingStatus(note) === filterType);
    }

    return filtered;
  }, [notes, searchTerm, filterType]);

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allIds = filteredNotes.map(note => note.id);
      onSelectionChange(allIds);
    } else {
      onSelectionChange([]);
    }
  };

  const handleSelectNote = (noteId: string, checked: boolean) => {
    if (checked) {
      onSelectionChange([...selectedNotes, noteId]);
    } else {
      onSelectionChange(selectedNotes.filter(id => id !== noteId));
    }
  };

  const handleGenerateEmbedding = async (noteId: string) => {
    setIsGenerating(noteId);
    
    try {
      const { error } = await supabase.functions.invoke('note-embed', {
        body: { note_id: noteId }
      });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Embedding generated successfully',
      });
      
      onRefresh();
    } catch (error) {
      console.error('Error generating embedding:', error);
      toast({
        title: 'Error',
        description: 'Failed to generate embedding',
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(null);
    }
  };

  const getStatusBadge = (status: string) => {
    const config = {
      completed: { variant: 'default' as const, label: 'Completed', className: 'bg-success text-success-foreground' },
      missing: { variant: 'secondary' as const, label: 'Missing', className: '' },
      failed: { variant: 'destructive' as const, label: 'Failed', className: '' },
      outdated: { variant: 'outline' as const, label: 'Outdated', className: 'border-warning text-warning' },
    };

    const { variant, label, className } = config[status as keyof typeof config] || config.missing;
    
    return (
      <Badge variant={variant} className={className}>
        {label}
      </Badge>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Notes Management</span>
          <Button onClick={onRefresh} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search notes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8"
            />
          </div>
          
          <Select value={filterType} onValueChange={(value: FilterType) => setFilterType(value)}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Notes</SelectItem>
              <SelectItem value="missing">Missing Embeddings</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
              <SelectItem value="outdated">Outdated</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {filteredNotes.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No notes found matching your criteria</p>
          </div>
        ) : (
          <>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={filteredNotes.length > 0 && filteredNotes.every(note => selectedNotes.includes(note.id))}
                        onCheckedChange={handleSelectAll}
                        aria-label="Select all notes"
                      />
                    </TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Last Updated</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredNotes.map((note) => {
                    const status = getEmbeddingStatus(note);
                    const isSelected = selectedNotes.includes(note.id);
                    
                    return (
                      <TableRow key={note.id}>
                        <TableCell>
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={(checked) => handleSelectNote(note.id, !!checked)}
                            aria-label={`Select ${note.title}`}
                          />
                        </TableCell>
                        <TableCell className="font-medium">
                          <div className="max-w-xs truncate" title={note.title}>
                            {note.title}
                          </div>
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(status)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center text-sm text-muted-foreground">
                            <Calendar className="h-3 w-3 mr-1" />
                            {new Date(note.created_at).toLocaleDateString()}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm text-muted-foreground">
                            {new Date(note.updated_at).toLocaleDateString()}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Button
                            onClick={() => handleGenerateEmbedding(note.id)}
                            disabled={isGenerating === note.id || status === 'completed'}
                            size="sm"
                            variant="outline"
                          >
                            {isGenerating === note.id ? (
                              <RefreshCw className="h-3 w-3 animate-spin" />
                            ) : (
                              'Generate'
                            )}
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
            
            <div className="text-sm text-muted-foreground">
              Showing {filteredNotes.length} of {notes.length} notes
              {selectedNotes.length > 0 && ` • ${selectedNotes.length} selected`}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};