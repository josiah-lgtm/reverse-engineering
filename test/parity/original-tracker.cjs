/* eslint-disable */

// FROZEN PARITY REFERENCE — original tracker functions. DO NOT EDIT.

let state;

function plan(){ return state.months[state.activeMonth]; }

const TRACKERS = { weekly:{ divisor:(p)=>p.workingDaysPerMonth/p.workingDaysPerWeek }, monthly:{ divisor:()=>1 } };

const CURRENCY_SYMBOLS = { GBP: '£', USD: '$', EUR: '€' };
function currencySymbol() { return CURRENCY_SYMBOLS[(state.settings && state.settings.currency) || 'GBP']; }

function num(n, decimals = 0) {
  if (n == null || !isFinite(n)) return '—';
  return n.toLocaleString('en-GB', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}
function money(n) {
  if (n == null || !isFinite(n)) return '—';
  return currencySymbol() + n.toLocaleString('en-GB', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}
function pct(n) { return (n == null || !isFinite(n)) ? '—' : n.toFixed(1) + '%'; }
function ceil(n) { return isFinite(n) ? Math.ceil(n) : 0; }

function compute() {
  const p = plan();
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

function withActiveMonth(monthId, fn) {
  const saved = state.activeMonth;
  if (state.months[monthId]) state.activeMonth = monthId;
  try { return fn(); } finally { state.activeMonth = saved; }
}

function trackerTargetRows(kind, planMonth) {
  return withActiveMonth(planMonth, () => {
    const p = plan();
    const c = compute();
    const div = TRACKERS[kind].divisor(p);
    const scale = (mo) => mo / div;
    const rows = [];
    rows.push({ section: 'Revenue & sales funnel' });
    rows.push({ k: 'wp_revenueTarget', lbl: 'Contracted revenue', target: scale(p.revenueTarget), money: true });
    rows.push({ k: 'wp_cashCollectedTarget', lbl: 'Cash collected', target: scale(c.cashCollectedTarget), money: true, conv: `${p.cashCollectedPct}% of contracted` });
    rows.push({ k: 'wp_closes', lbl: 'Closes', target: scale(c.closes), conv: `${money(c.packagePrice)} per close` });
    rows.push({ k: 'wp_offers', lbl: 'Offers', target: scale(c.offers), conv: `${p.sales.closeRate}% close rate` });
    rows.push({ k: 'wp_qshows2', lbl: 'Call 2 qualified shows', target: scale(c.qshows2), conv: `${p.sales.offerRate}% offer rate` });
    rows.push({ k: 'wp_shows2', lbl: 'Call 2 shows', target: scale(c.shows2), conv: `${p.sales.qshow2Rate}% qual-show rate` });
    rows.push({ k: 'wp_book2', lbl: 'Call 2 bookings', target: scale(c.book2), conv: `${p.sales.book2Rate}% → call 2 booked` });
    rows.push({ k: 'wp_qual1', lbl: 'Call 1 qualified shows', target: scale(c.qual1), conv: `${p.sales.qual1Rate}% qual-show rate` });
    rows.push({ k: 'wp_shows1', lbl: 'Call 1 shows', target: scale(c.shows1), conv: `${p.sales.show1Rate}% show rate` });
    rows.push({ k: 'wp_bookings', lbl: 'Call 1 bookings', target: scale(c.bookings) });

    // ─── Sales-funnel stage-to-stage conversions — auto-computed from the
    // volume actuals just above. Targets come from plan.sales rates.
    rows.push({ section: 'Conversion rates — sales funnel (auto from your actuals)' });
    const ratePct = (num, den) => (num && den) ? (num / den) * 100 : null;
    rows.push({ k: 'cv_show1', lbl: 'Call 1 show rate', target: p.sales.show1Rate, rate: true, conv: '= Call 1 shows ÷ Call 1 bookings',
                derive: (a) => ratePct(a.wp_shows1, a.wp_bookings) });
    rows.push({ k: 'cv_qual1', lbl: 'Call 1 qual rate', target: p.sales.qual1Rate, rate: true, conv: '= Call 1 qual shows ÷ Call 1 shows',
                derive: (a) => ratePct(a.wp_qual1, a.wp_shows1) });
    rows.push({ k: 'cv_book2', lbl: 'Call 2 book rate', target: p.sales.book2Rate, rate: true, conv: '= Call 2 bookings ÷ Call 1 qual shows',
                derive: (a) => ratePct(a.wp_book2, a.wp_qual1) });
    rows.push({ k: 'cv_show2', lbl: 'Call 2 show rate (book→show, combined)', target: (p.sales.sched2Rate * p.sales.show2Rate) / 100, rate: true,
                conv: '= Call 2 shows ÷ Call 2 bookings · combined sched + show',
                derive: (a) => ratePct(a.wp_shows2, a.wp_book2) });
    rows.push({ k: 'cv_qshow2', lbl: 'Call 2 qual-show rate', target: p.sales.qshow2Rate, rate: true, conv: '= Call 2 qual shows ÷ Call 2 shows',
                derive: (a) => ratePct(a.wp_qshows2, a.wp_shows2) });
    rows.push({ k: 'cv_offer', lbl: 'Offer rate', target: p.sales.offerRate, rate: true, conv: '= Offers ÷ Call 2 qual shows',
                derive: (a) => ratePct(a.wp_offers, a.wp_qshows2) });
    rows.push({ k: 'cv_close', lbl: 'Close rate', target: p.sales.closeRate, rate: true, conv: '= Closes ÷ Offers',
                derive: (a) => ratePct(a.wp_closes, a.wp_offers) });
    rows.push({ k: 'cv_book2close', lbl: 'Call 1 booked → closed (full funnel)', target: c.bookingToClose * 100, rate: true,
                conv: '= Closes ÷ Call 1 bookings · full-funnel conversion',
                derive: (a) => ratePct(a.wp_closes, a.wp_bookings) });

    rows.push({ section: 'Channels — outreach volume' });
    Object.entries(c.channelOutputs).forEach(([k, out]) => {
      const ch = p.channels[k];
      if (!ch.enabled) return;
      if (k === 'linkedin') {
        rows.push({ k: 'wp_li_connections', lbl: 'LinkedIn connections sent', target: scale(out.connections) });
        rows.push({ k: 'wp_li_accepts',     lbl: 'LinkedIn accepts',          target: scale(out.accepts), conv: 'feeds accept rate' });
        rows.push({ k: 'wp_li_positives',   lbl: 'LinkedIn positive replies', target: scale(out.positives), conv: 'feeds PRR' });
        rows.push({ k: 'wp_li_calendly',    lbl: 'LinkedIn Calendly clicks',  target: scale(out.calendlyClicks), conv: 'feeds CSR' });
        rows.push({ k: 'wp_li_bookings',    lbl: 'LinkedIn bookings',         target: scale(out.bk), conv: 'feeds ABR' });
        rows.push({ k: 'wp_li_profiles',    lbl: 'LinkedIn sender profiles', target: out.profilesNeeded, conv: 'monthly headcount', noDelta: true });
      }
      if (k === 'email') {
        rows.push({ k: 'wp_em_sends',     lbl: 'Email sends',            target: scale(out.sends) });
        rows.push({ k: 'wp_em_replies',   lbl: 'Email replies',          target: scale(out.replies), conv: 'feeds reply rate' });
        rows.push({ k: 'wp_em_positives', lbl: 'Email positive replies', target: scale(out.positives), conv: 'feeds PRR' });
        rows.push({ k: 'wp_em_bookings',  lbl: 'Email bookings',         target: scale(out.bk), conv: 'feeds ABR' });
        rows.push({ k: 'wp_em_inboxes',   lbl: 'Email inboxes',          target: out.inboxesNeeded, conv: 'monthly headcount', noDelta: true });
      }
    });

    // Conversion rate rows — auto-computed from the volume actuals above.
    // If both source volumes have actuals, the rate field shows the derived %
    // (read-only). If volumes are blank, the user can type the rate manually.
    rows.push({ section: 'Conversion rates — auto-computed from your volume actuals' });
    if (p.channels.linkedin && p.channels.linkedin.enabled) {
      const li = p.channels.linkedin;
      const ratePct = (num, den) => (num && den) ? (num / den) * 100 : null;
      rows.push({ k: 'cv_li_acceptRate', lbl: 'LinkedIn accept rate', target: li.acceptRate, rate: true, conv: '= accepts ÷ connections',
                  derive: (a) => ratePct(a.wp_li_accepts, a.wp_li_connections) });
      rows.push({ k: 'cv_li_prr', lbl: 'LinkedIn positive reply rate', target: li.prr, rate: true, conv: '= positives ÷ accepts',
                  derive: (a) => ratePct(a.wp_li_positives, a.wp_li_accepts) });
      rows.push({ k: 'cv_li_csr', lbl: 'LinkedIn Calendly schedule rate', target: li.csr, rate: true, conv: '= Calendly clicks ÷ positives',
                  derive: (a) => ratePct(a.wp_li_calendly, a.wp_li_positives) });
      rows.push({ k: 'cv_li_abr', lbl: 'LinkedIn appointment book rate', target: li.abr, rate: true, conv: '= bookings ÷ Calendly clicks',
                  derive: (a) => ratePct(a.wp_li_bookings, a.wp_li_calendly) });
    }
    if (p.channels.email && p.channels.email.enabled) {
      const em = p.channels.email;
      const ratePct = (num, den) => (num && den) ? (num / den) * 100 : null;
      rows.push({ k: 'cv_em_replyRate', lbl: 'Email reply rate', target: em.replyRate, rate: true, conv: '= replies ÷ sends',
                  derive: (a) => ratePct(a.wp_em_replies, a.wp_em_sends) });
      rows.push({ k: 'cv_em_prr', lbl: 'Email positive reply rate', target: em.prr, rate: true, conv: '= positives ÷ replies',
                  derive: (a) => ratePct(a.wp_em_positives, a.wp_em_replies) });
      rows.push({ k: 'cv_em_abr', lbl: 'Email appointment book rate', target: em.abr, rate: true, conv: '= bookings ÷ positives',
                  derive: (a) => ratePct(a.wp_em_bookings, a.wp_em_positives) });
    }

    // ─── Spend & profit — auto-computed from your volume actuals.
    // Each row falls back to a manual input if its source actuals are blank
    // (so old entries you typed before this auto-derive still work).
    rows.push({ section: 'Spend & profit (auto from your actuals)' });
    const li = p.channels.linkedin || {};
    const em = p.channels.email || {};
    const liActiveCost  = li.enabled
      ? (a) => (Number(a.wp_li_profiles) || 0) * (li.costPerProfile || 0)
             + (Number(a.wp_li_connections) || 0) * (li.costPerLead || 0)
             + (li.softwareCost || 0)
      : () => 0;
    const emActiveCost = em.enabled
      ? (a) => (Number(a.wp_em_inboxes) || 0) * (em.costPerInbox || 0)
             + (Number(a.wp_em_sends) || 0) * (em.costPerLead || 0)
             + (em.softwareCost || 0)
      : () => 0;
    const deriveMarketing = (a) => {
      const v = liActiveCost(a) + emActiveCost(a);
      return v > 0 ? v : null;
    };
    const deriveCommissions = (a) => {
      const qsh = Number(a.wp_qshows2) || 0;
      const cls = Number(a.wp_closes)  || 0;
      const cash = p.cashPerClose || 0;
      const srPct = (p.team && p.team.srCommissionPct) || 0;
      const jrPer = (p.team && p.team.jrCommissionPerQshow) || 0;
      const v = qsh * jrPer + cls * cash * (srPct / 100);
      return v > 0 ? v : null;
    };
    const deriveTotalSM = (a) => {
      const m = deriveMarketing(a);
      const c2 = deriveCommissions(a);
      if (m == null && c2 == null) return null;
      return (m || 0) + (c2 || 0);
    };
    const deriveProfit = (a) => {
      const rev = Number(a.wp_revenueTarget) || 0;
      const sm = deriveTotalSM(a);
      if (!rev || sm == null) return null;
      return rev - sm;
    };
    rows.push({ k: 'wp_marketing',  lbl: 'Marketing spend',    target: scale(c.economics.totalMarketing),         money: true, lowerBetter: true,
                conv: 'profiles × £ + connections × £ + software (LI + email)',
                derive: deriveMarketing });
    rows.push({ k: 'wp_commissions',lbl: 'Commission spend',   target: scale(c.economics.totalCommissions),       money: true, lowerBetter: true,
                conv: `qshows × £${(p.team && p.team.jrCommissionPerQshow) || 0} + closes × cash × ${(p.team && p.team.srCommissionPct) || 0}%`,
                derive: deriveCommissions });
    rows.push({ k: 'wp_total_sm',   lbl: 'Total S+M spend',    target: scale(c.economics.totalSalesAndMarketing), money: true, lowerBetter: true,
                conv: '= marketing + commissions',
                derive: deriveTotalSM });
    rows.push({ k: 'wp_profit',     lbl: 'Profit on M+S',      target: scale(c.economics.profitAfterSM),          money: true,
                conv: '= contracted revenue − total S+M spend',
                derive: deriveProfit });
    return rows;
  });
}

function trackerStatus(target, actual, lowerBetter) {
  if (!target || target <= 0) return { pct: null, cls: 'neutral', label: '—' };
  if (!actual || actual <= 0) return { pct: null, cls: 'neutral', label: 'not entered' };
  const pct = (actual / target) * 100;
  const isAhead = lowerBetter ? actual <= target : actual >= target;
  const near = Math.abs(pct - 100) <= 15;
  if (isAhead) return { pct, cls: 'good', label: lowerBetter ? `${pct.toFixed(0)}% of cap` : `${pct.toFixed(0)}% · on track` };
  if (near) return { pct, cls: 'warn', label: `${pct.toFixed(0)}% · close` };
  return { pct, cls: 'bad', label: `${pct.toFixed(0)}% · behind` };
}

function trackerEntryScore(kind, entry) {
  const rows = trackerTargetRows(kind, entry.planMonth);
  let scored = 0, hit = 0;
  rows.forEach(r => {
    if (r.section || r.noDelta) return;
    const actual = Number((entry.actuals || {})[r.k]);
    if (!isFinite(actual) || actual === 0) return;
    scored++;
    const ahead = r.lowerBetter ? actual <= r.target : actual >= r.target;
    if (ahead) hit++;
  });
  if (!scored) return { hit: 0, scored: 0, pct: null, cls: 'neutral' };
  const pct = (hit / scored) * 100;
  const cls = pct >= 75 ? 'good' : pct >= 50 ? 'warn' : 'bad';
  return { hit, scored, pct, cls };
}

function trackerEffectiveActual(r, actuals) {
  if (r.derive) {
    const derived = r.derive(actuals);
    if (derived != null && isFinite(derived)) return { value: derived, derived: true };
  }
  const v = Number((actuals || {})[r.k]) || 0;
  return { value: v, derived: false };
}


function vendorTrackerData(kind, planObj, planMonth, currency, actuals){
  state = { activeMonth: planMonth, months: { [planMonth]: planObj }, settings:{ currency } };
  const rows = trackerTargetRows(kind, planMonth);
  const norm = rows.map(r => r.section ? { section:r.section } : {
    k:r.k, lbl:r.lbl, target:r.target, money:!!r.money, rate:!!r.rate,
    lowerBetter:!!r.lowerBetter, noDelta:!!r.noDelta, conv:r.conv==null?null:r.conv,
    derived: r.derive ? r.derive(actuals) : null,
    eff: trackerEffectiveActual(r, actuals),
    status: (function(){ var e=trackerEffectiveActual(r,actuals); return trackerStatus(r.target, e.value, r.lowerBetter); })(),
  });
  const score = trackerEntryScore(kind, { planMonth, actuals });
  return { rows: norm, score };
}
module.exports = { vendorTrackerData };
