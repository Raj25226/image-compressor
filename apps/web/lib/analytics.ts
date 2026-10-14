type ToolEvent = 'tool_opened' | 'image_selected' | 'compression_started' | 'compression_succeeded' | 'compression_target_unmet' | 'download_clicked' | 'compression_failed';
type SafeDetails = { format?: 'jpeg' | 'png' | 'webp'; sizeBucket?: 'under-100kb' | '100kb-1mb' | '1mb-5mb' | 'over-5mb'; errorCategory?: 'input' | 'processing'; };
// Local event hook only. No analytics vendor, network requests, filenames, or image contents.
export function track(event: ToolEvent, detail: SafeDetails = {}): void {
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('image-compressor:event', { detail: { event, ...detail } }));
}
