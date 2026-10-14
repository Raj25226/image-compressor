'use client';
import { useRef, useState } from 'react';
import { Icon } from './Icon';

export function ImageDropzone({ onFile, onError, disabled, compact = false }: { onFile: (file: File) => void; onError: (error: string) => void; disabled: boolean; compact?: boolean }) {
  const ref = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const select = (files: FileList | null) => {
    if (!files?.length || disabled) return;
    if (files.length > 1) { onError('Choose one image at a time. Batch compression is not part of this release.'); return; }
    onFile(files[0]);
  };
  return <div className={`dropzone ${dragging ? 'dragging' : ''} ${compact ? 'compact' : ''}`} onDragOver={event => { event.preventDefault(); if (!disabled) setDragging(true); }} onDragLeave={event => { if (!event.currentTarget.contains(event.relatedTarget as Node)) setDragging(false); }} onDrop={event => { event.preventDefault(); setDragging(false); select(event.dataTransfer.files); }}>
    <input ref={ref} type="file" accept="image/jpeg,image/png,image/webp" aria-label="Choose image file" hidden disabled={disabled} onChange={event => { select(event.currentTarget.files); event.currentTarget.value = ''; }} />
    {!compact && <><span className="upload-icon"><Icon name="image" size={34} /></span><h3>Drop your image here</h3><p>or choose one from your device</p></>}
    <button className={compact ? 'button secondary small' : 'button primary'} disabled={disabled} type="button" onClick={() => ref.current?.click()}><Icon name="upload" size={17} />{compact ? 'Choose another image' : 'Choose an image'}</button>
    {!compact && <span className="file-support">JPG, PNG, WebP · Up to 20 MB · 40 MP</span>}
  </div>;
}
