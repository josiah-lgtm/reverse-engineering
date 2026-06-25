/* eslint-disable */

// FROZEN PARITY REFERENCE — verbatim original generatePlanMarkdown environment.

// Assembled from the pre-rewrite index.html. DO NOT EDIT.

let state;

function plan(){ return state.months[state.activeMonth]; }

const CURRENCY_SYMBOLS = { GBP: '£', USD: '$', EUR: '€' };
function currencySymbol() { return CURRENCY_SYMBOLS[(state.settings && state.settings.currency) || 'GBP']; }

function fmtMonth(id) {
  const [y, m] = id.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleString('en-GB', { month: 'long', year: 'numeric' });
}

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

const FUNNEL_STAGES = [
  { lbl: 'Call 1 booked', noteKey: 'bookings', valKey: 'bookings', hero: true },
  { lbl: 'Call 1 shows', noteKey: 'shows1', valKey: 'shows1' },
  { lbl: 'Call 1 qual shows', noteKey: 'qual1', valKey: 'qual1' },
  { lbl: 'Call 2 bookings', noteKey: 'book2', valKey: 'book2' },
  { lbl: 'Call 2 shows', noteKey: 'shows2', valKey: 'shows2' },
  { lbl: 'Call 2 qual shows', noteKey: 'qshows2', valKey: 'qshows2' },
  { lbl: 'Offers', noteKey: 'offers', valKey: 'offers' },
  { lbl: 'Closes', noteKey: 'closes', valKey: 'closes', hero: true },
];

