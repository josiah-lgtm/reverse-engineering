import { useEffect, useRef, useState } from 'react';
import {
  trackerEffectiveActual,
  trackerStatus,
} from '../../engine/tracker';
import { isSectionRow } from '../../engine/types';
import type { EntryId, TrackerEntry, TrackerKind, TrackerMetricRow, TrackerRow } from '../../engine/types';
import { useFormatters } from '../../format/useMoney';
import { useStore } from '../../state/store';

function ActualInput({
  kind, id, row, actuals,
}: {
  kind: TrackerKind;
  id: EntryId;
  row: TrackerMetricRow;
  actuals: Record<string, number>;
}) {
  const updateActual = useStore((s) => s.updateActual);
  const stored = Number(actuals[row.k]) || 0;
  const [draft, setDraft] = useState(stored ? String(stored) : '');
  const focused = useRef(false);
  useEffect(() => {
    if (!focused.current) setDraft(stored ? String(stored) : '');
  }, [stored]);
  const step = row.money ? '1' : '0.1';
  return (
    <input
      type="number"
      min={0}
      step={step}
      className="we-actual"
      placeholder="0"
      value={draft}
      onFocus={() => (focused.current = true)}
      onChange={(e) => {
        setDraft(e.target.value);
        const v = parseFloat(e.target.value);
        updateActual(kind, id, row.k, isFinite(v) ? v : null);
      }}
      onBlur={() => {
        focused.current = false;
        setDraft(stored ? String(stored) : '');
      }}
    />
  );
}

export function TrackerTable({
  kind, id, rows, entry, targetHeader,
}: {
  kind: TrackerKind;
  id: EntryId;
  rows: TrackerRow[];
  entry: TrackerEntry;
  targetHeader: string;
}) {
  const { fmtNum } = useFormatters();
  const setRowNote = useStore((s) => s.setRowNote);
  const [openNotes, setOpenNotes] = useState<Record<string, boolean>>({});
  const actuals = entry.actuals || {};
  const rowNotes = entry.rowNotes || {};

  return (
    <table className="we-table">
      <thead>
        <tr>
          <th>Metric</th>
          <th className="num">{targetHeader}</th>
          <th className="num">Actual</th>
          <th className="num">Δ</th>
          <th className="num">Status</th>
          <th>Context</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => {
          if (isSectionRow(r)) {
            return (
              <tr className="section-row" key={`s${i}`}>
                <td colSpan={6}>{r.section}</td>
              </tr>
            );
          }
          const eff = trackerEffectiveActual(r, actuals);
          const actual = eff.value;
          const delta = actual - r.target;
          const status = r.noDelta
            ? { cls: 'neutral' as const, label: '—' }
            : trackerStatus(r.target, actual, !!r.lowerBetter);
          const showDelta = !r.noDelta && actual > 0;
          const opts = { money: !!r.money, rate: !!r.rate };
          const deltaTxt = showDelta ? (delta >= 0 ? '+' : '−') + fmtNum(Math.abs(delta), opts) : '—';
          const deltaColor = showDelta
            ? delta >= 0
              ? 'var(--good)'
              : 'var(--bad)'
            : 'var(--text-tertiary)';
          const note = rowNotes[r.k] || '';
          const hasNote = note.trim().length > 0;
          const isOpen = !!openNotes[r.k];

          return (
            <RowFragment key={r.k}>
              <tr className={hasNote ? 'has-note' : ''}>
                <td className="lbl">
                  {r.lbl}
                  <button
                    type="button"
                    className="we-note-btn"
                    title={hasNote ? 'Edit note' : 'Add note'}
                    onClick={() => setOpenNotes((o) => ({ ...o, [r.k]: !o[r.k] }))}
                  >
                    {hasNote ? '✎' : '+'}
                  </button>
                </td>
                <td className="num">{fmtNum(r.target, opts)}</td>
                <td className="num">
                  {eff.derived ? (
                    <div className="we-actual derived" title="Auto-computed from your volume actuals">
                      {fmtNum(actual, opts)}
                      <span className="derived-tag">auto</span>
                    </div>
                  ) : (
                    <ActualInput kind={kind} id={id} row={r} actuals={actuals} />
                  )}
                </td>
                <td className="num" style={{ color: deltaColor, fontWeight: 600 }}>
                  {deltaTxt}
                </td>
                <td className="num">
                  <span className={`we-status-pill ${status.cls}`}>{status.label}</span>
                </td>
                <td className="conv">{r.conv || ''}</td>
              </tr>
              {isOpen && (
                <tr className="we-note-row">
                  <td colSpan={6}>
                    <textarea
                      autoFocus
                      value={note}
                      placeholder={`note on ${r.lbl}…`}
                      onChange={(e) => setRowNote(kind, id, r.k, e.target.value)}
                    />
                  </td>
                </tr>
              )}
            </RowFragment>
          );
        })}
      </tbody>
    </table>
  );
}

function RowFragment({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
