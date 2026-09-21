import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('active Thread listing excludes withdrawn/replaced records',()=>{
  assert.ok(read('src/pages/threads/index.astro').includes("intelligence.threads.filter(x => x.lifecycle === 'active')"));
});
test('public metadata never substitutes registration for verified publication',()=>{
  const s=read('src/pages/signals/[id].astro');
  assert.ok(s.includes('datePublished: signal.first_public_at'));
  assert.ok(!s.includes('datePublished: signal.registered_at'));
  assert.ok(!s.includes('publishedAt={signal.registered_at}'));
});
test('withdrawn or invalidated context cannot silently use Local Explain',()=>{
  for (const [path,record] of [['signals','signal'],['threads','thread']]) {
    const s=read(`src/pages/${path}/[id].astro`);
    assert.ok(s.includes(`${record}.lifecycle === 'active' && ${record}.status !== 'falsified' && !${record}.review_required`));
  }
});
test('same-day Thread events prefer the latest appended revision',()=>{
  assert.ok(read('src/pages/threads/[id].astro').includes('[...thread.updates].reverse()'));
});


test('homepage search snippet uses the product definition and excludes operational coverage copy',()=>{
  const home=read('src/pages/index.astro');
  const coverage=read('src/components/CoveragePanel.astro');
  assert.ok(home.includes('const homepageDescription ='));
  assert.ok(home.includes('<BaseLayout description={homepageDescription}>'));
  assert.ok(home.includes('<p>{homepageDescription}</p>'));
  assert.ok(coverage.includes('data-nosnippet'));
});


test('agent discovery advertises llms and record-specific JSON',()=>{
  const layout=read('src/layouts/BaseLayout.astro');
  assert.ok(layout.includes('rel="describedby"'));
  assert.ok(layout.includes('jsonAlternateHref'));
  const llms=read('public/llms.txt');
  assert.ok(llms.includes('/grepsignal/data/signals/{signal_id}.json'));
  assert.ok(llms.includes('/grepsignal/data/threads/{thread_id}.json'));
  assert.ok(read('src/pages/data/signals/[id].json.ts').includes("record_type: 'signal'"));
  assert.ok(read('src/pages/data/threads/[id].json.ts').includes("record_type: 'thread'"));
  assert.ok(read('src/pages/data/predictions/[id].json.ts').includes("record_type: 'prediction'"));
});

test('detail pages point agents at the matching record resource',()=>{
  const signal=read('src/pages/signals/[id].astro');
  const thread=read('src/pages/threads/[id].astro');
  const prediction=read('src/pages/predictions/[id].astro');
  assert.ok(signal.includes('data/signals/${signal.id}.json'));
  assert.ok(thread.includes('data/threads/${thread.id}.json'));
  assert.ok(prediction.includes('data/predictions/${prediction.id}.json'));
});
