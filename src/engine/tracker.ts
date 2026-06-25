// ============================================================
// Tracker engine — pure ports of trackerTargetRows, trackerEffectiveActual,
// trackerStatus, trackerEntryScore. The original swapped state.activeMonth
// via withActiveMonth(); here the caller passes the plan + its computed
// directly (planMonth is implicit in which pair is passed).
// ============================================================

import { TRACKERS } from './constants';
import type {
  Computed,
  Plan,
  TrackerEntry,
  TrackerKind,
  TrackerMetricRow,
  TrackerRow,
} from './types';
import type { Formatters } from '../format/formatters';

export type StatusCls = 'good' | 'warn' | 'bad' | 'neutral';

// Returns null when EITHER operand is falsy (0 → null) — preserved exactly.
function ratePct(numr: number, den: number): number | null {
  return numr && den ? (numr / den) * 100 : null;
}

export function trackerTargetRows(
  kind: TrackerKind,
  plan: Plan,
  computed: Computed,
  fmt: Formatters,
): TrackerRow[] {
  const p = plan;
  const c = computed;
  const div = TRACKERS[kind].divisor(p);
  const scale = (mo: number) => mo / div;
  const rows: TrackerRow[] = [];

  rows.push({ section: 'Revenue & sales funnel' });
  rows.push({ k: 'wp_revenueTarget', lbl: 'Contracted revenue', target: scale(p.revenueTarget), money: true });
  rows.push({ k: 'wp_cashCollectedTarget', lbl: 'Cash collected', target: scale(c.cashCollectedTarget), money: true, conv: `${p.cashCollectedPct}% of contracted` });
  rows.push({ k: 'wp_closes', lbl: 'Closes', target: scale(c.closes), conv: `${fmt.money(c.packagePrice)} per close` });
  rows.push({ k: 'wp_offers', lbl: 'Offers', target: scale(c.offers), conv: `${p.sales.closeRate}% close rate` });
  rows.push({ k: 'wp_qshows2', lbl: 'Call 2 qualified shows', target: scale(c.qshows2), conv: `${p.sales.offerRate}% offer rate` });
  rows.push({ k: 'wp_shows2', lbl: 'Call 2 shows', target: scale(c.shows2), conv: `${p.sales.qshow2Rate}% qual-show rate` });
  rows.push({ k: 'wp_book2', lbl: 'Call 2 bookings', target: scale(c.book2), conv: `${p.sales.book2Rate}% → call 2 booked` });
  rows.push({ k: 'wp_qual1', lbl: 'Call 1 qualified shows', target: scale(c.qual1), conv: `${p.sales.qual1Rate}% qual-show rate` });
  rows.push({ k: 'wp_shows1', lbl: 'Call 1 shows', target: scale(c.shows1), conv: `${p.sales.show1Rate}% show rate` });
  rows.push({ k: 'wp_bookings', lbl: 'Call 1 bookings', target: scale(c.bookings) });

  rows.push({ section: 'Conversion rates — sales funnel (auto from your actuals)' });
  rows.push({ k: 'cv_show1', lbl: 'Call 1 show rate', target: p.sales.show1Rate, rate: true, conv: '= Call 1 shows ÷ Call 1 bookings', derive: (a) => ratePct(a.wp_shows1, a.wp_bookings) });
  rows.push({ k: 'cv_qual1', lbl: 'Call 1 qual rate', target: p.sales.qual1Rate, rate: true, conv: '= Call 1 qual shows ÷ Call 1 shows', derive: (a) => ratePct(a.wp_qual1, a.wp_shows1) });
  rows.push({ k: 'cv_book2', lbl: 'Call 2 book rate', target: p.sales.book2Rate, rate: true, conv: '= Call 2 bookings ÷ Call 1 qual shows', derive: (a) => ratePct(a.wp_book2, a.wp_qual1) });
  rows.push({ k: 'cv_show2', lbl: 'Call 2 show rate (book→show, combined)', target: (p.sales.sched2Rate * p.sales.show2Rate) / 100, rate: true, conv: '= Call 2 shows ÷ Call 2 bookings · combined sched + show', derive: (a) => ratePct(a.wp_shows2, a.wp_book2) });
  rows.push({ k: 'cv_qshow2', lbl: 'Call 2 qual-show rate', target: p.sales.qshow2Rate, rate: true, conv: '= Call 2 qual shows ÷ Call 2 shows', derive: (a) => ratePct(a.wp_qshows2, a.wp_shows2) });
  rows.push({ k: 'cv_offer', lbl: 'Offer rate', target: p.sales.offerRate, rate: true, conv: '= Offers ÷ Call 2 qual shows', derive: (a) => ratePct(a.wp_offers, a.wp_qshows2) });
  rows.push({ k: 'cv_close', lbl: 'Close rate', target: p.sales.closeRate, rate: true, conv: '= Closes ÷ Offers', derive: (a) => ratePct(a.wp_closes, a.wp_offers) });
  rows.push({ k: 'cv_book2close', lbl: 'Call 1 booked → closed (full funnel)', target: c.bookingToClose * 100, rate: true, conv: '= Closes ÷ Call 1 bookings · full-funnel conversion', derive: (a) => ratePct(a.wp_closes, a.wp_bookings) });

  rows.push({ section: 'Channels — outreach volume' });
  (Object.entries(c.channelOutputs) as [string, { connections?: number; accepts?: number; positives: number; calendlyClicks?: number; bk: number; profilesNeeded?: number; sends?: number; replies?: number; inboxesNeeded?: number }][]).forEach(([k, out]) => {
    const ch = p.channels[k as keyof Plan['channels']];
    if (!ch.enabled) return;
    if (k === 'linkedin') {
      rows.push({ k: 'wp_li_connections', lbl: 'LinkedIn connections sent', target: scale(out.connections!) });
      rows.push({ k: 'wp_li_accepts', lbl: 'LinkedIn accepts', target: scale(out.accepts!), conv: 'feeds accept rate' });
      rows.push({ k: 'wp_li_positives', lbl: 'LinkedIn positive replies', target: scale(out.positives), conv: 'feeds PRR' });
      rows.push({ k: 'wp_li_calendly', lbl: 'LinkedIn Calendly clicks', target: scale(out.calendlyClicks!), conv: 'feeds CSR' });
      rows.push({ k: 'wp_li_bookings', lbl: 'LinkedIn bookings', target: scale(out.bk), conv: 'feeds ABR' });
      rows.push({ k: 'wp_li_profiles', lbl: 'LinkedIn sender profiles', target: out.profilesNeeded!, conv: 'monthly headcount', noDelta: true });
    }
    if (k === 'email') {
      rows.push({ k: 'wp_em_sends', lbl: 'Email sends', target: scale(out.sends!) });
      rows.push({ k: 'wp_em_replies', lbl: 'Email replies', target: scale(out.replies!), conv: 'feeds reply rate' });
      rows.push({ k: 'wp_em_positives', lbl: 'Email positive replies', target: scale(out.positives), conv: 'feeds PRR' });
      rows.push({ k: 'wp_em_bookings', lbl: 'Email bookings', target: scale(out.bk), conv: 'feeds ABR' });
      rows.push({ k: 'wp_em_inboxes', lbl: 'Email inboxes', target: out.inboxesNeeded!, conv: 'monthly headcount', noDelta: true });
    }
  });

  rows.push({ section: 'Conversion rates — auto-computed from your volume actuals' });
  if (p.channels.linkedin && p.channels.linkedin.enabled) {
    const li = p.channels.linkedin;
    rows.push({ k: 'cv_li_acceptRate', lbl: 'LinkedIn accept rate', target: li.acceptRate, rate: true, conv: '= accepts ÷ connections', derive: (a) => ratePct(a.wp_li_accepts, a.wp_li_connections) });
    rows.push({ k: 'cv_li_prr', lbl: 'LinkedIn positive reply rate', target: li.prr, rate: true, conv: '= positives ÷ accepts', derive: (a) => ratePct(a.wp_li_positives, a.wp_li_accepts) });
    rows.push({ k: 'cv_li_csr', lbl: 'LinkedIn Calendly schedule rate', target: li.csr, rate: true, conv: '= Calendly clicks ÷ positives', derive: (a) => ratePct(a.wp_li_calendly, a.wp_li_positives) });
    rows.push({ k: 'cv_li_abr', lbl: 'LinkedIn appointment book rate', target: li.abr, rate: true, conv: '= bookings ÷ Calendly clicks', derive: (a) => ratePct(a.wp_li_bookings, a.wp_li_calendly) });
  }
  if (p.channels.email && p.channels.email.enabled) {
    const em = p.channels.email;
    rows.push({ k: 'cv_em_replyRate', lbl: 'Email reply rate', target: em.replyRate, rate: true, conv: '= replies ÷ sends', derive: (a) => ratePct(a.wp_em_replies, a.wp_em_sends) });
    rows.push({ k: 'cv_em_prr', lbl: 'Email positive reply rate', target: em.prr, rate: true, conv: '= positives ÷ replies', derive: (a) => ratePct(a.wp_em_positives, a.wp_em_replies) });
    rows.push({ k: 'cv_em_abr', lbl: 'Email appointment book rate', target: em.abr, rate: true, conv: '= bookings ÷ positives', derive: (a) => ratePct(a.wp_em_bookings, a.wp_em_positives) });
  }

  rows.push({ section: 'Spend & profit (auto from your actuals)' });
  const li = p.channels.linkedin;
  const em = p.channels.email;
  const liActiveCost = li.enabled
    ? (a: Record<string, number>) =>
        (Number(a.wp_li_profiles) || 0) * (li.costPerProfile || 0) +
        (Number(a.wp_li_connections) || 0) * (li.costPerLead || 0) +
        (li.softwareCost || 0)
    : () => 0;
  const emActiveCost = em.enabled
    ? (a: Record<string, number>) =>
        (Number(a.wp_em_inboxes) || 0) * (em.costPerInbox || 0) +
        (Number(a.wp_em_sends) || 0) * (em.costPerLead || 0) +
        (em.softwareCost || 0)
    : () => 0;
  const deriveMarketing = (a: Record<string, number>): number | null => {
    const v = liActiveCost(a) + emActiveCost(a);
    return v > 0 ? v : null;
  };
  const deriveCommissions = (a: Record<string, number>): number | null => {
    const qsh = Number(a.wp_qshows2) || 0;
    const cls = Number(a.wp_closes) || 0;
    const cash = c.cashPerClose || 0;
    const srPct = (p.team && p.team.srCommissionPct) || 0;
    const jrPer = (p.team && p.team.jrCommissionPerQshow) || 0;
    const v = qsh * jrPer + cls * cash * (srPct / 100);
    return v > 0 ? v : null;
  };
  const deriveTotalSM = (a: Record<string, number>): number | null => {
    const m = deriveMarketing(a);
    const c2 = deriveCommissions(a);
    if (m == null && c2 == null) return null;
    return (m || 0) + (c2 || 0);
  };
  const deriveProfit = (a: Record<string, number>): number | null => {
    const rev = Number(a.wp_revenueTarget) || 0;
    const sm = deriveTotalSM(a);
    if (!rev || sm == null) return null;
    return rev - sm;
  };
  rows.push({ k: 'wp_marketing', lbl: 'Marketing spend', target: scale(c.economics.totalMarketing), money: true, lowerBetter: true, conv: 'profiles × £ + connections × £ + software (LI + email)', derive: deriveMarketing });
  rows.push({ k: 'wp_commissions', lbl: 'Commission spend', target: scale(c.economics.totalCommissions), money: true, lowerBetter: true, conv: `qshows × £${(p.team && p.team.jrCommissionPerQshow) || 0} + closes × cash × ${(p.team && p.team.srCommissionPct) || 0}%`, derive: deriveCommissions });
  rows.push({ k: 'wp_total_sm', lbl: 'Total S+M spend', target: scale(c.economics.totalSalesAndMarketing), money: true, lowerBetter: true, conv: '= marketing + commissions', derive: deriveTotalSM });
  rows.push({ k: 'wp_profit', lbl: 'Profit on M+S', target: scale(c.economics.profitAfterSM), money: true, conv: '= contracted revenue − total S+M spend', derive: deriveProfit });

  return rows;
}

