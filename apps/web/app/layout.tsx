import type { Metadata } from 'next';
import Link from 'next/link';
import Script from 'next/script';
import { Icon } from '@/components/Icon';
import { siteURL } from '@/lib/content';
import './globals.css';
const url = siteURL();
export const metadata: Metadata = { ...(url ? { metadataBase: new URL(url) } : {}), title: { default: 'Image Compressor — Free, Private & Browser-Based', template: '%s | Image Compressor' }, description: 'Reduce JPEG, PNG, and WebP image size in your browser. Choose a target, compare results, and download without uploading your image.', applicationName: 'Image Compressor' };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body><a className="skip-link" href="#main-content">Skip to content</a><header className="site-header"><Link className="brand" href="/"><span><Icon name="image" size={21} /></span>Image<span className="brand-light">Compressor</span></Link><nav aria-label="Main navigation"><Link href="/#how-it-works">How it works</Link><Link href="/#faq">FAQ</Link><Link href="/privacy/">Privacy</Link></nav><span className="header-private"><Icon name="shield" size={15} />Made to stay private</span></header>{children}<footer className="site-footer"><div><Link className="brand" href="/"><Icon name="image" size={20} />Image Compressor</Link><p>Small files. No uploads. All yours.</p></div><div className="footer-links"><Link href="/privacy/">Privacy</Link><Link href="/tools/#passport-photo">Passport photo maker · planned</Link><Link href="/tools/#jpg-to-pdf">JPG to PDF · planned</Link></div><small>© {new Date().getFullYear()} Image Compressor · Free online utility</small></footer><Script id="cloudflare-web-analytics" type="module" src="https://static.cloudflareinsights.com/beacon.min.js" data-cf-beacon={JSON.stringify({ token: 'd6ada48a666f420e8f8d26e5194c9126' })} strategy="afterInteractive" /></body></html>;
}
