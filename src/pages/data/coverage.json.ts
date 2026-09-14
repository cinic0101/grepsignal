import coverage from '../../data/coverage.json';
export const prerender = true;
export function GET() {
  return new Response(JSON.stringify(coverage,null,2), {
    headers: {'Content-Type':'application/json; charset=utf-8'},
  });
}
