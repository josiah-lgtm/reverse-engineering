// ============================================================
// normalizeState — the full migration/backfill pipeline.
//
// Unlike the original loadState (which early-returned after a v1→v2
// migration and skipped backfills, and which skipped migrations on JSON
// import), this runs the ENTIRE pipeline on EVERY input — rehydrate AND
// import. That consciously fixes the two original migration-skip bugs while
// never corrupting already-correct v2 data.
// ============================================================

import { BD_MAP, NOTE_SECTIONS } from '../engine/constants';
import { currentMonthId } from '../engine/dates';
import { defaultPlan, defaultSettings, defaultState, emptyNotes } from '../engine/defaults';
import type {
  MonthId,
  NotesBlock,
  Plan,
  State,
  TrackerEntry,
  ViewKey,
} from '../engine/types';

type AnyRec = Record<string, any>;

const NOTE_KEYS = NOTE_SECTIONS.map((s) => s.k);
const VIEWS: ViewKey[] = ['reverse-engineering', 'monthly-planning', 'business-data', 'history'];

function backfillPlan(p: AnyRec): Plan {
  const dp = defaultPlan();

  // Legacy migrations FIRST — read genuine old fields before defaults mask them.
  // (The original ran backfill first, which made these migrations dead code and
  // discarded the user's old pricing/commission values. Running them first is a
  // conscious fix: it only touches plans missing the new fields, never v2 data.)

  // Pricing-model migration (cashPerClose/contractPerClose -> packagePrice + cashCollectedPct).
  const oldTotal = (p.cashPerClose || 0) + (p.contractPerClose || 0);
  if (p.packagePrice === undefined) p.packagePrice = oldTotal > 0 ? oldTotal : 15000;
  if (p.cashCollectedPct === undefined) {
    p.cashCollectedPct = oldTotal > 0 ? Math.round(((p.cashPerClose || 0) / oldTotal) * 100) : 67;
  }
  delete p.contractMonths;
  delete p.cashCollectedTarget;

  // Team-commission migration (flat £ -> %, renamed jr field).
  if (p.team) {
    if (p.team.jrCommissionPerQshow === undefined) {
      p.team.jrCommissionPerQshow = p.team.jrCommissionPerCall || 50;
      delete p.team.jrCommissionPerCall;
    }
    if (p.team.srCommissionPct === undefined) {
      const cash = p.cashPerClose || 1;
      const derived = ((p.team.srCommissionPerClose || 0) / cash) * 100;
      p.team.srCommissionPct = derived > 0 && derived <= 30 ? Math.round(derived) : 10;
      delete p.team.srCommissionPerClose;
    }
  }

  // THEN backfill any still-missing fields from defaults.
  (Object.keys(dp) as (keyof Plan)[]).forEach((k) => {
    if (p[k] === undefined) p[k] = (dp as AnyRec)[k];
  });
  // One level of nested-object backfill (matches the original's shallow merges).
  p.sales = { ...dp.sales, ...(p.sales || {}) };
  p.channels = {
    linkedin: { ...dp.channels.linkedin, ...((p.channels && p.channels.linkedin) || {}) },
    email: { ...dp.channels.email, ...((p.channels && p.channels.email) || {}) },
  };
  p.team = { ...dp.team, ...(p.team || {}) };
  p.notes = { ...dp.notes, ...(p.notes || {}) };
  if (p.notionPageUrl === undefined) p.notionPageUrl = '';
  if (p.notionPageId === undefined) p.notionPageId = '';

  // Enforce the dual-target invariant (cashTarget = revenueTarget × cashCollectedPct%)
  // AFTER revenue/pct/mode are guaranteed present. This self-heals the stale default
  // that the v1->v2 spread of defaultPlan() can leave behind, and any drift from a
  // hand-edited import. In cash mode the user's cashTarget is the source of truth;
  // otherwise revenue is. The invariant holds in BOTH modes, so this is idempotent.
  if (p.targetMode !== 'cash' && p.targetMode !== 'revenue') p.targetMode = 'revenue';
  {
    const pct = (p.cashCollectedPct || 0) / 100;
    if (p.targetMode === 'cash' && Number.isFinite(p.cashTarget) && pct > 0) {
      p.revenueTarget = p.cashTarget / pct;
    } else {
      p.cashTarget = (p.revenueTarget || 0) * pct;
    }
  }
  return p as Plan;
}

function normalizeNotes(raw: unknown): NotesBlock {
  const block = emptyNotes();
  if (typeof raw === 'string') {
    block.wins = raw; // legacy single string -> wins
    return block;
  }
  if (raw && typeof raw === 'object') {
    NOTE_KEYS.forEach((k) => {
      const v = (raw as AnyRec)[k];
      if (typeof v === 'string') block[k] = v;
    });
  }
  return block;
}

