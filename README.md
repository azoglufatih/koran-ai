# Koran AI

An open-source, mobile-first PWA for reading the Quran in Arabic alongside translations and
tafsir, with an AI panel to ask about the meaning of selected text.

No accounts, no backend, no database. The app is a fully static frontend; any AI provider
configuration lives only in the reader's own browser
(see [ADR 0001](docs/adr/0001-no-backend-client-side-ai.md)).

## Status

Early. Currently implemented: the Arabic Reading Pane — the full Quran in Arabic, navigable by
Surah and Ayah, with a Latin-script transliteration under every Ayah in one of three schemes —
beside a row of Columns the reader arranges, each holding Translation Tabs (English, Turkish,
German), Tafsir Tabs (Al-Mukhtasar, in English and Turkish) and AI Tabs. AI Tabs answer questions
about a selected Ayah through a provider the reader configures, grounded in passages retrieved
from the corpus. The Column arrangement, the transliteration preference and the reading position
are kept in the reader's own browser, and the app installs to a home screen.

## Getting started

```bash
npm install
npm run dev
```

Then open http://localhost:3000.

## Scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` | Static export to `out/` |
| `npm test` | Vitest suite |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |
| `npm run vendor:quran` | Regenerate the vendored Arabic corpus (output is committed) |
| `npm run vendor:translations` | Regenerate the vendored translations (output is committed) |
| `npm run vendor:transliteration` | Regenerate the vendored Latin-script transliterations (output is committed) |
| `npm run vendor:tafsir` | Regenerate the vendored tafsir (output is committed) |
| `npm run build:retrieval-index` | Rebuild the Retrieval Index over the vendored translations and tafsir, after regenerating either (output is committed) |
| `npm run icons:generate` | Re-render the PNG app icons from the SVGs under `public/icons/` (output is committed; needs `rsvg-convert`, or macOS `sips`) |

## Layout

- `src/content/` — the Quran Content Repository seam. `quran-content-repository.ts` is the
  interface every caller reads content through; `data/` is the vendored Arabic corpus.
- `public/content/translations/`, `public/content/transliteration/`, `public/content/tafsir/` — the
  vendored translations, Latin-script transliterations and commentary, fetched as they are needed
  rather than bundled into the page.
- `src/retrieval/` — the Corpus Retriever seam. `corpus-retriever.ts` is what the AI Client asks
  for passages through; `public/content/retrieval/` holds the shards it searches.
- `src/app/`, `src/components/` — the Reading Pane and the Columns of Tabs beside it.
  `components/tabs/column-arrangement.ts` is the arrangement itself, apart from React and from the
  storage it is written to in `stored-arrangement.ts`.
- `public/sw.js`, `public/pwa/` — the service worker that caches the App Shell, and the policy
  saying what it may keep. Served from the root because that is the only place a service worker is
  allowed to control the whole app; tested from `src/pwa/`.
- `scripts/` — regenerates and validates the vendored content, and the index built over it.

## Licensing

The app's own code is MIT (see [LICENSE](LICENSE)). The bundled Quran text and translations keep
their own terms — see [CREDITS.md](CREDITS.md).
