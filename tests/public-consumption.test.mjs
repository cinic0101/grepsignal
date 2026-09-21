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
