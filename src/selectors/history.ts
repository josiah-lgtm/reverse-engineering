// ============================================================
// History selectors — pure ports of historyApplyPreset (presetToRange),
// historyEntriesInRange, historyDashboardData, and CSV export.
// ============================================================

import { TRACKERS } from '../engine/constants';
import { fmtMonth } from '../engine/dates';
import { compute } from '../engine/compute';
import { trackerEffectiveActual, trackerTargetRows } from '../engine/tracker';
import type { Formatters } from '../format/formatters';
import type {
  Computed,
  HistoryRange,
  MonthId,
  Plan,
  State,
  TrackerEntry,
  TrackerKind,
  TrackerMetricRow,
} from '../engine/types';

const DAY = 86400000;

export function histIsoDate(d: Date): string {
  return new Date(d).toISOString().slice(0, 10);
}

function allEntryIds(state: State): string[] {
  return [...Object.keys(state.weeklyEntries), ...Object.keys(state.monthlyEntries)];
}

/** Pure port of historyApplyPreset's range computation. */
export function presetToRange(
  preset: string,
  state: State,
  today: Date = new Date(),
): { from: string; to: string } {
  const to = histIsoDate(today);
  let from = '';
  if (preset === '4w') from = histIsoDate(new Date(today.getTime() - 28 * DAY));
  else if (preset === '8w') from = histIsoDate(new Date(today.getTime() - 56 * DAY));
  else if (preset === '13w') from = histIsoDate(new Date(today.getTime() - 91 * DAY));
  else if (preset === 'ytd') from = `${today.getFullYear()}-01-01`;
  else if (preset === 'all') {
    const ids = allEntryIds(state).sort();
    let earliest = ids[0] || '';
    if (/^\d{4}-\d{2}$/.test(earliest)) earliest += '-01';
    from = earliest || '2020-01-01';
    if (from > to) from = '2020-01-01';
  }
  return { from, to };
}

export interface HistoryEntry {
  id: string;
  entry: TrackerEntry;
}

/** Aggregate + filter + sort (newest-first) the active kind's entries. */
export function historyEntriesInRange(state: State, history: HistoryRange): HistoryEntry[] {
  const store = history.kind === 'weekly' ? state.weeklyEntries : state.monthlyEntries;
  const { from, to } = history;
  const out: HistoryEntry[] = [];
  Object.entries(store).forEach(([id, entry]) => {
    let inRange: boolean;
    if (history.kind === 'monthly') {
      const monthStart = `${id}-01`;
      const monthEnd = `${id}-31`;
      inRange = monthEnd >= from && monthStart <= to;
    } else {
      inRange = id >= from && id <= to;
    }
    if (inRange) out.push({ id, entry });
  });
  out.sort((a, b) => b.id.localeCompare(a.id));
  return out;
}

/** Resolve the plan-month used for the whole grid's columns (defensive fallback). */
export function columnPlanMonth(state: State, entries: HistoryEntry[]): MonthId {
  const candidate = entries[0]?.entry.planMonth;
  return candidate && state.months[candidate] ? candidate : state.activeMonth;
}

export interface HistoryDashboard {
  count: number;
  scorePct: number | null;
  totals: Record<string, number>;
}

export function historyDashboardData(
  kind: TrackerKind,
  entries: HistoryEntry[],
  planFor: (planMonth: MonthId) => { plan: Plan; computed: Computed },
  fmt: Formatters,
): HistoryDashboard {
  if (!entries.length) return { count: 0, scorePct: null, totals: {} };
  const totals: Record<string, number> = {};
  let scoreNum = 0;
  let scoreDen = 0;
  entries.forEach(({ entry }) => {
    const { plan, computed } = planFor(entry.planMonth);
    const rows = trackerTargetRows(kind, plan, computed, fmt);
    rows.forEach((r) => {
      if ('section' in r || r.rate || r.noDelta) return;
      const actual = Number(entry.actuals[r.k]) || 0;
      if (!actual) return;
      totals[r.k] = (totals[r.k] || 0) + actual;
      scoreDen++;
      const ahead = r.lowerBetter ? actual <= r.target : actual >= r.target;
      if (ahead) scoreNum++;
    });
  });
  return {
    count: entries.length,
    scorePct: scoreDen ? Math.round((scoreNum / scoreDen) * 100) : null,
    totals,
  };
}

function escapeCsv(v: string): string {
  if (/[",\n]/.test(v)) return `"${v.replace(/"/g, '""')}"`;
  return v;
}

/** CSV string of RAW stored actuals (unformatted, blank-as-empty) — matches the original. */
export function entriesToCsv(
  kind: TrackerKind,
  entries: HistoryEntry[],
  columns: TrackerMetricRow[],
): string {
  const t = TRACKERS[kind];
  const header = ['Entry', 'Plan month', ...columns.map((c) => c.lbl)];
  const lines = [header.map(escapeCsv).join(',')];
  entries.forEach(({ id, entry }) => {
    const cells = [
      t.fmtLabel(id),
      fmtMonth(entry.planMonth),
      ...columns.map((r) => {
        const raw = Number(entry.actuals[r.k]) || 0;
        return raw || '';
      }),
    ];
    lines.push(cells.map((c) => escapeCsv(String(c))).join(','));
  });
  return lines.join('\n');
}

export { trackerEffectiveActual, compute };
