import { MAX_FILE_BYTES, MAX_PIXELS, MIN_TARGET_KB, MAX_TARGET_KB, type ImageInfo } from './types';

export function targetBytesFromKB(value: string | number): number {
  const kb = typeof value === 'number' ? value : Number(value.trim());
  if (!Number.isFinite(kb) || kb < MIN_TARGET_KB || kb > MAX_TARGET_KB) throw new Error(`Enter a target between ${MIN_TARGET_KB} and ${MAX_TARGET_KB.toLocaleString()} KB.`);
  return Math.floor(kb * 1024);
}

export function inspectHeader(bytes: Uint8Array): ImageInfo {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const text = (start: number, count: number) => String.fromCharCode(...bytes.slice(start, start + count));
  let info: ImageInfo | undefined;
  if (bytes.length >= 24 && bytes[0] === 137 && text(1, 3) === 'PNG' && bytes[4] === 13 && bytes[5] === 10 && bytes[6] === 26 && bytes[7] === 10 && text(12, 4) === 'IHDR') {
    info = { format: 'image/png', width: view.getUint32(16), height: view.getUint32(20) };
  } else if (bytes.length >= 30 && text(0, 4) === 'RIFF' && text(8, 4) === 'WEBP') {
    const chunk = text(12, 4);
    if (chunk === 'VP8X') {
      const uint24 = (at: number) => bytes[at] | bytes[at + 1] << 8 | bytes[at + 2] << 16;
      info = { format: 'image/webp', width: uint24(24) + 1, height: uint24(27) + 1 };
    } else if (chunk === 'VP8 ' && bytes[23] === 157 && bytes[24] === 1 && bytes[25] === 42) {
      info = { format: 'image/webp', width: view.getUint16(26, true) & 16383, height: view.getUint16(28, true) & 16383 };
    } else if (chunk === 'VP8L' && bytes[20] === 47) {
      const bits = view.getUint32(21, true);
      info = { format: 'image/webp', width: (bits & 16383) + 1, height: ((bits >>> 14) & 16383) + 1 };
    }
  } else if (bytes.length >= 4 && bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) {
    let at = 2;
    while (at + 4 <= bytes.length) {
      if (bytes[at] !== 255) break;
      while (bytes[at] === 255) at++;
      const marker = bytes[at++];
      if (marker === 217 || marker === 218) break;
      if (marker === 1 || marker >= 208 && marker <= 215) continue;
      if (at + 2 > bytes.length) break;
      const length = view.getUint16(at);
      if (length < 2 || at + length > bytes.length) break;
      if ([192, 193, 194, 195, 197, 198, 199, 201, 202, 203, 205, 206, 207].includes(marker) && length >= 7) {
        info = { format: 'image/jpeg', width: view.getUint16(at + 5), height: view.getUint16(at + 3) };
        break;
      }
      at += length;
    }
  }
  if (!info) throw new Error('This file is unsupported or damaged. Choose a valid JPEG, PNG, or WebP image.');
  if (!info.width || !info.height) throw new Error('This image has invalid dimensions.');
  if (info.width * info.height > MAX_PIXELS) throw new Error('This image exceeds the 40-megapixel limit. Resize it before trying again.');
  return info;
}

export async function validateImage(file: File): Promise<ImageInfo> {
  if (!file.size) throw new Error('This file is empty. Choose another image.');
  if (file.size > MAX_FILE_BYTES) throw new Error('Choose an image smaller than 20 MB.');
  if (file.type && !['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) throw new Error('Choose a JPEG, PNG, or WebP image.');
  const info = inspectHeader(new Uint8Array(await file.slice(0, 1024 * 1024).arrayBuffer()));
  if (file.type && file.type !== info.format) throw new Error('The image contents do not match its file type. Export it again as JPEG, PNG, or WebP.');
  return info;
}
