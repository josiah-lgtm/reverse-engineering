export interface PublishResult {
  ok: boolean;
  page_id?: string;
  page_url?: string;
  updated?: boolean;
  error?: string;
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
  if (!res.ok || !data.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}
