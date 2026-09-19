import history from '../../data/history.json';
export function GET() { return new Response(JSON.stringify(history),{headers:{'Content-Type':'application/json; charset=utf-8'}}); }
