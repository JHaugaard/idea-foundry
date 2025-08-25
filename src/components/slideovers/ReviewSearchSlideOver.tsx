import React, { Suspense, useEffect, useState } from 'react';
import { ResponsiveSlideOver } from './ResponsiveSlideOver';
import { SearchInterface } from '@/components/SearchInterface';
import { useSlideOver } from '@/contexts/SlideOverContext';
import { Skeleton } from '@/components/ui/skeleton';

interface ReviewSearchSlideOverProps {
  triggerRef?: React.RefObject<HTMLElement>;
}

export const ReviewSearchSlideOver: React.FC<ReviewSearchSlideOverProps> = ({ triggerRef }) => {
  const { activePanel, close } = useSlideOver();
  const [lastQuery, setLastQuery] = useState('');
  const isOpen = activePanel === 'search';

  // Restore last search query from localStorage
  useEffect(() => {
    if (isOpen) {
      const saved = localStorage.getItem('slideOver.lastSearchQuery');
      if (saved) {
        setLastQuery(saved);
      }
    }
  }, [isOpen]);

  // Save search query to localStorage
  const handleQueryChange = (query: string) => {
    setLastQuery(query);
    localStorage.setItem('slideOver.lastSearchQuery', query);
  };

  return (
    <ResponsiveSlideOver
      isOpen={isOpen}
      onOpenChange={(open) => !open && close()}
      title="Review & Search"
      description="Search your notes, apply filters, and review recent activity"
      ariaLabel="Review and search panel"
      triggerRef={triggerRef}
    >
      <div className="space-y-4">
        <div className="text-sm text-muted-foreground">
          Press <kbd className="px-1 py-0.5 bg-muted rounded">Esc</kbd> to close • 
          <kbd className="px-1 py-0.5 bg-muted rounded ml-1">/</kbd> to focus search
        </div>
        
        <Suspense fallback={
          <div className="space-y-4">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-8 w-3/4" />
            <div className="space-y-2">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          </div>
        }>
          <SearchInterface 
            onNoteSelect={(noteId) => {
              // Handle note selection - could navigate or emit event
              console.log('Selected note:', noteId);
            }}
          />
        </Suspense>
      </div>
    </ResponsiveSlideOver>
  );
};