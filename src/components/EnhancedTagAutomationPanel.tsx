import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAITagPreferences } from '@/hooks/useAITagPreferences';
import { useTags } from '@/hooks/useTags';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  Sparkles, 
  Target, 
  Brain, 
  Loader2,
  CheckCircle,
  XCircle,
  Info,
  TrendingUp,
  Globe,
  Wand2,
  BarChart3,
  RefreshCw
} from 'lucide-react';

interface EnhancedTagSuggestion {
  tag: string;
  confidence: number;
  reason: string;
  category: 'topic' | 'action' | 'context' | 'meta';
}

interface TagTranslation {
  original: string;
  translated: string;
  confidence: number;
  notes?: string;
}

interface EnhancedTagAutomationPanelProps {
  noteId?: string;
  noteContent?: string;
  noteTitle?: string;
  existingTags?: string[];
  onTagsApplied?: (tags: string[]) => void;
}

export default function EnhancedTagAutomationPanel({ 
  noteId, 
  noteContent, 
  noteTitle, 
  existingTags = [],
  onTagsApplied
}: EnhancedTagAutomationPanelProps) {
  const { toast } = useToast();
  const { updateNoteTags } = useTags();
  const { preferences, recordInteraction } = useAITagPreferences();
  
  // State for different suggestion types
  const [contentSuggestions, setContentSuggestions] = useState<EnhancedTagSuggestion[]>([]);
  const [similaritySuggestions, setSimilaritySuggestions] = useState<EnhancedTagSuggestion[]>([]);
  const [translations, setTranslations] = useState<TagTranslation[]>([]);
  const [selectedSuggestions, setSelectedSuggestions] = useState<Set<string>>(new Set());
  
  // Loading states
  const [isGettingContentSuggestions, setIsGettingContentSuggestions] = useState(false);
  const [isGettingSimilaritySuggestions, setIsGettingSimilaritySuggestions] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  
  // Translation settings
  const [targetLanguage, setTargetLanguage] = useState(preferences.primary_language);

  // Auto-suggest on content change
  useEffect(() => {
    if (preferences.auto_suggest_enabled && noteContent && noteTitle && !preferences.manual_review_required) {
      handleGetContentSuggestions();
    }
  }, [noteContent, noteTitle, preferences.auto_suggest_enabled]);

  const handleGetContentSuggestions = async () => {
    if (!noteContent || !noteTitle) {
      toast({
        title: "Content required",
        description: "Note content and title are required for AI suggestions",
        variant: "destructive",
      });
      return;
    }

    setIsGettingContentSuggestions(true);
    try {
      const { data, error } = await supabase.functions.invoke('suggest-tags', {
        body: { 
          mode: 'suggestions',
          content: noteContent, 
          title: noteTitle, 
          existingTags,
          noteId
        }
      });

      if (error) throw error;
      
      const filteredSuggestions = data.suggestions.filter((suggestion: EnhancedTagSuggestion) => 
        suggestion.confidence >= preferences.confidence_threshold
      );
      
      setContentSuggestions(filteredSuggestions.slice(0, preferences.max_suggestions_per_note));
      
      if (filteredSuggestions.length === 0) {
        toast({
          title: "No high-confidence suggestions",
          description: "AI couldn't find suggestions meeting your confidence threshold",
        });
      }
    } catch (error) {
      console.error('Content suggestions error:', error);
      toast({
        title: "Suggestions failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setIsGettingContentSuggestions(false);
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

    setIsGettingSimilaritySuggestions(true);
    try {
      // This would use the existing vector similarity logic
      // For now, using a simplified approach
      const { data: similarNotes, error } = await supabase
        .from('notes')
        .select('id, title, content, tags')
        .neq('id', noteId)
        .limit(10);

      if (error) throw error;

      // Simple text similarity
      const targetWords = new Set(
        `${noteTitle} ${noteContent}`
          .toLowerCase()
          .match(/\b\w{3,}\b/g) || []
      );

      const similarities = similarNotes
        .map(note => {
          const noteWords = new Set(
            `${note.title} ${note.content}`
              .toLowerCase()
              .match(/\b\w{3,}\b/g) || []
          );
          
          const intersection = new Set([...targetWords].filter(x => noteWords.has(x)));
          const union = new Set([...targetWords, ...noteWords]);
          const similarity = intersection.size / union.size;
          
          return { ...note, similarity };
        })
        .filter(note => note.similarity > 0.1)
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, 5);

      // Extract suggested tags
      const suggestedTagsMap = new Map<string, { score: number; notes: any[] }>();
      similarities.forEach(note => {
        note.tags?.forEach((tag: string) => {
          if (!existingTags.includes(tag)) {
            const existing = suggestedTagsMap.get(tag) || { score: 0, notes: [] };
            existing.score += note.similarity;
            existing.notes.push(note);
            suggestedTagsMap.set(tag, existing);
          }
        });
      });

      const suggestions = Array.from(suggestedTagsMap.entries())
        .sort((a, b) => b[1].score - a[1].score)
        .slice(0, 5)
        .map(([tag, data]) => ({
          tag,
          confidence: Math.min(data.score, 0.95),
          reason: `Found in ${data.notes.length} similar note${data.notes.length > 1 ? 's' : ''}`,
          category: 'context' as const
        }));

      setSimilaritySuggestions(suggestions);
      
      if (suggestions.length === 0) {
        toast({
          title: "No similar notes",
          description: "No similar notes found with relevant tags",
        });
      }
    } catch (error) {
      console.error('Similarity suggestions error:', error);
      toast({
        title: "Similarity search failed", 
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setIsGettingSimilaritySuggestions(false);
    }
  };

  const handleTranslateTags = async () => {
    if (existingTags.length === 0) {
      toast({
        title: "No tags to translate",
        description: "Add some tags first to translate them",
        variant: "destructive",
      });
      return;
    }

    setIsTranslating(true);
    try {
      const { data, error } = await supabase.functions.invoke('suggest-tags', {
        body: { 
          mode: 'translation',
          existingTags: existingTags,
          targetLanguage
        }
      });

      if (error) throw error;
      setTranslations(data.translations);
      
      toast({
        title: "Translation complete",
        description: `Translated ${data.translations.length} tags to ${targetLanguage}`,
      });
    } catch (error) {
      console.error('Translation error:', error);
      toast({
        title: "Translation failed", 
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setIsTranslating(false);
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

  const handleSuggestionInteraction = (suggestion: EnhancedTagSuggestion, action: 'accepted' | 'rejected') => {
    if (noteId) {
      recordInteraction({
        suggestedTag: suggestion.tag,
        noteId,
        action,
        suggestionSource: 'content_ai',
        confidence: suggestion.confidence,
        noteContentSnippet: noteContent?.slice(0, 200),
        otherNoteTags: existingTags
      });
    }
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
      
      // Record interactions for selected tags
      [...contentSuggestions, ...similaritySuggestions]
        .filter(s => selectedSuggestions.has(s.tag))
        .forEach(s => handleSuggestionInteraction(s, 'accepted'));
      
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

  const rejectSuggestion = (suggestion: EnhancedTagSuggestion) => {
    handleSuggestionInteraction(suggestion, 'rejected');
    
    // Remove from current suggestions
    setContentSuggestions(prev => prev.filter(s => s.tag !== suggestion.tag));
    setSimilaritySuggestions(prev => prev.filter(s => s.tag !== suggestion.tag));
    
    // Remove from selected if it was selected
    const newSelected = new Set(selectedSuggestions);
    newSelected.delete(suggestion.tag);
    setSelectedSuggestions(newSelected);
    
    toast({
      title: "Suggestion rejected",
      description: `"${suggestion.tag}" will be suggested less often`,
    });
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'bg-green-500';
    if (confidence >= 0.6) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'topic': return <Brain className="h-3 w-3" />;
      case 'action': return <Target className="h-3 w-3" />;
      case 'context': return <Info className="h-3 w-3" />;
      case 'meta': return <TrendingUp className="h-3 w-3" />;
      default: return <Info className="h-3 w-3" />;
    }
  };

  const allSuggestions = [...contentSuggestions, ...similaritySuggestions];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5" />
          Enhanced AI Tag Assistant
        </CardTitle>
        <CardDescription>
          Advanced AI-powered tag recommendations with learning and personalization
        </CardDescription>
      </CardHeader>

      <CardContent>
        <Tabs defaultValue="suggestions" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="suggestions" className="flex items-center gap-2">
              <Brain className="h-4 w-4" />
              Smart Suggestions
            </TabsTrigger>
            <TabsTrigger value="similarity" className="flex items-center gap-2">
              <Target className="h-4 w-4" />
              Similar Notes
            </TabsTrigger>
            <TabsTrigger value="translation" className="flex items-center gap-2">
              <Globe className="h-4 w-4" />
              Translation
            </TabsTrigger>
          </TabsList>

          <TabsContent value="suggestions" className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">
                  AI-powered content analysis with {preferences.confidence_threshold * 100}% minimum confidence
                </p>
                {preferences.auto_suggest_enabled && (
                  <Badge variant="secondary" className="text-xs">
                    Auto-suggestions enabled
                  </Badge>
                )}
              </div>
              <Button
                onClick={handleGetContentSuggestions}
                disabled={isGettingContentSuggestions}
                size="sm"
                className="flex items-center gap-2"
              >
                {isGettingContentSuggestions ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Wand2 className="h-4 w-4" />
                )}
                Analyze Content
              </Button>
            </div>

            {contentSuggestions.length > 0 && (
              <div className="space-y-3">
                <div className="text-sm font-medium">Content-based suggestions:</div>
                <div className="space-y-2">
                  {contentSuggestions.map((suggestion) => (
                    <div key={suggestion.tag} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <Badge
                          variant={selectedSuggestions.has(suggestion.tag) ? "default" : "outline"}
                          className="cursor-pointer hover:bg-accent transition-colors"
                          onClick={() => toggleSuggestion(suggestion.tag)}
                        >
                          <div className="flex items-center gap-1">
                            {getCategoryIcon(suggestion.category)}
                            {suggestion.tag}
                          </div>
                        </Badge>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <div 
                              className={`w-2 h-2 rounded-full ${getConfidenceColor(suggestion.confidence)}`}
                              title={`${(suggestion.confidence * 100).toFixed(0)}% confidence`}
                            />
                            <Progress value={suggestion.confidence * 100} className="w-16 h-1" />
                          </div>
                          <div className="text-xs text-muted-foreground">{suggestion.reason}</div>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => rejectSuggestion(suggestion)}
                        className="text-destructive hover:text-destructive"
                      >
                        <XCircle className="h-4 w-4" />
                      </Button>
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
                  <BarChart3 className="h-4 w-4" />
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
              <div className="space-y-2">
                {similaritySuggestions.map((suggestion) => (
                  <div key={suggestion.tag} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Badge
                        variant={selectedSuggestions.has(suggestion.tag) ? "default" : "outline"}
                        className="cursor-pointer hover:bg-accent transition-colors"
                        onClick={() => toggleSuggestion(suggestion.tag)}
                      >
                        {suggestion.tag}
                      </Badge>
                      <div className="text-xs text-muted-foreground">{suggestion.reason}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Progress value={suggestion.confidence * 100} className="w-16 h-1" />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => rejectSuggestion(suggestion)}
                        className="text-destructive hover:text-destructive"
                      >
                        <XCircle className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="translation" className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Select value={targetLanguage} onValueChange={setTargetLanguage}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="es">Spanish</SelectItem>
                    <SelectItem value="fr">French</SelectItem>
                    <SelectItem value="de">German</SelectItem>
                    <SelectItem value="it">Italian</SelectItem>
                    <SelectItem value="pt">Portuguese</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">
                  Translate existing tags to another language
                </p>
              </div>
              <Button
                onClick={handleTranslateTags}
                disabled={isTranslating || existingTags.length === 0}
                size="sm"
                className="flex items-center gap-2"
              >
                {isTranslating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Globe className="h-4 w-4" />
                )}
                Translate
              </Button>
            </div>

            {translations.length > 0 && (
              <div className="space-y-2">
                <div className="text-sm font-medium">Translations:</div>
                {translations.map((translation, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Badge variant="outline">{translation.original}</Badge>
                      <span className="text-sm text-muted-foreground">→</span>
                      <Badge variant="default">{translation.translated}</Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <Progress value={translation.confidence * 100} className="w-16 h-1" />
                      <span className="text-xs text-muted-foreground">
                        {(translation.confidence * 100).toFixed(0)}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {selectedSuggestions.size > 0 && (
          <div className="mt-6 pt-4 border-t">
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
                  Apply Selected Tags
                </Button>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}