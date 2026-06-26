# CLAUDE.md

Guidance for AI assistants working in this repo — **Agency Advanta** reverse-engineering
KPI dashboard (React + TypeScript + Vite).

## Git workflow

- **Commit directly to the `main` branch.** Do NOT create feature branches or open PRs
  for changes in this repo — when work is ready, commit it straight to `main`.
- Before committing, make sure it still builds and the tests pass:
  `npm run build` and `npm test`.

## Commands

- `npm run dev` — Vite dev server at http://localhost:5173
- `npm test` — parity + migration + UI tests (must stay green)
- `npm run typecheck` — types only
- `npm run build` — type-check + production build to `dist/`

## Must-not-break invariants

- **`src/engine/compute.ts` is parity-locked** — it's asserted 1:1 against the frozen
  `test/parity/original-compute.cjs` over 20,000 randomized plans. Never change its
  output for an existing plan; add new behaviour in selectors/store/components *around*
  it, not inside it.
- State persists to `localStorage` key `reverseEngineering_v2`. Any new
  `Plan` / `Settings` / `TrackerEntry` field MUST be added to `src/engine/defaults.ts`
  **and** backfilled in `src/state/normalize.ts`, or existing saved data breaks on load.
- Production is **Vercel only** (path-based routing, vite `base: '/'`, `vercel.json` SPA
  rewrite). GitHub Pages is retired — don't reintroduce a subpath base.
- Notion publishing uses a **server-side `NOTION_TOKEN`** env var (no OAuth/reconnect
  flow). `GET /api/publish` is a connection health check used by the publish modal.
