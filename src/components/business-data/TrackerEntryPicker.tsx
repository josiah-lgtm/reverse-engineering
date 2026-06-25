import { useEffect, useRef, useState } from 'react';
import { TRACKERS } from '../../engine/constants';
import { fmtMonth } from '../../engine/dates';
import { compute } from '../../engine/compute';
import { trackerEntryScore, trackerTargetRows } from '../../engine/tracker';
import type { EntryId, TrackerEntry, TrackerKind } from '../../engine/types';
import { useFormatters } from '../../format/useMoney';
import { useStore } from '../../state/store';

export function TrackerEntryPicker({
  kind, ids, activeId, store,
}: {
  kind: TrackerKind;
  ids: EntryId[];
  activeId: EntryId | null;
  store: Record<EntryId, TrackerEntry>;
}) {
  const t = TRACKERS[kind];
  const months = useStore((s) => s.months);
  const activeMonth = useStore((s) => s.activeMonth);
  const setActive = useStore((s) => s.trackerSetActive);
  const fmt = useFormatters();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('click', onDoc);
    return () => document.removeEventListener('click', onDoc);
  }, [open]);

  function scorePct(entry: TrackerEntry): number | null {
    const plan = months[entry.planMonth] ?? months[activeMonth];
    if (!plan) return null;
    const rows = trackerTargetRows(kind, plan, compute(plan), fmt);
    return trackerEntryScore(rows, entry).pct;
  }

  const current = activeId ? store[activeId] : null;

  return (
    <div className="tracker-picker" ref={ref}>
      <button type="button" className="picker-trigger" onClick={() => setOpen((o) => !o)}>
        <span>{current && activeId ? t.fmtLabel(activeId) : 'No entries yet'}</span>
        <span className="caret">▾</span>
      </button>
      {open && (
        <div className="picker-menu">
          {ids.length === 0 ? (
            <div className="picker-empty">Click +Add… to create one</div>
          ) : (
            ids.map((id) => {
              const e = store[id];
              const pct = scorePct(e);
              return (
                <button
                  key={id}
                  type="button"
                  className={`picker-option ${id === activeId ? 'active' : ''}`.trim()}
                  onClick={() => {
                    setActive(kind, id);
                    setOpen(false);
                  }}
                >
                  <span className="po-lbl">{t.fmtLabel(id)}</span>
                  <span className="po-meta">
                    vs {fmtMonth(e.planMonth)}
                    {pct != null ? ` · ${Math.round(pct)}%` : ''}
                  </span>
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
