import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useTagAutomation, TagSuggestion } from '@/hooks/useTagAutomation';
import { useTags } from '@/hooks/useTags';
import { useToast } from '@/hooks/use-toast';
import { 
  Sparkles, 
  Target, 
  Brain, 
  Loader2,
  CheckCircle,
  XCircle,
  Info,
  TrendingUp
} from 'lucide-react';

interface TagAutomationPanelProps {
  noteId?: string;
  noteContent?: string;
  noteTitle?: string;
  existingTags?: string[];
  onTagsApplied?: (tags: string[]) => void;
}

export default function TagAutomationPanel({ 
  noteId, 
  noteContent, 
  noteTitle, 
  existingTags = [],
  onTagsApplied
}: TagAutomationPanelProps) {
  const { toast } = useToast();
  const { updateNoteTags } = useTags();
  const {
    getContentSuggestions,
    isGettingContentSuggestions,
    getSimilaritySuggestions,
    isGettingSimilaritySuggestions
  } = useTagAutomation();

  const [contentSuggestions, setContentSuggestions] = useState<TagSuggestion[]>([]);
  const [similaritySuggestions, setSimilaritySuggestions] = useState<TagSuggestion[]>([]);
  const [selectedSuggestions, setSelectedSuggestions] = useState<Set<string>>(new Set());

  const handleGetContentSuggestions = async () => {
    if (!noteContent || !noteTitle) {
      toast({
        title: "Content required",
        description: "Note content and title are required for AI suggestions",
        variant: "destructive",
      });
      return;
    }

    try {
      getContentSuggestions(
        { content: noteContent, title: noteTitle, existingTags },
        {
          onSuccess: (suggestions) => {
            setContentSuggestions(suggestions);
            if (suggestions.length === 0) {
              toast({
                title: "No suggestions",
                description: "AI couldn't find relevant tag suggestions for this content",
              });
            }
          }
        }
      );
    } catch (error) {
      toast({
        title: "Suggestions failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    }
  };

  const handleGetSimilaritySuggestions = async () => {
    if (!noteId) {
      toast({
        title: "Note ID required",
        description: "Note must be saved to get similarity suggestions",
        variant: "destructive",
      });
      return;
    }

    try {
      getSimilaritySuggestions(noteId, {
        onSuccess: (suggestions) => {
          setSimilaritySuggestions(suggestions);
          if (suggestions.length === 0) {
            toast({
              title: "No similar notes",
              description: "No similar notes found with relevant tags",
            });
          }
        }
      });
    } catch (error) {
      toast({
        title: "Similarity search failed", 
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    }
  };

  const toggleSuggestion = (tag: string) => {
    const newSelected = new Set(selectedSuggestions);
    if (newSelected.has(tag)) {
      newSelected.delete(tag);
    } else {
      newSelected.add(tag);
    }
    setSelectedSuggestions(newSelected);
  };

  const applySelectedTags = async () => {
    if (selectedSuggestions.size === 0) {
      toast({
        title: "No tags selected",
        description: "Please select tags to apply",
        variant: "destructive",
      });
      return;
    }

    const newTags = [...new Set([...existingTags, ...Array.from(selectedSuggestions)])];
    
    try {
      if (noteId) {
        updateNoteTags.mutate({ noteId, tags: newTags });
      }
      
      onTagsApplied?.(newTags);
      setSelectedSuggestions(new Set());
      
      toast({
        title: "Tags applied",
        description: `Added ${selectedSuggestions.size} tags to the note`,
      });
    } catch (error) {
      toast({
        title: "Failed to apply tags",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    }
  };

  const getConfidenceColor = (confidence: string) => {
    switch (confidence) {
      case 'high': return 'bg-green-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-red-500';
      default: return 'bg-muted';
    }
  };

  const getReasonIcon = (reason: string) => {
    switch (reason) {
      case 'content': return <Brain className="h-3 w-3" />;
      case 'similarity': return <Target className="h-3 w-3" />;
      case 'pattern': return <TrendingUp className="h-3 w-3" />;
      default: return <Info className="h-3 w-3" />;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5" />
          Smart Tag Suggestions
        </CardTitle>
        <CardDescription>
          AI-powered tag recommendations based on content and similar notes
        </CardDescription>
      </CardHeader>

      <CardContent>
        <Tabs defaultValue="content" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="content" className="flex items-center gap-2">
              <Brain className="h-4 w-4" />
              Content AI
            </TabsTrigger>
            <TabsTrigger value="similarity" className="flex items-center gap-2">
              <Target className="h-4 w-4" />
              Similar Notes
            </TabsTrigger>
          </TabsList>

          <TabsContent value="content" className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Get AI-powered tag suggestions based on note content
              </p>
              <Button
                onClick={handleGetContentSuggestions}
                disabled={isGettingContentSuggestions}
                size="sm"
                className="flex items-center gap-2"
              >
                {isGettingContentSuggestions ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Brain className="h-4 w-4" />
                )}
                Analyze Content
              </Button>
            </div>

            {contentSuggestions.length > 0 && (
              <div className="space-y-2">
                <div className="text-sm font-medium">Content-based suggestions:</div>
                <div className="flex flex-wrap gap-2">
                  {contentSuggestions.map((suggestion) => (
                    <div key={suggestion.tag} className="relative">
                      <Badge
                        variant={selectedSuggestions.has(suggestion.tag) ? "default" : "outline"}
                        className="cursor-pointer hover:bg-accent transition-colors pr-8"
                        onClick={() => toggleSuggestion(suggestion.tag)}
                      >
                        <div className="flex items-center gap-1">
                          {getReasonIcon(suggestion.reason)}
                          {suggestion.tag}
                        </div>
                      </Badge>
                      <div 
                        className={`absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 border-background ${getConfidenceColor(suggestion.confidence)}`}
                        title={`${suggestion.confidence} confidence`}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="similarity" className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Find tags from similar notes in your collection
              </p>
              <Button
                onClick={handleGetSimilaritySuggestions}
                disabled={isGettingSimilaritySuggestions || !noteId}
                size="sm"
                className="flex items-center gap-2"
              >
                {isGettingSimilaritySuggestions ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Target className="h-4 w-4" />
                )}
                Find Similar
              </Button>
            </div>

            {!noteId && (
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  Save the note first to get similarity-based suggestions
                </AlertDescription>
              </Alert>
            )}

            {similaritySuggestions.length > 0 && (
              <div className="space-y-4">
                {similaritySuggestions.map((suggestion) => (
                  <div key={suggestion.tag} className="border rounded-lg p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <Badge
                        variant={selectedSuggestions.has(suggestion.tag) ? "default" : "outline"}
                        className="cursor-pointer hover:bg-accent transition-colors"
                        onClick={() => toggleSuggestion(suggestion.tag)}
                      >
                        <div className="flex items-center gap-1">
                          {getReasonIcon(suggestion.reason)}
                          {suggestion.tag}
                        </div>
                      </Badge>
                      <div 
                        className={`w-2 h-2 rounded-full ${getConfidenceColor(suggestion.confidence)}`}
                        title={`${suggestion.confidence} confidence`}
                      />
                    </div>
                    
                    {suggestion.similarNotes && suggestion.similarNotes.length > 0 && (
                      <div className="text-xs text-muted-foreground">
                        <div className="font-medium mb-1">Similar notes:</div>
                        <div className="space-y-1">
                          {suggestion.similarNotes.slice(0, 3).map((note, index) => (
                            <div key={index} className="truncate">
                              • {note.title} ({Math.round(note.similarity * 100)}% similar)
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {selectedSuggestions.size > 0 && (
          <div className="mt-4 pt-4 border-t">
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                {selectedSuggestions.size} tag{selectedSuggestions.size !== 1 ? 's' : ''} selected
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedSuggestions(new Set())}
                >
                  Clear
                </Button>
                <Button
                  size="sm"
                  onClick={applySelectedTags}
                  className="flex items-center gap-2"
                >
                  <CheckCircle className="h-4 w-4" />
                  Apply Tags
                </Button>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}