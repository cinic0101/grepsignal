# GrepSignal

> **grep the noise, find the signal.**

Public, static presentation and machine-readable output for GrepSignal intelligence.

This repository is intentionally separate from the private `grepsignal-engine`. It contains only publication-safe material: approved GrepSignal analysis, source links/metadata, public schemas and the static site. Raw scraped content, private prompts, engine heuristics, temporary images and secrets do not belong here.

## How GrepSignal works

![How GrepSignal works](public/how-grepsignal-works.webp)

GrepSignal uses LLM-assisted semantic review and evidence gathering to interpret candidates and collect context. Publication is constrained by an evidence-backed signal gate: candidates can be marked `out of scope`, `no signal` or `watch` instead of being published.

## v0.1 beta

- Astro static site, English canonical content.
- Research-journal × light-terminal visual style.
- No third-party article images.
- JSON is a first-class public output; HTML is a presentation layer.
- Published records expose evidence links, falsifiers and limitations; discovery channels such as Hacker News are not counted as factual evidence.
- GitHub Pages is the initial dogfood target. Cloudflare Pages/domain comes only after the content and publishing flow have been observed for several days.

## Discoverability

> **Never create content because a keyword exists. Make genuine signals maximally discoverable.**

SEO/AEO is a publication concern, not an editorial input. GrepSignal may improve stable URLs, semantic HTML, canonical metadata, structured data, sitemaps and machine-readable outputs for intelligence that has already passed editorial review. Search demand must not create a signal, lower its publication threshold or justify keyword-targeted filler pages.

## Local development

```sh
npm install
npm run dev
npm run build
```

Local development uses `/` as the base path. GitHub Actions builds with `/grepsignal/`. A later Cloudflare deployment can set `PUBLIC_BASE_PATH=/` and its own `PUBLIC_SITE_URL` without changing site code.

## GitHub Pages beta

The beta is published at:

`https://cinic0101.github.io/grepsignal/`

The deploy workflow builds `dist/` and publishes it through GitHub Pages.

## Public data boundary

`scripts/validate-data.mjs` blocks obvious private/raw fields. For `publication_status: published`, it also requires linked evidence, matching source counts, source-organization counts, falsifiers, limitations, registration date, evidence-history date, and credential-free HTTPS source URLs.

That validator is a publication guard, not a substitute for the private engine's editorial/IP review.

## License

The software source code, scripts, configuration, and site implementation in this repository are licensed under the [Apache License 2.0](LICENSE).

Published GrepSignal intelligence, editorial analysis, and machine-readable signal records are **not** licensed under Apache-2.0 unless explicitly stated otherwise. Third-party source material remains subject to the rights of its respective owners.
