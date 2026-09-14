# GrepSignal

> **grep the noise, find the signal.**

Public, static presentation and machine-readable output for GrepSignal intelligence.

This repository is intentionally separate from the private `grepsignal-engine`. It contains only publication-safe material: approved GrepSignal analysis, source links/metadata, public schemas and the static site. Raw scraped content, private prompts, engine heuristics, temporary images and secrets do not belong here.

## v0.1 beta

- Astro static site, English canonical content.
- Research-journal × light-terminal visual style.
- No third-party article images.
- JSON is a first-class public output; HTML is a presentation layer.
- Published records expose evidence links, falsifiers and limitations; discovery channels such as Hacker News are not counted as factual evidence.
- GitHub Pages is the initial dogfood target. Cloudflare Pages/domain comes only after the content and publishing flow have been observed for several days.

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

No repository-wide license is selected yet because code and original intelligence content may use different licenses later.
