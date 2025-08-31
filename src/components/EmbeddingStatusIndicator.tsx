import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Cpu, Zap, Cloud, AlertCircle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useEmbeddingProvider } from '@/hooks/useEmbeddingProvider';

export const EmbeddingStatusIndicator: React.FC = () => {
  const { 
    capabilities, 
    isInitializing, 
    lastUsedSource, 
    source,
    isLocalReady 
  } = useEmbeddingProvider();

  if (!capabilities) {
    return null;
  }

  const getStatusIcon = () => {
    if (isInitializing) {
      return <Zap className="h-3 w-3 animate-pulse" />;
    }

    if (lastUsedSource === 'local' || (source === 'local' && isLocalReady)) {
      return <Cpu className="h-3 w-3" />;
    }

    if (lastUsedSource === 'openai' || source === 'openai') {
      return <Cloud className="h-3 w-3" />;
    }

    if (!capabilities.isSupported) {
      return <AlertCircle className="h-3 w-3" />;
    }

    return <Cpu className="h-3 w-3" />;
  };

  const getStatusText = () => {
    if (isInitializing) {
      return "Initializing...";
    }

    if (lastUsedSource === 'local') {
      return `Local (${capabilities.supportsWebGPU ? 'WebGPU' : 'WASM'})`;
    }

    if (lastUsedSource === 'openai') {
      return "OpenAI";
    }

    if (!capabilities.isSupported) {
      return "Not supported";
    }

    return source === 'auto' ? 'Auto' : source === 'local' ? 'Local' : 'OpenAI';
  };

  const getStatusVariant = () => {
    if (isInitializing) {
      return "outline";
    }

    if (lastUsedSource === 'local' || (source === 'local' && isLocalReady)) {
      return "default";
    }

    if (lastUsedSource === 'openai') {
      return "secondary";
    }

    if (!capabilities.isSupported) {
      return "destructive";
    }

    return "outline";
  };

  const getTooltipContent = () => {
    const lines = [
      `Source: ${getStatusText()}`,
    ];

    if (capabilities.isMobile) {
      lines.push("Mobile device detected");
    }

    if (capabilities.supportsWebGPU) {
      lines.push("WebGPU supported");
    } else if (capabilities.supportsWasm) {
      lines.push("WebAssembly supported");
    } else {
      lines.push("Limited browser support");
    }

    if (isInitializing) {
      lines.push("Loading embedding model...");
    }

    return lines.join('\n');
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge 
            variant={getStatusVariant()}
            className="text-xs font-mono"
          >
            {getStatusIcon()}
            <span className="ml-1">{getStatusText()}</span>
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <pre className="text-xs whitespace-pre-line">
            {getTooltipContent()}
          </pre>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};