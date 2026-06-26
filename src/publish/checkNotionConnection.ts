// Client-side Notion connection health check. GETs the resolved publish endpoint,
// which (for our Vercel function) verifies the server token AND that the integration
// can see the configured parent — turning silent failures into a clear status.

export interface NotionHealth {
  /** the endpoint answered the health GET at all */
  reachable: boolean;
  /** token valid AND integration can see the parent */
  connected: boolean;
  workspace?: string;
  /** one-line remediation when not connected */
  hint?: string;
  error?: string;
}

export async function checkNotionConnection(apiUrl: string): Promise<NotionHealth> {
  if (!apiUrl) {
    return { reachable: false, connected: false, hint: 'No publish endpoint configured (Settings → Notion API).' };
  }
  try {
    const res = await fetch(apiUrl, { method: 'GET', headers: { Accept: 'application/json' } });
    // Some endpoints (e.g. a plain Vite dev server, or the team-tracker route)
    // have no GET health handler — treat that as "unknown", not "broken".
    if (res.status === 404 || res.status === 405) {
      return { reachable: false, connected: false, hint: 'This endpoint has no health check — publishing may still work.' };
    }
    const data = await res.json().catch(() => ({}));
    return {
      reachable: true,
      connected: !!data.connected,
      workspace: data.workspace || undefined,
      hint: data.hint || undefined,
      error: data.error || undefined,
    };
  } catch (e) {
    return {
      reachable: false,
      connected: false,
      error: e instanceof Error ? e.message : String(e),
      hint: 'Could not reach the publish endpoint. Check your connection or the endpoint URL in Settings.',
    };
  }
}
