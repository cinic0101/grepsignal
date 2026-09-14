import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { validateCoverage } from '../scripts/coverage-contract.mjs';

const current=JSON.parse(readFileSync(new URL('../src/data/coverage.json',import.meta.url),'utf8'));

test('current public coverage validates',()=>assert.equal(validateCoverage(current).schema_version,2));
test('historical review completion stays unknown, not zero',()=>assert.equal(validateCoverage(current).sources[0].reviewed_count,null));
for (const [name,change] of [
 ['private timing field',d=>{d.timings=[];}],
 ['private disposition field',d=>{d.sources[0].dispositions={no_signal:1};}],
 ['private materialization field',d=>{d.sources[0].materialized=1;}],
 ['negative intake',d=>{d.sources[0].intake_count=-1;}],
 ['review exceeds intake',d=>{d.coverage_status='partial';d.sources[0].reviewed_count=61;}],
 ['false reviewed status',d=>{d.coverage_status='reviewed';d.sources[0].reviewed_count=60;d.sources[1].reviewed_count=29;}],
 ['backfilled historical zero',d=>{d.sources[0].reviewed_count=0;}],
 ['duplicate sources',d=>{d.sources.push(structuredClone(d.sources[0]));}],
 ['invalid timestamp',d=>{d.generated_at='today';}],
 ['HTML in labels',d=>{d.sources[0].name='<img src=x>'; }],
]) test(name,()=>{const d=structuredClone(current);change(d);assert.throws(()=>validateCoverage(d));});

test('partial accepts recorded but incomplete review',()=>{
  const d=structuredClone(current);
  d.coverage_status='partial';
  d.sources[0].reviewed_count=12;
  d.sources[1].reviewed_count=3;
  assert.equal(validateCoverage(d).coverage_status,'partial');
});

test('reviewed requires every configured intake item reviewed',()=>{
  const d=structuredClone(current);
  d.coverage_status='reviewed';
  for (const source of d.sources) source.reviewed_count=source.intake_count;
  assert.equal(validateCoverage(d).coverage_status,'reviewed');
});
