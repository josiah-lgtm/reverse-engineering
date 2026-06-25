// ============================================================
// Static config — currency symbols, funnel stage metadata,
// note sections, the legacy BD_MAP migration map, and the
// per-kind TRACKERS config (the only weekly/monthly difference).
// ============================================================

import type {
  Currency,
  EntryId,
  FunnelStage,
  MonthId,
  NoteSection,
  Plan,
  TrackerKind,
} from './types';
import {
  currentMonthId,
  fmtMonth,
  fmtWeekLabel,
  incrementMonthId,
  incrementWeekId,
  weekPlanMonth,
  weekStartFor,
} from './dates';

export const CURRENCY_SYMBOLS: Record<Currency, string> = { GBP: '£', USD: '$', EUR: '€' };

// Funnel stages, top -> bottom. Hero stages get a ±variance chip.
export const FUNNEL_STAGES: FunnelStage[] = [
  { lbl: 'Call 1 booked', noteKey: 'bookings', valKey: 'bookings', hero: true },
  { lbl: 'Call 1 shows', noteKey: 'shows1', valKey: 'shows1' },
  { lbl: 'Call 1 qual shows', noteKey: 'qual1', valKey: 'qual1' },
  { lbl: 'Call 2 bookings', noteKey: 'book2', valKey: 'book2' },
  { lbl: 'Call 2 shows', noteKey: 'shows2', valKey: 'shows2' },
  { lbl: 'Call 2 qual shows', noteKey: 'qshows2', valKey: 'qshows2' },
  { lbl: 'Offers', noteKey: 'offers', valKey: 'offers' },
  { lbl: 'Closes', noteKey: 'closes', valKey: 'closes', hero: true },
];

// The six free-text note sections shared by every tracker entry.
export const NOTE_SECTIONS: NoteSection[] = [
  { k: 'announcements', icon: '📢', lbl: 'Announcements', placeholder: 'Team-wide announcements for this period…' },
  { k: 'wins', icon: '🏆', lbl: 'Wins', placeholder: 'What went well…' },
  { k: 'blockers', icon: '⛔', lbl: 'Blockers', placeholder: "What's in the way…" },
  { k: 'premortem', icon: '⚠', lbl: 'Pre-mortem', placeholder: 'What could go wrong from here…' },
  { k: 'bottleneck', icon: '🚧', lbl: 'Current Bottleneck', placeholder: 'The single biggest constraint right now…' },
  { k: 'bigplay', icon: '💎', lbl: '$100M Play', placeholder: 'The highest-leverage move available…' },
];

// Legacy businessData field -> modern wp_* actuals key.
export const BD_MAP: Record<string, string> = {
  revenueActual: 'wp_revenueTarget',
  cashCollectedActual: 'wp_cashCollectedTarget',
  closesActual: 'wp_closes',
  bookingsActual: 'wp_bookings',
  linkedinConnectionsActual: 'wp_li_connections',
  emailSendsActual: 'wp_em_sends',
};

export interface TrackerConfig {
  kind: TrackerKind;
  storeKey: 'weeklyEntries' | 'monthlyEntries';
  activeKey: 'activeWeeklyId' | 'activeMonthlyId';
  targetHeader: string;
  addLabel: string;
  pickerInputType: 'date' | 'month';
  divisor: (p: Plan) => number;
  fmtLabel: (id: EntryId) => string;
  fmtShortLabel: (id: EntryId) => string;
  suggestId: (today?: Date) => EntryId;
  inferPlanMonth: (id: EntryId) => MonthId;
  incrementId: (id: EntryId, delta: number) => EntryId;
}

export const TRACKERS: Record<TrackerKind, TrackerConfig> = {
  weekly: {
    kind: 'weekly',
    storeKey: 'weeklyEntries',
    activeKey: 'activeWeeklyId',
    targetHeader: 'Weekly target',
    addLabel: '+ Add this week',
    pickerInputType: 'date',
    divisor: (p) => p.workingDaysPerMonth / p.workingDaysPerWeek,
    fmtLabel: (id) => fmtWeekLabel(id),
    fmtShortLabel: (id) => fmtWeekLabel(id).replace(/^Week of /, ''),
    suggestId: (today = new Date()) => weekStartFor(today),
    inferPlanMonth: (id) => weekPlanMonth(id),
    incrementId: (id, delta) => incrementWeekId(id, delta),
  },
  monthly: {
    kind: 'monthly',
    storeKey: 'monthlyEntries',
    activeKey: 'activeMonthlyId',
    targetHeader: 'Monthly target',
    addLabel: '+ Add this month',
    pickerInputType: 'month',
    divisor: () => 1,
    fmtLabel: (id) => fmtMonth(id),
    fmtShortLabel: (id) => fmtMonth(id),
    suggestId: (today = new Date()) => currentMonthId(today),
    inferPlanMonth: (id) => id,
    incrementId: (id, delta) => incrementMonthId(id, delta),
  },
};

// Sales funnel rate rows, in the order the plan-markdown emits them.
export const SALES_RATE_LABELS: { k: keyof Plan['sales']; lbl: string }[] = [
  { k: 'show1Rate', lbl: 'Call 1 show rate' },
  { k: 'qual1Rate', lbl: 'Call 1 qualification' },
  { k: 'book2Rate', lbl: 'Call 2 booking' },
  { k: 'sched2Rate', lbl: 'Call 2 scheduled' },
  { k: 'show2Rate', lbl: 'Call 2 show rate' },
  { k: 'qshow2Rate', lbl: 'Call 2 qualified-show rate' },
  { k: 'offerRate', lbl: 'Offer rate' },
  { k: 'closeRate', lbl: 'Close rate' },
];
