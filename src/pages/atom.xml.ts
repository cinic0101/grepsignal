import { changes } from '../data/intelligence';
import history from '../data/history.json';
import { asAtom } from '../../scripts/accountability.mjs';
export function GET({site}) {
  const base = new URL(import.meta.env.BASE_URL, site ?? 'http://localhost');
  return new Response(asAtom(changes,base.href,history.initialized_at),{headers:{'Content-Type':'application/atom+xml; charset=utf-8'}});
}
