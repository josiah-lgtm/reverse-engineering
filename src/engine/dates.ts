// ============================================================
// Date helpers — pure ports of the original (currentMonthId,
// fmtMonth, weekStartFor, weekEndIso, fmtWeekLabel, weekPlanMonth).
// `today` is injectable so callers/tests stay deterministic.
// NOTE: the original used LOCAL time (getFullYear/getMonth) — preserved.
// ============================================================

import type { EntryId, MonthId } from './types';

const MONTHS_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

/** "YYYY-MM" for the given (or current local) date. */
export function currentMonthId(today: Date = new Date()): MonthId {
  return `${today.getFullYear()}-${pad2(today.getMonth() + 1)}`;
}

/** "YYYY-MM" -> "June 2026" (en-GB). */
export function fmtMonth(id: MonthId): string {
  const [y, m] = id.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleString('en-GB', { month: 'long', year: 'numeric' });
}

/** ISO week start (Monday) as "YYYY-MM-DD". */
export function weekStartFor(date: Date): EntryId {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const dow = d.getDay();
  const diff = dow === 0 ? -6 : 1 - dow;
  d.setDate(d.getDate() + diff);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

/** Sunday Date that ends the week beginning at weekStart. */
export function weekEndIso(weekStart: EntryId): Date {
  const d = new Date(weekStart);
  d.setDate(d.getDate() + 6);
  return d;
}

/** "Week of Mon D–D, YYYY" (same month) or "Week of Mon D – Mon D, YYYY" (cross-month). */
export function fmtWeekLabel(weekStart: EntryId): string {
  const start = new Date(weekStart);
  const end = weekEndIso(weekStart);
  const sM = start.getMonth();
  const eM = end.getMonth();
  const y = end.getFullYear();
  if (sM === eM) {
    return `Week of ${MONTHS_SHORT[sM]} ${start.getDate()}–${end.getDate()}, ${y}`;
  }
  return `Week of ${MONTHS_SHORT[sM]} ${start.getDate()} – ${MONTHS_SHORT[eM]} ${end.getDate()}, ${y}`;
}

/** "YYYY-MM" of the week-start date — the war-plan month a week maps to. */
export function weekPlanMonth(weekStart: EntryId): MonthId {
  const d = new Date(weekStart);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`;
}

/** Advance a weekly id (Monday) by `delta` weeks, re-snapped to Monday. */
export function incrementWeekId(id: EntryId, delta: number): EntryId {
  const d = new Date(id);
  d.setDate(d.getDate() + 7 * delta);
  return weekStartFor(d);
}

/** Advance a monthly id "YYYY-MM" by `delta` months. */
export function incrementMonthId(id: MonthId, delta: number): MonthId {
  const [y, m] = id.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`;
}
