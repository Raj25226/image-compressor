'use client';
import { useEffect, useRef, useState } from 'react';
import { ImageDropzone } from './ImageDropzone';
import { CompressionSettings } from './CompressionSettings';
import { ImageComparison } from './ImageComparison';
import { Icon } from './Icon';
import { compressImage } from '@/features/image-compressor/compress';
import { validateImage, targetBytesFromKB } from '@/features/image-compressor/validate';
import type { CompressionResult, OutputFormat } from '@/features/image-compressor/types';
import { formatBytes, downloadName } from '@/lib/format';
import { track } from '@/lib/analytics';

type Selection = { file: File; url: string; width: number; height: number };
export function Compressor({ initialTarget = 100 }: { initialTarget?: number }) {
  const [selected, setSelected] = useState<Selection | null>(null);
  const [target, setTarget] = useState(String(initialTarget));
  const [format, setFormat] = useState<OutputFormat>('auto');
  const [resize, setResize] = useState(true);
  const [maxWidth, setMaxWidth] = useState('');
  const [maxHeight, setMaxHeight] = useState('');
  const [result, setResult] = useState<CompressionResult | null>(null);
  const [resultURL, setResultURL] = useState('');
  const [resultTarget, setResultTarget] = useState(0);
  const [status, setStatus] = useState<'idle' | 'validating' | 'compressing'>('idle');
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const controller = useRef<AbortController | null>(null);
  const generation = useRef(0);
  const resultRef = useRef<HTMLDivElement>(null);
  const busy = status !== 'idle';
  useEffect(() => {
    track('tool_opened');
    const sequence = generation;
    const cancellation = controller;
    return () => { sequence.current++; cancellation.current?.abort(); };
  }, []);
  useEffect(() => () => { if (selected) URL.revokeObjectURL(selected.url); }, [selected]);
  useEffect(() => () => { if (resultURL) URL.revokeObjectURL(resultURL); }, [resultURL]);

  async function selectFile(file: File) {
    const current = ++generation.current;
    controller.current?.abort();
    setError(''); setStatus('validating');
    let url = '';
    try {
      const info = await validateImage(file);
      url = URL.createObjectURL(file);
      // Decode before showing a preview, detecting corrupt files and respecting EXIF orientation.
      let width = info.width; let height = info.height;
      if (typeof createImageBitmap === 'function') {
        const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
        width = bitmap.width; height = bitmap.height; bitmap.close();
      } else {
        const image = new Image(); image.src = url; await image.decode();
        width = image.naturalWidth; height = image.naturalHeight; image.src = '';
      }
      if (generation.current !== current) { URL.revokeObjectURL(url); return; }
      setSelected({ file, url, width, height }); setResult(null); setResultURL('');
      track('image_selected', { format: info.format.split('/')[1] as 'jpeg' | 'png' | 'webp', sizeBucket: file.size < 102400 ? 'under-100kb' : file.size < 1048576 ? '100kb-1mb' : file.size < 5242880 ? '1mb-5mb' : 'over-5mb' });
    } catch (caught) {
      if (url) URL.revokeObjectURL(url);
      if (generation.current === current) { setError(caught instanceof Error ? caught.message : 'This image could not be opened.'); track('compression_failed', { errorCategory: 'input' }); }
    } finally { if (generation.current === current) setStatus('idle'); }
  }

  async function compress() {
    if (!selected || busy) return;
    const current = ++generation.current;
    const abortController = new AbortController(); controller.current = abortController;
    setError(''); setResult(null); setResultURL(''); setProgress(0);
    try {
      const targetBytes = targetBytesFromKB(target);
      const dimension = (value: string) => {
        if (!value) return undefined;
        const number = Number(value);
        if (!Number.isInteger(number) || number < 1 || number > 20000) throw new Error('Dimension limits must be whole numbers from 1 to 20,000 pixels.');
        return number;
      };
      const options = { targetBytes, outputFormat: format, allowResize: resize, maxWidth: resize ? dimension(maxWidth) : undefined, maxHeight: resize ? dimension(maxHeight) : undefined };
      setStatus('compressing'); track('compression_started');
      const compressed = await compressImage(selected.file, options, abortController.signal, value => { if (generation.current === current) setProgress(value); });
      if (generation.current !== current) return;
      setResult(compressed); setResultTarget(targetBytes); setResultURL(URL.createObjectURL(compressed.blob));
      track(compressed.targetReached ? 'compression_succeeded' : 'compression_target_unmet');
      requestAnimationFrame(() => resultRef.current?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'nearest' }));
    } catch (caught) {
      if (generation.current === current) {
        if (caught instanceof DOMException && caught.name === 'AbortError') setError('Compression cancelled. Your original image is unchanged.');
        else { setError(caught instanceof Error ? caught.message : 'Compression failed. Try a smaller image.'); track('compression_failed', { errorCategory: 'processing' }); }
      }
    } finally { if (generation.current === current) setStatus('idle'); }
  }
  function clear() { generation.current++; controller.current?.abort(); setSelected(null); setResult(null); setResultURL(''); setStatus('idle'); setError(''); }

  return <section className="tool-card" id="compressor" aria-label="Image compression tool">
    <div className="tool-main">
      <div className="panel-heading"><span className="section-label">01 / Choose your image</span><span className="local-badge"><Icon name="shield" size={14} />On your device</span></div>
      {selected ? <div className="selected-image"><div className="selected-preview checkerboard"><img src={selected.url} alt="Selected file preview" /></div><div className="selected-meta"><div><strong title={selected.file.name}>{selected.file.name}</strong><span>{formatBytes(selected.file.size)} · {selected.width} × {selected.height} px</span></div><button type="button" className="icon-button" aria-label="Remove image" onClick={clear}><Icon name="close" size={18} /></button></div><ImageDropzone compact onFile={selectFile} onError={setError} disabled={busy} /></div> : <ImageDropzone onFile={selectFile} onError={setError} disabled={busy} />}
      {!selected && <div className="empty-result"><span className="mini-landscape" aria-hidden="true"><i /><b /></span><div><strong>Smaller files, ready for anything.</strong><p>Forms, websites, applications, and everyday sharing.</p></div></div>}
      <p className="privacy-note"><Icon name="shield" size={16} />Your images stay in your browser. No uploads, no account.</p>
    </div>
    <div className="tool-settings"><CompressionSettings target={target} setTarget={setTarget} format={format} setFormat={setFormat} resize={resize} setResize={setResize} maxWidth={maxWidth} setMaxWidth={setMaxWidth} maxHeight={maxHeight} setMaxHeight={setMaxHeight} disabled={busy} />
      <button type="button" className="button primary compress-button" disabled={!selected || busy} onClick={compress}>{status === 'compressing' ? <><span className="spinner" />Compressing…</> : status === 'validating' ? 'Checking image…' : <>Compress image<Icon name="arrow" size={18} /></>}</button>
      {status === 'compressing' && <div className="progress-block"><progress value={progress} max="100" aria-label="Compression progress" /><div><span>{progress}% · Processing locally</span><button className="text-button" type="button" onClick={() => controller.current?.abort()}>Cancel</button></div></div>}
      <p className="hint centered">Quality and dimensions may change to approach your target.</p>
    </div>
    {error && <div className="tool-error" role="alert">{error}</div>}
    <div className="sr-only" role="status">{status === 'validating' ? 'Checking your image.' : status === 'compressing' ? `Compressing locally, ${progress} percent.` : result ? `Result ready. ${result.targetReached ? 'Target reached.' : 'Target not reached.'}` : ''}</div>
    {result && selected && resultURL && <div className="result-panel" ref={resultRef}><ImageComparison targetBytes={resultTarget} originalURL={selected.url} originalBytes={selected.file.size} originalWidth={selected.width} originalHeight={selected.height} result={result} resultURL={resultURL} /><div className="download-row"><p>Actual download size: <strong>{formatBytes(result.outputBytes)}</strong></p><a className="button primary" href={resultURL} download={downloadName(selected.file.name, result.blob.type, result.originalKept)} onClick={() => track('download_clicked')}><Icon name="download" size={18} />{result.originalKept ? 'Download original' : 'Download image'}</a></div></div>}
  </section>;
}
