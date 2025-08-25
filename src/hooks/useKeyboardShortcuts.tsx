import { useEffect, useCallback } from 'react';

interface KeyboardShortcut {
  key: string;
  ctrlKey?: boolean;
  metaKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
  preventDefault?: boolean;
  action: (event?: KeyboardEvent) => void;
}

export const useKeyboardShortcuts = (shortcuts: KeyboardShortcut[]) => {
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    const matchingShortcut = shortcuts.find(shortcut => {
      const keyMatches = event.key.toLowerCase() === shortcut.key.toLowerCase();
      const ctrlMatches = !!shortcut.ctrlKey === event.ctrlKey;
      const metaMatches = !!shortcut.metaKey === event.metaKey;
      const shiftMatches = !!shortcut.shiftKey === event.shiftKey;
      const altMatches = !!shortcut.altKey === event.altKey;

      return keyMatches && ctrlMatches && metaMatches && shiftMatches && altMatches;
    });

    if (matchingShortcut) {
      if (matchingShortcut.preventDefault !== false) {
        event.preventDefault();
      }
      matchingShortcut.action(event);
    }
  }, [shortcuts]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
};

export const useGlobalShortcuts = (
  onLinkSearch: () => void,
  onBacklinkPanel: () => void
) => {
  useKeyboardShortcuts([
    {
      key: 'k',
      metaKey: true,
      action: onLinkSearch,
    },
    {
      key: 'k',
      ctrlKey: true,
      action: onLinkSearch,
    },
    {
      key: 'b',
      metaKey: true,
      action: onBacklinkPanel,
    },
    {
      key: 'b',
      ctrlKey: true,
      action: onBacklinkPanel,
    },
  ]);
};

export const useSlideOverShortcuts = (
  onOpenCapture: () => void,
  onOpenSearch: () => void,
  onClose: () => void,
  isOpen: boolean
) => {
  useKeyboardShortcuts([
    {
      key: 'c',
      action: onOpenCapture,
      preventDefault: true,
    },
    {
      key: '/',
      action: (event) => {
        // Prevent default browser find behavior
        event?.preventDefault();
        onOpenSearch();
      },
      preventDefault: true,
    },
    {
      key: 'Escape',
      action: () => {
        if (isOpen) {
          onClose();
        }
      },
      preventDefault: false, // Let other ESC handlers work too
    },
  ]);
};