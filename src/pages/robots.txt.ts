import type { APIRoute } from 'astro';

export const prerender = true;

export const GET: APIRoute = ({ site }) => {
  const origin = site ?? new URL('http://localhost');
  const sitemapUrl = new URL(`${import.meta.env.BASE_URL}sitemap.xml`, origin).toString();
  const body = [
    'User-agent: *',
    'Allow: /',
    '',
    'User-agent: OAI-SearchBot',
    'Allow: /',
    '',
    `Sitemap: ${sitemapUrl}`,
    '',
  ].join('\n');

  return new Response(body, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
};
