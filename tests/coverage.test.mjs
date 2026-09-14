import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { validateCoverage } from '../scripts/coverage-contract.mjs';
const historical=JSON.parse(readFileSync(new URL('../src/data/coverage.json',import.meta.url),'utf8'));
const live=JSON.parse(readFileSync(new URL('./fixtures/live-coverage.json',import.meta.url),'utf8'));
test('historical counts stay unknown, not zero',()=>assert.equal(validateCoverage(historical).totals.triaged,null));
test('actual engine aggregate output is compatible',()=>assert.equal(validateCoverage(live).totals.triaged,0));
for (const [name,change] of [
 ['private field',d=>{d.sources[0].reason='private reasoning';}],
 ['inconsistent totals',d=>{d.totals.selected++;}],
 ['negative counter',d=>{d.sources[0].observed=-1;}],
 ['false full coverage',d=>{d.coverage_status='complete_for_selected_window';}],
 ['wrong disposition sum',d=>{d.sources[0].dispositions.research++;}],
 ['read exceeds triage',d=>{d.sources[0].source_read=1;}],
 ['null in audited cycle',d=>{d.sources[0].triaged=null;}],
 ['duplicate sources',d=>{d.sources.push(d.sources[0]);}],
 ['negative time',d=>{d.timings[0].seconds=-1;}],
 ['end-to-end without receipt',d=>{d.end_to_end_seconds=99;}],
 ['invalid timestamp',d=>{d.generated_at='today';}],
 ['HTML in labels',d=>{d.sources[0].name='<img src=x>'; }],
]) test(name,()=>{const d=structuredClone(live);change(d);assert.throws(()=>validateCoverage(d));});
test('old review cannot be silently backfilled',()=>{const d=structuredClone(historical);d.sources[0].triaged=60;assert.throws(()=>validateCoverage(d));});
test('a real zero-input window can be complete',()=>{const d=structuredClone(live);for(const s of d.sources){for(const k of Object.keys(d.totals))s[k]=0;for(const k of Object.keys(s.dispositions))s.dispositions[k]=0;}for(const k of Object.keys(d.totals))d.totals[k]=0;d.coverage_status='complete_for_selected_window';assert.equal(validateCoverage(d).totals.selected,0);});
