// ============================================================
// compute() — PURE port of the original calculation core.
//
// Faithfulness rules (see parity tests in test/parity):
//   • Does NOT mutate `plan`. cashPerClose / contractPerClose are
//     returned on `Computed` instead of written back onto the plan.
//   • Reads NO globals. All inputs are arguments.
//   • Preserves every `rate > 0 ? x/(rate/100) : 0` guard exactly.
//   • channelOutputs is a PARTIAL map — only enabled channels get a key.
//   • jrCloserCapacityPerRep / srCloserCapacityPerRep divide by minPerCall
//     WITHOUT a guard (Infinity -> ceil(0) = 0), matching the original.
//   • Two distinct CAC definitions kept: per-channel `cac` (marketing-only)
//     vs `cacOverall` (includes commissions).
//   • Math.ceil only for physical counts; funnel volumes stay fractional.
// ============================================================

import type {
  Channels,
  Computed,
  EmailOut,
  LinkedInOut,
  Plan,
} from './types';

export function compute(plan: Plan): Computed {
  const p = plan;
  const r = p.sales;

  const packagePrice = p.packagePrice || 0;
  const cashPct = (p.cashCollectedPct || 0) / 100;
  const cashPerClose = packagePrice * cashPct;
  const contractPerClose = packagePrice * (1 - cashPct);
  const revPerClose = packagePrice;

  const closes = packagePrice > 0 ? p.revenueTarget / packagePrice : 0;
  const cashCollectedTarget = (p.revenueTarget || 0) * cashPct;

  // Backward funnel chain.
  const offers = r.closeRate > 0 ? closes / (r.closeRate / 100) : 0;
  const qshows2 = r.offerRate > 0 ? offers / (r.offerRate / 100) : 0;
  const shows2 = r.qshow2Rate > 0 ? qshows2 / (r.qshow2Rate / 100) : 0;
  const sched2 = r.show2Rate > 0 ? shows2 / (r.show2Rate / 100) : 0;
  const book2 = r.sched2Rate > 0 ? sched2 / (r.sched2Rate / 100) : 0;
  const qual1 = r.book2Rate > 0 ? book2 / (r.book2Rate / 100) : 0;
  const shows1 = r.qual1Rate > 0 ? qual1 / (r.qual1Rate / 100) : 0;
  const bookings = r.show1Rate > 0 ? shows1 / (r.show1Rate / 100) : 0;

  const bookingToClose =
    (r.show1Rate / 100) *
    (r.qual1Rate / 100) *
    (r.book2Rate / 100) *
    (r.sched2Rate / 100) *
    (r.show2Rate / 100) *
    (r.qshow2Rate / 100) *
    (r.offerRate / 100) *
    (r.closeRate / 100);

  // Channel demand split (disabled channels get 0; mixes are NOT normalized).
  const channelBookings: Record<string, number> = {};
  (Object.keys(p.channels) as (keyof Channels)[]).forEach((k) => {
    const c = p.channels[k];
    channelBookings[k] = c.enabled ? bookings * (c.mix / 100) : 0;
  });

  const out: { linkedin?: LinkedInOut; email?: EmailOut } = {};

  const li = p.channels.linkedin;
  if (li.enabled) {
    const bk = channelBookings.linkedin;
    const csr = li.csr / 100;
    const abr = li.abr / 100;
    const prr = li.prr / 100;
    const ar = li.acceptRate / 100;
    const calendlyClicks = abr > 0 ? bk / abr : 0;
    const positives = csr > 0 ? calendlyClicks / csr : 0;
    const accepts = prr > 0 ? positives / prr : 0;
    const connections = ar > 0 ? accepts / ar : 0;
    const connectionsPerWeek = connections / (p.workingDaysPerMonth / p.workingDaysPerWeek);
    const connectionsPerDay = connections / p.workingDaysPerMonth;
    const profilesNeeded = Math.ceil(connectionsPerDay / (li.connectsPerProfilePerDay || 30));
    const profileCost = profilesNeeded * (li.costPerProfile || 0);
    const leadCost = connections * (li.costPerLead || 0);
    const softwareCost = li.softwareCost || 0;
    const totalCost = profileCost + leadCost + softwareCost;
    const closesAttributable = bk * bookingToClose;
    const costPerBooking = bk > 0 ? totalCost / bk : 0;
    const cac = closesAttributable > 0 ? totalCost / closesAttributable : 0;
    const messagesPerBooking = bk > 0 ? connections / bk : 0;
    out.linkedin = {
      bk,
      calendlyClicks,
      positives,
      accepts,
      connections,
      connectionsPerWeek,
      connectionsPerDay,
      profilesNeeded,
      profileCost,
      leadCost,
      softwareCost,
      totalCost,
      closesAttributable,
      costPerBooking,
      cac,
      messagesPerBooking,
      ltvCac: 0, // filled in below
    };
  }

  const em = p.channels.email;
  if (em.enabled) {
    const bk = channelBookings.email;
    const abr = em.abr / 100;
    const prr = em.prr / 100;
    const rr = em.replyRate / 100;
    const positives = abr > 0 ? bk / abr : 0;
    const replies = prr > 0 ? positives / prr : 0;
    const sends = rr > 0 ? replies / rr : 0;
    const sendsPerWeek = sends / (p.workingDaysPerMonth / p.workingDaysPerWeek);
    const sendsPerDay = sends / p.workingDaysPerMonth;
    const inboxesNeeded = Math.ceil(sendsPerDay / (em.sendsPerInboxPerDay || 30));
    const domainsNeeded = Math.ceil(inboxesNeeded / (em.inboxesPerDomain || 3));
    const inboxCost = inboxesNeeded * (em.costPerInbox || 0);
    const leadCost = sends * (em.costPerLead || 0);
    const softwareCost = em.softwareCost || 0;
    const totalCost = inboxCost + leadCost + softwareCost;
    const closesAttributable = bk * bookingToClose;
    const costPerBooking = bk > 0 ? totalCost / bk : 0;
    const cac = closesAttributable > 0 ? totalCost / closesAttributable : 0;
    const messagesPerBooking = bk > 0 ? sends / bk : 0;
    out.email = {
      bk,
      positives,
      replies,
      sends,
      sendsPerWeek,
      sendsPerDay,
      inboxesNeeded,
      domainsNeeded,
      inboxCost,
      leadCost,
      softwareCost,
      totalCost,
      closesAttributable,
      costPerBooking,
      cac,
      messagesPerBooking,
      ltvCac: 0, // filled in below
    };
  }

  // Team capacity — measured against BOOKINGS, not shows.
  const t = p.team;
  const jrBookingsNeeded = bookings;
  const srBookingsNeeded = book2;
  const jrMinutesAvailable = t.jrCloserCount * t.jrHoursPerDay * 60 * p.workingDaysPerMonth;
  const srMinutesAvailable = t.srCloserCount * t.srHoursPerDay * 60 * p.workingDaysPerMonth;
  const jrMinutesNeeded = jrBookingsNeeded * t.jrMinPerCall;
  const srMinutesNeeded = srBookingsNeeded * t.srMinPerCall;
  const jrCapacityCalls = t.jrMinPerCall > 0 ? jrMinutesAvailable / t.jrMinPerCall : 0;
  const srCapacityCalls = t.srMinPerCall > 0 ? srMinutesAvailable / t.srMinPerCall : 0;
  const jrUtilization = jrCapacityCalls > 0 ? (jrBookingsNeeded / jrCapacityCalls) * 100 : 0;
  const srUtilization = srCapacityCalls > 0 ? (srBookingsNeeded / srCapacityCalls) * 100 : 0;
  const jrShortfall = jrBookingsNeeded - jrCapacityCalls;
  const srShortfall = srBookingsNeeded - srCapacityCalls;
  // NOTE: divides by minPerCall WITHOUT a >0 guard (Infinity -> ceil(0) = 0).
  const jrCloserCapacityPerRep = (t.jrHoursPerDay * 60 * p.workingDaysPerMonth) / t.jrMinPerCall;
  const srCloserCapacityPerRep = (t.srHoursPerDay * 60 * p.workingDaysPerMonth) / t.srMinPerCall;
  const jrClosersNeeded = jrCloserCapacityPerRep > 0 ? Math.ceil(jrBookingsNeeded / jrCloserCapacityPerRep) : 0;
  const srClosersNeeded = srCloserCapacityPerRep > 0 ? Math.ceil(srBookingsNeeded / srCloserCapacityPerRep) : 0;

  // Commissions.
  const jrCommissionTotal = qshows2 * (t.jrCommissionPerQshow || 0);
  const srCommissionTotal = closes * cashPerClose * ((t.srCommissionPct || 0) / 100);
  const totalCommissions = jrCommissionTotal + srCommissionTotal;

  // Unit economics.
  const ltv = packagePrice;
  // Per-channel LTV:CAC (second pass, once ltv is known).
  (Object.values(out) as (LinkedInOut | EmailOut)[]).forEach((o) => {
    o.ltvCac = o.cac > 0 ? ltv / o.cac : 0;
  });
  const totalMarketing = (Object.values(out) as (LinkedInOut | EmailOut)[]).reduce(
    (s, o) => s + (o.totalCost || 0),
    0,
  );
  const totalSalesAndMarketing = totalMarketing + totalCommissions;
  const cacOverall = closes > 0 ? totalSalesAndMarketing / closes : 0;
  const ltvCac = cacOverall > 0 ? ltv / cacOverall : 0;
  const profitAfterSM = (p.revenueTarget || 0) - totalSalesAndMarketing;
  const profitMarginAfterSM = p.revenueTarget > 0 ? (profitAfterSM / p.revenueTarget) * 100 : 0;

  // Monthly revenue split.
  const cashCollectedMo = closes * cashPerClose;
  const contractedRevenueMo = closes * packagePrice;

  return {
    revPerClose,
    closes,
    bookings,
    bookingToClose,
    cashCollectedTarget,
    packagePrice,
    cashCollectedMo,
    contractedRevenueMo,
    bookingsPerWeek: bookings / (p.workingDaysPerMonth / p.workingDaysPerWeek),
    bookingsPerDay: bookings / p.workingDaysPerMonth,
    closesPerWeek: closes / (p.workingDaysPerMonth / p.workingDaysPerWeek),
    closesPerDay: closes / p.workingDaysPerMonth,
    offers,
    qshows2,
    shows2,
    sched2,
    book2,
    qual1,
    shows1,
    channelBookings,
    channelOutputs: out,
    team: {
      jrMinutesNeeded,
      srMinutesNeeded,
      jrMinutesAvailable,
      srMinutesAvailable,
      jrCapacityCalls,
      srCapacityCalls,
      jrUtilization,
      srUtilization,
      jrShortfall,
      srShortfall,
      jrClosersNeeded,
      srClosersNeeded,
      jrCommissionTotal,
      srCommissionTotal,
      totalCommissions,
    },
    economics: {
      ltv,
      totalMarketing,
      totalCommissions,
      totalSalesAndMarketing,
      cacOverall,
      ltvCac,
      profitAfterSM,
      profitMarginAfterSM,
    },
    cashPerClose,
    contractPerClose,
  };
}
