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
  const publishedSignalIds = new Set(data.signals.map((signal) => signal.id));
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

  for (const thread of data.threads) {
    for (const key of ['id', 'title', 'status', 'summary', 'created_at', 'last_updated', 'evidence_since']) {
      if (!nonEmpty(thread[key])) fail(`published thread ${thread.id ?? '<unknown>'} missing ${key}`);
    }
    if (!Array.isArray(thread.updates) || thread.updates.length === 0) {
      fail(`published thread ${thread.id} needs durable revision history`);
    }
    const updateIds = new Set();
    let latest = null;
    for (const update of thread.updates) {
      if (![update.id, update.date, update.assessment, update.change].every(nonEmpty)) {
        fail(`published thread ${thread.id} has incomplete revision metadata`);
      }
      if (updateIds.has(update.id)) fail(`published thread ${thread.id} repeats revision ${update.id}`);
      updateIds.add(update.id);
      if (!['emerging', 'strengthening', 'stable', 'weakening'].includes(update.assessment)) {
        fail(`published thread ${thread.id} has invalid revision assessment`);
      }
      if (!Array.isArray(update.signal_ids) || !Array.isArray(update.sources)) {
        fail(`published thread ${thread.id} revision ${update.id} needs signal_ids and sources arrays`);
      }
      if (update.signal_ids.length === 0 && update.sources.length === 0) {
        fail(`published thread ${thread.id} revision ${update.id} needs provenance`);
      }
      if (update.signal_ids.some((id) => !publishedSignalIds.has(id))) {
        fail(`published thread ${thread.id} revision ${update.id} references an unknown signal`);
      }
      for (const source of update.sources) {
        if (![source.publisher, source.title, source.role, source.url].every(nonEmpty)) {
          fail(`published thread ${thread.id} revision ${update.id} has incomplete source metadata`);
        }
        let url;
        try { url = new URL(source.url); } catch {
          fail(`invalid source URL in thread revision ${update.id}`);
        }
        if (url.protocol !== 'https:' || url.username || url.password) {
          fail(`thread revision source URL must be credential-free HTTPS in ${update.id}`);
        }
      }
      if (!latest || update.date > latest.date) latest = update;
    }
    if (latest.date !== thread.last_updated) {
      fail(`published thread ${thread.id} last_updated must match its latest revision`);
    }
    if (latest.assessment !== thread.status) {
      fail(`published thread ${thread.id} status must match its latest revision assessment`);
    }
    if (thread.analysis !== undefined) {
      if (!thread.analysis || !Array.isArray(thread.analysis.evidence_map) ||
          !Array.isArray(thread.analysis.boundaries) || !thread.analysis.view_tests) {
        fail(`published thread ${thread.id} has invalid analysis shape`);
      }
      if (thread.analysis.evidence_map.length === 0 ||
          thread.analysis.boundaries.length === 0 ||
          !Array.isArray(thread.analysis.view_tests.strengthen) ||
          !Array.isArray(thread.analysis.view_tests.weaken) ||
          thread.analysis.view_tests.strengthen.length === 0 ||
          thread.analysis.view_tests.weaken.length === 0) {
        fail(`published thread ${thread.id} analysis sections must be non-empty`);
      }
      const dimensionIds = new Set();
      for (const dimension of thread.analysis.evidence_map) {
        if (![dimension.id, dimension.title, dimension.summary].every(nonEmpty)) {
          fail(`published thread ${thread.id} has incomplete evidence dimension`);
        }
        if (dimensionIds.has(dimension.id)) {
          fail(`published thread ${thread.id} repeats evidence dimension ${dimension.id}`);
        }
        dimensionIds.add(dimension.id);
        if (!Array.isArray(dimension.signal_ids) || dimension.signal_ids.length === 0 ||
            dimension.signal_ids.some((id) => !publishedSignalIds.has(id))) {
          fail(`published thread ${thread.id} evidence dimension must reference published signals`);
        }
      }
      if (!thread.analysis.boundaries.every(nonEmpty) ||
          !thread.analysis.view_tests.strengthen.every(nonEmpty) ||
          !thread.analysis.view_tests.weaken.every(nonEmpty)) {
        fail(`published thread ${thread.id} analysis prose must be non-empty`);
      }
    }
  }
}

console.log(`public-data validation passed (${data.publication_status}, ${data.signals.length} signals, ${data.threads.length} threads)`);
