import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {isDeepStrictEqual} from 'node:util';
import {load,assert} from './accountability.mjs';
load();
const ref=process.env.HISTORY_BASE_REF;
if (!ref) {
  assert(!process.env.CI,'CI must supply HISTORY_BASE_REF for append-only validation');
  console.log('Current journal valid. Cross-commit prefix check requires HISTORY_BASE_REF.');
} else {
  assert(/^[0-9a-f]{40}$/.test(ref) && !/^0+$/.test(ref),'invalid history base ref');
  execFileSync('git',['cat-file','-e',`${ref}^{commit}`],{stdio:'pipe'});
  for (const path of ['src/data/intelligence.json','src/data/thread-links.json']) {
    const old=execFileSync('git',['show',`${ref}:${path}`],{encoding:'utf8',stdio:['ignore','pipe','pipe']});
    assert(old === readFileSync(path,'utf8'),'legacy baselines may not be rewritten');
  }
  const exists=execFileSync('git',['ls-tree','--name-only',ref,'--','src/data/history.json'],{encoding:'utf8'}).trim();
  if (exists) {
    const previous=JSON.parse(execFileSync('git',['show',`${ref}:src/data/history.json`],{encoding:'utf8'}));
    const current=JSON.parse(readFileSync('src/data/history.json','utf8'));
    const {events:oldEvents,...oldMeta}=previous;
    const {events:newEvents,...newMeta}=current;
    assert(isDeepStrictEqual(oldMeta,newMeta),'journal origin metadata is immutable');
    assert(newEvents.length >= oldEvents.length && isDeepStrictEqual(oldEvents,newEvents.slice(0,oldEvents.length)),'published journal is append-only');
  }
  console.log('Append-only history validation passed');
}
