# GrepSignal public repository boundaries

This repository is public. Treat every committed byte as publishable.

- Never copy raw article bodies, screenshots, third-party editorial images, private prompts, source caches, engine weights/heuristics, secrets, tokens or signed URLs here.
- Published intelligence should arrive only from an explicitly approved private-engine export/review flow. Do not read private candidates and publish them opportunistically.
- Source presentation is link-first: publisher/author/title/URL and GrepSignal's original synthesis, not mirrored source content.
- English is the canonical language. Do not create parallel translated intelligence databases.
- HTML is a presentation layer. Keep structured JSON/schema output usable by agents.
- Preserve stable public IDs and prediction history. Never silently rewrite an already registered prediction.
- Preview/sample data must remain visibly marked and must never be mixed with `publication_status: published`.
- Avoid fake precision such as Signal scores unless a documented method exists.
- Discoverability is downstream of editorial judgment: **Never create content because a keyword exists. Make genuine signals maximally discoverable.** SEO/AEO metadata, semantic markup, feeds and indexes may expose approved intelligence, but must never create or promote intelligence solely to target search demand.
- Keep the site static-first. Do not add a backend, database, auth, ad stack, MCP/WebMCP server or analytics dependency without an explicit product decision.
- GitHub Pages beta must remain deployable under `/grepsignal/`; production hosting must also work at `/` via configuration.

Run `npm run build` before merging site changes.
