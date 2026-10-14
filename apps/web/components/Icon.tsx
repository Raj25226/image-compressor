import type { CSSProperties } from 'react';
export function Icon({ name, size = 20, style }: { name: 'image' | 'upload' | 'download' | 'shield' | 'arrow' | 'check' | 'close'; size?: number; style?: CSSProperties }) {
  const paths = {
    image: <><rect x="3" y="3" width="18" height="18" rx="4" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="m3 16 5-5 4 4 4-6 5 7" /></>,
    upload: <><path d="M12 16V3m-5 5 5-5 5 5M4 15v5a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-5" /></>,
    download: <><path d="M12 3v13m-5-5 5 5 5-5M4 16v4a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-4" /></>,
    shield: <><path d="m12 3 8 3v5c0 5-8 10-8 10S4 16 4 11V6l8-3Z" /><path d="m8 12 3 3 5-6" /></>,
    arrow: <path d="M4 12h16m-6-6 6 6-6 6" />,
    check: <path d="m5 12 4 4L19 6" />,
    close: <path d="m6 6 12 12M6 18 18 6" />,
  };
  return <svg width={size} height={size} style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}
