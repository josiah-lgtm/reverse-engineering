// ============================================================
// War-plan rows — pure port of renderWarPlan's row model + fmtVal.
// The MONTHLY value (`mo`) is the source of truth; Daily = mo/mDiv,
// Weekly = mo/wkDiv. pct rows show the SAME value in all three columns
// (utilization doesn't scale); money + plain rows ARE divided.
// ============================================================

import type { Computed, Plan, WarPlanRow } from './types';
import type { Formatters } from '../format/formatters';

export function buildWarPlanRows(plan: Plan, computed: Computed, fmt: Formatters): WarPlanRow[] {
  const p = plan;
  const c = computed;
  const { num, money, pct, ceil } = fmt;
  const rows: WarPlanRow[] = [];

  rows.push({ section: 'Revenue & sales funnel' });
  rows.push({ k: 'wp_revenueTarget', lbl: 'Contracted revenue target', mo: p.revenueTarget, money: true });
  rows.push({ k: 'wp_cashCollectedTarget', lbl: 'Cash collected target', mo: c.cashCollectedTarget, money: true, conv: `${p.cashCollectedPct}% of contracted` });
  rows.push({ k: 'wp_closes', lbl: 'Closes', mo: c.closes, conv: `${money(c.packagePrice)} per close` });
  rows.push({ k: 'wp_offers', lbl: 'Offers', mo: c.offers, conv: `${p.sales.closeRate}% close rate` });
  rows.push({ k: 'wp_qshows2', lbl: 'Call 2 qualified shows', mo: c.qshows2, conv: `${p.sales.offerRate}% offer rate` });
  rows.push({ k: 'wp_shows2', lbl: 'Call 2 shows', mo: c.shows2, conv: `${p.sales.qshow2Rate}% qual-show rate` });
  rows.push({ k: 'wp_book2', lbl: 'Call 2 bookings', mo: c.book2, conv: `${p.sales.book2Rate}% → call 2 booked` });
  rows.push({ k: 'wp_qual1', lbl: 'Call 1 qualified shows', mo: c.qual1, conv: `${p.sales.qual1Rate}% qual-show rate` });
  rows.push({ k: 'wp_shows1', lbl: 'Call 1 shows', mo: c.shows1, conv: `${p.sales.show1Rate}% show rate` });
  rows.push({ k: 'wp_bookings', lbl: 'Call 1 bookings', mo: c.bookings });

  rows.push({ section: 'Channels — outreach' });
  (Object.keys(c.channelOutputs) as ('linkedin' | 'email')[]).forEach((k) => {
    const ch = p.channels[k];
    if (!ch.enabled) return;
    if (k === 'linkedin') {
      const out = c.channelOutputs.linkedin!;
      const li = p.channels.linkedin;
      rows.push({ k: 'wp_li_connections', lbl: 'LinkedIn connections', mo: out.connections, conv: `${li.acceptRate}% accept · ${li.prr}% PRR · ${li.csr}% CSR · ${li.abr}% ABR` });
      rows.push({ k: 'wp_li_profiles', lbl: 'LinkedIn profiles needed', mo: out.profilesNeeded, conv: `${li.connectsPerProfilePerDay}/day each` });
    }
    if (k === 'email') {
      const out = c.channelOutputs.email!;
      const em = p.channels.email;
      rows.push({ k: 'wp_em_sends', lbl: 'Email sends', mo: out.sends, conv: `${em.replyRate}% reply · ${em.prr}% PRR · ${em.abr}% ABR` });
      rows.push({ k: 'wp_em_inboxes', lbl: 'Email inboxes / domains', mo: out.inboxesNeeded, conv: `${out.inboxesNeeded} inboxes · ${out.domainsNeeded} domains` });
    }
  });

  rows.push({ section: 'Team capacity & spend' });
  rows.push({ k: 'wp_jr_load', lbl: 'Junior closer load', mo: c.team.jrUtilization / 100, pct: true, conv: `${p.team.jrCloserCount} junior · ${num(ceil(c.bookings))} call 1 bookings` });
  rows.push({ k: 'wp_sr_load', lbl: 'Senior closer load', mo: c.team.srUtilization / 100, pct: true, conv: `${p.team.srCloserCount} senior · ${num(ceil(c.book2))} call 2 bookings` });
  rows.push({ k: 'wp_marketing', lbl: 'Marketing spend', mo: c.economics.totalMarketing, money: true });
  rows.push({ k: 'wp_commissions', lbl: 'Commission spend', mo: c.economics.totalCommissions, money: true });
  rows.push({ k: 'wp_total_sm', lbl: 'Total S+M spend', mo: c.economics.totalSalesAndMarketing, money: true });
  rows.push({ k: 'wp_profit', lbl: 'Profit on M+S', mo: c.economics.profitAfterSM, money: true, conv: `${pct(c.economics.profitMarginAfterSM)} margin · LTV:CAC ${c.economics.ltvCac > 0 ? c.economics.ltvCac.toFixed(1) + 'x' : '—'}` });

  return rows;
}

/** Number formatter for a war-plan cell — precision switches at the 100 threshold. */
export function fmtVal(
  row: { money?: boolean; pct?: boolean },
  periodVal: number,
  fmt: Formatters,
): string {
  if (row.money) return fmt.money(periodVal);
  if (row.pct) return fmt.pct(periodVal * 100);
  if (Number.isInteger(periodVal)) return fmt.num(periodVal);
  if (periodVal >= 100) return fmt.num(Math.round(periodVal));
  return fmt.num(periodVal, 1);
}

export interface WarPlanCells {
  daily: string;
  weekly: string;
  monthly: string;
}

export function warPlanCells(
  row: { mo: number; money?: boolean; pct?: boolean },
  plan: Plan,
  fmt: Formatters,
): WarPlanCells {
  const wkDiv = plan.workingDaysPerMonth / plan.workingDaysPerWeek;
  const mDiv = plan.workingDaysPerMonth;
  const moVal = row.mo || 0;
  return {
    daily: row.money ? fmt.money(moVal / mDiv) : row.pct ? fmt.pct(moVal * 100) : fmtVal(row, moVal / mDiv, fmt),
    weekly: row.money ? fmt.money(moVal / wkDiv) : row.pct ? fmt.pct(moVal * 100) : fmtVal(row, moVal / wkDiv, fmt),
    monthly: fmtVal(row, moVal, fmt),
  };
}
