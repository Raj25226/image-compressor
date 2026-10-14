import { afterEach, describe, expect, it, vi } from 'vitest';
import { compressOnDevice } from '../features/image-compressor/engine';

function input() {
  const bytes = new Uint8Array(500 * 1024);
  bytes.set([137,80,78,71,13,10,26,10,0,0,0,13,73,72,68,82]);
  const view = new DataView(bytes.buffer); view.setUint32(16, 1000); view.setUint32(20, 1000);
  return new File([bytes], 'source.png', { type: 'image/png' });
}
function encoder(size: (scale: number, quality: number) => number) {
  const close = vi.fn();
  vi.stubGlobal('createImageBitmap', vi.fn().mockResolvedValue({ width: 1000, height: 1000, close }));
  class Canvas {
    constructor(public width: number, public height: number) {}
    getContext() { return { fillStyle: '', drawImage: vi.fn(), fillRect: vi.fn() }; }
    async convertToBlob({ type, quality }: { type: string; quality: number }) {
      return new Blob([new Uint8Array(Math.ceil(size(this.width / 1000, quality)))], { type });
    }
  }
  vi.stubGlobal('OffscreenCanvas', Canvas);
  return close;
}
afterEach(() => vi.unstubAllGlobals());
describe('target quality and size', () => {
  it('keeps full encoding quality when 94% would over-compress the image', async () => {
    const release = encoder((_scale, quality) => 200_000 * Math.pow(quality, 40));
    const result = await compressOnDevice(input(), { targetBytes: 200 * 1024, outputFormat: 'image/jpeg', allowResize: true });
    expect(result.outputBytes).toBe(200_000);
    expect(result.width).toBe(1000);
    expect(result.height).toBe(1000);
    expect(release).toHaveBeenCalledOnce();
  });
  it('refines PNG dimensions rather than accepting the first undersized resize', async () => {
    encoder(scale => 500 * 1024 * scale * scale);
    const result = await compressOnDevice(input(), { targetBytes: 200 * 1024, outputFormat: 'image/png', allowResize: true });
    expect(result.outputBytes).toBeLessThanOrEqual(200 * 1024);
    expect(result.outputBytes).toBeGreaterThan(198 * 1024);
    expect(result.width).toBeGreaterThan(608);
    expect(result.targetReached).toBe(true);
  });
  it('searches quality up to 100% to use the available budget', async () => {
    encoder((_scale, quality) => 220 * 1024 * Math.pow(quality, 40));
    const result = await compressOnDevice(input(), { targetBytes: 200 * 1024, outputFormat: 'image/jpeg', allowResize: false });
    expect(result.outputBytes).toBeLessThanOrEqual(200 * 1024);
    expect(result.outputBytes).toBeGreaterThan(198 * 1024);
    expect(result.width).toBe(1000);
  });
  it('explains naturally small full-quality results without adding filler', async () => {
    encoder(() => 15 * 1024);
    const result = await compressOnDevice(input(), { targetBytes: 200 * 1024, outputFormat: 'image/png', allowResize: true });
    expect(result.outputBytes).toBe(15 * 1024);
    expect(result.width).toBe(1000);
    expect(result.warnings.join(' ')).toContain('full encoding quality');
  });
  it('keeps the best fitting result when encoder sizes jump discretely', async () => {
    encoder((_scale, quality) => quality < .9 ? 180 * 1024 : 230 * 1024);
    const result = await compressOnDevice(input(), { targetBytes: 200 * 1024, outputFormat: 'image/jpeg', allowResize: false });
    expect(result.outputBytes).toBe(180 * 1024);
    expect(result.targetReached).toBe(true);
  });
});
