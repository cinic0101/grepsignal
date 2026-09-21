import { load } from './accountability.mjs';
const { data: intelligence, links } = load();

const fail = (message) => {
  console.error(`thread-link validation failed: ${message}`);
  process.exit(1);
};

const signalIds = new Set(intelligence.signals.map((signal) => signal.id));
const threadIds = new Set(intelligence.threads.map((thread) => thread.id));

for (const key of Object.keys(links)) {
  if (!threadIds.has(key)) fail(`unknown thread ${key}`);
}

for (const thread of intelligence.threads) {
  const relation = links[thread.id];
  if (!relation) fail(`missing public relation for thread ${thread.id}`);
  if (!Array.isArray(relation.supporting) || !Array.isArray(relation.contradicting)) {
    fail(`thread ${thread.id} must define supporting and contradicting arrays`);
  }
  const all = [...relation.supporting, ...relation.contradicting];
  if (new Set(all).size !== all.length) fail(`thread ${thread.id} repeats a signal relation`);
  if (all.some((id) => !signalIds.has(id))) fail(`thread ${thread.id} references an unknown signal`);
  if (all.length !== thread.signal_count) {
    fail(`thread ${thread.id} signal_count ${thread.signal_count} does not match ${all.length} public relations`);
  }
  if (JSON.stringify(thread.signal_ids) !== JSON.stringify(all)) {
    fail(`thread ${thread.id} projected signal_ids diverge from canonical relations`);
  }
  if (JSON.stringify(thread.signal_relations) !== JSON.stringify(relation)) {
    fail(`thread ${thread.id} projected signal_relations diverge from canonical relations`);
  }
}

for (const signal of intelligence.signals) {
  const expected = [];
  for (const thread of intelligence.threads) {
    if (thread.signal_relations.supporting.includes(signal.id)) expected.push({thread_id:thread.id,relationship:'supporting'});
    if (thread.signal_relations.contradicting.includes(signal.id)) expected.push({thread_id:thread.id,relationship:'contradicting'});
  }
  if (JSON.stringify(signal.thread_relations) !== JSON.stringify(expected)) {
    fail(`signal ${signal.id} projected thread_relations diverge from canonical relations`);
  }
  if (JSON.stringify(signal.thread_ids) !== JSON.stringify([...new Set(expected.map(x => x.thread_id))])) {
    fail(`signal ${signal.id} projected thread_ids diverge from canonical relations`);
  }
}

console.log(`thread-link validation passed (${intelligence.threads.length} threads, bidirectional projection verified)`);
