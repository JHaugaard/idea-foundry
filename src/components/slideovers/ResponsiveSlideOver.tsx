import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';

interface ResponsiveSlideOverProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  ariaLabel?: string;
  children: React.ReactNode;
  triggerRef?: React.RefObject<HTMLElement>;
}

export const ResponsiveSlideOver: React.FC<ResponsiveSlideOverProps> = ({
  isOpen,
  onOpenChange,
  title,
  description,
  ariaLabel,
  children,
  triggerRef,
}) => {
  const isMobile = useIsMobile();
  const contentRef = useRef<HTMLDivElement>(null);

  // Handle ESC key to close
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        event.preventDefault();
        onOpenChange(false);
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onOpenChange]);

  // Focus management
  useEffect(() => {
    if (isOpen && contentRef.current) {
      // Focus first focusable element
      const firstFocusable = contentRef.current.querySelector(
        'input, textarea, button, select, [tabindex]:not([tabindex="-1"])'
      ) as HTMLElement;
      
      if (firstFocusable) {
        // Small delay to ensure the element is fully rendered
        setTimeout(() => firstFocusable.focus(), 100);
      }
    }
  }, [isOpen]);

  // Restore focus when closing
  useEffect(() => {
    return () => {
      if (!isOpen && triggerRef?.current) {
        triggerRef.current.focus();
      }
    };
  }, [isOpen, triggerRef]);

  const handleClose = () => {
    onOpenChange(false);
  };

  if (isMobile) {
    return (
      <Drawer open={isOpen} onOpenChange={onOpenChange}>
        <DrawerContent 
          className="max-h-[85vh]"
          aria-label={ariaLabel || title}
        >
          <div ref={contentRef} className="p-4 pb-safe">
            <DrawerHeader className="text-left px-0">
              <div className="flex items-center justify-between">
                <div>
                  <DrawerTitle>{title}</DrawerTitle>
                  {description && <DrawerDescription>{description}</DrawerDescription>}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleClose}
                  className="h-8 w-8"
                >
                  <X className="h-4 w-4" />
                  <span className="sr-only">Close</span>
                </Button>
              </div>
            </DrawerHeader>
            
            <div className="overflow-y-auto max-h-[calc(85vh-8rem)]">
              {children}
            </div>
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent 
        side="right" 
        className="w-full sm:w-[500px] lg:w-[600px] xl:w-[700px] p-0"
        aria-label={ariaLabel || title}
      >
        <div ref={contentRef} className="flex flex-col h-full">
          <SheetHeader className="px-6 py-4 border-b">
            <div className="flex items-center justify-between">
              <div>
                <SheetTitle>{title}</SheetTitle>
                {description && <SheetDescription>{description}</SheetDescription>}
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleClose}
                className="h-8 w-8"
              >
                <X className="h-4 w-4" />
                <span className="sr-only">Close</span>
              </Button>
            </div>
          </SheetHeader>
          
          <div className="flex-1 overflow-y-auto px-6 py-4">
            {children}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};