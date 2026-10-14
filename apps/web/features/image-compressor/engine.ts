import { validateImage, targetBytesFromKB } from './validate';
import { MAX_PIXELS, type CompressionOptions, type CompressionResult } from './types';

const cancelled = (signal?: AbortSignal) => { if (signal?.aborted) throw new DOMException('Compression cancelled.', 'AbortError'); };

async function decode(file: File, signal?: AbortSignal): Promise<{ source: CanvasImageSource; width: number; height: number; release: () => void }> {
  cancelled(signal);
  if (typeof createImageBitmap === 'function') {
    const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
    return { source: bitmap, width: bitmap.width, height: bitmap.height, release: () => bitmap.close() };
  }
  if (typeof document === 'undefined') throw new Error('Worker decoding unavailable.');
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    return { source: image, width: image.naturalWidth, height: image.naturalHeight, release: () => { image.src = ''; URL.revokeObjectURL(url); } };
  } catch { URL.revokeObjectURL(url); throw new Error('Your browser could not decode this image. It may be damaged or unsupported.'); }
}

export async function compressOnDevice(file: File, options: CompressionOptions, signal?: AbortSignal, onProgress?: (value: number) => void): Promise<CompressionResult> {
  targetBytesFromKB(options.targetBytes / 1024);
  if (!['auto', 'image/jpeg', 'image/png', 'image/webp'].includes(options.outputFormat)) throw new Error('Choose a supported output format.');
  for (const limit of [options.maxWidth, options.maxHeight]) if (limit !== undefined && (!Number.isFinite(limit) || limit < 1)) throw new Error('Dimension limits must be positive.');
  const info = await validateImage(file);
  cancelled(signal);
  onProgress?.(5);
  let decoded: Awaited<ReturnType<typeof decode>>;
  try { decoded = await decode(file, signal); } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error;
    throw new Error('Your browser could not decode this image. It may be damaged or unsupported.');
  }
  const canvas = typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(1, 1) : document.createElement('canvas');
  const warnings: string[] = [];
  const format = options.outputFormat === 'auto' ? info.format : options.outputFormat;
  if (format === 'image/jpeg' && info.format !== 'image/jpeg') warnings.push('JPEG does not support transparency. Transparent areas are filled with white.');
  if (format === 'image/png') warnings.push('PNG uses lossless encoding. A lower size may require smaller dimensions; quality adjustment does not reduce PNG size.');
  const startingScale = Math.min(1, options.maxWidth ? options.maxWidth / decoded.width : 1, options.maxHeight ? options.maxHeight / decoded.height : 1);
  type Candidate = { blob: Blob; width: number; height: number; scale: number; quality: number };
  let smallest: Candidate = { blob: file, width: decoded.width, height: decoded.height, scale: 1, quality: 1 };
  let best: Candidate | undefined;
  let attempts = 0;
  const start = performance.now();
  const withinBudget = () => performance.now() - start <= 20_000 && attempts < 100;
  try {
    cancelled(signal);
    if (decoded.width * decoded.height > MAX_PIXELS) throw new Error('This image exceeds the 40-megapixel limit.');
    if (file.size <= options.targetBytes && startingScale === 1 && format === info.format) {
      return { blob: file, originalBytes: file.size, outputBytes: file.size, width: decoded.width, height: decoded.height, targetReached: true, warnings: ['Your image already fits the target. The original is ready to download without quality loss.'], originalKept: true };
    }
    let drawn = false;
    const encode = async (scale: number, quality: number): Promise<Candidate> => {
      cancelled(signal);
      const width = Math.max(1, Math.round(decoded.width * scale));
      const height = Math.max(1, Math.round(decoded.height * scale));
      if (!drawn || canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
        const context = canvas.getContext('2d') as CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null;
        if (!context) throw new Error('Image processing is not available in this browser.');
        if (format === 'image/jpeg') { context.fillStyle = '#ffffff'; context.fillRect(0, 0, width, height); }
        context.drawImage(decoded.source, 0, 0, width, height);
        drawn = true;
      }
      let blob: Blob;
      if ('convertToBlob' in canvas) blob = await canvas.convertToBlob({ type: format, quality });
      else blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(value => value ? resolve(value) : reject(new Error('Image encoding failed. Try a smaller image.')), format, quality));
      cancelled(signal);
      if (blob.type !== format) throw new Error('Your browser does not support this output format. Try PNG or JPEG.');
      attempts++;
      onProgress?.(Math.min(92, 10 + attempts));
      const candidate = { blob, width, height, scale, quality };
      if (blob.size < smallest.blob.size) smallest = candidate;
      await new Promise(resolve => setTimeout(resolve, 0));
      return candidate;
    };
    let previousScale = startingScale;
    for (let step = 0; step < (options.allowResize ? 9 : 1); step++) {
      if (!withinBudget()) break;
      cancelled(signal);
      const scale = startingScale * Math.pow(.78, step);
      // Never lower quality unnecessarily when the full-quality result already fits.
      const high = await encode(scale, 1);
      if (high.blob.size <= options.targetBytes) {
        best = high;
        if (step > 0) {
          // The previous size exceeded the target. Find the largest fitting
          // dimensions between it and this coarse resize step at full quality.
          let lo = scale;
          let hi = previousScale;
          for (let iteration = 0; iteration < 12 && withinBudget(); iteration++) {
            const middle = (lo + hi) / 2;
            const width = Math.max(1, Math.round(decoded.width * middle));
            const height = Math.max(1, Math.round(decoded.height * middle));
            if (width === best.width && height === best.height) break;
            const candidate = await encode(middle, 1);
            if (candidate.blob.size <= options.targetBytes) {
              lo = middle;
              if (candidate.width >= best.width && candidate.height >= best.height) best = candidate;
            } else hi = middle;
          }
        }
        break;
      }
      if (format !== 'image/png') {
        const low = await encode(scale, .35);
        if (low.blob.size <= options.targetBytes) {
          best = low;
          let lo = .35;
          let hi = 1;
          for (let iteration = 0; iteration < 12 && withinBudget(); iteration++) {
            const quality = (lo + hi) / 2;
            const candidate = await encode(scale, quality);
            if (candidate.blob.size <= options.targetBytes) {
              lo = quality;
              if (candidate.quality > best.quality) best = candidate;
            } else hi = quality;
          }
          break;
        }
      }
      previousScale = scale;
      if (Math.max(high.width, high.height) <= 64) break;
    }
    if (!withinBudget()) warnings.push('The processing limit was reached. This is the best result found so far.');

    cancelled(signal);
    const chosen = best ?? smallest;
    let blob = chosen.blob;
    let bestWidth = chosen.width;
    let bestHeight = chosen.height;
    let originalKept = false;
    if (blob.size >= file.size) {
      blob = file; bestWidth = decoded.width; bestHeight = decoded.height; originalKept = true;
      warnings.length = 0;
      warnings.push('Compression did not produce a smaller file. The original image is offered instead, in its original format.');
    } else {
      if (bestWidth !== decoded.width || bestHeight !== decoded.height) warnings.push(`Dimensions reduced from ${decoded.width} × ${decoded.height} to ${bestWidth} × ${bestHeight}. Check the preview before downloading.`);
      if (format !== 'image/png') warnings.push('Lossy encoding may reduce image quality. Compare the previews before downloading.');
      if (best && best.quality === 1 && best.scale === startingScale && blob.size < options.targetBytes * .9) warnings.push('This image already fits well below the target at full encoding quality. No extra resizing or lower quality was applied to make it smaller.');
    }
    const targetReached = blob.size <= options.targetBytes;
    if (!targetReached) warnings.push('The requested target was not reached within the quality, resize, and time limits. Try a larger target or a different format.');
    onProgress?.(100);
    return { blob, originalBytes: file.size, outputBytes: blob.size, width: bestWidth, height: bestHeight, targetReached, warnings, originalKept };
  } finally { decoded.release(); canvas.width = 1; canvas.height = 1; }
}
