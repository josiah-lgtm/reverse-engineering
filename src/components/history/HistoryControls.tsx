import type { TrackerKind } from '../../engine/types';
import { useStore } from '../../state/store';

const PRESETS: { p: string; l: string }[] = [
  { p: '4w', l: 'Last 4w' },
  { p: '8w', l: 'Last 8w' },
  { p: '13w', l: 'Last 13w' },
  { p: 'ytd', l: 'YTD' },
  { p: 'all', l: 'All' },
];

export function HistoryControls({ onExportCsv }: { onExportCsv: () => void }) {
  const history = useStore((s) => s.history)!;
  const setKind = useStore((s) => s.setHistoryKind);
  const setFrom = useStore((s) => s.setHistoryFrom);
  const setTo = useStore((s) => s.setHistoryTo);
  const applyPreset = useStore((s) => s.applyHistoryPreset);

  return (
    <div className="history-controls">
      <div className="hc-group">
        <label>Range</label>
        <input type="date" value={history.from} onChange={(e) => setFrom(e.target.value)} />
        <span className="hc-sep">→</span>
        <input type="date" value={history.to} onChange={(e) => setTo(e.target.value)} />
      </div>
      <div className="hc-group">
        <label>Tracker</label>
        <div className="hc-toggle">
          {(['weekly', 'monthly'] as TrackerKind[]).map((k) => (
            <button
              key={k}
              type="button"
              className={`hc-toggle-btn ${history.kind === k ? 'active' : ''}`.trim()}
              onClick={() => setKind(k)}
            >
              {k === 'weekly' ? 'Weekly' : 'Monthly'}
            </button>
          ))}
        </div>
      </div>
      <div className="hc-group hc-presets">
        {PRESETS.map((preset) => (
          <button
            key={preset.p}
            type="button"
            className={`hc-preset ${history.preset === preset.p ? 'active' : ''}`.trim()}
            onClick={() => applyPreset(preset.p)}
          >
            {preset.l}
          </button>
        ))}
      </div>
      <div className="hc-group" style={{ marginLeft: 'auto' }}>
        <button className="ghost" onClick={onExportCsv}>
          Export CSV
        </button>
      </div>
    </div>
  );
}
