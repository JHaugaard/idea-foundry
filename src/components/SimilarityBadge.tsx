import React from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface SimilarityBadgeProps {
  score: number;
  className?: string;
}

export function SimilarityBadge({ score, className }: SimilarityBadgeProps) {
  const percentage = Math.round(score * 100);
  
  const getVariant = (score: number) => {
    if (score > 0.8) return 'high';
    if (score > 0.6) return 'medium';
    return 'low';
  };

  const getBadgeClasses = (variant: string) => {
    switch (variant) {
      case 'high':
        return 'bg-similarity-high text-white border-similarity-high';
      case 'medium':
        return 'bg-similarity-medium text-white border-similarity-medium';
      case 'low':
        return 'bg-similarity-low text-white border-similarity-low';
      default:
        return 'bg-muted';
    }
  };

  const variant = getVariant(score);

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div 
        className={cn(
          "w-2 h-2 rounded-full",
          variant === 'high' && "bg-similarity-high",
          variant === 'medium' && "bg-similarity-medium", 
          variant === 'low' && "bg-similarity-low"
        )}
      />
      <Badge 
        variant="outline" 
        className={cn(
          "text-xs font-medium",
          getBadgeClasses(variant)
        )}
      >
        {percentage}% match
      </Badge>
    </div>
  );
}