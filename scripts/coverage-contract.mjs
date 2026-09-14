/** Aggregate-only public boundary; null is unknown, never zero. */
export const countKeys = ['observed', 'eligible', 'selected', 'not_selected', 'triaged', 'pending', 'source_read', 'materialized'];
export const dispositions = ['no_signal', 'watch', 'research', 'duplicate_event', 'out_of_scope', 'defer'];
const rootKeys = ['schema_version','cycle_id','coverage_status','generated_at','sources','totals','timings','closed_at','recorded_window_seconds','end_to_end_seconds','note'];
const sourceKeys = ['source_id','name','scope','observed_at','collection_status',...countKeys,'dispositions','gaps'];
function expect(ok, message) { if (!ok) throw new Error(`Coverage: ${message}`); }
function object(value, keys) {
  expect(value && typeof value === 'object' && !Array.isArray(value), 'expected object');
  expect(Object.keys(value).every(k => keys.includes(k)) && keys.every(k => Object.hasOwn(value,k)), 'unknown or missing field');
}
function text(value) { expect(typeof value === 'string' && value.trim().length > 0 && value.length <= 2000 && !/[<>]/.test(value), 'invalid text'); }
function date(value, nullable=false) {
  if (nullable && value === null) return;
  expect(typeof value === 'string' && /T.*(?:Z|[+-]\d\d:\d\d)$/.test(value) && Number.isFinite(Date.parse(value)), 'invalid timestamp');
}
function count(value, allowNull) { expect((allowNull && value === null) || (Number.isSafeInteger(value) && value >= 0), 'invalid counter'); }
const known = (...values) => values.every(v => v !== null);
export function validateCoverage(data) {
  object(data, rootKeys);
  expect(data.schema_version === 1, 'unsupported schema');
  text(data.cycle_id); text(data.note); date(data.generated_at); date(data.closed_at, true);
  expect(['not_recorded','partial','complete_for_selected_window'].includes(data.coverage_status), 'invalid coverage status');
  const historical = data.coverage_status === 'not_recorded';
  expect(Array.isArray(data.sources) && data.sources.length > 0, 'sources required');
  expect(new Set(data.sources.map(s => s.source_id)).size === data.sources.length, 'duplicate source IDs');
  for (const row of data.sources) {
    object(row, sourceKeys);
    text(row.source_id); text(row.name); text(row.scope); date(row.observed_at, true);
    expect(['available','partial','unavailable'].includes(row.collection_status), 'invalid collection status');
    expect(Array.isArray(row.gaps), 'gaps must be an array'); row.gaps.forEach(text);
    if (row.collection_status !== 'available') expect(row.gaps.length > 0, 'collection gap must be explained');
    countKeys.forEach(k => count(row[k], historical));
    if (known(row.observed,row.eligible)) expect(row.observed >= row.eligible, 'eligible exceeds observed');
    if (known(row.eligible,row.selected)) expect(row.eligible >= row.selected, 'selected exceeds eligible');
    if (known(row.eligible,row.selected,row.not_selected)) expect(row.eligible-row.selected === row.not_selected, 'not_selected mismatch');
    if (known(row.selected,row.triaged,row.pending)) expect(row.triaged+row.pending === row.selected, 'triage denominator mismatch');
    if (known(row.triaged,row.source_read)) expect(row.source_read <= row.triaged, 'reading exceeds triage');
    if (known(row.materialized,row.selected)) expect(row.materialized <= row.selected, 'materialization exceeds selection');
    object(row.dispositions, dispositions);
    dispositions.forEach(k => count(row.dispositions[k], historical));
    const ds=Object.values(row.dispositions);
    if (known(row.triaged,...ds)) expect(ds.reduce((a,b)=>a+b,0) === row.triaged, 'disposition sum mismatch');
    if (historical) expect(row.triaged === null && row.pending === null && row.source_read === null && ds.every(v=>v===null), 'unrecorded review cannot be backfilled');
  }
  object(data.totals, countKeys);
  for (const key of countKeys) {
    count(data.totals[key],historical);
    const values=data.sources.map(s=>s[key]);
    const total=values.includes(null) ? null : values.reduce((a,b)=>a+b,0);
    expect(data.totals[key] === total, 'total mismatch');
  }
  if (data.coverage_status === 'complete_for_selected_window') {
    expect(data.totals.pending === 0 && data.sources.every(s=>s.collection_status === 'available' && s.gaps.length === 0), 'false complete coverage');
  }
  expect(Array.isArray(data.timings), 'timings must be an array');
  const timingKeys=new Set();
  for (const t of data.timings) {
    object(t,['stage','attempt','status','seconds']);
    expect(['collection','triage','research','validation','human_wait','deployment'].includes(t.stage),'unknown stage');
    expect(Number.isSafeInteger(t.attempt) && t.attempt>0,'invalid attempt');
    expect(['finish','fail','running'].includes(t.status),'invalid stage status');
    expect(t.status==='running' ? t.seconds===null : typeof t.seconds==='number' && Number.isFinite(t.seconds) && t.seconds>=0,'invalid timing');
    const key=`${t.stage}:${t.attempt}`; expect(!timingKeys.has(key),'duplicate stage attempt'); timingKeys.add(key);
  }
  expect(data.recorded_window_seconds === null || (data.closed_at !== null && Number.isFinite(data.recorded_window_seconds) && data.recorded_window_seconds >= 0), 'invalid recorded window');
  expect(data.end_to_end_seconds === null,'end-to-end duration needs a deployment-receipt contract; not supported yet');
  return data;
}
