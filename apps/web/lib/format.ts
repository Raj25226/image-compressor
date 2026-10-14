export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}
export function downloadName(name: string, mime: string, originalKept: boolean): string {
  if (originalKept) return name;
  const extension = mime === 'image/jpeg' ? 'jpg' : mime === 'image/webp' ? 'webp' : 'png';
  return `${name.replace(/\.[^.]+$/, '')}-compressed.${extension}`;
}