function normalizeEntry(raw: AnyRec, id: string, fallbackPlanMonth: MonthId): TrackerEntry {
  return {
    id,
    planMonth: raw.planMonth || fallbackPlanMonth,
    actuals: raw.actuals && typeof raw.actuals === 'object' ? raw.actuals : {},
    rowNotes: raw.rowNotes && typeof raw.rowNotes === 'object' ? raw.rowNotes : {},
    notes: normalizeNotes(raw.notes),
    openNotes: raw.openNotes && typeof raw.openNotes === 'object' ? raw.openNotes : {},
    notionPageId: raw.notionPageId || '',
    notionPageUrl: raw.notionPageUrl || '',
    ...(raw.savedToHistory ? { savedToHistory: true } : {}),
    ...(raw.savedAt ? { savedAt: raw.savedAt } : {}),
    ...(Array.isArray(raw.changeLog) ? { changeLog: raw.changeLog } : {}),
  };
}

/**
 * Run on a parsed-but-untrusted blob (or null). Always returns a valid State.
 * Any structural surprise falls back to sensible defaults rather than throwing.
 */
export function normalizeState(raw: unknown, today: Date = new Date()): State {
  if (!raw || typeof raw !== 'object') return defaultState(today);

  try {
    let s = raw as AnyRec;

    // v1 -> v2 (flat single-plan blob -> per-month map). Unlike the original we
    // DO NOT early-return; the wrapped object flows through the rest of the pipeline.
    if (s.revenueTarget !== undefined && !s.months) {
      const monthId = currentMonthId(today);
      const dp = defaultPlan();
      const migrated: AnyRec = { ...dp, ...s };
      if (s.sales) migrated.sales = { ...dp.sales, ...s.sales };
      if (s.channels) {
        migrated.channels = {
          linkedin: { ...dp.channels.linkedin, ...(s.channels.linkedin || {}) },
          email: { ...dp.channels.email, ...(s.channels.email || {}) },
        };
      }
      s = { activeMonth: monthId, months: { [monthId]: migrated } };
    }

    if (!s.months || typeof s.months !== 'object') return defaultState(today);

    // Per-month backfill + migrations.
    Object.keys(s.months).forEach((id) => {
      s.months[id] = backfillPlan(s.months[id] || {});
    });

    // activeMonth + top-level guards.
    if (!s.activeMonth || !s.months[s.activeMonth]) {
      s.activeMonth = Object.keys(s.months)[0] || currentMonthId(today);
      if (!s.months[s.activeMonth]) s.months[s.activeMonth] = defaultPlan();
    }
    s.settings = { ...defaultSettings(), ...(s.settings || {}) };
    if (!s.businessData) s.businessData = {};
    if (!s.weeklyEntries) s.weeklyEntries = {};
    if (!s.monthlyEntries) s.monthlyEntries = {};
    if (!s.activeView || !VIEWS.includes(s.activeView)) s.activeView = 'reverse-engineering';
    if (s.activeWeeklyId === undefined) s.activeWeeklyId = null;
    if (s.activeMonthlyId === undefined) s.activeMonthlyId = null;
    if (!s.history || typeof s.history !== 'object') {
      s.history = { kind: 'weekly', preset: 'all', from: '', to: '' };
    } else {
      if (s.history.kind !== 'weekly' && s.history.kind !== 'monthly') s.history.kind = 'weekly';
      if (!s.history.preset) s.history.preset = 'all';
      if (typeof s.history.from !== 'string') s.history.from = '';
      if (typeof s.history.to !== 'string') s.history.to = '';
    }

    // Weekly entries notes/openNotes/rowNotes backfill.
    Object.keys(s.weeklyEntries).forEach((id) => {
      s.weeklyEntries[id] = normalizeEntry(s.weeklyEntries[id] || {}, id, s.activeMonth);
    });

    // BD_MAP — legacy businessData -> monthlyEntries (never overwrites existing).
    Object.entries(s.businessData as AnyRec).forEach(([id, data]) => {
      if (s.monthlyEntries[id]) return;
      const actuals: Record<string, number> = {};
      Object.entries(BD_MAP).forEach(([oldK, newK]) => {
        const v = Number((data as AnyRec)[oldK]);
        if (isFinite(v) && v > 0) actuals[newK] = v;
      });
      const notes = emptyNotes();
      notes.wins = (data as AnyRec).notes || '';
      const planMonth = s.months[id] ? id : s.activeMonth || Object.keys(s.months)[0];
      s.monthlyEntries[id] = {
        id,
        planMonth,
        actuals,
        rowNotes: {},
        notes,
        openNotes: {},
        notionPageId: '',
        notionPageUrl: '',
      };
    });

    // Monthly entries notes/openNotes/rowNotes backfill.
    Object.keys(s.monthlyEntries).forEach((id) => {
      s.monthlyEntries[id] = normalizeEntry(s.monthlyEntries[id] || {}, id, s.activeMonth);
    });

    return s as State;
  } catch (e) {
    console.error('normalizeState failed; falling back to defaults', e);
    return defaultState(today);
  }
}
