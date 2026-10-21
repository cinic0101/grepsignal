import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { formatEvidencePeriod } from '../src/data/evidence-period.mjs';

test('year-only evidence renders without fabricated month or day', () => {
  assert.equal(formatEvidencePeriod('2026'), '2026');
});

test('existing month and day evidence display is unchanged', () => {
  assert.equal(formatEvidencePeriod('2026-10'), 'Oct 2026');
  assert.equal(formatEvidencePeriod('2026-10-21'), 'Oct 2026');
});

test('homepage and Signal detail use the precision-aware formatter', () => {
  for (const path of ['src/pages/index.astro', 'src/pages/signals/[id].astro']) {
    const source = readFileSync(new URL('../' + path, import.meta.url), 'utf8');
    assert.ok(source.includes('formatEvidencePeriod('));
    assert.ok(source.includes('data/evidence-period.mjs'));
    assert.ok(!source.includes('formatMonth('));
  }
});
