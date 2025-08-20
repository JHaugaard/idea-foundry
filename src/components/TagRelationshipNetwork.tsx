import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { TagRelationship } from '@/hooks/useTagAnalytics';

interface TagRelationshipNetworkProps {
  relationships: TagRelationship[];
}

export const TagRelationshipNetwork: React.FC<TagRelationshipNetworkProps> = ({ 
  relationships 
}) => {
  const getStrengthColor = (strength: number) => {
    if (strength >= 0.8) return 'bg-green-500';
    if (strength >= 0.6) return 'bg-yellow-500';
    if (strength >= 0.4) return 'bg-orange-500';
    return 'bg-red-500';
  };

  const getStrengthLabel = (strength: number) => {
    if (strength >= 0.8) return 'Very Strong';
    if (strength >= 0.6) return 'Strong';
    if (strength >= 0.4) return 'Moderate';
    return 'Weak';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tag Relationships</CardTitle>
        <CardDescription>
          Tags that frequently appear together in your notes
        </CardDescription>
      </CardHeader>
      <CardContent>
        {relationships.length > 0 ? (
          <div className="space-y-4">
            {relationships.map((rel, index) => (
              <div key={`${rel.tagA}-${rel.tagB}`} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{rel.tagA}</Badge>
                    <span className="text-muted-foreground">+</span>
                    <Badge variant="outline">{rel.tagB}</Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">
                      {rel.coOccurrence} notes
                    </span>
                    <Badge 
                      variant="secondary" 
                      className={`text-white ${getStrengthColor(rel.strength)}`}
                    >
                      {getStrengthLabel(rel.strength)}
                    </Badge>
                  </div>
                </div>
                
                <div className="mb-3">
                  <div className="flex justify-between text-sm mb-1">
                    <span>Relationship Strength</span>
                    <span>{(rel.strength * 100).toFixed(1)}%</span>
                  </div>
                  <Progress value={rel.strength * 100} className="h-2" />
                </div>

                {rel.notes.length > 0 && (
                  <div>
                    <p className="text-sm font-medium mb-2">Example Notes:</p>
                    <div className="space-y-1">
                      {rel.notes.slice(0, 3).map(note => (
                        <p key={note.id} className="text-sm text-muted-foreground truncate">
                          • {note.title}
                        </p>
                      ))}
                      {rel.notes.length > 3 && (
                        <p className="text-sm text-muted-foreground">
                          and {rel.notes.length - 3} more...
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="flex items-center justify-center h-[300px] text-muted-foreground">
            No tag relationships found. Try using more tag combinations in your notes.
          </div>
        )}
      </CardContent>
    </Card>
  );
};