import * as webllm from '@mlc-ai/web-llm';

export type ModelId = 'phi-4-mini' | 'qwen3-1.7b';

export interface ModelInfo {
  id: ModelId;
  name: string;
  modelId: string;
  size: string;
  description: string;
}

export const AVAILABLE_MODELS: ModelInfo[] = [
  {
    id: 'phi-4-mini',
    name: 'Phi-3.5 Mini',
    modelId: 'Phi-3.5-mini-instruct-q4f16_1-MLC',
    size: '1.8GB',
    description: 'Fast and capable model for general chat processing.'
  },
  {
    id: 'qwen3-1.7b',
    name: 'Qwen 2.5 1.5B',
    modelId: 'Qwen2.5-1.5B-Instruct-q4f16_1-MLC',
    size: '1.2GB',
    description: 'Lightweight and extremely fast, great for lower end devices.'
  }
];

export type LoadingProgress = {
  stage: 'downloading' | 'loading' | 'ready' | 'error';
  progress: number;
  message: string;
};

/**
 * Wrapper class for the WebLLM engine.
 */
export class AIEngine {
  private engine: webllm.MLCEngineInterface | null = null;
  private currentModel: ModelId | null = null;

  /**
   * Initialize and load a model with progress callback.
   */
  async loadModel(modelId: ModelId, onProgress: (p: LoadingProgress) => void): Promise<void> {
    const modelInfo = AVAILABLE_MODELS.find(m => m.id === modelId);
    if (!modelInfo) throw new Error(`Model ${modelId} not found`);

    try {
      this.engine = new webllm.MLCEngine();
      
      this.engine.setInitProgressCallback((report: webllm.InitProgressReport) => {
        onProgress({
          stage: report.progress === 1 ? 'ready' : 'downloading',
          progress: report.progress * 100,
          message: report.text
        });
      });

      await this.engine.reload(modelInfo.modelId);
      this.currentModel = modelId;
      
      onProgress({
        stage: 'ready',
        progress: 100,
        message: 'Model loaded successfully'
      });
    } catch (error) {
      onProgress({
        stage: 'error',
        progress: 0,
        message: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Check if engine is ready.
   */
  isReady(): boolean {
    return this.engine !== null && this.currentModel !== null;
  }

  /**
   * Run a chat completion (returns parsed JSON or raw text).
   */
  async complete(messages: {role: string, content: string}[]): Promise<string> {
    if (!this.engine) throw new Error('Engine not initialized');
    
    const request: webllm.ChatCompletionRequest = {
      messages: messages as webllm.ChatCompletionMessageParam[],
      temperature: 0.1,
      // Grammar-constrained decoding: guarantees syntactically valid JSON.
      response_format: { type: 'json_object' },
    };
    
    const response = await this.engine.chat.completions.create(request);
    return response.choices[0].message.content || '';
  }
}

export const aiEngine = new AIEngine();
