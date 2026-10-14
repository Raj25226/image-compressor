export type OutputFormat = 'auto' | 'image/jpeg' | 'image/webp' | 'image/png';
export type CompressionOptions = { targetBytes: number; outputFormat: OutputFormat; allowResize: boolean; maxWidth?: number; maxHeight?: number; };
export type CompressionResult = { blob: Blob; originalBytes: number; outputBytes: number; width: number; height: number; targetReached: boolean; warnings: string[]; originalKept: boolean; };
export type ImageInfo = { format: 'image/jpeg' | 'image/png' | 'image/webp'; width: number; height: number; };
export const MAX_FILE_BYTES = 20 * 1024 * 1024;
export const MAX_PIXELS = 40_000_000;
export const MIN_TARGET_KB = 1;
export const MAX_TARGET_KB = 20 * 1024;
