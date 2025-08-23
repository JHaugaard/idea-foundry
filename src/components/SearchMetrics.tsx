import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Clock, 
  Database, 
  Search, 
  Brain,
  AlertCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface SearchMetricsProps {
  totalResults: number;
  searchTime?: number;
  totalNotes: number;
  notesWithEmbeddings: number;
  searchType: 'fuzzy' | 'semantic' | 'hybrid';
  hasSemanticFallback?: boolean;
  className?: string;
}

export function SearchMetrics({
  totalResults,
  searchTime,
  totalNotes,
  notesWithEmbeddings,
  searchType,
  hasSemanticFallback = false,
  className
}: SearchMetricsProps) {
  const semanticCoverage = totalNotes > 0 ? Math.round((notesWithEmbeddings / totalNotes) * 100) : 0;
  
  return (
    <Card className={cn("border-muted", className)}>
      <CardContent className="p-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          {/* Results Info */}
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Search className="h-4 w-4" />
              <span className="font-medium text-foreground">{totalResults}</span>
              <span>results</span>
            </div>
            
            {searchTime && (
              <div className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                <span>{searchTime}ms</span>
              </div>
            )}
            
            <div className="flex items-center gap-1">
              <Database className="h-4 w-4" />
              <span>
                Searched {totalNotes} notes
                {notesWithEmbeddings > 0 && (
                  <span className="text-search-accent ml-1">
                    ({notesWithEmbeddings} semantic)
                  </span>
                )}
              </span>
            </div>
          </div>

          {/* Search Type Badges */}
          <div className="flex items-center gap-2">
            {hasSemanticFallback && (
              <div className="flex items-center gap-1 text-xs text-orange-600">
                <AlertCircle className="h-3 w-3" />
                <span>Partial semantic coverage</span>
              </div>
            )}
            
            <Badge 
              variant={searchType === 'hybrid' ? 'default' : 'outline'}
              className="gap-1 text-xs"
            >
              {searchType === 'hybrid' && <Brain className="h-3 w-3" />}
              {searchType === 'semantic' && <Brain className="h-3 w-3" />}
              {searchType === 'fuzzy' && <Search className="h-3 w-3" />}
              {searchType === 'hybrid' ? 'Fuzzy + Semantic' : 
               searchType === 'semantic' ? 'Semantic Only' : 
               'Fuzzy Only'}
            </Badge>

            {semanticCoverage < 100 && semanticCoverage > 0 && (
              <Badge variant="secondary" className="text-xs">
                {semanticCoverage}% semantic coverage
              </Badge>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}