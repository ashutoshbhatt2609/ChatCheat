/**
 * Web Worker for running AI inference off the main thread.
 *
 * To use this worker in your app:
 *   const worker = new Worker(new URL('./ai/worker.ts', import.meta.url), { type: 'module' });
 *   const engine = await webllm.CreateWebWorkerMLCEngine(worker, modelId);
 *
 * For now, ChatCheat runs WebLLM on the main thread via engine.ts.
 * This worker file is provided as an optimization path for future use.
 */

import * as webllm from '@mlc-ai/web-llm';

let handler: webllm.WebWorkerMLCEngineHandler | null = null;

self.addEventListener('message', (msg: MessageEvent) => {
  if (!handler) {
    handler = new webllm.WebWorkerMLCEngineHandler();
  }
  handler.onmessage(msg);
});
