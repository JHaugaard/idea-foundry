import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useAITagPreferences } from '@/hooks/useAITagPreferences';
import { useState } from 'react';
import { X, Plus, Settings, Brain, Globe, Sparkles, TrendingUp } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function AITagSettings() {
  const { preferences, updatePreferences, isUpdating, addToBlacklist, removeFromBlacklist } = useAITagPreferences();
  const { toast } = useToast();
  const [newBlacklistTag, setNewBlacklistTag] = useState('');

  const handlePreferenceChange = (key: string, value: any) => {
    updatePreferences({ [key]: value });
  };

  const handleAddBlacklistTag = () => {
    if (!newBlacklistTag.trim()) return;
    
    const tag = newBlacklistTag.trim().toLowerCase().replace(/[^a-z0-9-]/g, '').replace(/-+/g, '-');
    if (tag.length < 2) {
      toast({
        title: "Invalid tag",
        description: "Tag must be at least 2 characters long",
        variant: "destructive",
      });
      return;
    }

    addToBlacklist(tag);
    setNewBlacklistTag('');
  };

  const handleRemoveBlacklistTag = (tag: string) => {
    removeFromBlacklist(tag);
  };

  return (
    <div className="space-y-6">
      {/* AI Generation Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            AI Generation Settings
          </CardTitle>
          <CardDescription>
            Configure how AI suggests tags for your notes
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="auto-suggest">Auto-suggest tags</Label>
              <div className="text-sm text-muted-foreground">
                Automatically suggest tags when creating or editing notes
              </div>
            </div>
            <Switch
              id="auto-suggest"
              checked={preferences.auto_suggest_enabled}
              onCheckedChange={(checked) => handlePreferenceChange('auto_suggest_enabled', checked)}
            />
          </div>

          <div className="space-y-2">
            <Label>Confidence threshold: {(preferences.confidence_threshold * 100).toFixed(0)}%</Label>
            <div className="text-sm text-muted-foreground mb-2">
              Only suggest tags with confidence above this threshold
            </div>
            <Slider
              value={[preferences.confidence_threshold]}
              onValueChange={([value]) => handlePreferenceChange('confidence_threshold', value)}
              max={1}
              min={0.1}
              step={0.05}
              className="w-full"
            />
          </div>

          <div className="space-y-2">
            <Label>Maximum suggestions per note: {preferences.max_suggestions_per_note}</Label>
            <Slider
              value={[preferences.max_suggestions_per_note]}
              onValueChange={([value]) => handlePreferenceChange('max_suggestions_per_note', value)}
              max={10}
              min={1}
              step={1}
              className="w-full"
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="manual-review">Manual review required</Label>
              <div className="text-sm text-muted-foreground">
                Require manual approval before applying AI-suggested tags
              </div>
            </div>
            <Switch
              id="manual-review"
              checked={preferences.manual_review_required}
              onCheckedChange={(checked) => handlePreferenceChange('manual_review_required', checked)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Multi-language Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Multi-language Settings
          </CardTitle>
          <CardDescription>
            Configure language preferences for tag suggestions and translations
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="primary-language">Primary language</Label>
            <Select
              value={preferences.primary_language}
              onValueChange={(value) => handlePreferenceChange('primary_language', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="es">Spanish</SelectItem>
                <SelectItem value="fr">French</SelectItem>
                <SelectItem value="de">German</SelectItem>
                <SelectItem value="it">Italian</SelectItem>
                <SelectItem value="pt">Portuguese</SelectItem>
                <SelectItem value="ru">Russian</SelectItem>
                <SelectItem value="ja">Japanese</SelectItem>
                <SelectItem value="ko">Korean</SelectItem>
                <SelectItem value="zh">Chinese</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="auto-translate">Auto-translate tags</Label>
              <div className="text-sm text-muted-foreground">
                Automatically translate tags to your primary language
              </div>
            </div>
            <Switch
              id="auto-translate"
              checked={preferences.auto_translate_tags}
              onCheckedChange={(checked) => handlePreferenceChange('auto_translate_tags', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="normalize-tags">Normalize tags</Label>
              <div className="text-sm text-muted-foreground">
                Automatically format tags (lowercase, hyphen-separated)
              </div>
            </div>
            <Switch
              id="normalize-tags"
              checked={preferences.normalize_tags}
              onCheckedChange={(checked) => handlePreferenceChange('normalize_tags', checked)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Quality and Cleanup Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            Quality & Cleanup Settings
          </CardTitle>
          <CardDescription>
            Configure automatic tag quality analysis and cleanup suggestions
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="duplicate-detection">Duplicate detection</Label>
              <div className="text-sm text-muted-foreground">
                Detect and suggest merging similar tags
              </div>
            </div>
            <Switch
              id="duplicate-detection"
              checked={preferences.duplicate_detection_enabled}
              onCheckedChange={(checked) => handlePreferenceChange('duplicate_detection_enabled', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="quality-scoring">Quality scoring</Label>
              <div className="text-sm text-muted-foreground">
                Analyze and score tag quality automatically
              </div>
            </div>
            <Switch
              id="quality-scoring"
              checked={preferences.quality_scoring_enabled}
              onCheckedChange={(checked) => handlePreferenceChange('quality_scoring_enabled', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="auto-cleanup">Auto cleanup suggestions</Label>
              <div className="text-sm text-muted-foreground">
                Show cleanup suggestions in the interface
              </div>
            </div>
            <Switch
              id="auto-cleanup"
              checked={preferences.auto_cleanup_suggestions}
              onCheckedChange={(checked) => handlePreferenceChange('auto_cleanup_suggestions', checked)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Learning Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Learning Settings
          </CardTitle>
          <CardDescription>
            Configure how the AI learns from your tag preferences
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="learn-rejections">Learn from rejections</Label>
              <div className="text-sm text-muted-foreground">
                Improve suggestions based on rejected tags
              </div>
            </div>
            <Switch
              id="learn-rejections"
              checked={preferences.learn_from_rejections}
              onCheckedChange={(checked) => handlePreferenceChange('learn_from_rejections', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="learn-acceptances">Learn from acceptances</Label>
              <div className="text-sm text-muted-foreground">
                Improve suggestions based on accepted tags
              </div>
            </div>
            <Switch
              id="learn-acceptances"
              checked={preferences.learn_from_acceptances}
              onCheckedChange={(checked) => handlePreferenceChange('learn_from_acceptances', checked)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="personalization-level">Personalization level</Label>
            <Select
              value={preferences.personalization_level}
              onValueChange={(value) => handlePreferenceChange('personalization_level', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low - General suggestions</SelectItem>
                <SelectItem value="medium">Medium - Some personalization</SelectItem>
                <SelectItem value="high">High - Highly personalized</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Blacklist Management */}
      <Card>
        <CardHeader>
          <CardTitle>Tag Blacklist</CardTitle>
          <CardDescription>
            Tags that should never be suggested automatically
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Enter tag to blacklist..."
              value={newBlacklistTag}
              onChange={(e) => setNewBlacklistTag(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleAddBlacklistTag()}
            />
            <Button onClick={handleAddBlacklistTag} size="sm">
              <Plus className="h-4 w-4 mr-1" />
              Add
            </Button>
          </div>

          {preferences.blacklisted_tags && preferences.blacklisted_tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {preferences.blacklisted_tags.map((tag) => (
                <Badge key={tag} variant="destructive" className="flex items-center gap-1">
                  {tag}
                  <X 
                    className="h-3 w-3 cursor-pointer hover:bg-destructive-foreground/20 rounded-full" 
                    onClick={() => handleRemoveBlacklistTag(tag)}
                  />
                </Badge>
              ))}
            </div>
          )}

          {(!preferences.blacklisted_tags || preferences.blacklisted_tags.length === 0) && (
            <div className="text-sm text-muted-foreground">
              No blacklisted tags. Add tags that you don't want the AI to suggest.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}