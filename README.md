# Reverse Engineering

Universal reverse-engineering calculator for **Agency Advanta**: type a revenue
target → the math walks backwards through your sales funnel, channel mix,
outreach actions, and team capacity to tell you exactly what you need to hit it.
Plus a **Business Data** tracker (weekly/monthly actuals vs the war plan) and a
**History** view that aggregates every entry into one editable grid.

This is a clean **React + TypeScript + Vite** rewrite of the original single-file
app. The calculation core is a pure, side-effect-free engine that is
parity-tested **1:1** against the original `compute()` / `generatePlanMarkdown()`
across tens of thousands of randomized inputs.

## Architecture

```
src/
├─ engine/      # PURE TS calculation core (no React/DOM) — parity-tested
│  ├─ compute.ts        reverse-engineering math (closes → funnel → channels → team → economics)
│  ├─ tracker.ts        weekly/monthly target rows, status, scoring, derived actuals
│  ├─ markdown.ts       war-plan + tracker-report markdown (byte-exact GFM for Notion)
│  ├─ warplan.ts        war-plan rows + per-period scaling
│  ├─ constants.ts      FUNNEL_STAGES, NOTE_SECTIONS, TRACKERS, CURRENCY_SYMBOLS, BD_MAP
│  ├─ dates.ts          month/week id helpers (injectable "today")
│  ├─ defaults.ts       defaultPlan / defaultState / createEntry
│  └─ types.ts          domain + Computed types
├─ state/       # Zustand store + persistence
│  ├─ store.ts          single source of truth; debounced raw-JSON persistence
│  └─ normalize.ts      full migration pipeline (v1→v2, backfills, BD_MAP) — runs on load AND import
├─ selectors/   # memoized derived data (usePlan, useComputed, history)
├─ format/      # currency-reactive number formatters
├─ publish/     # Notion publish (endpoint resolution + POST)
├─ components/  # UI — shell · reverse-engineering · business-data · history · modal · print
└─ styles/      # ported design system (tokens + components + responsive + print)

api/publish.js   # Vercel serverless: markdown → Notion (create/update page) — unchanged
test/parity/     # frozen vendored original + randomized parity suites
```

State autosaves to `localStorage` under `reverseEngineering_v2` — the same key
and JSON shape as the original, so existing data migrates automatically.

## Develop

```sh
npm install
npm run dev        # Vite dev server at http://localhost:5173
npm test           # parity + migration + UI smoke tests
npm run build      # type-check + production build to dist/
```

## Deploy

**GitHub Pages** — `.github/workflows/deploy.yml` builds and publishes `dist/`
on every push to `main` (enable Pages → "GitHub Actions" in repo settings). The
Vite `base` is `'./'`, so it works at any subpath.

**Vercel** (for the Notion publish function) — import the repo; Vercel
auto-detects the Vite framework (build `npm run build`, output `dist/`) and
serves `api/publish.js` as a serverless function. Set environment variables:

- `NOTION_TOKEN` — internal integration secret from
  [notion.so/my-integrations](https://www.notion.so/my-integrations) (the
  integration must be invited to the parent page/database).
- `NOTION_PARENT_DATABASE_ID` *(or)* `NOTION_PARENT_PAGE_ID` — where new pages
  are created.

The **Publish to Notion** button resolves its endpoint from
`window.PUBLISH_API_URL_OVERRIDE` → Settings → `apiUrl` → `localhost /api/publish`.
The "Use team-tracker" preset points it at
`tracker.agencyadvanta.com/api/external/notion-publish`, which shares the exact
`{title, markdown, pageId}` → `{ok, page_id, page_url, updated}` contract.

> CORS allow-list lives in `api/publish.js` — add any new front-end origin there.
