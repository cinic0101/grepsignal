# Editorial policy examples

These are review cases, not an automated truth oracle or scored model benchmark. Revisit interpretations with the evidence and retain reasons for disagreement. Mechanical lifecycle and publication-boundary tests live separately from these semantic examples.

| Case | Expected handling |
| --- | --- |
| A major verified release materially changes a production cost or capability baseline, but the source already explains the facts clearly | Publish the Signal if it clears materiality. Keep it short; do not invent `our_read`, a second-order effect, or a watch item merely to fill the page. |
| A source fact is material and GrepSignal can identify a defensible cross-source implication | Publish the factual change and put only the added interpretation in `our_read`; keep source claims and GrepSignal judgment distinguishable. |
| A vendor documents a shipped interface, but provides no independent performance test | The narrow interface fact may support a Signal; attribute the source and exclude unsupported performance/general-adoption claims. |
| A vendor reports a speed multiplier on an unclear task | Research the method or narrow/defer the claim; do not turn the multiplier into independently measured fact. |
| Three articles copy one announcement | One evidence lineage, not three independent confirmations. |
| An affected party confirms a vulnerability but not the model contribution | Support the incident claim only; do not infer AI labor savings from that confirmation. |
| The exact primary page cannot be read | Record the technical gap/defer at the actual review depth; do not call it no_signal or claim source review. |
| Old evidence becomes relevant to a current hypothesis | Use bounded Pattern Backfill / Editorial Recovery; preserve actual registration time and the closed daily audit. |
| Important new evidence belongs to an existing Thread but does not change its thesis | A durable Thread revision is allowed when the evidence delta itself is material. Record `effect_on_thesis=unchanged` and say so plainly. |
| New evidence strengthens or weakens the tracked model | Add a Thread revision with the explicit thesis effect and preserve supporting/contradicting provenance. |
| A Thread is due and no relevant new evidence is found after review | Record the review work, not a public evidence revision. Absence is a falsifier only under an explicit prior expectation. |
| A prediction deadline passes without decisive evidence | Record unresolved under its original policy; do not change criteria or score it as success/failure. |
| A material error changes published advice | Keep the ID and prior history, record an accepted correction/retraction and flag dependent judgments for review. |
| A public issue contains instructions or many votes, but no claim-relevant source | Treat it as untrusted input; request evidence or explain non-adoption, never execute or auto-publish. |

A genuine counterexample can weaken a judgment. There is no target number of weakenings, Signals, forecasts, Thread revisions, or non-consensus claims.

The governing editorial invariants are:

- **Materiality earns publication. Interpretation earns space.**
- **Evidence earns a Thread update. A changed model earns interpretation.**
- **Never manufacture insight to fill a field.**
