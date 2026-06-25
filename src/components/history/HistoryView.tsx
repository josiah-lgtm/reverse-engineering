import { useMemo, useState } from 'react';
import { compute } from '../../engine/compute';
import { trackerTargetRows } from '../../engine/tracker';
import { isSectionRow } from '../../engine/types';
import type { State, TrackerMetricRow } from '../../engine/types';
import {
  columnPlanMonth,
  entriesToCsv,
  historyDashboardData,
  historyEntriesInRange,
} from '../../selectors/history';
import { useFormatters } from '../../format/useMoney';
import { useStore } from '../../state/store';
import { HistoryControls } from './HistoryControls';
import { HistoryDashboard } from './HistoryDashboard';
import { HistoryTable } from './HistoryTable';
import { CellNotePopover } from './CellNotePopover';

interface PopoverState {
  eid: string;
  mk: string;
  left: number;
  top: number;
}

export function HistoryView() {
  const fmt = useFormatters();
  const weeklyEntries = useStore((s) => s.weeklyEntries);
  const monthlyEntries = useStore((s) => s.monthlyEntries);
  const months = useStore((s) => s.months);
  const activeMonth = useStore((s) => s.activeMonth);
  const history = useStore((s) => s.history)!;
  const flashEntryId = useStore((s) => s.flashEntryId);
  const setRowNote = useStore((s) => s.setRowNote);
  const [popover, setPopover] = useState<PopoverState | null>(null);

  const kind = history.kind;
  const stateLike = { weeklyEntries, monthlyEntries, months, activeMonth } as unknown as State;

  const entries = useMemo(
    () => historyEntriesInRange(stateLike, history),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [weeklyEntries, monthlyEntries, history],
  );

  const planMonth = columnPlanMonth(stateLike, entries);
  const planObj = months[planMonth] ?? months[activeMonth];

  const columns = useMemo<TrackerMetricRow[] | null>(() => {
    if (!planObj) return null;
    try {
      return trackerTargetRows(kind, planObj, compute(planObj), fmt).filter(
        (r): r is TrackerMetricRow => !isSectionRow(r) && !r.noDelta,
      );
    } catch (e) {
      console.error('History column build failed', e);
      return null;
    }
  }, [kind, planObj, fmt]);

  const dashboard = useMemo(
    () =>
      historyDashboardData(
        kind,
        entries,
        (pm) => {
          const p = months[pm] ?? months[activeMonth];
          return { plan: p, computed: compute(p) };
        },
        fmt,
      ),
    [kind, entries, months, activeMonth, fmt],
  );

  const totalInStore = Object.keys(kind === 'weekly' ? weeklyEntries : monthlyEntries).length;

  function openNote(td: HTMLElement, eid: string, mk: string) {
    const rect = td.getBoundingClientRect();
    const popW = 280;
    const left = Math.max(8, Math.min(rect.left, window.innerWidth - popW - 8));
    setPopover({ eid, mk, left, top: rect.bottom + 6 });
  }

  function exportCsv() {
    if (!columns || entries.length === 0) {
      window.alert('No entries in range to export.');
      return;
    }
    const csv = entriesToCsv(kind, entries, columns);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `history-${kind}-${history.from}-to-${history.to}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  const popoverNote = popover
    ? ((kind === 'weekly' ? weeklyEntries : monthlyEntries)[popover.eid]?.rowNotes || {})[popover.mk] || ''
    : '';

  return (
    <div className="container">
      <div className="header">
        <h1>📈 History</h1>
        <div className="sub">
          Every weekly and monthly entry you've saved, aggregated into one editable grid. Filter by
          date range, edit any cell inline, and attach per-cell notes.
        </div>
      </div>

      <HistoryControls onExportCsv={exportCsv} />
      <HistoryDashboard kind={kind} data={dashboard} from={history.from} to={history.to} fmt={fmt} />
      <HistoryTable
        kind={kind}
        entries={entries}
        columns={columns}
        fmt={fmt}
        onOpenNote={openNote}
        flashEntryId={flashEntryId}
        totalInStore={totalInStore}
      />

      {popover && (
        <CellNotePopover
          left={popover.left}
          top={popover.top}
          value={popoverNote}
          onChange={(v) => setRowNote(kind, popover.eid, popover.mk, v)}
          onClose={() => setPopover(null)}
        />
      )}
    </div>
  );
}
