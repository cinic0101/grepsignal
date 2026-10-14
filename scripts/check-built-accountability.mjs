import {readFileSync} from 'node:fs';
import {strict as assert} from 'node:assert';
import {reviewContext} from '../src/data/review-context.mjs';
const data=JSON.parse(readFileSync('dist/data/intelligence.json','utf8'));
const feed=JSON.parse(readFileSync('dist/data/changes.json','utf8'));
const history=JSON.parse(readFileSync('dist/data/history.json','utf8'));
assert.equal(data.schema_version,2);
assert.equal(feed.events.length,history.events.length);
assert.equal(data.accountability.latest_sequence,history.events.length);
if (!history.events.length) {
  assert.equal(data.signals.length,6,'migration must preserve six Signals');
  assert.equal(data.threads.length,5,'migration must preserve five Threads');
  assert.equal(data.predictions.length,0,'migration must not invent forecasts');
}
const base=process.env.PUBLIC_BASE_PATH || '/';
for (const path of ['index.html','agents/index.html','changes/index.html','editorial/index.html']) {
  const html=readFileSync(`dist/${path}`,'utf8');
  assert.ok(html.includes(`${base}atom.xml`),`${path}: Atom discovery missing`);
  assert.ok(html.includes('Evidence') || html.includes('evidence'));
}
assert.ok(readFileSync('dist/atom.xml','utf8').includes('http://www.w3.org/2005/Atom'));
console.log('Built A/B/C endpoints, migration invariants and base-path discovery passed.');
// Validate rendered reader warnings against the same accepted projection. This
// runs for both root and GitHub Pages builds in CI, without a browser or JS.
const escape = value => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
for (const kind of ['signals','threads','predictions']) for (const record of data[kind]) {
  const html=readFileSync(`dist/${kind}/${record.id}/index.html`,'utf8');
  const context=reviewContext(record,feed.events);
  assert.equal(html.includes('id="review-context-title"'),context.pending,`${record.id}: review warning visibility`);
  if (context.pending) {
    assert.ok(html.includes(context.title),`${record.id}: reader-facing status`);
    assert.ok(html.includes('<summary') && html.includes('Review context and dates'),`${record.id}: native disclosure`);
    if (context.overdue) {
      assert.ok(html.includes('Overdue since'),`${record.id}: visible overdue status`);
      assert.ok(html.includes(`datetime="${record.review_due_since}"`),`${record.id}: preserved overdue origin`);
    }
    if (record.next_review_at) assert.ok(html.includes(`datetime="${record.next_review_at}"`),`${record.id}: planned check`);
    if (context.review) {
      assert.ok(html.includes(escape(context.review.note)),`${record.id}: accepted rationale, unmodified`);
      assert.ok(html.includes(`href="${base}changes/#${context.review.id}"`),`${record.id}: review evidence link respects base path`);
    } else {
      assert.ok(html.includes('href="#record-history"') && html.includes('id="record-history"'),`${record.id}: history fallback`);
    }
  }
  if (record.lifecycle !== 'active') assert.ok(html.includes(record.lifecycle.toUpperCase()),`${record.id}: lifecycle warning`);
  if (record.status === 'falsified') assert.ok(html.includes('THESIS FALSIFIED.'),`${record.id}: falsification warning`);
  if (kind === 'threads') assert.ok(html.includes('not a confidence score or a completed review'),`${record.id}: direction is not confidence`);
}
console.log('Rendered review warnings, accepted rationale, dates and base-path links passed.');
