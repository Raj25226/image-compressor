import { compressOnDevice } from './engine';
import type { CompressionOptions, CompressionResult } from './types';

export async function compressImage(file: File, options: CompressionOptions, signal?: AbortSignal, onProgress?: (value: number) => void): Promise<CompressionResult> {
  if (signal?.aborted) throw new DOMException('Compression cancelled.', 'AbortError');
  if (typeof Worker === 'undefined') return compressOnDevice(file, options, signal, onProgress);
  let worker: Worker;
  try { worker = new Worker(new URL('./compression.worker.ts', import.meta.url)); }
  catch { return compressOnDevice(file, options, signal, onProgress); }
  const result = await new Promise<CompressionResult | null>((resolve, reject) => {
    const cleanup = () => { clearTimeout(timer); signal?.removeEventListener('abort', abort); worker.terminate(); };
    const abort = () => { cleanup(); reject(new DOMException('Compression cancelled.', 'AbortError')); };
    const timer = setTimeout(() => { cleanup(); reject(new Error('Processing took too long on this device. Try a smaller image or a larger target.')); }, 30_000);
    signal?.addEventListener('abort', abort, { once: true });
    worker.onmessage = event => {
      if (event.data.type === 'progress') onProgress?.(event.data.progress);
      else if (event.data.type === 'fallback') { cleanup(); resolve(null); }
      else if (event.data.type === 'result') { cleanup(); resolve(event.data.result); }
      else if (event.data.type === 'error') { cleanup(); reject(new Error(event.data.message)); }
    };
    worker.onerror = () => { cleanup(); resolve(null); };
    worker.postMessage({ file, options });
  });
  return result ?? compressOnDevice(file, options, signal, onProgress);
}
