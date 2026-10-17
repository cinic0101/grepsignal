import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';

const note=`XBOW's "quoted" costs < expected > baseline & literal &amp;.\nSecond line.`;
const escaped='XBOW&#39;s &quot;quoted&quot; costs &lt; expected &gt; baseline &amp; literal &amp;amp;.\nSecond line.';
function fixture(t) {
  const root=mkdtempSync(join(tmpdir(),'gs-built-accountability-'));
  t.after(()=>rmSync(root,{recursive:true,force:true}));
  const write=(path,value)=>{
    const target=join(root,'dist',path);
    mkdirSync(dirname(target),{recursive:true});writeFileSync(target,value);
  };
  const record={id:'signal-test-rationale',lifecycle:'active',review_required:true,
    last_reviewed_at:'2026-10-17T01:00:00Z',last_review_outcome:'inconclusive'};
  const review={id:'evt-test-rationale',record_id:record.id,kind:'review',recorded_at:record.last_reviewed_at,note};
  write('data/intelligence.json',JSON.stringify({schema_version:2,accountability:{latest_sequence:1},
    signals:[record],threads:[],predictions:[]}));
  for(const path of ['data/changes.json','data/history.json']) write(path,JSON.stringify({events:[review]}));
  for(const path of ['index.html','agents/index.html','changes/index.html','editorial/index.html'])
    write(path,'<a href="/atom.xml">Evidence</a>');
  write('atom.xml','<feed xmlns="http://www.w3.org/2005/Atom"/>');
  return rationale=>{
    write(`signals/${record.id}/index.html`,`<h2 id="review-context-title">Last review inconclusive</h2>
      <details><summary>Review context and dates</summary><p>${rationale}</p>
      <a href="/changes/#${review.id}">Review evidence</a></details>`);
    return spawnSync(process.execPath,[fileURLToPath(new URL('../scripts/check-built-accountability.mjs',import.meta.url))],
      {cwd:root,encoding:'utf8',env:{...process.env,PUBLIC_BASE_PATH:'/'}});
  };
}
test('built accountability accepts the exact Astro-escaped rationale, including both quotes',t=>{
  const result=fixture(t)(escaped);
  assert.equal(result.status,0,result.stderr);
  assert.match(result.stdout,/Rendered review warnings, accepted rationale, dates and base-path links passed/);
});
test('built accountability still rejects modified or incorrectly encoded rationale',t=>{
  const check=fixture(t);
  for(const rationale of [
    escaped.replace('costs','savings'),escaped.replace('\nSecond line.',''),
    escaped.replace('&#39;',"'"),escaped.replaceAll('&quot;','"'),
    escaped.replace('&amp; literal','& literal'),escaped.replace('&lt;','<'),escaped.replace('&gt;','>'),
    escaped.replace('&#39;','&amp;#39;'),escaped.replace('&amp;amp;','&amp;'),
  ]) {
    const result=check(rationale);
    assert.notEqual(result.status,0,rationale);
    assert.match(result.stderr,/signal-test-rationale: accepted rationale, unmodified/);
  }
});
