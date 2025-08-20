import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { TagCombination } from '@/hooks/useTagAnalytics';

interface TagCombinationsTableProps {
  combinations: TagCombination[];
}

export const TagCombinationsTable: React.FC<TagCombinationsTableProps> = ({ 
  combinations 
}) => {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getEffectivenessColor = (effectiveness: number) => {
    if (effectiveness >= 80) return 'text-green-600';
    if (effectiveness >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Most Effective Tag Combinations</CardTitle>
        <CardDescription>
          Tag pairs that work well together for organizing your notes
        </CardDescription>
      </CardHeader>
      <CardContent>
        {combinations.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tag Combination</TableHead>
                <TableHead>Usage Count</TableHead>
                <TableHead>Effectiveness</TableHead>
                <TableHead>Last Used</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {combinations.map((combo, index) => (
                <TableRow key={`${combo.tags.join('-')}-${index}`}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {combo.tags.map((tag, tagIndex) => (
                        <React.Fragment key={tag}>
                          <Badge variant="secondary">{tag}</Badge>
                          {tagIndex < combo.tags.length - 1 && (
                            <span className="text-muted-foreground">+</span>
                          )}
                        </React.Fragment>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{combo.count}</span>
                      <span className="text-sm text-muted-foreground">notes</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span 
                          className={`text-sm font-medium ${getEffectivenessColor(combo.effectiveness)}`}
                        >
                          {combo.effectiveness.toFixed(1)}%
                        </span>
                      </div>
                      <Progress 
                        value={combo.effectiveness} 
                        className="h-2 w-20" 
                      />
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground">
                      {formatDate(combo.lastUsed)}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="flex items-center justify-center h-[300px] text-muted-foreground">
            No tag combinations found. Try using multiple tags in your notes.
          </div>
        )}
      </CardContent>
    </Card>
  );
};