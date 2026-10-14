import type { MetadataRoute } from 'next';
import { siteURL } from '@/lib/content';
export const dynamic = 'force-static';
export default function robots(): MetadataRoute.Robots {
  const origin = siteURL();
  return { rules: { userAgent: '*', allow: '/' }, ...(origin ? { sitemap: `${origin}/sitemap.xml` } : {}) };
}
