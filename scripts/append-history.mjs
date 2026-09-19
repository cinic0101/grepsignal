/** Append an already accepted public-safe event. This command never approves/publishes. */
import {readFileSync,writeFileSync,renameSync} from 'node:fs';
import {isDeepStrictEqual} from 'node:util';
import {load,replay,validateEvent} from './accountability.mjs';
const input=process.argv[2];
if (!input) throw new Error('Usage: node scripts/append-history.mjs accepted-public-event.json');
const event=validateEvent(JSON.parse(readFileSync(input,'utf8')));
load();
const path='src/data/history.json';
const journal=JSON.parse(readFileSync(path,'utf8'));
const previous=journal.events.find(x => x.id === event.id);
if (previous) {
  if (!isDeepStrictEqual(previous,event)) throw new Error('Event ID reused with different content');
  console.log('Exact replay; no write');
} else {
  journal.events.push(event);
  replay(JSON.parse(readFileSync('src/data/intelligence.json','utf8')),journal,JSON.parse(readFileSync('src/data/thread-links.json','utf8')));
  const temp=`${path}.tmp`;
  writeFileSync(temp,`${JSON.stringify(journal,null,2)}\n`,{flag:'wx'});
  renameSync(temp,path);
  console.log('Appended accepted event. Submit/review the public PR; nothing was auto-published.');
}
