// ============================================================
// Path-based routing — a tiny History-API layer (no router dependency).
// Each view has one canonical URL so any view is shareable / deep-linkable.
// The store's activeView stays the source of truth; this just keeps the URL
// and the store in sync in both directions (nav -> URL, URL/back-forward -> nav).
// ============================================================

import type { ViewKey } from './engine/types';

/** view -> canonical path. Keep in sync with VIEWS in state/normalize.ts. */
export const VIEW_PATHS: Record<ViewKey, string> = {
  'reverse-engineering': '/',
  'monthly-planning': '/monthly-planning',
  'business-data': '/business-data',
  history: '/history',
};

export function viewToPath(v: ViewKey): string {
  return VIEW_PATHS[v] ?? '/';
}

/** path -> view, or null when the path matches no known view. */
export function pathToView(pathname: string): ViewKey | null {
  const p = pathname.length > 1 ? pathname.replace(/\/+$/, '') : '/';
  const hit = (Object.entries(VIEW_PATHS) as [ViewKey, string][]).find(([, path]) => path === p);
  return hit ? hit[0] : null;
}
