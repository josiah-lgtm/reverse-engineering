/* eslint-disable */
// ============================================================
// FROZEN PARITY REFERENCE — DO NOT EDIT / DO NOT "CLEAN UP".
// Verbatim extraction of defaultPlan() and compute() from the
// original single-file index.html (pre-rewrite). The only edits:
//   • compute() takes the plan as an argument instead of reading the
//     plan() global (the "const p = plan();" line was removed).
//   • cashPerClose/contractPerClose are still MUTATED onto the input
//     plan (read them back off the input after calling).
// This is the golden source the TS engine is parity-tested against.
// ============================================================

function defaultPlan() {
  return {
    revenueTarget: 120000,         // total contracted revenue target / month
    packagePrice: 15000,           // contracted price per close (the program price = LTV)
    cashCollectedPct: 67,          // % of contracted revenue paid upfront in cash (slider)
    // cashPerClose + contractPerClose are now DERIVED from packagePrice × cashCollectedPct
    // (kept in state for backward compat but compute() recomputes them every time)
    cashPerClose: 10050,
    contractPerClose: 4950,
    workingDaysPerMonth: 22,
    workingDaysPerWeek: 5,
    sales: {
      show1Rate: 65,
      qual1Rate: 70,
      book2Rate: 70,
      sched2Rate: 80,
      show2Rate: 80,
      qshow2Rate: 85,   // % of call-2 shows that are still qualified (NEW STAGE)
      offerRate: 90,
      closeRate: 35,
    },
    channels: {
      linkedin: {
        enabled: true, mix: 60, label: 'LinkedIn', open: true,
        connectsPerProfilePerDay: 30,
        acceptRate: 20, prr: 6.24, csr: 80, abr: 50,
        // Costs
        costPerProfile: 75,        // £/month per LinkedIn sender profile
        costPerLead: 0,            // £ per connection sent (data/list cost)
        softwareCost: 250,         // £/month additional software (Sales Nav, etc.)
      },
      email: {
        enabled: true, mix: 40, label: 'Email', open: true,
        sendsPerInboxPerDay: 30, inboxesPerDomain: 3,
        replyRate: 2, prr: 25, abr: 30,
        // Costs
        costPerInbox: 8,           // £/month per email inbox
        costPerLead: 0.05,         // £ per send (data/enrichment per record)
        softwareCost: 350,         // £/month additional software (Instantly, Clay, etc.)
      },
    },
    team: {
      jrCloserCount: 2,
      jrMinPerCall: 20,
      jrHoursPerDay: 6,
      jrCommissionPerQshow: 50,  // £ per qualified call-2 show that lands on closer's calendar
      srCloserCount: 1,
      srMinPerCall: 45,
      srHoursPerDay: 6,
      srCommissionPct: 10,       // % of cash collected per close (commission)
    },
    // LTV = packagePrice (the contracted program price). No multiplier.
    notes: {
      // Per-funnel-stage notes
      bookings: '', shows1: '', book2: '', shows2: '', qshows2: '', offers: '', closes: '',
      // Per-channel notes
      linkedin: '', email: '',
      // Per-team notes
      team: '',
      // Plan-level sections
      announcements: '',
      premortem: '',
      ideas: '',
      team: '',
    },
    notionPageUrl: '',  // optional: paste your Notion plan page URL here for one-click open
    notionPageId: '',   // set automatically after first publish — enables idempotent re-publish
  };
}