function generatePlanMarkdown() {
  const p = plan();
  const c = compute();
  const wkDivisor = p.workingDaysPerMonth / p.workingDaysPerWeek;
  const monthLabel = fmtMonth(state.activeMonth);
  const lines = [];

  lines.push(`# ${monthLabel} — Plan`);
  lines.push('');
  lines.push(`Revenue target: **${money(p.revenueTarget)}** · ${money(c.revPerClose)}/close · ${num(p.workingDaysPerMonth)} working days`);
  lines.push('');

  lines.push('## Full funnel — what we need each month');
  lines.push('');
  lines.push('| Stage | Monthly | Weekly | Daily | Note |');
  lines.push('| --- | ---: | ---: | ---: | --- |');
  FUNNEL_STAGES.forEach(s => {
    const v = c[s.valKey];
    const note = (p.notes[s.noteKey] || '').trim().replace(/\|/g, '\\|').replace(/\n/g, ' ');
    lines.push(`| **${s.lbl}** | ${num(ceil(v))} | ${num(v / wkDivisor, 1)} | ${num(v / p.workingDaysPerMonth, 1)} | ${note || '—'} |`);
  });
  lines.push('');

  lines.push('## Sales funnel rates');
  lines.push('');
  lines.push('| Stage | Rate |');
  lines.push('| --- | ---: |');
  [
    ['show1Rate', 'Call 1 show rate'],
    ['qual1Rate', 'Call 1 qualification'],
    ['book2Rate', 'Call 2 booking'],
    ['sched2Rate', 'Call 2 scheduled'],
    ['show2Rate', 'Call 2 show rate'],
    ['qshow2Rate', 'Call 2 qualified-show rate'],
    ['offerRate', 'Offer rate'],
    ['closeRate', 'Close rate'],
  ].forEach(([k, l]) => lines.push(`| ${l} | ${p.sales[k]}% |`));
  lines.push(`| **Booking → close** (cumulative) | **${pct(c.bookingToClose * 100)}** |`);
  lines.push('');

  // Channels
  lines.push('## Channels');
  lines.push('');
  if (p.channels.linkedin.enabled) {
    const out = c.channelOutputs.linkedin;
    const li = p.channels.linkedin;
    lines.push('### LinkedIn');
    lines.push(`Mix: **${li.mix}%** · bookings target: **${num(ceil(out.bk))}/mo**`);
    lines.push('');
    lines.push('| Output | Monthly | Weekly | Daily |');
    lines.push('| --- | ---: | ---: | ---: |');
    lines.push(`| Connections | ${num(ceil(out.connections))} | ${num(ceil(out.connectionsPerWeek))} | ${num(ceil(out.connectionsPerDay))} |`);
    lines.push(`| Accepts | ${num(ceil(out.accepts))} | ${num(ceil(out.accepts / wkDivisor))} | — |`);
    lines.push(`| Positive replies | ${num(ceil(out.positives))} | ${num(ceil(out.positives / wkDivisor))} | — |`);
    lines.push(`| Calendly clicks | ${num(ceil(out.calendlyClicks))} | ${num(ceil(out.calendlyClicks / wkDivisor))} | — |`);
    lines.push(`| **Sender profiles needed** | **${out.profilesNeeded}** | — | (${li.connectsPerProfilePerDay}/day each) |`);
    lines.push('');
    lines.push(`Rates: ${li.acceptRate}% accept · ${li.prr}% PRR · ${li.csr}% CSR · ${li.abr}% ABR`);
    if ((p.notes.linkedin || '').trim()) {
      lines.push('');
      lines.push(`> **Note:** ${p.notes.linkedin.trim()}`);
    }
    lines.push('');
  }
  if (p.channels.email.enabled) {
    const out = c.channelOutputs.email;
    const em = p.channels.email;
    lines.push('### Email');
    lines.push(`Mix: **${em.mix}%** · bookings target: **${num(ceil(out.bk))}/mo**`);
    lines.push('');
    lines.push('| Output | Monthly | Weekly | Daily |');
    lines.push('| --- | ---: | ---: | ---: |');
    lines.push(`| Sends | ${num(ceil(out.sends))} | ${num(ceil(out.sendsPerWeek))} | ${num(ceil(out.sendsPerDay))} |`);
    lines.push(`| Replies | ${num(ceil(out.replies))} | ${num(ceil(out.replies / wkDivisor))} | — |`);
    lines.push(`| Positive replies | ${num(ceil(out.positives))} | ${num(ceil(out.positives / wkDivisor))} | — |`);
    lines.push(`| **Inboxes / Domains needed** | **${out.inboxesNeeded} / ${out.domainsNeeded}** | — | (${em.sendsPerInboxPerDay}/inbox · ${em.inboxesPerDomain} inboxes/domain) |`);
    lines.push('');
    lines.push(`Rates: ${em.replyRate}% reply · ${em.prr}% PRR · ${em.abr}% ABR`);
    if ((p.notes.email || '').trim()) {
      lines.push('');
      lines.push(`> **Note:** ${p.notes.email.trim()}`);
    }
    lines.push('');
  }

  // Team capacity
  const tcap = c.team;
  const tt = p.team;
  lines.push('## Team capacity');
  lines.push('');
  lines.push('| Role | Count | Min/call | Hrs/day | Capacity/mo | Needed/mo | Loaded |');
  lines.push('| --- | ---: | ---: | ---: | ---: | ---: | ---: |');
  lines.push(`| Junior closer (call 1) | ${tt.jrCloserCount} | ${tt.jrMinPerCall} | ${tt.jrHoursPerDay} | ${num(ceil(tcap.jrCapacityCalls))} | ${num(ceil(c.shows1))} | ${pct(tcap.jrUtilization)} |`);
  lines.push(`| Senior closer (call 2) | ${tt.srCloserCount} | ${tt.srMinPerCall} | ${tt.srHoursPerDay} | ${num(ceil(tcap.srCapacityCalls))} | ${num(ceil(c.shows2))} | ${pct(tcap.srUtilization)} |`);
  if (tcap.jrShortfall > 0) lines.push(`> ⚠️ Junior shortfall — need **${tcap.jrClosersNeeded}** junior closers total (have ${tt.jrCloserCount})`);
  if (tcap.srShortfall > 0) lines.push(`> ⚠️ Senior shortfall — need **${tcap.srClosersNeeded}** senior closers total (have ${tt.srCloserCount})`);
  if ((p.notes.team || '').trim()) {
    lines.push('');
    lines.push(`> **Note:** ${p.notes.team.trim()}`);
  }
  lines.push('');

  // Announcements
  if ((p.notes.announcements || '').trim()) {
    lines.push('## 📢 Announcements');
    lines.push('');
    lines.push(p.notes.announcements.trim());
    lines.push('');
  }
  // Pre-mortem
  if ((p.notes.premortem || '').trim()) {
    lines.push('## ⚠ Pre-mortem');
    lines.push('');
    lines.push(p.notes.premortem.trim());
    lines.push('');
  }
  // Team notes
  if ((p.notes.team || '').trim()) {
    lines.push('## 👥 Team notes');
    lines.push('');
    lines.push(p.notes.team.trim());
    lines.push('');
  }
  // Ideas
  if ((p.notes.ideas || '').trim()) {
    lines.push('## 💡 Ideas');
    lines.push('');
    lines.push(p.notes.ideas.trim());
    lines.push('');
  }

  return lines.join('\n');
}


function genMarkdown(planObj, monthId, currency){
  state = { activeMonth: monthId, months: { [monthId]: planObj }, settings: { currency } };
  return generatePlanMarkdown();
}
module.exports = { genMarkdown };
