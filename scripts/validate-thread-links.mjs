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
}

console.log(`thread-link validation passed (${intelligence.threads.length} threads)`);
