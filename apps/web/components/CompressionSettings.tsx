'use client';
import type { OutputFormat } from '@/features/image-compressor/types';
export function CompressionSettings({ target, setTarget, format, setFormat, resize, setResize, maxWidth, setMaxWidth, maxHeight, setMaxHeight, disabled }: { target: string; setTarget: (value: string) => void; format: OutputFormat; setFormat: (value: OutputFormat) => void; resize: boolean; setResize: (value: boolean) => void; maxWidth: string; setMaxWidth: (value: string) => void; maxHeight: string; setMaxHeight: (value: string) => void; disabled: boolean }) {
  return <fieldset className="settings" disabled={disabled}>
    <legend className="section-label">02 / Make it fit</legend>
    <label className="field-label" htmlFor="custom-target">Target file size</label>
    <div className="presets" role="group" aria-label="Target size presets">{[20, 50, 100, 200].map(kb => <button key={kb} className={Number(target) === kb ? 'selected' : ''} type="button" aria-label={`${kb} KB`} aria-pressed={Number(target) === kb} onClick={() => setTarget(String(kb))}>{kb}<span>KB</span></button>)}</div>
    <div className="input-with-unit"><input id="custom-target" type="number" min="1" max="20480" step="any" value={target} onChange={event => setTarget(event.target.value)} aria-describedby="target-hint" /><span>KB</span></div>
    <p className="hint" id="target-hint">A goal, not a guarantee. We’ll show the actual size achieved.</p>
    <label className="field-label" htmlFor="output-format">Output format</label>
    <select id="output-format" value={format} onChange={event => setFormat(event.target.value as OutputFormat)}><option value="auto">Keep original format</option><option value="image/jpeg">JPEG · best for photos</option><option value="image/webp">WebP · smaller, supports transparency</option><option value="image/png">PNG · lossless, supports transparency</option></select>
    {format === 'image/jpeg' && <p className="format-warning">JPEG removes transparency. Transparent areas will be filled with white.</p>}
    <label className="toggle-row"><input type="checkbox" aria-label="Allow smaller dimensions" checked={resize} onChange={event => setResize(event.target.checked)} /><span>Allow smaller dimensions<small>Helps reach tighter size targets</small></span></label>
    {resize && <div className="dimension-inputs"><label htmlFor="max-width">Max width<input id="max-width" type="number" min="1" max="20000" placeholder="Original" value={maxWidth} onChange={event => setMaxWidth(event.target.value)} /></label><label htmlFor="max-height">Max height<input id="max-height" type="number" min="1" max="20000" placeholder="Original" value={maxHeight} onChange={event => setMaxHeight(event.target.value)} /></label></div>}
  </fieldset>;
}
