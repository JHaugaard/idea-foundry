import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { localEmbeddingService, type EmbeddingCapabilities, type EmbeddingResult } from '@/services/localEmbedding';
import { useAITagPreferences } from './useAITagPreferences';

export type EmbeddingSource = 'auto' | 'local' | 'openai';

export interface EmbeddingProviderState {
  capabilities: EmbeddingCapabilities | null;
  isInitializing: boolean;
  source: EmbeddingSource;
  lastUsedSource: 'local' | 'openai' | null;
}

export const useEmbeddingProvider = () => {
  const { preferences, updatePreferences } = useAITagPreferences();
  const [state, setState] = useState<EmbeddingProviderState>({
    capabilities: null,
    isInitializing: false,
    source: (preferences as any)?.embedding_source || 'auto',
    lastUsedSource: null
  });

  // Sync source with preferences
  useEffect(() => {
    const embeddingSource = (preferences as any)?.embedding_source;
    if (embeddingSource && embeddingSource !== state.source) {
      setState(prev => ({ ...prev, source: embeddingSource as EmbeddingSource }));
    }
  }, [(preferences as any)?.embedding_source]);

  // Detect capabilities on mount
  useEffect(() => {
    const detectCapabilities = async () => {
      try {
        const capabilities = await localEmbeddingService.detectCapabilities();
        setState(prev => ({ ...prev, capabilities }));
      } catch (error) {
        console.error('Failed to detect embedding capabilities:', error);
      }
    };

    detectCapabilities();
  }, []);

  const setEmbeddingSource = useCallback(async (source: EmbeddingSource) => {
    setState(prev => ({ ...prev, source }));
    
    if (preferences && updatePreferences) {
      await updatePreferences({ embedding_source: source } as any);
    }
  }, [preferences, updatePreferences]);

  const generateEmbedding = useCallback(async (text: string): Promise<EmbeddingResult> => {
    const { capabilities, source } = state;
    
    // Determine actual source to use
    let useLocal = false;
    
    if (source === 'local') {
      useLocal = capabilities?.isSupported || false;
    } else if (source === 'auto') {
      useLocal = capabilities?.isSupported || false;
    } else {
      useLocal = false; // explicitly openai
    }

    // Try local first if requested/auto
    if (useLocal) {
      try {
        setState(prev => ({ ...prev, isInitializing: true }));
        
        const result = await localEmbeddingService.generateEmbedding(text);
        setState(prev => ({ 
          ...prev, 
          isInitializing: false,
          lastUsedSource: 'local'
        }));
        
        return result;
        
      } catch (error) {
        console.warn('Local embedding failed, falling back to OpenAI:', error);
        setState(prev => ({ ...prev, isInitializing: false }));
        
        // Fall through to OpenAI
      }
    }

    // Use OpenAI (either explicitly requested or as fallback)
    try {
      setState(prev => ({ ...prev, isInitializing: true }));
      
      const startTime = Date.now();
      const { data, error } = await supabase.functions.invoke('query-embed', {
        body: { query: text }
      });

      if (error) throw error;

      const duration = Date.now() - startTime;
      
      setState(prev => ({ 
        ...prev, 
        isInitializing: false,
        lastUsedSource: 'openai'
      }));

      return {
        embedding: data.embedding,
        dimensions: data.dimensions,
        source: 'openai',
        duration
      };

    } catch (error) {
      setState(prev => ({ ...prev, isInitializing: false }));
      console.error('OpenAI embedding failed:', error);
      throw new Error(`Failed to generate embedding: ${error.message}`);
    }
  }, [state]);

  const initializeLocal = useCallback(async () => {
    if (!state.capabilities?.isSupported) {
      throw new Error('Local embeddings not supported on this device');
    }

    setState(prev => ({ ...prev, isInitializing: true }));
    
    try {
      await localEmbeddingService.initialize();
      setState(prev => ({ ...prev, isInitializing: false }));
    } catch (error) {
      setState(prev => ({ ...prev, isInitializing: false }));
      throw error;
    }
  }, [state.capabilities]);

  const warmupLocal = useCallback(async () => {
    if (state.capabilities?.isSupported) {
      try {
        await localEmbeddingService.warmup();
      } catch (error) {
        console.warn('Failed to warm up local embeddings:', error);
      }
    }
  }, [state.capabilities]);

  return {
    ...state,
    generateEmbedding,
    setEmbeddingSource,
    initializeLocal,
    warmupLocal,
    isLocalReady: localEmbeddingService.isReady(),
  };
};