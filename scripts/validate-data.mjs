import { readFile } from 'node:fs/promises';

const path = new URL('../src/data/intelligence.json', import.meta.url);
const data = JSON.parse(await readFile(path, 'utf8'));

const fail = (message) => {
  console.error(`public-data validation failed: ${message}`);
  process.exit(1);
};

if (data.schema_version !== 1) fail('schema_version must be 1');
if (!['preview_sample', 'published'].includes(data.publication_status)) fail('invalid publication_status');
if (data.canonical_language !== 'en') fail('canonical_language must be en');
if (!Array.isArray(data.signals) || !Array.isArray(data.threads) || !Array.isArray(data.predictions)) {
  fail('signals, threads and predictions must be arrays');
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
if (new Set(ids).size !== ids.length) fail('public IDs must be unique across preview records');

console.log(`public-data validation passed (${data.publication_status}, ${data.signals.length} signals)`);