export interface EffectiveActual {
  value: number;
  derived: boolean;
}

/** Derived rows are read-only ONLY while their sources yield a value; else manual input. */
export function trackerEffectiveActual(
  r: TrackerMetricRow,
  actuals: Record<string, number>,
): EffectiveActual {
  if (r.derive) {
    const d = r.derive(actuals);
    if (d != null && isFinite(d)) return { value: d, derived: true };
  }
  return { value: Number(actuals[r.k]) || 0, derived: false };
}

export interface TrackerStatusResult {
  pct: number | null;
  cls: StatusCls;
  label: string;
}

export function trackerStatus(
  target: number,
  actual: number,
  lowerBetter?: boolean,
): TrackerStatusResult {
  if (!target || target <= 0) return { pct: null, cls: 'neutral', label: '—' };
  if (!actual || actual <= 0) return { pct: null, cls: 'neutral', label: 'not entered' };
  const pct = (actual / target) * 100;
  const isAhead = lowerBetter ? actual <= target : actual >= target;
  const near = Math.abs(pct - 100) <= 15;
  if (isAhead) return { pct, cls: 'good', label: lowerBetter ? `${pct.toFixed(0)}% of cap` : `${pct.toFixed(0)}% · on track` };
  if (near) return { pct, cls: 'warn', label: `${pct.toFixed(0)}% · close` };
  return { pct, cls: 'bad', label: `${pct.toFixed(0)}% · behind` };
}

export interface TrackerScore {
  hit: number;
  scored: number;
  pct: number | null;
  cls: StatusCls;
}

/**
 * Score = % of scored rows whose RAW actual beat target. NOTE: reads raw
 * entry.actuals (not the effective/derived value) — preserved exactly, so a
 * derived rate/spend row with no stored actual never counts toward the score.
 */
export function trackerEntryScore(rows: TrackerRow[], entry: TrackerEntry): TrackerScore {
  let scored = 0;
  let hit = 0;
  rows.forEach((r) => {
    if ('section' in r || r.noDelta) return;
    const actual = Number((entry.actuals || {})[r.k]);
    if (!isFinite(actual) || actual === 0) return;
    scored++;
    const ahead = r.lowerBetter ? actual <= r.target : actual >= r.target;
    if (ahead) hit++;
  });
  if (!scored) return { hit: 0, scored: 0, pct: null, cls: 'neutral' };
  const pct = (hit / scored) * 100;
  const cls: StatusCls = pct >= 75 ? 'good' : pct >= 50 ? 'warn' : 'bad';
  return { hit, scored, pct, cls };
}
