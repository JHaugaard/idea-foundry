import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Cpu, Cloud, Zap, AlertCircle, Info } from 'lucide-react';
import { useEmbeddingProvider, type EmbeddingSource } from '@/hooks/useEmbeddingProvider';
import { Alert, AlertDescription } from '@/components/ui/alert';

export const EmbeddingSettings: React.FC = () => {
  const { 
    capabilities, 
    source, 
    setEmbeddingSource, 
    isInitializing,
    initializeLocal,
    warmupLocal,
    isLocalReady,
    lastUsedSource
  } = useEmbeddingProvider();

  const handleSourceChange = (newSource: EmbeddingSource) => {
    setEmbeddingSource(newSource);
  };

  const handleInitializeLocal = async () => {
    try {
      await initializeLocal();
    } catch (error) {
      console.error('Failed to initialize local embeddings:', error);
    }
  };

  const handleWarmupLocal = async () => {
    try {
      await warmupLocal();
    } catch (error) {
      console.error('Failed to warm up local embeddings:', error);
    }
  };

  if (!capabilities) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Embedding Settings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Loading capabilities...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="h-5 w-5" />
          Embedding Settings
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Source Selection */}
        <div className="space-y-2">
          <Label htmlFor="embedding-source">Embedding Source</Label>
          <Select value={source} onValueChange={handleSourceChange}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="auto">
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4" />
                  Auto (Recommended)
                </div>
              </SelectItem>
              <SelectItem value="local" disabled={!capabilities.isSupported}>
                <div className="flex items-center gap-2">
                  <Cpu className="h-4 w-4" />
                  Local Only
                  {!capabilities.isSupported && <AlertCircle className="h-3 w-3 text-destructive" />}
                </div>
              </SelectItem>
              <SelectItem value="openai">
                <div className="flex items-center gap-2">
                  <Cloud className="h-4 w-4" />
                  OpenAI Only
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Capabilities Display */}
        <div className="space-y-2">
          <Label>Browser Capabilities</Label>
          <div className="flex flex-wrap gap-2">
            <Badge variant={capabilities.supportsWebGPU ? "default" : "outline"}>
              <Cpu className="h-3 w-3 mr-1" />
              WebGPU: {capabilities.supportsWebGPU ? "Yes" : "No"}
            </Badge>
            <Badge variant={capabilities.supportsWasm ? "default" : "outline"}>
              <Cpu className="h-3 w-3 mr-1" />
              WASM: {capabilities.supportsWasm ? "Yes" : "No"}
            </Badge>
            <Badge variant={capabilities.isMobile ? "secondary" : "outline"}>
              Mobile: {capabilities.isMobile ? "Yes" : "No"}
            </Badge>
          </div>
        </div>

        {/* Status and Actions */}
        <div className="space-y-2">
          <Label>Current Status</Label>
          <div className="flex items-center gap-2">
            {lastUsedSource && (
              <Badge variant="outline">
                Last used: {lastUsedSource}
              </Badge>
            )}
            {isLocalReady && (
              <Badge variant="default">
                <Cpu className="h-3 w-3 mr-1" />
                Local Ready
              </Badge>
            )}
            {isInitializing && (
              <Badge variant="outline">
                <Zap className="h-3 w-3 mr-1 animate-pulse" />
                Initializing...
              </Badge>
            )}
          </div>
        </div>

        {/* Local Embedding Actions */}
        {capabilities.isSupported && (
          <div className="space-y-2">
            <Label>Local Embedding Actions</Label>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleInitializeLocal}
                disabled={isInitializing}
              >
                {isInitializing ? "Initializing..." : "Initialize Local"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleWarmupLocal}
                disabled={!isLocalReady || isInitializing}
              >
                Warm Up
              </Button>
            </div>
          </div>
        )}

        {/* Helpful Information */}
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            {source === 'auto' && capabilities.isSupported ? (
              "Auto mode will prefer local embeddings when available, falling back to OpenAI when needed."
            ) : source === 'local' && capabilities.isSupported ? (
              "Local mode uses your device's GPU/CPU for embedding generation. No API calls required."
            ) : source === 'local' && !capabilities.isSupported ? (
              "Local embeddings are not supported on this device. Please use Auto or OpenAI mode."
            ) : (
              "OpenAI mode uses cloud-based embedding generation. Requires API calls."
            )}
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
};