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


test('detail pages consume the canonical derived relation projection',()=>{
  const signal=read('src/pages/signals/[id].astro');
  const thread=read('src/pages/threads/[id].astro');
  assert.ok(signal.includes('signal.thread_ids.includes(thread.id)'));
  assert.ok(thread.includes('thread.signal_relations.supporting'));
  assert.ok(thread.includes('thread.signal_relations.contradicting'));
  assert.ok(!signal.includes("data/thread-links"));
  assert.ok(!thread.includes("data/thread-links"));
});

test('record alerts stay above content while full history stays after canonical detail',()=>{
  const layout=read('src/layouts/BaseLayout.astro');
  assert.ok(layout.includes('RecordAlert'));
  assert.ok(!layout.includes('RecordHistory'));
  const history=read('src/components/RecordHistory.astro');
  assert.ok(!history.includes('First observed: '));
  assert.ok(history.includes('Unrecorded timestamps are omitted rather than inferred'));
  for (const path of ['signals','threads','predictions']) {
    const page=read('src/pages/'+path+'/[id].astro');
    assert.ok(page.includes('<RecordHistory />'));
    assert.ok(page.indexOf('<RecordHistory />') > page.indexOf('</main>'));
  }
});

test('canonical analysis precedes optional Local AI reading aids',()=>{
  const signal=read('src/pages/signals/[id].astro');
  assert.ok(signal.indexOf('<LocalExplain signal={signal} />') > signal.indexOf('aria-label="Review notes"'));
  const thread=read('src/pages/threads/[id].astro');
  assert.ok(thread.indexOf('<LocalThreadExplain thread={thread} />') > thread.indexOf('class="detail-section history-section"'));
  for (const path of ['src/components/LocalExplain.astro','src/components/LocalThreadExplain.astro']) {
    const component=read(path);
    assert.ok(component.includes('<details class="local-ai-shell">'));
    assert.ok(component.includes('typically hundreds of MB'));
  }
});

test('Signal archive exposes only filter values present in current records',()=>{
  const archive=read('src/pages/signals/index.astro');
  assert.ok(archive.includes('statusOptions.map'));
  assert.ok(archive.includes('signals.some((signal) => signal.type === value)'));
  assert.ok(archive.includes('Array.from(statusSelect.options)'));
  assert.ok(!archive.includes('<option value="stable">Stable</option>'));
});

test('editorial style advisory is explicit and non-blocking',()=>{
  const pkg=JSON.parse(read('package.json'));
  assert.equal(pkg.scripts['editorial:lint'],'node scripts/editorial-lint.mjs');
  assert.ok(pkg.scripts.build.startsWith('node scripts/editorial-lint.mjs &&'));
  const lint=read('scripts/editorial-lint.mjs');
  assert.ok(lint.includes('process.exitCode = 0'));
  assert.ok(lint.includes('LONG_SENTENCE_WORDS = 30'));
  assert.ok(read('docs/editorial-style.md').includes('not a truth oracle or publication gate'));
});

test('Predictions navigation is hidden until there is a public ledger entry',()=>{
  const layout=read('src/layouts/BaseLayout.astro');
  assert.ok(layout.includes('const showPredictions = intelligence.predictions.some((prediction) => prediction.first_public_at !== null)'));
  assert.ok(layout.includes('showPredictions && <a href'));
});


test('human reading guide is discoverable and indexed',()=>{
  const layout=read('src/layouts/BaseLayout.astro');
  const sitemap=read('src/pages/sitemap.xml.ts');
  const guide=read('src/pages/read/index.astro');
  assert.ok(layout.includes('How to read'));
  assert.ok(sitemap.includes("absoluteUrl('read/')"));
  assert.ok(guide.includes('How to read GrepSignal.'));
  assert.ok(guide.includes('Strengthening is not a confidence score.'));
});

test('human pages format timestamps while preserving machine datetime values',()=>{
  const history=read('src/components/RecordHistory.astro');
  const changes=read('src/pages/changes/index.astro');
  const prediction=read('src/pages/predictions/[id].astro');
  for (const file of [history,changes,prediction]) {
    assert.ok(file.includes('Intl.DateTimeFormat'));
    assert.ok(file.includes('datetime='));
  }
  assert.ok(history.includes('title={value}'));
  assert.ok(changes.includes('title={event.recorded_at}'));
  assert.ok(prediction.includes('title={prediction.deadline}'));
});

test('published Signal detail does not repeat the long publication notice',()=>{
  const signal=read('src/pages/signals/[id].astro');
  assert.ok(signal.includes('{!isPublished && ('));
  assert.ok(!signal.includes("isPublished ? 'LIVE INTELLIGENCE'"));
});

test('share metadata has a default preview image',()=>{
  const layout=read('src/layouts/BaseLayout.astro');
  assert.ok(layout.includes('property="og:image"'));
  assert.ok(layout.includes('name="twitter:image"'));
  assert.ok(layout.includes('how-grepsignal-works.webp'));
});

test('usage form distinguishes consumer type and record IDs',()=>{
  const usage=read('.github/ISSUE_TEMPLATE/usage.yml');
  assert.ok(usage.includes('id: consumer_type'));
  assert.ok(usage.includes('AI agent / automated workflow'));
  assert.ok(usage.includes('id: record_ids_used'));
});

test('roadmap scope matches the current technical-builder positioning',()=>{
  const roadmap=read('docs/roadmap.md');
  assert.ok(roadmap.includes('AI models, agents, tooling, and infrastructure'));
  assert.ok(!roadmap.includes('Initial scope: agent infrastructure and technical adoption.'));
});

test('public schemas document evidence lineage and structured proposal provenance',()=>{
  const intelligence=JSON.parse(read('public/schema/intelligence.schema.json'));
  const history=JSON.parse(read('public/schema/history.schema.json'));
  assert.ok(intelligence.properties.signals.items.properties.sources.items.properties.lineage_id);
  assert.ok(intelligence.properties.threads.items.properties.updates.items.properties.sources.items.properties.lineage_id);
  assert.ok(history.properties.events.items.properties.proposal);
  assert.ok(history.properties.events.items.properties.evidence.items.properties.lineage_id);
});

