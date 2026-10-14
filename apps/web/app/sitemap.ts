import type { MetadataRoute } from 'next';
import { TOOL_PAGES, siteURL } from '@/lib/content';
export const dynamic = 'force-static';
export default function sitemap(): MetadataRoute.Sitemap {
  const origin = siteURL();
  if (!origin) return [];
  return [...Object.keys(TOOL_PAGES), 'privacy', 'tools'].map(path => ({ url: `${origin}/${path}/` }));
}
