import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ToolPage } from '@/components/ToolPage';
import { TOOL_PAGES, siteURL, type ToolSlug } from '@/lib/content';
export function generateStaticParams() { return Object.keys(TOOL_PAGES).map(tool => ({ tool })); }
export const dynamicParams = false;
export async function generateMetadata({ params }: { params: Promise<{ tool: string }> }): Promise<Metadata> {
  const { tool } = await params;
  if (!(tool in TOOL_PAGES)) return {};
  const content = TOOL_PAGES[tool as ToolSlug];
  return { title: content.title, description: content.intro, ...(siteURL() ? { alternates: { canonical: `/${tool}/` } } : {}) };
}
export default async function Page({ params }: { params: Promise<{ tool: string }> }) {
  const { tool } = await params;
  if (!(tool in TOOL_PAGES)) notFound();
  return <ToolPage slug={tool as ToolSlug} />;
}
