import type { Metadata } from 'next';
import { ToolPage } from '@/components/ToolPage';
import { siteURL } from '@/lib/content';
export const metadata: Metadata = { ...(siteURL() ? { alternates: { canonical: '/image-compressor/' } } : {}) };
export default function Home() { return <ToolPage slug="image-compressor" />; }
