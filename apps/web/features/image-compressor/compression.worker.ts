import { compressOnDevice } from './engine';
import type { CompressionOptions } from './types';
self.onmessage = async (event: MessageEvent<{ file: File; options: CompressionOptions }>) => {
  if (typeof OffscreenCanvas === 'undefined' || typeof createImageBitmap !== 'function') { self.postMessage({ type: 'fallback' }); return; }
  try {
    const result = await compressOnDevice(event.data.file, event.data.options, undefined, progress => self.postMessage({ type: 'progress', progress }));
    self.postMessage({ type: 'result', result });
  } catch (error) { self.postMessage({ type: 'error', message: error instanceof Error ? error.message : 'Unable to compress this image.' }); }
};
