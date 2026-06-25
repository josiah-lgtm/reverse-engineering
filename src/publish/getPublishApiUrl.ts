export const TEAM_TRACKER_ENDPOINT =
  'https://tracker.agencyadvanta.com/api/external/notion-publish';

/**
 * Resolve the publish endpoint: window override -> settings.apiUrl -> localhost
 * '/api/publish' (for `vercel dev`) -> '' (not configured). Mirrors the original.
 */
export function getPublishApiUrl(settingsApiUrl: string): string {
  if (typeof window !== 'undefined' && window.PUBLISH_API_URL_OVERRIDE) {
    return window.PUBLISH_API_URL_OVERRIDE;
  }
  const fromSettings = (settingsApiUrl || '').trim();
  if (fromSettings) return fromSettings;
  if (typeof location !== 'undefined' && location.hostname === 'localhost') return '/api/publish';
  return '';
}
