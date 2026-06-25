export const TEAM_TRACKER_ENDPOINT =
  'https://tracker.agencyadvanta.com/api/external/notion-publish';

// Hosts where the Vercel serverless `/api/publish` function is co-located with
// the front-end, so the relative path resolves to a working endpoint:
//   • localhost / 127.0.0.1                       — `vercel dev`
//   • reverseengineering.agencyadvanta.com        — production (Vercel)
// On other hosts (e.g. the GitHub Pages mirror) there is no co-located function,
// so we fall through to '' and the user picks an endpoint in Settings instead.
const COLOCATED_API_HOSTS = new Set([
  'localhost',
  '127.0.0.1',
  'reverseengineering.agencyadvanta.com',
]);

/**
 * Resolve the publish endpoint: window override -> settings.apiUrl -> co-located
 * '/api/publish' -> '' (not configured). Mirrors the original.
 */
export function getPublishApiUrl(settingsApiUrl: string): string {
  if (typeof window !== 'undefined' && window.PUBLISH_API_URL_OVERRIDE) {
    return window.PUBLISH_API_URL_OVERRIDE;
  }
  const fromSettings = (settingsApiUrl || '').trim();
  if (fromSettings) return fromSettings;
  if (typeof location !== 'undefined' && COLOCATED_API_HOSTS.has(location.hostname)) {
    return '/api/publish';
  }
  return '';
}
