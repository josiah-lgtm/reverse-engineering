import { useState } from 'react';
import { trackerEffectiveActual, trackerStatus } from '../../engine/tracker';
import { isSectionRow } from '../../engine/types';
import type { EntryId, TrackerEntry, TrackerKind, TrackerMetricRow, TrackerRow } from '../../engine/types';
import { useFormatters } from '../../format/useMoney';
import { useStore } from '../../state/store';
import { ActualInput } from './ActualInput';

interface Group {
  section: string;
  rows: TrackerMetricRow[];
}

function groupRows(rows: TrackerRow[]): Group[] {
  const groups: Group[] = [];
  let cur: Group | null = null;
  for (const r of rows) {
    if (isSectionRow(r)) {
      cur = { section: r.section, rows: [] };
      groups.push(cur);
    } else if (cur) {
      cur.rows.push(r);
    }
  }
  return groups.filter((g) => g.rows.length > 0);
}

/** Scorecard "card view" — every metric as a status-coloured tile, grouped by section. */
export function TrackerCards({
  kind,
  id,
  rows,
  entry,
}: {
  kind: TrackerKind;
  id: EntryId;
  rows: TrackerRow[];
  entry: TrackerEntry;
}) {
  const { fmtNum } = useFormatters();
  const setRowNote = useStore((s) => s.setRowNote);
  const [openNotes, setOpenNotes] = useState<Record<string, boolean>>({});
  const actuals = entry.actuals || {};
  const rowNotes = entry.rowNotes || {};
  const groups = groupRows(rows);

  return (
    <div className="bd-cards">
      {groups.map((g) => (
        <div className="bd-section" key={g.section}>
          <div className="bd-section-title">{g.section}</div>
          <div className="bd-card-grid">
            {g.rows.map((r) => {
              const eff = trackerEffectiveActual(r, actuals);
              const actual = eff.value;
              const opts = { money: !!r.money, rate: !!r.rate };
              const status = r.noDelta
                ? { cls: 'neutral' as const, label: '—' }
                : trackerStatus(r.target, actual, !!r.lowerBetter);
              const showDelta = !r.noDelta && actual > 0;
              const delta = actual - r.target;
              const deltaTxt = showDelta
                ? (delta >= 0 ? '+' : '−') + fmtNum(Math.abs(delta), opts)
                : '';
              const note = rowNotes[r.k] || '';
              const hasNote = note.trim().length > 0;
              const isOpen = !!openNotes[r.k];
              return (
                <div className={`bd-metric ${status.cls} ${hasNote ? 'has-note' : ''}`.trim()} key={r.k}>
                  <div className="bm-head">
                    <span className="bm-lbl">{r.lbl}</span>
                    <button
                      type="button"
                      className="we-note-btn"
                      title={hasNote ? 'Edit note' : 'Add note'}
                      onClick={() => setOpenNotes((o) => ({ ...o, [r.k]: !o[r.k] }))}
                    >
                      {hasNote ? '✎' : '+'}
                    </button>
                  </div>
                  <div className="bm-main">
                    {eff.derived ? (
                      <span className="bm-actual derived" title="Auto-computed from your volume actuals">
                        {fmtNum(actual, opts)}
                        <span className="derived-tag">auto</span>
                      </span>
                    ) : (
                      <ActualInput kind={kind} id={id} row={r} actuals={actuals} />
                    )}
                    <span className="bm-target">target {fmtNum(r.target, opts)}</span>
                  </div>
                  <div className="bm-foot">
                    <span className={`we-status-pill ${status.cls}`}>{status.label}</span>
                    {deltaTxt && (
                      <span
                        className="bm-delta"
                        style={{ color: delta >= 0 ? 'var(--good)' : 'var(--bad)' }}
                      >
                        {deltaTxt}
                      </span>
                    )}
                  </div>
                  {r.conv && <div className="bm-conv">{r.conv}</div>}
                  {isOpen && (
                    <textarea
                      className="bm-note"
                      autoFocus
                      value={note}
                      placeholder={`note on ${r.lbl}…`}
                      onChange={(e) => setRowNote(kind, id, r.k, e.target.value)}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
