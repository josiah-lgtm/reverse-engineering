export interface PublishResult {
  ok: boolean;
  page_id?: string;
  page_url?: string;
  updated?: boolean;
  error?: string;
  /** Notion error code (e.g. 'unauthorized', 'object_not_found') when ok is false. */
  code?: string;
  /** One-line remediation from the server when a publish fails. */
  hint?: string;
}

export interface PublishPayload {
  title: string;
  markdown: string;
  pageId?: string;
}

/**
 * POST {title, markdown, pageId} to the resolved endpoint. Both the Vercel
 * `api/publish.js` and the team-tracker endpoint share this exact contract.
 * Throws on non-2xx / {ok:false} so callers can fall back to manual copy.
 */
export async function publishToNotion(apiUrl: string, payload: PublishPayload): Promise<PublishResult> {
  const res = await fetch(apiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data: PublishResult = await res.json().catch(() => ({ ok: false }));
  if (!res.ok || !data.ok) {
    const base = data.error || `HTTP ${res.status}`;
    throw new Error(data.hint ? `${base} — ${data.hint}` : base);
  }
  return data;
}
