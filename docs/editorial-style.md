# Editorial writing guidance

This is a writing-quality aid, not a truth oracle or publication gate. Evidence quality, scope, limitations, materiality, and editorial acceptance remain authoritative.

## Core rule

**Materiality earns publication. Interpretation earns space.**

A verified event can deserve a Signal even when GrepSignal has nothing useful to add beyond a concise explanation of why the event matters. Never manufacture interpretation to make a page look complete.

For Threads, **evidence earns an update; a changed model earns interpretation**. Material new evidence may be worth recording while the current thesis remains unchanged.

## Responsibilities by field

- **Title** — name the material change plainly. No fixed grammatical pattern is required.
- **Summary / What changed** — state the verified change. Prefer one or two sentences when that is enough.
- **Why it matters / Why surfaced** — required materiality statement. Explain why this change is worth the reader's attention; do not simply restate the summary.
- **Our read** — optional GrepSignal interpretation beyond the source. Omit it when there is no earned interpretation.
- **Second-order effect** — optional downstream consequence. Omit it instead of manufacturing a chain of effects.
- **Watch next** — optional evidence that could update the judgment. Use specific observations, not generic advice to “monitor the space.”
- **Thread effect on thesis** — record `unchanged`, `strengthened`, `weakened`, `revised`, or `falsified`. Do not imply movement when the evidence is material but the thesis is unchanged.

There is no “minimal Signal” versus “full Signal” content class. Every optional field independently earns its place.

## Editorial questions

Before publishing or revising a Signal:

1. Is the event materially worth surfacing to the target technical audience?
2. Does each sentence add a fact, a materiality reason, an interpretation, a boundary, or a useful update criterion?
3. If `our_read`, a second-order effect, or `watch_next` disappeared, would any real judgment be lost?
4. Are we adding prose because the evidence supports it, or because the template has a field?

Before revising a Thread:

1. Is the new evidence materially worth adding to the tracked trajectory?
2. What exactly is its effect on the thesis?
3. If the thesis is unchanged, can the change note say that directly?
4. Is this independent evidence, stronger evidence, a contradiction, or merely more coverage of the same event?

## Style smells

The build runs a non-blocking editorial advisory. It currently flags:

- sentences longer than 30 words,
- repeated “material change/shift … not … but …” constructions,
- repeated “is/are becoming” title constructions,
- unusually dense Signal summaries,
- high lexical overlap between a summary and `our_read` or the materiality statement,
- generic `watch_next` language such as “monitor the ecosystem.”

These are review prompts, not failures. The program does not decide whether an interpretation is true or valuable.

## What the program must not do

The advisory must not:

- rewrite published intelligence,
- lower or raise a Signal gate,
- manufacture `our_read`, a downstream effect, a watch item, or a changed Thread thesis,
- manufacture a different title merely to satisfy style variety,
- change a factual scope, limitation, falsifier, or status,
- block publication on a style heuristic alone.

Material wording changes to an already published judgment belong in the accountability flow; they are not cosmetic UI edits.
