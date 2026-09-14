/** Small public research-coverage boundary. Detailed ledger/timing stays private. */
const rootKeys = ['schema_version','cycle_id','coverage_status','generated_at','sources','primary_sources_consulted','published_signals','note'];
const sourceKeys = ['source_id','name','scope','intake_count','reviewed_count'];
function expect(ok, message) { if (!ok) throw new Error(`Coverage: ${message}`); }
function object(value, keys) {
  expect(value && typeof value === 'object' && !Array.isArray(value), 'expected object');
  expect(Object.keys(value).every(k => keys.includes(k)) && keys.every(k => Object.hasOwn(value,k)), 'unknown or missing field');
}
function text(value) { expect(typeof value === 'string' && value.trim().length > 0 && value.length <= 2000 && !/[<>]/.test(value), 'invalid text'); }
function date(value) { expect(typeof value === 'string' && /T.*(?:Z|[+-]\d\d:\d\d)$/.test(value) && Number.isFinite(Date.parse(value)), 'invalid timestamp'); }
function count(value, nullable=false) { expect((nullable && value === null) || (Number.isSafeInteger(value) && value >= 0), 'invalid counter'); }

export function validateCoverage(data) {
  object(data, rootKeys);
  expect(data.schema_version === 2, 'unsupported schema');
  text(data.cycle_id); text(data.note); date(data.generated_at);
  expect(['not_recorded','partial','reviewed'].includes(data.coverage_status), 'invalid coverage status');
  count(data.primary_sources_consulted); count(data.published_signals);
  expect(Array.isArray(data.sources) && data.sources.length > 0, 'sources required');
  expect(new Set(data.sources.map(s => s.source_id)).size === data.sources.length, 'duplicate source IDs');
  for (const row of data.sources) {
    object(row, sourceKeys);
    text(row.source_id); text(row.name); text(row.scope);
    count(row.intake_count); count(row.reviewed_count, true);
    if (row.reviewed_count !== null) expect(row.reviewed_count <= row.intake_count, 'reviewed exceeds intake');
  }
  const reviews = data.sources.map(s => s.reviewed_count);
  if (data.coverage_status === 'not_recorded') {
    expect(reviews.every(v => v === null), 'not_recorded cannot imply completed review counts');
  }
  if (data.coverage_status === 'reviewed') {
    expect(reviews.every((v,i) => v !== null && v === data.sources[i].intake_count), 'false reviewed coverage');
  }
  if (data.coverage_status === 'partial') {
    expect(reviews.some(v => v !== null), 'partial requires at least one recorded review count');
    expect(!reviews.every((v,i) => v !== null && v === data.sources[i].intake_count), 'fully reviewed data cannot be partial');
  }
  return data;
}
