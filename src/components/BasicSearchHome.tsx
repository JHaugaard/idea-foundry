import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Search, Hash } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useLinkNavigation } from '@/hooks/useLinkNavigation';

interface SearchResult {
  id: string;
  title: string;
  content: string | null;
  tags: string[] | null;
  created_at: string;
  slug?: string;
}

interface BasicSearchHomeProps {
  onNoteSelect?: (noteId: string) => void;
}

export const BasicSearchHome: React.FC<BasicSearchHomeProps> = ({ onNoteSelect }) => {
  const [query, setQuery] = useState('');
  const { user } = useAuth();
  const { navigateToNote } = useLinkNavigation();

  const searchResults = useQuery({
    queryKey: ['search', query, user?.id],
    queryFn: async () => {
      if (!user || !query.trim()) return [];

      const trimmedQuery = query.trim().toLowerCase();
      
      // Check if searching by tag (starts with #)
      if (trimmedQuery.startsWith('#')) {
        const tagName = trimmedQuery.substring(1);
        if (!tagName) return [];
        
        const { data, error } = await supabase
          .from('notes')
          .select('id, title, content, tags, created_at, slug')
          .eq('user_id', user.id)
          .contains('tags', [tagName])
          .order('created_at', { ascending: false })
          .limit(20);

        if (error) throw error;
        return data || [];
      } else {
        // Search in title and content
        const { data, error } = await supabase
          .from('notes')
          .select('id, title, content, tags, created_at, slug')
          .eq('user_id', user.id)
          .or(`title.ilike.%${trimmedQuery}%,content.ilike.%${trimmedQuery}%`)
          .order('created_at', { ascending: false })
          .limit(20);

        if (error) throw error;
        return data || [];
      }
    },
    enabled: !!user && !!query.trim(),
  });

  const handleNoteClick = (note: SearchResult) => {
    if (onNoteSelect) {
      onNoteSelect(note.id);
    } else {
      navigateToNote(note.slug, note.id, note.title);
    }
  };

  const results = searchResults.data || [];

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search notes or use #tag..."
          className="pl-10"
        />
      </div>

      {query.trim() && (
        <div className="space-y-2">
          {searchResults.isLoading && (
            <div className="text-center text-muted-foreground py-4">
              Searching...
            </div>
          )}
          
          {results.length === 0 && !searchResults.isLoading && query.trim() && (
            <div className="text-center text-muted-foreground py-4">
              No notes found for "{query}"
            </div>
          )}

          {results.map((note) => (
            <Card 
              key={note.id} 
              className="cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={() => handleNoteClick(note)}
            >
              <CardContent className="p-3">
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-medium text-sm leading-tight line-clamp-2">
                      {note.title}
                    </h3>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {formatDistanceToNow(new Date(note.created_at), { addSuffix: true })}
                    </span>
                  </div>
                  
                  {note.content && (
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {note.content}
                    </p>
                  )}
                  
                  {note.tags && note.tags.length > 0 && (
                    <div className="flex items-center gap-1 flex-wrap">
                      <Hash className="h-3 w-3 text-muted-foreground" />
                      {note.tags.slice(0, 3).map((tag) => (
                        <Badge key={tag} variant="secondary" className="text-xs px-1 py-0">
                          {tag}
                        </Badge>
                      ))}
                      {note.tags.length > 3 && (
                        <span className="text-xs text-muted-foreground">
                          +{note.tags.length - 3} more
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default BasicSearchHome;