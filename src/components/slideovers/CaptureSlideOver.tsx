import React from 'react';
import { ResponsiveSlideOver } from './ResponsiveSlideOver';
import QuickCapture from '@/components/QuickCapture';
import { useSlideOver } from '@/contexts/SlideOverContext';

interface CaptureSlideOverProps {
  triggerRef?: React.RefObject<HTMLElement>;
}

export const CaptureSlideOver: React.FC<CaptureSlideOverProps> = ({ triggerRef }) => {
  const { activePanel, close } = useSlideOver();
  const isOpen = activePanel === 'capture';

  return (
    <ResponsiveSlideOver
      isOpen={isOpen}
      onOpenChange={(open) => !open && close()}
      title="Quick Capture"
      description="Capture ideas, notes, and files quickly"
      ariaLabel="Quick capture panel"
      triggerRef={triggerRef}
    >
      <div className="space-y-4">
        <div className="text-sm text-muted-foreground">
          Press <kbd className="px-1 py-0.5 bg-muted rounded">Esc</kbd> to close
        </div>
        <QuickCapture />
      </div>
    </ResponsiveSlideOver>
  );
};