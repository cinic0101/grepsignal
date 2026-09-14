import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { validateCoverage } from '../scripts/coverage-contract.mjs';

const current=JSON.parse(readFileSync(new URL('../src/data/coverage.json',import.meta.url),'utf8'));
const historical={
  schema_version:2,
  cycle_id:'historical-unrecorded-fixture',
  coverage_status:'not_recorded',
  generated_at:'2026-09-14T07:15:00Z',
  sources:[
    {source_id:'hacker-news',name:'Hacker News',scope:'Top 60 discovery intake',intake_count:60,reviewed_count:null},
    {source_id:'simon-willison',name:'Simon Willison',scope:'30 feed items observed',intake_count:30,reviewed_count:null},
  ],
  primary_sources_consulted:8,
  published_signals:1,
  note:'Historical fixture with intentionally unknown review completion.',
};

test('current public coverage validates',()=>assert.equal(validateCoverage(current).schema_version,2));
test('historical review completion stays unknown, not zero',()=>assert.equal(validateCoverage(historical).sources[0].reviewed_count,null));
for (const [name,change] of [
 ['private timing field',d=>{d.timings=[];}],
 ['private disposition field',d=>{d.sources[0].dispositions={no_signal:1};}],
 ['private materialization field',d=>{d.sources[0].materialized=1;}],
 ['negative intake',d=>{d.sources[0].intake_count=-1;}],
 ['review exceeds intake',d=>{d.coverage_status='partial';d.sources[0].reviewed_count=d.sources[0].intake_count+1;}],
 ['false reviewed status',d=>{d.coverage_status='reviewed';for(const source of d.sources) source.reviewed_count=source.intake_count;d.sources[0].reviewed_count-=1;}],
 ['duplicate sources',d=>{d.sources.push(structuredClone(d.sources[0]));}],
 ['invalid timestamp',d=>{d.generated_at='today';}],
 ['HTML in labels',d=>{d.sources[0].name='<img src=x>'; }],
]) test(name,()=>{const d=structuredClone(current);change(d);assert.throws(()=>validateCoverage(d));});

test('backfilled historical zero is rejected',()=>{
  const d=structuredClone(historical);
  d.sources[0].reviewed_count=0;
  assert.throws(()=>validateCoverage(d));
});

test('partial accepts recorded but incomplete review',()=>{
  const d=structuredClone(current);
  d.coverage_status='partial';
  d.sources[0].reviewed_count=Math.min(12,d.sources[0].intake_count);
  d.sources[1].reviewed_count=Math.min(3,d.sources[1].intake_count);
  assert.equal(validateCoverage(d).coverage_status,'partial');
});

test('reviewed requires every configured intake item reviewed',()=>{
  const d=structuredClone(current);
  d.coverage_status='reviewed';
  for (const source of d.sources) source.reviewed_count=source.intake_count;
  assert.equal(validateCoverage(d).coverage_status,'reviewed');
});
