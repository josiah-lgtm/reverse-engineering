import { useRef } from 'react';
import { Section } from '../primitives/Card';
import { useStore, exportStateJSON } from '../../state/store';
import { TEAM_TRACKER_ENDPOINT } from '../../publish/getPublishApiUrl';
import { cssVars } from '../../lib/css';

export function SettingsCard() {
  const apiUrl = useStore((s) => s.settings.apiUrl);
  const errorPct = useStore((s) => s.settings.errorPct);
  const setApiUrl = useStore((s) => s.setApiUrl);
  const setErrorPct = useStore((s) => s.setErrorPct);
  const resetMonth = useStore((s) => s.resetMonth);
  const resetAll = useStore((s) => s.resetAll);
  const importState = useStore((s) => s.importState);
  const fileRef = useRef<HTMLInputElement>(null);

  function handleExport() {
    const blob = new Blob([exportStateJSON()], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'reverse-engineering.json';
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function handleImport(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        importState(JSON.parse(String(reader.result)));
      } catch {
        window.alert('Could not read that file — is it valid JSON exported from this app?');
      }
    };
    reader.readAsText(file);
  }

  const sliderPct = Math.min(errorPct, 30) / 30 * 100;

  return (
    <Section title="Settings — API config & presets" summary="autosaves locally">
      <div className="settings-card">
        <h3>Notion API</h3>
        <p className="settings-sub">
          Where the <b>Publish to Notion</b> button POSTs the markdown. The team-tracker deployment
          already holds your <code>NOTION_TOKEN</code> — reuse it with one click, or paste a
          different endpoint URL below.
        </p>
        <div className="setting-row">
          <label htmlFor="set-api-url">Publish endpoint</label>
          <input
            id="set-api-url"
            type="url"
            placeholder={TEAM_TRACKER_ENDPOINT}
            value={apiUrl}
            onChange={(e) => setApiUrl(e.target.value)}
          />
        </div>
        <div style={{ marginTop: 8, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button type="button" className="ghost small" onClick={() => setApiUrl(TEAM_TRACKER_ENDPOINT)}>
            ↺ Use team-tracker (tracker.agencyadvanta.com)
          </button>
        </div>
        <details className="onboard-steps">
          <summary>How it works · alt option (your own Vercel deployment)</summary>
          <p>
            The <b>team-tracker</b> Next.js app already exposes <code>/api/external/notion-publish</code>{' '}
            and writes to the same Notion database that hosts the scorecards. The "Use team-tracker"
            button above prefills the URL — that's all you need.
          </p>
          <p>If you'd rather host the Notion publisher yourself, the original Vercel onboarding still works:</p>
          <ol>
            <li>
              Create a Notion <b>internal integration</b> at{' '}
              <a href="https://www.notion.so/my-integrations" target="_blank" rel="noopener">
                notion.so/my-integrations
              </a>
              . Copy the <b>Internal Integration Secret</b> — that's your <code>NOTION_TOKEN</code>.
            </li>
            <li>
              In Notion, open the parent page (or database) where you want plans to live. Click{' '}
              <b>···</b> → <b>Add connections</b> → pick the integration. Copy the page/database ID
              from the URL.
            </li>
            <li>
              Sign in to{' '}
              <a href="https://vercel.com" target="_blank" rel="noopener">
                vercel.com
              </a>{' '}
              with GitHub → <b>Add New → Project</b> → import <code>josiah-lgtm/reverse-engineering</code>.
              Framework preset <b>Other</b>, output directory <code>.</code>
            </li>
            <li>
              In Vercel <b>Project Settings → Environment Variables</b>, add: <code>NOTION_TOKEN</code>{' '}
              and <code>NOTION_PARENT_DATABASE_ID</code> (or <code>NOTION_PARENT_PAGE_ID</code>).
            </li>
            <li>
              Deploy. Paste <code>https://&lt;your-app&gt;.vercel.app/api/publish</code> into the field
              above.
            </li>
          </ol>
        </details>

        <h3 style={{ marginTop: 24 }}>Forecast uncertainty</h3>
        <p className="settings-sub">
          How much you trust each conversion rate. Compounds through the funnel — bookings will show
          ±X% margin of error using this value.
        </p>
        <div className="setting-row">
          <label>Per-stage variance</label>
          <div className="setting-slider-wrap">
            <input
              type="range"
              min={0}
              max={30}
              step={1}
              value={Math.min(errorPct, 30)}
              style={cssVars({ '--pct': sliderPct.toFixed(1) + '%' })}
              onChange={(e) => setErrorPct(parseInt(e.target.value, 10) || 0)}
            />
            <input
              type="number"
              min={0}
              max={100}
              step={1}
              value={errorPct}
              onChange={(e) => setErrorPct(parseInt(e.target.value, 10) || 0)}
            />
            <span className="unit">%</span>
          </div>
        </div>

        <h3 style={{ marginTop: 24 }}>Data</h3>
        <div className="settings-actions">
          <button
            className="ghost"
            onClick={() => {
              if (window.confirm('Reset this month to defaults?')) resetMonth();
            }}
          >
            Reset this month to defaults
          </button>
          <button
            className="ghost"
            onClick={() => {
              if (window.confirm('Wipe ALL months and start fresh? This cannot be undone.')) resetAll();
            }}
          >
            Wipe ALL months &amp; start fresh
          </button>
          <button className="ghost" onClick={handleExport}>
            Export JSON
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json"
            style={{ display: 'none' }}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleImport(f);
              e.target.value = '';
            }}
          />
          <button className="ghost" onClick={() => fileRef.current?.click()}>
            Import JSON
          </button>
        </div>
      </div>
    </Section>
  );
}
