'use client';
import { formatBytes } from '@/lib/format';
import type { CompressionResult } from '@/features/image-compressor/types';
export function ImageComparison({ originalURL, originalBytes, originalWidth, originalHeight, result, resultURL, targetBytes }: { targetBytes: number; originalURL: string; originalBytes: number; originalWidth: number; originalHeight: number; result: CompressionResult; resultURL: string }) {
  const reduction = Math.max(0, (1 - result.outputBytes / originalBytes) * 100);
  return <div className="comparison">
    <div className="result-heading"><div><span className="section-label">03 / Your result</span><h3>{result.originalKept ? 'Original kept. No unnecessary loss.' : `${reduction.toFixed(1)}% smaller.`}</h3><p className="hint">Requested target: {formatBytes(targetBytes)}</p></div><span className={`status ${result.targetReached ? 'success' : 'unmet'}`}>{result.targetReached ? 'Target reached' : 'Target not reached'}</span></div>
    <div className="preview-grid"><figure><div className="preview checkerboard"><img src={originalURL} alt="Original file preview" /></div><figcaption><span>Original<strong>{formatBytes(originalBytes)}</strong></span><small>{originalWidth} × {originalHeight} px</small></figcaption></figure><figure><div className="preview checkerboard"><img src={resultURL} alt="Compressed result preview" /></div><figcaption><span>{result.originalKept ? 'Download original' : 'Compressed'}<strong>{formatBytes(result.outputBytes)}</strong></span><small>{result.width} × {result.height} px</small></figcaption></figure></div>
    {result.warnings.length > 0 && <ul className="result-notes">{result.warnings.map(note => <li key={note}>{note}</li>)}</ul>}
  </div>;
}
