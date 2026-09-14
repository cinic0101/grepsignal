import { readFile } from 'node:fs/promises';

const path = new URL('../src/data/intelligence.json', import.meta.url);
const data = JSON.parse(await readFile(path, 'utf8'));

const fail = (message) => {
  console.error(`public-data validation failed: ${message}`);
  process.exit(1);
};
const nonEmpty = (value) => typeof value === 'string' && value.trim().length > 0;

if (data.schema_version !== 1) fail('schema_version must be 1');
if (!['preview_sample', 'published'].includes(data.publication_status)) fail('invalid publication_status');
if (data.canonical_language !== 'en') fail('canonical_language must be en');
if (!Array.isArray(data.signals) || !Array.isArray(data.threads) || !Array.isArray(data.predictions)) {
  fail('signals, threads and predictions must be arrays');
}
if (!data.stats || data.stats.material_signals !== data.signals.length ||
    data.stats.active_threads !== data.threads.length ||
    data.stats.open_predictions !== data.predictions.length) {
  fail('stats must exactly match published arrays');
}

const forbiddenKeys = new Set([
  'raw_html', 'raw_text', 'source_text', 'source_body', 'cache_file',
  'image_url', 'image_bytes', 'screenshot', 'prompt', 'private_notes', 'secret'
]);
function walk(value, trail = '$') {
  if (Array.isArray(value)) {
    value.forEach((item, index) => walk(item, `${trail}[${index}]`));
    return;
  }
  if (!value || typeof value !== 'object') return;
  for (const [key, child] of Object.entries(value)) {
    if (forbiddenKeys.has(key)) fail(`forbidden field ${trail}.${key}`);
    walk(child, `${trail}.${key}`);
  }
}
walk(data);

const allRecords = [...data.signals, ...data.threads, ...data.predictions];
if (data.publication_status === 'preview_sample' && allRecords.some((item) => item.sample !== true)) {
  fail('every preview record must be explicitly marked sample=true');
}
if (data.publication_status === 'published' && allRecords.some((item) => item.sample === true)) {
  fail('published output must not contain preview sample records');
}

const ids = allRecords.map((item) => item.id);
if (new Set(ids).size !== ids.length) fail('public IDs must be unique across records');

if (data.publication_status === 'published') {
  for (const signal of data.signals) {
    for (const key of ['id', 'type', 'status', 'title', 'summary', 'why_it_matters',
      'second_order_effect', 'watch_next', 'registered_at', 'evidence_since']) {
      if (!nonEmpty(signal[key])) fail(`published signal ${signal.id ?? '<unknown>'} missing ${key}`);
    }
    if (!Array.isArray(signal.sources) || signal.sources.length === 0) {
      fail(`published signal ${signal.id} needs linked evidence`);
    }
    if (signal.source_count !== signal.sources.length) {
      fail(`published signal ${signal.id} source_count mismatch`);
    }
    const publishers = new Set();
    for (const source of signal.sources) {
      if (![source.publisher, source.title, source.role, source.url].every(nonEmpty)) {
        fail(`published signal ${signal.id} has incomplete source metadata`);
      }
      let url;
      try { url = new URL(source.url); } catch { fail(`invalid source URL in ${signal.id}`); }
      if (url.protocol !== 'https:' || url.username || url.password) {
        fail(`source URL must be credential-free HTTPS in ${signal.id}`);
      }
      publishers.add(source.publisher);
    }
    if (signal.source_organization_count !== publishers.size) {
      fail(`published signal ${signal.id} source_organization_count mismatch`);
    }
    if (!Array.isArray(signal.falsifiers) || signal.falsifiers.length === 0 ||
        !signal.falsifiers.every(nonEmpty)) {
      fail(`published signal ${signal.id} needs falsifiers`);
    }
    if (!Array.isArray(signal.limitations) || signal.limitations.length === 0 ||
        !signal.limitations.every(nonEmpty)) {
      fail(`published signal ${signal.id} needs limitations`);
    }
  }
}

console.log(`public-data validation passed (${data.publication_status}, ${data.signals.length} signals)`);
