# Research coverage is not an intelligence-output counter

The homepage coverage panel and `/data/coverage.json` expose a deliberately small research-transparency surface. They answer a reader-facing question: what configured sources were in the scheduled intake, how much review was recorded, and how much bounded research follow-up occurred for that frozen cycle.

They do **not** answer how much intelligence GrepSignal ultimately registered that day. Signal and Thread output can change after the scheduled cycle through Editorial Recovery, Pattern Backfill Review, or a later Thread revision. The homepage therefore renders same-day intelligence output separately from `intelligence.json`.

Detailed intake decisions, `watch/research/defer` queues, materialization identities, reviewer notes, retry history and timing stay in the private `grepsignal-engine`. Hiding those fields only in the UI is not enough; they do not belong in public coverage JSON or public test fixtures.

## Public contract

`coverage.json` schema v3 contains only:

- cycle ID and coverage status;
- per-source name, human-readable scope, intake count and reviewed count;
- number of research targets reviewed after the research+synthesis stage completed;
- number of unique exact document revisions materialized for the cycle;
- a short scope note.

Coverage status:

- `not_recorded`: review completion was not recorded; all `reviewed_count` fields are null.
- `partial`: at least one review count is recorded, but the configured intake is not fully reviewed.
- `reviewed`: every configured intake item has a recorded review decision.

Even `reviewed` means complete only for the configured intake window. It is never a claim of complete coverage of the AI ecosystem.

`research_targets_reviewed` is only non-zero when the bounded research+synthesis stage reached a recorded synthesis finish. A budget target count alone is never presented as completed review.

`exact_sources_materialized` counts unique exact `document_id + revision_id` materializations for the cycle. It is an aggregate research-follow-up count, not a public source list and not a claim that every materialization supported published intelligence.

## Intelligence output

The homepage separately derives same-day output from the canonical public intelligence record:

- Signals whose `registered_at` equals the scheduled cycle date;
- Thread revisions whose `date` equals the scheduled cycle date.

That output intentionally includes later Editorial Recovery on the same date. It must not be copied back into the finalized scheduled cycle or used to rewrite its historical outcome.

## Private timing

Collection timing, ChatGPT semantic wall time, human review wait, synthesis-to-publish latency and end-to-end deployment latency are operational metrics and remain private in `grepsignal-engine`. The public site does not expose them.

Cross-repository coverage sync remains a narrow handoff boundary. It may refresh aggregate scheduled-review coverage, but it must not mutate `intelligence.json` or infer publication output from a cycle publication receipt.
