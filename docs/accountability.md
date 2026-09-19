# Accountability journal — public contract v2

The current public head is a deterministic projection of a pinned legacy snapshot and `src/data/history.json`. Existing intelligence.json and thread-links.json are immutable **baselines**, not the current head. All pages, current JSON, links and feeds share the reducer. Migration creates no real forecast, correction, source review or intelligence claim.

## Honest migration

Legacy intelligence/links remain byte-identical to commit fd1cceb64329fd94ecc50c3c18f60573979437e9. CI pins their Git blob hashes. Existing Thread revisions stay intact. Version 0 means the migration head, not absence of earlier work. Unknown first-observed/public times and human-review scope stay unknown. initialized_at is a technical migration marker; initial_thread_review_due_at is a newly assigned future due date, NOT a completed review.

## One accepted event

On a feature branch use `npm run history:append -- /path/to/accepted-event.json`. This validates/appends only, never approves, commits, merges or deploys. The event must have passed the private evidence/candidate/IP process, contain only public-safe material, and reference the actual accepting review/PR. A named actor/reference is an attestation, not cryptographic human identity or proof of reading. Inspect the exact proposed version at PR review.

Required event fields: id, record_type, record_id, expected_version, kind, recorded_at, proposed_by, acceptance (actor/scope/reference/accepted_at), note, evidence, payload. Material intelligence requires acceptance scope publication; review scope only permits non-material review bookkeeping. Times are UTC. Exact repeat is a no-op; changed payload with the same ID fails. CI compares old journal metadata and the entire event prefix against the exact base commit. Missing CI base references fail closed. Local current-state tests alone do not attest Git-history integrity.

## Event kinds

- register: a new stable Signal/Thread/Prediction. Optional known first_observed_at is not inferred from a source date. Threads include explicit signal_relations (supporting/contradicting) and initial evidence-backed update. Original IDs, registration dates and forecast terms are not patchable.
- revise: allowlisted Signal/Thread content/assessment/evidence, with change reason and sources. Thread history gets the matching update. A changed conclusion is not a generic review receipt.
- review: unchanged/inconclusive, actual counterevidence_checked, and next_review_at. An inconclusive attempt preserves its warning/due origin. Reviews do not advance the intelligence publication date.
- supersede: existing active same-type replacement, no self-reference/cycles. retract: visibly withdraw without deleting. Inactive records cannot silently revive. Dependents get a review warning, not automatic falsification.
- relate: evidence-backed supports/challenges/depends_on, with target_id and target_version. Thread-to-Signal support/challenge updates the current link map. Empty relations mean no recorded assertion, not proof of no relation.
- publication: immutable operator-attested actual first_public_at and verification_url. Forecasts must have been public before deadline; private drafts/planned deployments are not public forecasts.
- resolve: an originally publicly registered forecast after deadline, outcome true/false/unresolved; corrections name supersedes_resolution. Decisive evidence includes an originally allowed source. Original terms and every resolution remain. Binary Brier score is `(initial_probability - outcome)^2`; unresolved is unscored, never zero. A few scored events do not prove calibration.

See public/schema/history.schema.json and synthetic tests. Structure is not truth, source access permission or editorial acceptance. Fixtures stay outside the live journal.

## Separate lifecycle and judgment

Assessment: emerging/strengthening/stable/weakening/falsified. Record lifecycle: active/superseded/retracted. A disproven extrapolation does not erase an underlying event. Arrays retain inactive records for stable lookup; active counters/listings exclude them. Inspect both dimensions. Private candidate/watch/draft states are not public record lifecycle values.

## Consumers and compatibility

/data/intelligence.json now uses schema v2; historical schema v1 stays separately available. /data/history.json is the accepted journal; /data/changes.json is its complete post-migration sequence, including corrections, withdrawals and review attempts. /atom.xml and /changes/ are projections, not separately authored feeds. recorded_at is not independently verified first-publication time. Historical recovery enters the current sequence, never the past.

Store the highest processed sequence and process all larger sequences, deduplicating event IDs. Same-time events remain distinct. Source publication dates and intelligence generated_at are NOT change cursors. A smaller sequence or altered old event signals invalid rollback; investigate rather than silently continuing. Completeness applies to this journal, not all pre-migration history.

## Private/public handoff

Private Runner review receipts remain proposals. An editor adopts a public review/revision/recovery/forecast result in a separate PR, never via coverage sync. For Thread thesis revisions retain the paired private published/thread-*.json artifact so next preflight seeds the accepted head. Record actual public forecast registration back in the private operator ledger. Public/private original terms and resolution evidence must match; private and public version counters are not interchangeable.

This two-repository handoff is explicit, not an atomic transaction. A partial second step must be reconciled before reporting completion. No private note, raw article body or image is exported by the journal command.

Exceptional privacy/security/rights removal requires a reviewed safe explanation. The normal append-only command deliberately does not provide a silent history-rewrite option.

Consumer safeguards: active listings exclude retracted/superseded records, but stable detail URLs remain. Optional Local Explain is suppressed for withdrawn/falsified/re-review-required context. Search metadata emits datePublished only with an actual first_public_at receipt. Same-day Thread revisions prefer append order rather than silently choosing the oldest revision.
