import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useSearchNotesByLinks } from '@/hooks/useLinkNetwork';
import { useLinkNavigation } from '@/hooks/useLinkNavigation';
import { Search, ExternalLink, ArrowRight, ArrowLeft } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export default function LinkSearchInterface() {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeSearch, setActiveSearch] = useState('');
  const { data: searchResults, isLoading } = useSearchNotesByLinks(activeSearch);
  const { navigateToNote } = useLinkNavigation();

  const handleSearch = () => {
    setActiveSearch(searchTerm);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Search className="h-5 w-5" />
          Search by Link Patterns
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Find notes linking to... (e.g., 'productivity')"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyPress={handleKeyPress}
              className="flex-1"
            />
            <Button onClick={handleSearch} disabled={!searchTerm.trim()}>
              Search
            </Button>
          </div>

          {activeSearch && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>Notes linking to:</span>
                <Badge variant="outline">"{activeSearch}"</Badge>
              </div>

              {isLoading ? (
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />
                  ))}
                </div>
              ) : searchResults?.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No notes found linking to "{activeSearch}"</p>
                  <p className="text-sm">Try a different search term</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {searchResults?.map((note) => (
                    <div key={note.noteId} className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-medium truncate">{note.title}</h4>
                          <Badge variant="secondary" className="shrink-0">
                            {note.totalConnections} connections
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <ArrowLeft className="h-3 w-3" />
                            <span>{note.incomingCount} incoming</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <ArrowRight className="h-3 w-3" />
                            <span>{note.outgoingCount} outgoing</span>
                          </div>
                          <span>•</span>
                          <span>Updated {formatDistanceToNow(new Date(note.updatedAt), { addSuffix: true })}</span>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigateToNote(note.slug, note.noteId)}
                        className="ml-2 shrink-0"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}