function originalCompute(p) {
  const r = p.sales;
  // Package price = LTV per close (the contracted program price).
  // Cash & contract split derived from cashCollectedPct slider.
  const packagePrice = p.packagePrice || 0;
  const cashPct = (p.cashCollectedPct || 0) / 100;
  // Keep state in sync — derived values written back so other places that
  // still read p.cashPerClose / p.contractPerClose get correct numbers.
  p.cashPerClose = packagePrice * cashPct;
  p.contractPerClose = packagePrice * (1 - cashPct);
  const cashPerClose = p.cashPerClose;
  const contractPerClose = p.contractPerClose;
  const revPerClose = packagePrice;
  // Closes derived purely from contracted revenue target. Cash collected
  // target = revenue × cashPct, so it tracks automatically.
  const closes = packagePrice > 0 ? p.revenueTarget / packagePrice : 0;
  const cashCollectedTarget = (p.revenueTarget || 0) * cashPct;
  // Backward chain from closes:
  const offers = r.closeRate > 0 ? closes / (r.closeRate / 100) : 0;
  const qshows2 = r.offerRate > 0 ? offers / (r.offerRate / 100) : 0;
  const shows2 = r.qshow2Rate > 0 ? qshows2 / (r.qshow2Rate / 100) : 0;
  const sched2 = r.show2Rate > 0 ? shows2 / (r.show2Rate / 100) : 0;
  const book2 = r.sched2Rate > 0 ? sched2 / (r.sched2Rate / 100) : 0;
  const qual1 = r.book2Rate > 0 ? book2 / (r.book2Rate / 100) : 0;
  const shows1 = r.qual1Rate > 0 ? qual1 / (r.qual1Rate / 100) : 0;
  const bookings = r.show1Rate > 0 ? shows1 / (r.show1Rate / 100) : 0;
  const bookingToClose =
    (r.show1Rate / 100) * (r.qual1Rate / 100) * (r.book2Rate / 100) *
    (r.sched2Rate / 100) * (r.show2Rate / 100) * (r.qshow2Rate / 100) *
    (r.offerRate / 100) * (r.closeRate / 100);

  // Channels
  const channelBookings = {};
  Object.keys(p.channels).forEach(k => {
    const c = p.channels[k];
    channelBookings[k] = c.enabled ? bookings * (c.mix / 100) : 0;
  });

  const out = {};
  const li = p.channels.linkedin;
  if (li.enabled) {
    const bk = channelBookings.linkedin;
    const csr = li.csr / 100, abr = li.abr / 100, prr = li.prr / 100, ar = li.acceptRate / 100;
    const calendlyClicks = abr > 0 ? bk / abr : 0;
    const positives = csr > 0 ? calendlyClicks / csr : 0;
    const accepts = prr > 0 ? positives / prr : 0;
    const connections = ar > 0 ? accepts / ar : 0;
    const connectionsPerWeek = connections / (p.workingDaysPerMonth / p.workingDaysPerWeek);
    const connectionsPerDay = connections / p.workingDaysPerMonth;
    const profilesNeeded = Math.ceil(connectionsPerDay / (li.connectsPerProfilePerDay || 30));
    // Costs
    const profileCost = profilesNeeded * (li.costPerProfile || 0);
    const leadCost = connections * (li.costPerLead || 0);
    const softwareCost = li.softwareCost || 0;
    const totalCost = profileCost + leadCost + softwareCost;
    const closesAttributable = bk * bookingToClose;
    const costPerBooking = bk > 0 ? totalCost / bk : 0;
    const cac = closesAttributable > 0 ? totalCost / closesAttributable : 0;
    const messagesPerBooking = bk > 0 ? connections / bk : 0;
    out.linkedin = {
      bk, calendlyClicks, positives, accepts, connections, connectionsPerWeek, connectionsPerDay, profilesNeeded,
      profileCost, leadCost, softwareCost, totalCost,
      closesAttributable, costPerBooking, cac, messagesPerBooking,
      // ltvCac computed below after ltv is known (placeholder)
    };
  }
  const em = p.channels.email;
  if (em.enabled) {
    const bk = channelBookings.email;
    const abr = em.abr / 100, prr = em.prr / 100, rr = em.replyRate / 100;
    const positives = abr > 0 ? bk / abr : 0;
    const replies = prr > 0 ? positives / prr : 0;
    const sends = rr > 0 ? replies / rr : 0;
    const sendsPerWeek = sends / (p.workingDaysPerMonth / p.workingDaysPerWeek);
    const sendsPerDay = sends / p.workingDaysPerMonth;
    const inboxesNeeded = Math.ceil(sendsPerDay / (em.sendsPerInboxPerDay || 30));
    const domainsNeeded = Math.ceil(inboxesNeeded / (em.inboxesPerDomain || 3));
    // Costs
    const inboxCost = inboxesNeeded * (em.costPerInbox || 0);
    const leadCost = sends * (em.costPerLead || 0);
    const softwareCost = em.softwareCost || 0;
    const totalCost = inboxCost + leadCost + softwareCost;
    const closesAttributable = bk * bookingToClose;
    const costPerBooking = bk > 0 ? totalCost / bk : 0;
    const cac = closesAttributable > 0 ? totalCost / closesAttributable : 0;
    const messagesPerBooking = bk > 0 ? sends / bk : 0;
    out.email = {
      bk, positives, replies, sends, sendsPerWeek, sendsPerDay, inboxesNeeded, domainsNeeded,
      inboxCost, leadCost, softwareCost, totalCost,
      closesAttributable, costPerBooking, cac, messagesPerBooking,
    };
  }

  // Team capacity — measured against BOOKINGS not shows. Each booking takes
  // a calendar slot even if it no-shows; the team needs that time blocked off.
  const t = p.team;
  // Call 1 bookings = bookings (top of funnel). Call 2 bookings = book2.
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
  // How many more closers needed to cover?
  const jrCloserCapacityPerRep = (t.jrHoursPerDay * 60 * p.workingDaysPerMonth) / t.jrMinPerCall;
  const srCloserCapacityPerRep = (t.srHoursPerDay * 60 * p.workingDaysPerMonth) / t.srMinPerCall;
  const jrClosersNeeded = jrCloserCapacityPerRep > 0 ? Math.ceil(jrBookingsNeeded / jrCloserCapacityPerRep) : 0;
  const srClosersNeeded = srCloserCapacityPerRep > 0 ? Math.ceil(srBookingsNeeded / srCloserCapacityPerRep) : 0;

  // Team commissions
  // Junior gets paid per qualified call-2 show landing on the closer's calendar.
  const jrCommissionTotal = qshows2 * (t.jrCommissionPerQshow || 0);
  // Senior gets paid % of cash collected per close.
  const srCommissionTotal = closes * (p.cashPerClose || 0) * ((t.srCommissionPct || 0) / 100);
  const totalCommissions = jrCommissionTotal + srCommissionTotal;

  // Unit economics — LTV is just the package price (one program = one LTV)
  const ltv = packagePrice;
  // Per-channel LTV:CAC (now that ltv is known)
  Object.values(out).forEach(o => { o.ltvCac = o.cac > 0 ? ltv / o.cac : 0; });
  const totalMarketing = Object.values(out).reduce((s, o) => s + (o.totalCost || 0), 0);
  const totalSalesAndMarketing = totalMarketing + totalCommissions;
  const cacOverall = closes > 0 ? totalSalesAndMarketing / closes : 0;
  const ltvCac = cacOverall > 0 ? ltv / cacOverall : 0;
  const profitAfterSM = (p.revenueTarget || 0) - totalSalesAndMarketing;
  const profitMarginAfterSM = p.revenueTarget > 0 ? (profitAfterSM / p.revenueTarget) * 100 : 0;

  // Monthly revenue split
  // Cash collected = upfront portion (closes × cash per close)
  // Contracted revenue = FULL contracted amount (closes × packagePrice) — matches the revenue target
  const cashCollectedMo = closes * cashPerClose;
  const contractedRevenueMo = closes * packagePrice;

  return {
    revPerClose, closes, bookings, bookingToClose,
    cashCollectedTarget, packagePrice,
    cashCollectedMo, contractedRevenueMo,
    bookingsPerWeek: bookings / (p.workingDaysPerMonth / p.workingDaysPerWeek),
    bookingsPerDay: bookings / p.workingDaysPerMonth,
    closesPerWeek: closes / (p.workingDaysPerMonth / p.workingDaysPerWeek),
    closesPerDay: closes / p.workingDaysPerMonth,
    offers, qshows2, shows2, sched2, book2, qual1, shows1,
    channelBookings, channelOutputs: out,
    team: {
      jrMinutesNeeded, srMinutesNeeded,
      jrMinutesAvailable, srMinutesAvailable,
      jrCapacityCalls, srCapacityCalls,
      jrUtilization, srUtilization,
      jrShortfall, srShortfall,
      jrClosersNeeded, srClosersNeeded,
      jrCommissionTotal, srCommissionTotal, totalCommissions,
    },
    economics: {
      ltv, totalMarketing, totalCommissions, totalSalesAndMarketing,
      cacOverall, ltvCac, profitAfterSM, profitMarginAfterSM,
    },
  };
}

module.exports = { defaultPlan, originalCompute };
