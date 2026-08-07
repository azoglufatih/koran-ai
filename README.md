# Koran AI

An open-source, mobile-first PWA for reading the Quran in Arabic alongside translations and
tafsir, with an AI panel to ask about the meaning of selected text.

No accounts, no backend, no database. The app is a fully static frontend; any AI provider
configuration lives only in the reader's own browser
(see [ADR 0001](docs/adr/0001-no-backend-client-side-ai.md)).

## Status

Early. Currently implemented: the app scaffold and the Arabic Reading Pane — the full Quran in
Arabic, navigable by Surah and Ayah. Translation Tabs, Tafsir Tabs, and the AI Tab are tracked
as open issues.

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
| `npm run vendor:quran` | Regenerate the vendored Quran corpus (output is committed) |

## Layout

- `src/content/` — the Quran Content Repository seam. `quran-content-repository.ts` is the
  interface every caller reads content through; `data/` is the vendored corpus.
- `src/app/`, `src/components/` — the Reading Pane UI.
- `scripts/vendor-quran-data.mjs` — regenerates and validates `src/content/data/`.

## Licensing

The app's own code is MIT (see [LICENSE](LICENSE)). The bundled Quran text keeps its own terms —
see [CREDITS.md](CREDITS.md).
