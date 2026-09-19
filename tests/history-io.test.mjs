import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,copyFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {execFileSync,spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
function fixture() {
 const root=mkdtempSync(join(tmpdir(),'gs-history-'));
 mkdirSync(join(root,'src/data'),{recursive:true});mkdirSync(join(root,'scripts'));
 for (const f of ['accountability.mjs','check-history.mjs','append-history.mjs']) copyFileSync(new URL(`../scripts/${f}`,import.meta.url),join(root,'scripts',f));
 const baseline=JSON.stringify({schema_version:1,publication_status:'published',generated_at:'2026-09-19T00:00:00Z',signals:[],threads:[],predictions:[]});
 const links='{}';
 const sha=s=>createHash('sha1').update(`blob ${Buffer.byteLength(s)}\0`).update(s).digest('hex');
 writeFileSync(join(root,'src/data/intelligence.json'),baseline);writeFileSync(join(root,'src/data/thread-links.json'),links);
 const journal={schema_version:1,baseline_blob_sha:sha(baseline),baseline_links_blob_sha:sha(links),baseline_ref:'https://example.org/baseline',initialized_at:'2026-09-19T12:00:00Z',initial_thread_review_due_at:'2026-09-26T00:00:00Z',events:[]};
 writeFileSync(join(root,'src/data/history.json'),JSON.stringify(journal));
 const git=(...args)=>execFileSync('git',args,{cwd:root,encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();
 git('init');git('config','user.email','fixture@example.org');git('config','user.name','Fixture');git('add','.');git('commit','-m','fixture');
 const ref=git('rev-parse','HEAD');
 const check=(env={})=>spawnSync(process.execPath,['scripts/check-history.mjs'],{cwd:root,encoding:'utf8',env:{...process.env,CI:'true',HISTORY_BASE_REF:ref,...env}});
 return {root,journal,check,git};
}
test('CI checks pinned baseline and immutable journal metadata against actual Git base',()=>{
 const f=fixture();try {
  assert.equal(f.check().status,0);
  f.journal.initialized_at='2026-09-19T13:00:00Z';writeFileSync(join(f.root,'src/data/history.json'),JSON.stringify(f.journal));
  assert.notEqual(f.check().status,0);
 } finally {rmSync(f.root,{recursive:true,force:true});}
});
test('missing CI base fails closed; raw baseline edits fail fingerprint',()=>{
 const f=fixture();try {
  assert.notEqual(f.check({HISTORY_BASE_REF:''}).status,0);
  const path=join(f.root,'src/data/intelligence.json');writeFileSync(path,readFileSync(path,'utf8')+' ');
  assert.notEqual(f.check().status,0);
 } finally {rmSync(f.root,{recursive:true,force:true});}
});
