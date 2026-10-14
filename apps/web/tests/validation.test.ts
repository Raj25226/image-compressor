import { describe, it, expect } from 'vitest';
import { inspectHeader, targetBytesFromKB, validateImage } from '../features/image-compressor/validate';
import { formatBytes, downloadName } from '../lib/format';
function png(width: number, height: number) {
  const bytes = new Uint8Array(33); bytes.set([137,80,78,71,13,10,26,10,0,0,0,13,73,72,68,82]);
  new DataView(bytes.buffer).setUint32(16,width); new DataView(bytes.buffer).setUint32(20,height); return bytes;
}
describe('input validation', () => {
  it('reads PNG dimensions before decoding', () => expect(inspectHeader(png(400,300))).toEqual({format:'image/png',width:400,height:300}));
  it('rejects decompression-sized images', () => expect(() => inspectHeader(png(100000,100000))).toThrow('40-megapixel'));
  it('rejects zero dimensions', () => expect(() => inspectHeader(png(0,300))).toThrow('invalid dimensions'));
  it('rejects unsupported and corrupt headers', () => expect(() => inspectHeader(new Uint8Array([1,2,3,4]))).toThrow('unsupported or damaged'));
  it('reads JPEG SOF dimensions', () => expect(inspectHeader(new Uint8Array([255,216,255,192,0,17,8,1,44,1,144,3,1,17,0,2,17,0,3,17,0]))).toEqual({format:'image/jpeg',width:400,height:300}));
  it('reads extended WebP dimensions', () => {
    const bytes = new Uint8Array(30); bytes.set([...Buffer.from('RIFF')]); bytes.set([...Buffer.from('WEBPVP8X')],8); bytes[24]=99; bytes[27]=49;
    expect(inspectHeader(bytes)).toEqual({format:'image/webp',width:100,height:50});
  });
  it('rejects a malformed JPEG segment', () => expect(() => inspectHeader(new Uint8Array([255,216,255,224,0,1]))).toThrow());
  it('rejects wrong MIME signatures', async () => await expect(validateImage(new File([png(100,100)],'wrong.jpg',{type:'image/jpeg'}))).rejects.toThrow('do not match'));
  it('rejects SVG even when named as a PNG', async () => await expect(validateImage(new File(['<svg/>'],'image.png',{type:'image/svg+xml'}))).rejects.toThrow('JPEG, PNG, or WebP'));
  it('rejects empty files', async () => await expect(validateImage(new File([],'empty.png',{type:'image/png'}))).rejects.toThrow('empty'));
  it('rejects files larger than 20 MB', async () => await expect(validateImage(new File([new Uint8Array(20*1024*1024+1)],'big.png',{type:'image/png'}))).rejects.toThrow('20 MB'));
});
describe('target limits', () => {
  it.each([0,-1,'',NaN,Infinity,'abc',20481])('rejects invalid target %s', value => expect(() => targetBytesFromKB(value)).toThrow());
  it('uses binary kilobytes', () => expect(targetBytesFromKB('50')).toBe(51200));
  it('supports fractional positive targets', () => expect(targetBytesFromKB('1.5')).toBe(1536));
});
describe('download metadata', () => {
  it('uses actual output format for extension', () => expect(downloadName('portrait.png','image/webp',false)).toBe('portrait-compressed.webp'));
  it('preserves original filename when original is offered', () => expect(downloadName('portrait.png','image/jpeg',true)).toBe('portrait.png'));
  it('formats actual blob size', () => { expect(formatBytes(51200)).toBe('50.0 KB'); expect(formatBytes(999)).toBe('999 B'); });
});
