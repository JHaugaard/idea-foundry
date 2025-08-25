import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';

type SlideOverPanel = 'capture' | 'search' | null;

interface SlideOverContextType {
  activePanel: SlideOverPanel;
  openCapture: () => void;
  openSearch: () => void;
  close: () => void;
  isOpen: boolean;
}

const SlideOverContext = createContext<SlideOverContextType | undefined>(undefined);

export const useSlideOver = () => {
  const context = useContext(SlideOverContext);
  if (!context) {
    throw new Error('useSlideOver must be used within a SlideOverProvider');
  }
  return context;
};

interface SlideOverProviderProps {
  children: React.ReactNode;
}

export const SlideOverProvider: React.FC<SlideOverProviderProps> = ({ children }) => {
  const [activePanel, setActivePanel] = useState<SlideOverPanel>(null);
  const [searchParams, setSearchParams] = useSearchParams();

  // Initialize from URL on mount
  useEffect(() => {
    const capture = searchParams.get('capture');
    const search = searchParams.get('search');
    
    if (capture === '1') {
      setActivePanel('capture');
    } else if (search === '1') {
      setActivePanel('search');
    }
  }, [searchParams]);

  // Update URL when panel changes
  const updateURL = useCallback((panel: SlideOverPanel) => {
    const newParams = new URLSearchParams(searchParams);
    
    // Clear existing panel params
    newParams.delete('capture');
    newParams.delete('search');
    
    // Set new panel param
    if (panel === 'capture') {
      newParams.set('capture', '1');
    } else if (panel === 'search') {
      newParams.set('search', '1');
    }
    
    setSearchParams(newParams, { replace: true });
  }, [searchParams, setSearchParams]);

  // Listen to browser back/forward navigation
  useEffect(() => {
    const handlePopState = () => {
      const urlParams = new URLSearchParams(window.location.search);
      const capture = urlParams.get('capture');
      const search = urlParams.get('search');
      
      if (capture === '1') {
        setActivePanel('capture');
      } else if (search === '1') {
        setActivePanel('search');
      } else {
        setActivePanel(null);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const openCapture = useCallback(() => {
    setActivePanel('capture');
    updateURL('capture');
  }, [updateURL]);

  const openSearch = useCallback(() => {
    setActivePanel('search');
    updateURL('search');
  }, [updateURL]);

  const close = useCallback(() => {
    setActivePanel(null);
    updateURL(null);
  }, [updateURL]);

  const isOpen = activePanel !== null;

  const value: SlideOverContextType = {
    activePanel,
    openCapture,
    openSearch,
    close,
    isOpen,
  };

  return (
    <SlideOverContext.Provider value={value}>
      {children}
    </SlideOverContext.Provider>
  );
};