import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useTagGovernance } from '@/hooks/useTagGovernance';
import { Loader2, Settings } from 'lucide-react';

export function TagSettings() {
  const { preferences, updatePreferences, isUpdating, createBackup } = useTagGovernance();

  if (!preferences) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Tag Preferences
          </CardTitle>
          <CardDescription>
            Configure tag validation rules and behavior for your workspace.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="max-tags-per-note">Max tags per note</Label>
              <Input
                id="max-tags-per-note"
                type="number"
                min="1"
                max="50"
                value={preferences.max_tags_per_note}
                onChange={(e) => updatePreferences({ max_tags_per_note: parseInt(e.target.value) })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="max-total-tags">Max total tags</Label>
              <Input
                id="max-total-tags"
                type="number"
                min="10"
                max="10000"
                value={preferences.max_total_tags}
                onChange={(e) => updatePreferences({ max_total_tags: parseInt(e.target.value) })}
              />
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Enforce naming conventions</Label>
                <p className="text-sm text-muted-foreground">
                  Require lowercase, hyphen-separated tags (2-30 characters)
                </p>
              </div>
              <Switch
                checked={preferences.enforce_naming_conventions}
                onCheckedChange={(checked) => updatePreferences({ enforce_naming_conventions: checked })}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Auto-format tags</Label>
                <p className="text-sm text-muted-foreground">
                  Automatically format tags to meet naming conventions
                </p>
              </div>
              <Switch
                checked={preferences.auto_format_tags}
                onCheckedChange={(checked) => updatePreferences({ auto_format_tags: checked })}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Suggest similar tags</Label>
                <p className="text-sm text-muted-foreground">
                  Show suggestions for existing similar tags when typing
                </p>
              </div>
              <Switch
                checked={preferences.suggest_similar_tags}
                onCheckedChange={(checked) => updatePreferences({ suggest_similar_tags: checked })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Reserved words</Label>
            <div className="flex flex-wrap gap-2">
              {preferences.reserved_words.map((word) => (
                <Badge key={word} variant="secondary">{word}</Badge>
              ))}
            </div>
            <p className="text-sm text-muted-foreground">
              These words cannot be used as tags
            </p>
          </div>

          <div className="flex justify-between pt-4">
            <Button
              variant="outline"
              onClick={() => createBackup({ name: `Manual backup ${new Date().toLocaleDateString()}` })}
            >
              Create Backup
            </Button>
            <Button disabled={isUpdating}>
              {isUpdating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Preferences saved automatically
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}