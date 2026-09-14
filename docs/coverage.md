# Research coverage is not a CI dashboard

The homepage coverage panel and `/data/coverage.json` expose a deliberately small research-transparency surface. They answer a reader-facing question: what configured sources were in scope, how much review was recorded, how many primary/affected-party sources supported the published work, and how many Signals were published.

Detailed intake decisions, `watch/research/defer` queues, materialization state, reviewer notes, retry history and timing stay in the private `grepsignal-engine`. Hiding those fields only in the UI is not enough; they do not belong in the public coverage JSON or public test fixtures either.

The first manual publishing cycle has no complete per-item review ledger. Its public status remains `not_recorded`. The HN source is described as a Top 60 discovery intake and Simon as 30 observed feed items, but `reviewed_count` remains null. Never backfill missing historical review as zero or 60/60.

The current publication consulted 8 primary/affected-party sources and published 1 material Signal. Those are publication-level facts, not a coverage score.

## Public contract

`coverage.json` schema v2 contains only:

- cycle ID and coverage status;
- per-source name, human-readable scope, intake count and reviewed count;
- primary/affected-party source count;
- published Signal count;
- a short scope note.

Coverage status:

- `not_recorded`: review completion was not recorded; all `reviewed_count` fields are null.
- `partial`: at least one review count is recorded, but the configured intake is not fully reviewed.
- `reviewed`: every configured intake item has a recorded review decision.

Even `reviewed` means complete only for the configured intake window. It is never a claim of complete coverage of the AI ecosystem.

## Private timing

Collection timing, ChatGPT semantic wall time, human review wait, synthesis-to-publish latency and end-to-end deployment latency are operational metrics and remain private in `grepsignal-engine`. The public site does not expose them.

The engine's public projection command should be the future handoff boundary. Cross-repository copying and Scheduler publication are still separate workflow concerns and must preserve editorial approval.
