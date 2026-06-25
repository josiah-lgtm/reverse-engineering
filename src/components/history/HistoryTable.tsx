import { useEffect, useRef, useState } from 'react';
import { TRACKERS } from '../../engine/constants';
import { fmtMonth } from '../../engine/dates';
import { trackerEffectiveActual, trackerStatus } from '../../engine/tracker';
import type { TrackerKind, TrackerMetricRow } from '../../engine/types';
import type { HistoryEntry } from '../../selectors/history';
import type { Formatters } from '../../format/formatters';
import { useStore } from '../../state/store';

interface OpenNote {
  (td: HTMLElement, eid: string, mk: string): void;
}

function EditableCell({
  kind, eid, col, raw, display, statusCls, hasNote, onOpenNote,
}: {
  kind: TrackerKind;
  eid: string;
  col: TrackerMetricRow;
  raw: number;
  display: string;
  statusCls: string;
  hasNote: boolean;
  onOpenNote: OpenNote;
}) {
  const updateActual = useStore((s) => s.updateActual);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const tdRef = useRef<HTMLTableCellElement>(null);

  function commit() {
    const v = parseFloat(draft);
    updateActual(kind, eid, col.k, isFinite(v) ? v : null);
    setEditing(false);
  }

  return (
    <td
      ref={tdRef}
      className={`editable cell-${statusCls} ${hasNote ? 'has-note' : ''}`.trim()}
      data-eid={eid}
      onClick={(e) => {
        if (editing) return;
        if ((e.target as HTMLElement).closest('.note-btn')) return;
        setDraft(raw ? String(raw) : '');
        setEditing(true);
      }}
    >
      {editing ? (
        <input
          type="number"
          min={0}
          step={0.01}
          className="cell-input"
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') e.currentTarget.blur();
            if (e.key === 'Escape') setEditing(false);
          }}
        />
      ) : (
        <>
          {display}
          {hasNote && <span className="note-pin" />}
          <button
            type="button"
            className="note-btn"
            onClick={(e) => {
              e.stopPropagation();
              if (tdRef.current) onOpenNote(tdRef.current, eid, col.k);
            }}
          >
            ✎
          </button>
        </>
      )}
    </td>
  );
}

export function HistoryTable({
  kind, entries, columns, fmt, onOpenNote, flashEntryId, totalInStore,
}: {
  kind: TrackerKind;
  entries: HistoryEntry[];
  columns: TrackerMetricRow[] | null;
  fmt: Formatters;
  onOpenNote: OpenNote;
  flashEntryId: string | null;
  totalInStore: number;
}) {
  const t = TRACKERS[kind];
  const clearFlash = useStore((s) => s.flashEntry);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!flashEntryId) return;
    const row = wrapRef.current?.querySelector(`tr[data-eid="${flashEntryId}"]`);
    if (row) {
      row.scrollIntoView({ behavior: 'smooth', block: 'center' });
      row.classList.add('flash');
      const tm = setTimeout(() => {
        row.classList.remove('flash');
        clearFlash(null);
      }, 1800);
      return () => clearTimeout(tm);
    }
    clearFlash(null);
  }, [flashEntryId, clearFlash]);

  if (columns === null) {
    return (
      <div className="hist-table-wrap" ref={wrapRef}>
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--bad)' }}>
          Could not build the table for this range — try a different war-plan month.
        </div>
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="hist-table-wrap" ref={wrapRef}>
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-tertiary)' }}>
          {totalInStore > 0
            ? `You have ${totalInStore} ${kind} ${totalInStore === 1 ? 'entry' : 'entries'} in total — they're outside this range. Click All above to see everything.`
            : 'Add entries from the Business Data page first, then Save to History.'}
        </div>
      </div>
    );
  }

  return (
    <div className="hist-table-wrap" ref={wrapRef}>
      <table className="hist-table">
        <thead>
          <tr>
            <th className="sticky-left">Entry</th>
            {columns.map((col) => (
              <th key={col.k} title={col.lbl + (col.conv ? ` · ${col.conv}` : '')}>
                {col.lbl}
                <span className="col-target">
                  {fmt.fmtNum(col.target, { money: !!col.money, rate: !!col.rate })}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {entries.map(({ id, entry }) => (
            <tr key={id} data-eid={id}>
              <td className="sticky-left">
                {t.fmtLabel(id)}
                {entry.savedToHistory && (
                  <span
                    className="saved-chip"
                    title={`Saved to History${entry.savedAt ? ' on ' + new Date(entry.savedAt).toLocaleString('en-GB') : ''}`}
                  >
                    ✓
                  </span>
                )}
                <span className="meta">vs {fmtMonth(entry.planMonth)}</span>
              </td>
              {columns.map((col) => {
                const eff = trackerEffectiveActual(col, entry.actuals);
                const actual = eff.value;
                const status = !actual
                  ? { cls: 'neutral' }
                  : trackerStatus(col.target, actual, !!col.lowerBetter);
                const opts = { money: !!col.money, rate: !!col.rate };
                const note = (entry.rowNotes || {})[col.k] || '';
                return (
                  <EditableCell
                    key={col.k}
                    kind={kind}
                    eid={id}
                    col={col}
                    raw={Number(entry.actuals[col.k]) || 0}
                    display={actual ? fmt.fmtNum(actual, opts) : '—'}
                    statusCls={status.cls}
                    hasNote={note.trim().length > 0}
                    onOpenNote={onOpenNote}
                  />
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
