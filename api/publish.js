// POST /api/publish — markdown → Notion page
//
// Vercel serverless function. The markdown→Notion blocks conversion and
// createPage helper are copied (CommonJS-style) from the team-tracker's
// lib/notion.ts so the output is identical to the scorecard publisher.
//
// Server env vars required (set in Vercel project settings):
//   NOTION_TOKEN                  — internal integration secret
//   NOTION_PARENT_DATABASE_ID     — database ID, OR
//   NOTION_PARENT_PAGE_ID         — page ID (one of the two)
//
// Frontend POSTs JSON: { title: string, markdown: string }
// Returns: { ok: true, page_id, page_url } or { error }

const NOTION_API = "https://api.notion.com/v1";
const NOTION_VERSION = "2022-06-28";

const ALLOWED_ORIGINS = new Set([
  "https://reverseengineering.agencyadvanta.com", // production (Vercel custom domain)
  "https://josiah-lgtm.github.io",                // legacy GitHub Pages deploy
  "http://localhost:8793", // legacy python static server
  "http://localhost:5173", // Vite dev server
  "http://localhost:4173", // Vite preview server
]);

function setCors(req, res) {
  const origin = req.headers.origin || "";
  if (ALLOWED_ORIGINS.has(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Access-Control-Max-Age", "86400");
  res.setHeader("Vary", "Origin");
}

async function notion(path, init = {}) {
  const token = process.env.NOTION_TOKEN;
  if (!token) {
    const e = new Error("NOTION_TOKEN env var not set");
    e.notionStatus = 401;
    e.notionCode = "no_token";
    throw e;
  }
  const r = await fetch(`${NOTION_API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Notion-Version": NOTION_VERSION,
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });
  const body = await r.text();
  if (!r.ok) {
    // Notion returns JSON { code, message } — surface both so callers can classify.
    let code = "";
    let message = body.slice(0, 400);
    try {
      const j = JSON.parse(body);
      code = j.code || "";
      message = j.message || message;
    } catch {}
    const e = new Error(`Notion ${r.status} (${code || "error"}) ${path}: ${message}`);
    e.notionStatus = r.status;
    e.notionCode = code;
    throw e;
  }
  return body ? JSON.parse(body) : null;
}

// Map a Notion/transport error to a real HTTP status + a one-line remediation the
// front-end can show the user. This is what turns "it just stops" into "here's why".
function classifyNotionError(e) {
  const status = e && e.notionStatus;
  const code = (e && e.notionCode) || "";
  if (code === "no_token" || status === 401 || code === "unauthorized") {
    return { status: 401, code: "unauthorized", hint: "The server's Notion token is missing, invalid, or was rotated. Set/refresh NOTION_TOKEN in your Vercel project settings and redeploy." };
  }
  if (status === 404 || code === "object_not_found" || code === "restricted_resource") {
    return { status: 404, code: code || "object_not_found", hint: "Your Notion integration can't see the target page/database. Open it in Notion → ••• menu → Connections → add your integration, then retry." };
  }
  if (code === "validation_error" || status === 400) {
    return { status: 400, code: "validation_error", hint: "Notion rejected the request. Check that NOTION_PARENT_DATABASE_ID / NOTION_PARENT_PAGE_ID points at a real, shared destination." };
  }
  if (status === 429 || code === "rate_limited") {
    return { status: 429, code: "rate_limited", hint: "Notion is rate-limiting requests. Wait a few seconds and try again." };
  }
  return { status: 502, code: code || "notion_error", hint: "Unexpected Notion error — see the message above. If it persists, re-check the integration token and that the destination is shared with it." };
}

// GET /api/publish — connection health check (no writes). Verifies the token AND
// that the integration can actually see the configured parent.
async function handleHealth(req, res) {
  if (!process.env.NOTION_TOKEN) {
    return res.status(401).json({ ok: false, connected: false, code: "no_token", hint: "NOTION_TOKEN is not set on the server. Add it in Vercel → Settings → Environment Variables and redeploy." });
  }
  if (!process.env.NOTION_PARENT_DATABASE_ID && !process.env.NOTION_PARENT_PAGE_ID) {
    return res.status(400).json({ ok: false, connected: false, code: "no_parent", hint: "NOTION_PARENT_DATABASE_ID or NOTION_PARENT_PAGE_ID is not set on the server." });
  }
  let me;
  try {
    me = await notion("/users/me");
  } catch (e) {
    const c = classifyNotionError(e);
    return res.status(c.status).json({ ok: false, connected: false, code: c.code, error: e.message, hint: c.hint });
  }
  const workspace = (me && me.bot && me.bot.workspace_name) || "";
  const parent = notionParent();
  try {
    if (parent.kind === "database") await notion(`/databases/${parent.id}`);
    else await notion(`/pages/${parent.id}`);
  } catch (e) {
    const c = classifyNotionError(e);
    return res.status(200).json({ ok: true, connected: false, workspace, code: c.code, error: e.message, hint: c.hint });
  }
  return res.status(200).json({ ok: true, connected: true, workspace, parentKind: parent.kind });
}

function notionParent() {
  const db = process.env.NOTION_PARENT_DATABASE_ID;
  const pg = process.env.NOTION_PARENT_PAGE_ID;
  const norm = v => v.replace(/[^a-z0-9]/gi, "");
  if (db) return { kind: "database", id: norm(db) };
  if (pg) return { kind: "page",     id: norm(pg) };
  throw new Error("NOTION_PARENT_DATABASE_ID or NOTION_PARENT_PAGE_ID must be set");
}

// ────────────────────────────────────────────────────────────────────
// Inline markdown → Notion rich_text
// ────────────────────────────────────────────────────────────────────
function textSpan(text, annotations = {}, link) {
  return {
    type: "text",
    text: { content: text, ...(link ? { link: { url: link } } : {}) },
    annotations: { bold: false, italic: false, strikethrough: false, underline: false, code: false, color: "default", ...annotations },
  };
}
function toRichText(s) {
  const out = [];
  const re = /(\*\*[^*]+\*\*|_[^_]+_|`[^`]+`|\[[^\]]+\]\([^)]+\))/g;
  let last = 0, m;
  while ((m = re.exec(s)) !== null) {
    if (m.index > last) out.push(textSpan(s.slice(last, m.index)));
    const tok = m[0];
    if (tok.startsWith("**")) out.push(textSpan(tok.slice(2, -2), { bold: true }));
    else if (tok.startsWith("_")) out.push(textSpan(tok.slice(1, -1), { italic: true }));
    else if (tok.startsWith("`")) out.push(textSpan(tok.slice(1, -1), { code: true }));
    else {
      const lm = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(tok);
      if (lm) out.push(textSpan(lm[1], {}, lm[2]));
      else out.push(textSpan(tok));
    }
    last = m.index + tok.length;
  }
  if (last < s.length) out.push(textSpan(s.slice(last)));
  return out;
}

// ────────────────────────────────────────────────────────────────────
// Block-level markdown → Notion blocks
// ────────────────────────────────────────────────────────────────────
function markdownToNotionBlocks(md) {
  const blocks = [];
  const lines = md.split("\n");
  let i = 0;
  function pushPara(text) { blocks.push({ type: "paragraph", paragraph: { rich_text: toRichText(text) } }); }
  while (i < lines.length) {
    const line = lines[i];
    if (/^# /.test(line))   { blocks.push({ type: "heading_1", heading_1: { rich_text: toRichText(line.slice(2)) } }); i++; continue; }
    if (/^## /.test(line))  { blocks.push({ type: "heading_2", heading_2: { rich_text: toRichText(line.slice(3)) } }); i++; continue; }
    if (/^### /.test(line)) { blocks.push({ type: "heading_3", heading_3: { rich_text: toRichText(line.slice(4)) } }); i++; continue; }
    if (/^> /.test(line))   { blocks.push({ type: "quote",     quote:     { rich_text: toRichText(line.slice(2)) } }); i++; continue; }
    if (/^- /.test(line)) {
      while (i < lines.length && /^- /.test(lines[i])) {
        blocks.push({ type: "bulleted_list_item", bulleted_list_item: { rich_text: toRichText(lines[i].slice(2)) } });
        i++;
      }
      continue;
    }
    // markdown table → notion table block
    if (line.trim().startsWith("|") && lines[i + 1]?.trim().startsWith("|")) {
      const tableRows = [];
      while (i < lines.length && lines[i].trim().startsWith("|")) {
        const row = lines[i].trim().replace(/^\||\|$/g, "").split("|").map(c => c.trim());
        if (!row.every(c => /^-+$/.test(c) || c === "")) tableRows.push(row);
        i++;
      }
      if (tableRows.length) {
        const width = Math.max(...tableRows.map(r => r.length));
        blocks.push({
          type: "table",
          table: {
            table_width: width,
            has_column_header: true,
            has_row_header: false,
            children: tableRows.map(r => ({
              type: "table_row",
              table_row: { cells: Array.from({ length: width }, (_, k) => toRichText(r[k] || "")) },
            })),
          },
        });
      }
      continue;
    }
    if (line.trim() === "") { i++; continue; }
    pushPara(line);
    i++;
  }
  return blocks;
}

// ────────────────────────────────────────────────────────────────────
// Create page (handles database vs page parent + chunked appends)
// ────────────────────────────────────────────────────────────────────
async function createNotionPage({ title, markdown, periodStartDate }) {
  const parent = notionParent();
  const blocks = markdownToNotionBlocks(markdown);
  const FIRST_BATCH = blocks.slice(0, 95);
  const rest = blocks.slice(95);

  let parentBlock, properties;
  if (parent.kind === "database") {
    const dbMeta = await notion(`/databases/${parent.id}`);
    const propEntries = Object.entries(dbMeta.properties || {});
    const titleProp = propEntries.find(([, p]) => p.type === "title")?.[0] || "Name";
    properties = { [titleProp]: { title: toRichText(title) } };
    if (periodStartDate) {
      const dateProp = propEntries.find(([, p]) => p.type === "date")?.[0];
      if (dateProp) properties[dateProp] = { date: { start: periodStartDate } };
    }
    parentBlock = { type: "database_id", database_id: parent.id };
  } else {
    properties = { title: { title: toRichText(title) } };
    parentBlock = { type: "page_id", page_id: parent.id };
  }

  const created = await notion("/pages", {
    method: "POST",
    body: JSON.stringify({ parent: parentBlock, properties, children: FIRST_BATCH }),
  });

  for (let off = 0; off < rest.length; off += 95) {
    await notion(`/blocks/${created.id}/children`, {
      method: "PATCH",
      body: JSON.stringify({ children: rest.slice(off, off + 95) }),
    });
  }

  return { id: created.id, url: created.url };
}

// ────────────────────────────────────────────────────────────────────
// Update existing page in place (idempotent re-publish)
// Mirrors team-tracker's updateScorecardPage: rename, wipe children,
// re-append fresh blocks in 95-sized chunks.
// ────────────────────────────────────────────────────────────────────
async function updateNotionPage({ pageId, title, markdown }) {
  // 1. Update the title
  await notion(`/pages/${pageId}`, {
    method: "PATCH",
    body: JSON.stringify({ properties: { title: { title: toRichText(title) } } }),
  });
  // 2. Delete all current children (paginate just in case)
  let cursor;
  do {
    const path = `/blocks/${pageId}/children?page_size=100${cursor ? `&start_cursor=${cursor}` : ''}`;
    const { results, next_cursor, has_more } = await notion(path);
    for (const c of results || []) {
      await notion(`/blocks/${c.id}`, { method: "DELETE" });
    }
    cursor = has_more ? next_cursor : undefined;
  } while (cursor);
  // 3. Append fresh blocks in 95-sized chunks
  const blocks = markdownToNotionBlocks(markdown);
  for (let off = 0; off < blocks.length; off += 95) {
    await notion(`/blocks/${pageId}/children`, {
      method: "PATCH",
      body: JSON.stringify({ children: blocks.slice(off, off + 95) }),
    });
  }
  const page = await notion(`/pages/${pageId}`);
  return { id: page.id, url: page.url };
}

// ────────────────────────────────────────────────────────────────────
// Handler
// ────────────────────────────────────────────────────────────────────
module.exports = async (req, res) => {
  setCors(req, res);
  if (req.method === "OPTIONS") return res.status(204).end();

  const origin = req.headers.origin || "";

  // Health check (GET). Same-origin browser GETs omit the Origin header, so allow
  // an empty origin here; still block disallowed cross-origin callers.
  if (req.method === "GET") {
    if (origin && !ALLOWED_ORIGINS.has(origin)) return res.status(403).json({ error: "origin not allowed" });
    return handleHealth(req, res);
  }

  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });
  if (!ALLOWED_ORIGINS.has(origin)) {
    return res.status(403).json({ error: "origin not allowed" });
  }

  if (!process.env.NOTION_TOKEN) {
    return res.status(500).json({ error: "NOTION_TOKEN not configured on the server" });
  }
  if (!process.env.NOTION_PARENT_DATABASE_ID && !process.env.NOTION_PARENT_PAGE_ID) {
    return res.status(500).json({ error: "NOTION_PARENT_DATABASE_ID or NOTION_PARENT_PAGE_ID must be set" });
  }

  let body;
  try { body = req.body && typeof req.body === "object" ? req.body : JSON.parse(req.body || "{}"); }
  catch (e) { return res.status(400).json({ error: "invalid json" }); }

  if (!body.title || !body.markdown) {
    return res.status(400).json({ error: "title + markdown required" });
  }
  if (String(body.title).length > 200) return res.status(400).json({ error: "title too long (max 200 chars)" });
  if (String(body.markdown).length > 200_000) return res.status(400).json({ error: "markdown too long (max 200kb)" });

  try {
    // Idempotent: if caller passed a pageId from a previous publish, update
    // it in place instead of creating a duplicate. Same pattern team-tracker
    // uses for scorecard re-publishes (same period_key -> same Notion page).
    if (body.pageId) {
      try {
        const updated = await updateNotionPage({
          pageId: String(body.pageId),
          title: String(body.title),
          markdown: String(body.markdown),
        });
        return res.status(200).json({ ok: true, page_id: updated.id, page_url: updated.url, updated: true });
      } catch (e) {
        // Page may have been archived/deleted in Notion since we saved its id.
        // Fall through and create a fresh one rather than fail the publish. Only
        // for genuinely-missing pages — an auth/sharing error must NOT silently
        // create a duplicate (create would fail the same way), so let it surface.
        const code = e.notionCode || '';
        const missing = e.notionStatus === 404 || /404|object_not_found|not found|archived/i.test(`${code} ${e.message || ''}`);
        if (!missing) throw e;
      }
    }
    const created = await createNotionPage({
      title: String(body.title),
      markdown: String(body.markdown),
      periodStartDate: new Date().toISOString().slice(0, 10),
    });
    return res.status(200).json({ ok: true, page_id: created.id, page_url: created.url, updated: false });
  } catch (e) {
    const c = classifyNotionError(e);
    return res.status(c.status).json({ error: e.message || String(e), code: c.code, hint: c.hint });
  }
};
