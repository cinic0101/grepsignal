# Coverage is not publication volume

The homepage coverage panel and `/data/coverage.json` consume an aggregate intake report independently from `/data/intelligence.json`. Existing Signal content and registration dates are unchanged. Do not replace publication data with a collector/CI snapshot.

The first manual publishing cycle has no complete per-item decision ledger. Its public coverage status is `not_recorded`, with null review counts and a visible explanation. The initial collector recorded 99 HN stories, a 60-item HN brief, and 30 feed observations. Those facts do not establish that all 60/30 were read or triaged. Never backfill the missing decisions with zeros or invented totals. `tests/fixtures/live-coverage.json` is an actual aggregate-only ENGINE CI report, not the displayed publication's coverage; its zero review count is intentional.

New reviewed cycle reports are produced by the private engine's `intake-report` command. Copy only that approved aggregate JSON into `src/data/coverage.json` after editorial review; no private ledger or engine state belongs here. There is no new automatic cross-repository transport or Scheduler task in this change.

Counters: observed metadata; eligible window; selected triage denominator; triaged explicit decisions; source_read reviewer attestation; materialized fetched evidence documents. The six dispositions are mutually exclusive at the latest decision version, while materialization is a separate dimension. Complete means complete FOR THE SELECTED WINDOW, not every observed item or every article. Sources remain independent, not Simon-first with HN used for confirmation.

`coverage-contract.mjs` rejects unknown fields, invalid timestamps, inconsistent counts, nulls in audited counters, false completion and unsupported end-to-end durations. JSON Schema specifies the public shape; cross-field arithmetic is checked by the validator. Build runs Node tests and both data validators before Astro.

## Recorded timing

The first publication's Pages workflow was created at 2026-09-14T05:40:55Z; the Deploy to GitHub Pages step completed at 05:41:36Z. The 41-second pipeline interval includes queue/build/deploy, and excludes source research and editorial work. The build job itself ran 05:40:57–05:41:24 (27 s); the deployment step 05:41:30–05:41:36 (6 s). These intervals are nested, not additive.

Evidence: https://github.com/cinic0101/grepsignal/actions/runs/34810509961

Full-cycle duration is not measured. Do not substitute build time for it. Engine stage timers support collection, triage, research, validation, human_wait and deployment, including retries. Overlapping intervals are never summed to invent an end-to-end duration. A future receipt contract should connect the cycle start to an actually verified public deployment.
