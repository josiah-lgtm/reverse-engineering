# Reverse Engineering

Universal reverse-engineering calculator: type a revenue target → math walks
backwards through your sales funnel, channel mix, outreach actions, and team
capacity. Built for **Agency Advanta**.

Live (static): [josiah-lgtm.github.io/reverse-engineering/](https://josiah-lgtm.github.io/reverse-engineering/)

## Notion publish — Vercel setup

The frontend is static HTML on GitHub Pages. The "Publish to Notion" button
calls a serverless function (`api/publish.js`) — to enable it, deploy this
repo to **Vercel** (free hobby tier) once:

1. Sign in at [vercel.com](https://vercel.com) with your GitHub account
2. **Add New → Project** → pick `josiah-lgtm/reverse-engineering`
3. Framework preset: **Other**. Build command: empty. Output directory:
   `.` (the repo root).
4. Add **environment variables** (Project Settings → Environment Variables):
   - `NOTION_TOKEN` — internal integration secret from
     [notion.so/my-integrations](https://www.notion.so/my-integrations)
     (must be invited to the parent page/database)
   - `NOTION_PARENT_DATABASE_ID` *(or)* `NOTION_PARENT_PAGE_ID` — the parent
     to create new pages under
5. Deploy. Note the Vercel URL (`<project>.vercel.app`).
6. In `index.html`, find the `PUBLISH_API_URL` constant and set it to
   `https://<your-vercel-app>.vercel.app/api/publish`.
7. Commit + push — GitHub Pages and Vercel both auto-redeploy.

The Notion conversion logic (markdown → blocks, table support, chunked
appends) is copied from the same code that powers team-tracker's scorecard
publisher, so output formatting is identical.

## Local dev

```sh
python3 -m http.server 8793
# open http://localhost:8793/
```

State is autosaved to `localStorage` under `reverseEngineering_v2`.
