import { load } from './accountability.mjs';

const { data } = load();
const LONG_SENTENCE_WORDS = 30;
const MAX_EXAMPLES = 8;
const advisories = [];

const wordCount = (text) => (String(text).match(/[\p{L}\p{N}'’-]+/gu) ?? []).length;
const sentences = (text) => String(text)
  .split(/(?<=[.!?])\s+/)
  .map((sentence) => sentence.trim())
  .filter(Boolean);

const templatePatterns = [
  { name: 'material-change-not-but', re: /\bmaterial (?:change|shift)\b[^.!?]{0,120}\bnot\b[^.!?]{0,120}\bbut\b/i },
  { name: 'x-is-becoming-y', re: /\b(?:is|are) becoming\b/i },
];

function inspectText(recordType, id, field, text) {
  if (!text) return;
  for (const sentence of sentences(text)) {
    const words = wordCount(sentence);
    if (words > LONG_SENTENCE_WORDS) {
      advisories.push({
        kind: 'long-sentence',
        recordType,
        id,
        field,
        detail: `${words} words: ${sentence.slice(0, 150)}${sentence.length > 150 ? '…' : ''}`,
      });
    }
  }
  for (const pattern of templatePatterns) {
    if (pattern.re.test(text)) {
      advisories.push({kind:'template-pattern',recordType,id,field,detail:pattern.name});
    }
  }
}

for (const signal of data.signals.filter((record) => record.lifecycle === 'active')) {
  inspectText('signal', signal.id, 'title', signal.title);
  inspectText('signal', signal.id, 'summary', signal.summary);
  inspectText('signal', signal.id, 'why_it_matters', signal.why_it_matters);
  inspectText('signal', signal.id, 'second_order_effect', signal.second_order_effect);
  inspectText('signal', signal.id, 'watch_next', signal.watch_next);

  if (sentences(signal.summary).length > 2) {
    advisories.push({
      kind:'summary-density',
      recordType:'signal',
      id:signal.id,
      field:'summary',
      detail:`${sentences(signal.summary).length} sentences; prefer 1–2 when clarity allows`,
    });
  }
}

for (const thread of data.threads.filter((record) => record.lifecycle === 'active')) {
  inspectText('thread', thread.id, 'title', thread.title);
  inspectText('thread', thread.id, 'summary', thread.summary);
  inspectText('thread', thread.id, 'thesis', thread.thesis);
  for (const update of thread.updates) inspectText('thread', thread.id, `update:${update.id}`, update.change);
}

const counts = advisories.reduce((acc, item) => {
  acc[item.kind] = (acc[item.kind] ?? 0) + 1;
  return acc;
}, {});

if (advisories.length === 0) {
  console.log('editorial style advisory: no current style smells detected');
} else {
  console.log(`editorial style advisory (non-blocking): ${advisories.length} smell(s) across published copy`);
  console.log(Object.entries(counts).map(([kind, count]) => `${kind}=${count}`).join(', '));
  for (const item of advisories.slice(0, MAX_EXAMPLES)) {
    console.log(`  - ${item.recordType} ${item.id} · ${item.field} · ${item.detail}`);
  }
  if (advisories.length > MAX_EXAMPLES) {
    console.log(`  … ${advisories.length - MAX_EXAMPLES} more; run npm run editorial:lint for the same advisory locally`);
  }
}

process.exitCode = 0;
