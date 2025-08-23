import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Brain, 
  Search, 
  Sparkles,
  ExternalLink,
  Zap,
  AlertCircle
} from 'lucide-react';

interface SemanticSearchPanelProps {
  currentNoteId?: string;
  onNavigateToNote?: (noteId: string) => void;
}

interface SemanticResult {
  id: string;
  title: string;
  content: string;
  similarity: number;
  tags?: string[];
}

export function SemanticSearchPanel({ 
  currentNoteId, 
  onNavigateToNote 
}: SemanticSearchPanelProps) {
  const { user } = useAuth();
  const [semanticQuery, setSemanticQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [semanticResults, setSemanticResults] = useState<SemanticResult[]>([]);

  // Check if embeddings are available
  const { data: hasEmbeddings, isLoading: checkingEmbeddings } = useQuery({
    queryKey: ['has-embeddings', user?.id],
    queryFn: async () => {
      if (!user?.id) return false;
      
      const { data, error } = await supabase
        .from('note_embeddings')
        .select('id')
        .eq('user_id', user.id)
        .limit(1);

      if (error) return false;
      return (data?.length || 0) > 0;
    },
    enabled: !!user?.id,
  });

  const performSemanticSearch = async () => {
    if (!semanticQuery.trim() || !user?.id) return;
    
    setIsSearching(true);
    try {
      // Call the edge function for semantic search
      const { data, error } = await supabase.functions.invoke('note-embed', {
        body: { 
          action: 'search',
          query: semanticQuery,
          limit: 10
        }
      });

      if (error) throw error;
      
      setSemanticResults(data?.results || []);
    } catch (error) {
      console.error('Semantic search error:', error);
      setSemanticResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      performSemanticSearch();
    }
  };

  if (checkingEmbeddings) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Brain className="h-4 w-4" />
            Semantic Search
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-8 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!hasEmbeddings) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Brain className="h-4 w-4" />
            Semantic Search
          </CardTitle>
          <CardDescription className="text-xs">
            AI-powered content similarity search
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6">
            <AlertCircle className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
            <p className="text-sm text-muted-foreground mb-2">
              Semantic search not available
            </p>
            <p className="text-xs text-muted-foreground">
              Enable semantic indexing in your notes to use AI-powered search
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-2">
          <Brain className="h-4 w-4" />
          Semantic Search
        </CardTitle>
        <CardDescription className="text-xs">
          Find conceptually similar content using AI
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by meaning, not just keywords..."
            value={semanticQuery}
            onChange={(e) => setSemanticQuery(e.target.value)}
            onKeyPress={handleKeyPress}
            className="pl-10 pr-12"
          />
          <Button
            size="sm"
            onClick={performSemanticSearch}
            disabled={!semanticQuery.trim() || isSearching}
            className="absolute right-1 top-1/2 transform -translate-y-1/2 h-7"
          >
            {isSearching ? (
              <Sparkles className="h-3 w-3 animate-spin" />
            ) : (
              <Zap className="h-3 w-3" />
            )}
          </Button>
        </div>

        {/* Search Results */}
        {isSearching ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="p-2 border rounded">
                <Skeleton className="h-4 w-3/4 mb-2" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-1/2 mt-1" />
              </div>
            ))}
          </div>
        ) : semanticResults.length > 0 ? (
          <ScrollArea className="max-h-80">
            <div className="space-y-2">
              {semanticResults.map((result) => (
                <div
                  key={result.id}
                  className="p-3 border rounded hover:bg-muted/50 cursor-pointer transition-colors"
                  onClick={() => onNavigateToNote?.(result.id)}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <h4 className="font-medium text-sm mb-1">
                        {result.title}
                      </h4>
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {result.content.slice(0, 120)}...
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge 
                        variant="secondary" 
                        className="text-xs"
                      >
                        {Math.round(result.similarity * 100)}%
                      </Badge>
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                        <ExternalLink className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  
                  {result.tags && result.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {result.tags.slice(0, 3).map(tag => (
                        <Badge key={tag} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                      {result.tags.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{result.tags.length - 3}
                        </Badge>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        ) : semanticQuery && !isSearching ? (
          <div className="text-center py-4 text-muted-foreground">
            <Brain className="h-6 w-6 mx-auto mb-2" />
            <p className="text-sm">No semantically similar content found</p>
            <p className="text-xs">Try different concepts or keywords</p>
          </div>
        ) : null}

        {/* Search Tips */}
        {!semanticQuery && (
          <div className="text-xs text-muted-foreground space-y-1">
            <p className="font-medium">Semantic search tips:</p>
            <ul className="list-disc list-inside space-y-0.5">
              <li>Search by concepts, not exact words</li>
              <li>Use natural language descriptions</li>
              <li>Try synonyms and related ideas</li>
              <li>Results show conceptual similarity</li>
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}