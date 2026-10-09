import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { load } from '../scripts/accountability.mjs';

const schema = JSON.parse(readFileSync(new URL('../public/schema/intelligence.schema.json', import.meta.url), 'utf8'));
const period = schema.properties.signals.items.properties.evidence_since;
// Exercise the actual schema patterns, not a separate date-normalizing implementation.
const accepts = value => typeof value === 'string' && period.anyOf.some(branch => value.length >= branch.minLength && value.length <= branch.maxLength && new RegExp(branch.pattern).test(value));

test('Signal evidence period schema preserves valid month and day precision', () => {
  assert.equal(period.type, 'string');
  assert.equal(period.anyOf.length, 2);
  assert.equal(period.anyOf[1].format, 'date');
  assert.deepEqual(period.anyOf.map(branch => [branch.minLength, branch.maxLength]), [[7, 7], [10, 10]]);
  for (const value of ['2026-01', '2026-12', '2026-10-06', '2026-10-07', '2026-10-02', '2026-01-31', '2026-04-30', '2026-02-28', '2024-02-29', '2000-02-29', '2400-02-29', '0096-02-29']) {
    assert.equal(accepts(value), true, value);
  }
});

test('Signal evidence period schema rejects invalid months, days and leap dates', () => {
  const LF = String.fromCharCode(10);
  const CRLF = String.fromCharCode(13, 10);
  for (const value of ['2026-00', '2026-13', '2026-1', '2026-00-10', '2026-13-10', '2026-01-00', '2026-01-32', '2026-04-31', '2026-02-29', '1900-02-29', '2100-02-29', '2024-02-30', '0000-01', '0000-01-01', '0000-02-29', '2026-10-6', '26-10-06', '2026-10-06T00:00:00Z', ' 2026-10-06', '2026-10-06 ', '2026-10' + LF, '2026-10' + CRLF, '2026-10-06' + LF, '2026-10-06' + CRLF, '', null, 20261006]) {
    assert.equal(accepts(value), false, String(value));
  }
});

test('all projected Signals retain their original evidence periods without normalization', () => {
  const { data } = load();
  for (const signal of data.signals) assert.equal(accepts(signal.evidence_since), true, signal.id);
  const expected = new Map([
    ['sig-haiku-55-tiered-pricing-migration-2026-10-07', '2026-10-07'],
    ['sig-gpt6-intelligent-ui-chat-rollout-2026-10-07', '2026-10-07'],
    ['sig-whistle-local-speech-tool-path-2026-10-09', '2026-10-02'],
    ['sig-osc7501-terminal-agent-status-2026-10-09', '2026-10-06'],
  ]);
  for (const [id, value] of expected) assert.equal(data.signals.find(signal => signal.id === id)?.evidence_since, value, id);
});
