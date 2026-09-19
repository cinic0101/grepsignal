import intelligence from '../../data/intelligence';

export const prerender = true;

export function GET() {
  return new Response(JSON.stringify(intelligence, null, 2), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'public, max-age=300',
    },
  });
}
