import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('Local AI is surfaced through contextual interactions only', () => {
  const layout = read('src/layouts/BaseLayout.astro');
  const signal = read('src/pages/signals/[id].astro');
  const thread = read('src/pages/threads/[id].astro');

  assert.match(layout, /SelectionExplain/);
  assert.doesNotMatch(signal, /LocalExplain/);
  assert.match(thread, /LocalThreadSinceVisit/);
  assert.doesNotMatch(thread, /LocalThreadExplain/);
});

test('Local AI runtime exposes bounded selection and thread-delta tasks', () => {
  const runtime = read('src/scripts/local-ai.ts');
  const since = read('src/components/LocalThreadSinceVisit.astro');
  const selection = read('src/components/SelectionExplain.astro');

  assert.match(runtime, /selection_explain/);
  assert.match(runtime, /thread_since_visit/);
  assert.match(runtime, /Use only the supplied approved intelligence/);
  assert.match(since, /grepsignal\.thread-last-visit\.v1/);
  assert.match(since, /new_updates/);
  assert.match(selection, /selected_text/);
  assert.match(selection, /short surrounding passage/);
});
