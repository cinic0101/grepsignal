import type { APIRoute } from 'astro';
import intelligence from '../data/intelligence.json';

export const prerender = true;

const escapeXml = (value: string) => value
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&apos;');

export const GET: APIRoute = ({ site }) => {
  const origin = site ?? new URL('http://localhost');
  const base = import.meta.env.BASE_URL;
  const absoluteUrl = (path = '') => new URL(`${base}${path}`, origin).toString();
  const generatedDate = intelligence.generated_at.slice(0, 10);

  const entries: Array<{ loc: string; lastmod?: string }> = [
    { loc: absoluteUrl('agents/') },
  ];

  if (intelligence.publication_status === 'published') {
    entries.unshift({ loc: absoluteUrl(), lastmod: generatedDate });
    entries.push(...intelligence.signals.map((signal) => ({
      loc: absoluteUrl(`signals/${signal.id}/`),
      lastmod: signal.registered_at,
    })));
  }

  const urls = entries.map(({ loc, lastmod }) => [
    '  <url>',
    `    <loc>${escapeXml(loc)}</loc>`,
    lastmod ? `    <lastmod>${escapeXml(lastmod)}</lastmod>` : null,
    '  </url>',
  ].filter(Boolean).join('\n')).join('\n');

  const body = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    urls,
    '</urlset>',
    '',
  ].join('\n');

  return new Response(body, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  });
};
