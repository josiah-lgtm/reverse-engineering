import { TRACKERS } from '../../engine/constants';
import type { TrackerKind } from '../../engine/types';
import { useStore } from '../../state/store';
import { TrackerEntryPicker } from './TrackerEntryPicker';
import { TrackerEntryCard } from './TrackerEntryCard';

export function TrackerSection({ kind }: { kind: TrackerKind }) {
  const t = TRACKERS[kind];
  const store = useStore((s) => (kind === 'weekly' ? s.weeklyEntries : s.monthlyEntries));
  const storedActive = useStore((s) => (kind === 'weekly' ? s.activeWeeklyId : s.activeMonthlyId));
  const trackerAdd = useStore((s) => s.trackerAdd);
  const trackerDuplicate = useStore((s) => s.trackerDuplicate);
  const trackerDelete = useStore((s) => s.trackerDelete);

  const ids = Object.keys(store).sort().reverse();
  const activeId = storedActive && store[storedActive] ? storedActive : ids[0] || null;
  const entry = activeId ? store[activeId] : null;

  return (
    <section className="section tracker-section">
      <div className="tracker-head">
        <div className="tracker-title-block">
          <h2>{kind === 'weekly' ? '📊 Weekly tracking' : '🗓 Monthly tracking'}</h2>
          <div className="sub">vs war plan</div>
        </div>
        <div className="tracker-controls">
          <TrackerEntryPicker kind={kind} ids={ids} activeId={activeId} store={store} />
          <button className="primary" onClick={() => trackerAdd(kind)}>
            {t.addLabel}
          </button>
          <button className="ghost" disabled={!activeId} onClick={() => trackerDuplicate(kind)}>
            Duplicate
          </button>
          <button
            className="ghost danger"
            disabled={!activeId}
            onClick={() => {
              if (activeId && window.confirm(`Delete this entry (${t.fmtLabel(activeId)})? This can't be undone.`)) {
                trackerDelete(kind, activeId);
              }
            }}
          >
            Delete
          </button>
        </div>
      </div>
      <div>
        {entry && activeId ? (
          <TrackerEntryCard kind={kind} id={activeId} entry={entry} />
        ) : (
          <div className="bd-empty">No entries yet. Click "{t.addLabel}" to create one.</div>
        )}
      </div>
    </section>
  );
}
