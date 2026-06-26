# Reverse Engineering

Universal reverse-engineering calculator for **Agency Advanta**: type a **revenue
or cash-collection** target → the math walks backwards through your sales funnel,
channel mix, outreach actions, and team capacity to tell you exactly what you need
to hit it. Tune any conversion rate right on the at-a-glance funnel and everything
updates live; drill into any acquisition channel (LinkedIn / Email) for its required
activities, conversions, revenue, and funnel.

Four shareable, deep-linkable views (each at its own clean URL):

- **Reverse Engineering** (`/`) — targets → editable funnel → channels → team.
- **Monthly Planning** (`/monthly-planning`) — the war plan + monthly notes, publishable to Notion.
- **Business Data** (`/business-data`) — weekly/monthly actuals vs the war plan, as a **scorecard (cards) or dense table**, with auto-totals.
- **History** (`/history`) — every saved entry in one editable grid, with per-metric **change history**.

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

**GitHub Pages** — *retired.* The app now uses path-based routing with an absolute
Vite `base` of `'/'`, which is incompatible with the Pages project subpath, so
`.github/workflows/deploy.yml` is **manual-only** (`workflow_dispatch`) and no longer
runs on push. Re-enable its `push` trigger only if you also restore a subpath base.

**Vercel** (production — `reverseengineering.agencyadvanta.com`) — import the
repo; Vercel auto-detects the Vite framework (build `npm run build`, output
`dist/`) and serves `api/publish.js` as a serverless function on the same origin.
`vercel.json` adds an SPA rewrite (`/(.*) → /`, excluding `/api/`) so deep links
like `/business-data` resolve on refresh, plus a 60s `maxDuration` for the publish
function. The publish endpoint also answers `GET /api/publish` as a **connection
health check** (verifies the token *and* that the integration can see the parent),
which the publish modal uses to show a live "Notion connected ✓ / not connected ✗"
indicator with a specific fix-it hint.
Add the domain under **Project → Settings → Domains** and point its DNS (CNAME →
`cname.vercel-dns.com`) at Vercel. On this host the **Publish to Notion** button
auto-resolves to the co-located `/api/publish` — no Settings change needed. Set
environment variables:

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

> CORS allow-list lives in `api/publish.js` (`ALLOWED_ORIGINS`) — it already
> includes `https://reverseengineering.agencyadvanta.com`; add any new front-end
> origin there.
