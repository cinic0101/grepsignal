import {readFileSync} from 'node:fs';
import {strict as assert} from 'node:assert';
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
