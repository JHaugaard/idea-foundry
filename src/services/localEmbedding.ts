import { pipeline, env } from '@huggingface/transformers';

// Configure transformers environment
env.allowLocalModels = false;
env.backends.onnx.wasm.numThreads = 1;

export interface EmbeddingCapabilities {
  supportsWebGPU: boolean;
  supportsWasm: boolean;
  isMobile: boolean;
  isSupported: boolean;
}

export interface EmbeddingResult {
  embedding: number[];
  dimensions: number;
  source: 'local' | 'openai';
  duration?: number;
}

class LocalEmbeddingService {
  private pipeline: any = null;
  private isInitializing = false;
  private initPromise: Promise<void> | null = null;
  private capabilities: EmbeddingCapabilities | null = null;

  async detectCapabilities(): Promise<EmbeddingCapabilities> {
    if (this.capabilities) return this.capabilities;

    const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    let supportsWebGPU = false;
    try {
      supportsWebGPU = 'gpu' in navigator && (await (navigator as any).gpu?.requestAdapter()) !== null;
    } catch (e) {
      supportsWebGPU = false;
    }

    const supportsWasm = typeof WebAssembly === 'object' && typeof WebAssembly.instantiate === 'function';
    const isSupported = supportsWebGPU || (supportsWasm && !isMobile);

    this.capabilities = {
      supportsWebGPU,
      supportsWasm,
      isMobile,
      isSupported
    };

    return this.capabilities;
  }

  async initialize(): Promise<void> {
    if (this.pipeline) return;
    if (this.isInitializing && this.initPromise) return this.initPromise;

    this.isInitializing = true;
    
    this.initPromise = this._doInitialize();
    await this.initPromise;
    
    this.isInitializing = false;
  }

  private async _doInitialize(): Promise<void> {
    try {
      const capabilities = await this.detectCapabilities();
      
      if (!capabilities.isSupported) {
        throw new Error('Local embeddings not supported on this device');
      }

      console.log('Initializing local embedding model...');
      const startTime = Date.now();

      // Choose device based on capabilities
      const device = capabilities.supportsWebGPU ? 'webgpu' : 'wasm';
      
      this.pipeline = await pipeline(
        'feature-extraction',
        'mixedbread-ai/mxbai-embed-xsmall-v1',
        {
          device,
          dtype: capabilities.supportsWebGPU ? 'fp16' : 'fp32',
        }
      );

      const initTime = Date.now() - startTime;
      console.log(`Local embedding model initialized in ${initTime}ms on ${device}`);

    } catch (error) {
      console.error('Failed to initialize local embedding model:', error);
      this.pipeline = null;
      throw error;
    }
  }

  async generateEmbedding(text: string): Promise<EmbeddingResult> {
    const startTime = Date.now();

    try {
      if (!this.pipeline) {
        await this.initialize();
      }

      if (!this.pipeline) {
        throw new Error('Local embedding model not available');
      }

      const output = await this.pipeline(text, {
        pooling: 'mean',
        normalize: true,
      });

      const embedding = Array.from(output.data) as number[];
      const duration = Date.now() - startTime;

      return {
        embedding,
        dimensions: embedding.length,
        source: 'local',
        duration
      };

    } catch (error) {
      console.error('Local embedding generation failed:', error);
      throw error;
    }
  }

  isReady(): boolean {
    return this.pipeline !== null && !this.isInitializing;
  }

  async warmup(): Promise<void> {
    if (!this.isReady()) {
      await this.initialize();
    }
    
    // Generate a small embedding to warm up the model
    try {
      await this.generateEmbedding("warmup");
      console.log('Local embedding model warmed up');
    } catch (error) {
      console.warn('Failed to warm up local embedding model:', error);
    }
  }
}

export const localEmbeddingService = new LocalEmbeddingService();