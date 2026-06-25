// ============================================================
// generatePlanMarkdown — PURE port. Emits byte-identical GFM to the
// original (the server-side Notion parser depends on exact `**`, `_`,
// backtick, `[](...)`, `# `, `> `, `- `, `| ` syntax).
// ============================================================

import { FUNNEL_STAGES, NOTE_SECTIONS, SALES_RATE_LABELS } from './constants';
import { trackerEffectiveActual, trackerEntryScore, trackerStatus } from './tracker';
import type { Computed, Plan, TrackerEntry, TrackerKind, TrackerRow } from './types';
import type { Formatters } from '../format/formatters';

/** Convert the stored "• " bullet form back to markdown "- " for serialization. */
export function noteToMarkdown(text: string): string {
  return text.replace(/^• /gm, '- ');
}

export function generatePlanMarkdown(
  plan: Plan,
  computed: Computed,
  monthLabel: string,
  fmt: Formatters,
): string {
  const p = plan;
  const c = computed;
  const { num, money, pct, ceil } = fmt;
  const wkDivisor = p.workingDaysPerMonth / p.workingDaysPerWeek;
  const lines: string[] = [];

  lines.push(`# ${monthLabel} — Plan`);
  lines.push('');
  lines.push(
    `Revenue target: **${money(p.revenueTarget)}** · ${money(c.revPerClose)}/close · ${num(p.workingDaysPerMonth)} working days`,
  );
  lines.push('');

  lines.push('## Full funnel — what we need each month');
  lines.push('');
  lines.push('| Stage | Monthly | Weekly | Daily | Note |');
  lines.push('| --- | ---: | ---: | ---: | --- |');
  FUNNEL_STAGES.forEach((s) => {
    const v = c[s.valKey];
    const note = (p.notes[s.noteKey] || '').trim().replace(/\|/g, '\\|').replace(/\n/g, ' ');
    lines.push(
      `| **${s.lbl}** | ${num(ceil(v))} | ${num(v / wkDivisor, 1)} | ${num(v / p.workingDaysPerMonth, 1)} | ${note || '—'} |`,
    );
  });
  lines.push('');

  lines.push('## Sales funnel rates');
  lines.push('');
  lines.push('| Stage | Rate |');
  lines.push('| --- | ---: |');
  SALES_RATE_LABELS.forEach(({ k, lbl }) => lines.push(`| ${lbl} | ${p.sales[k]}% |`));
  lines.push(`| **Booking → close** (cumulative) | **${pct(c.bookingToClose * 100)}** |`);
  lines.push('');

  lines.push('## Channels');
  lines.push('');
  if (p.channels.linkedin.enabled) {
    const out = c.channelOutputs.linkedin!;
    const li = p.channels.linkedin;
    lines.push('### LinkedIn');
    lines.push(`Mix: **${li.mix}%** · bookings target: **${num(ceil(out.bk))}/mo**`);
    lines.push('');
    lines.push('| Output | Monthly | Weekly | Daily |');
    lines.push('| --- | ---: | ---: | ---: |');
    lines.push(
      `| Connections | ${num(ceil(out.connections))} | ${num(ceil(out.connectionsPerWeek))} | ${num(ceil(out.connectionsPerDay))} |`,
    );
    lines.push(`| Accepts | ${num(ceil(out.accepts))} | ${num(ceil(out.accepts / wkDivisor))} | — |`);
    lines.push(
      `| Positive replies | ${num(ceil(out.positives))} | ${num(ceil(out.positives / wkDivisor))} | — |`,
    );
    lines.push(
      `| Calendly clicks | ${num(ceil(out.calendlyClicks))} | ${num(ceil(out.calendlyClicks / wkDivisor))} | — |`,
    );
    lines.push(
      `| **Sender profiles needed** | **${out.profilesNeeded}** | — | (${li.connectsPerProfilePerDay}/day each) |`,
    );
    lines.push('');
    lines.push(`Rates: ${li.acceptRate}% accept · ${li.prr}% PRR · ${li.csr}% CSR · ${li.abr}% ABR`);
    if ((p.notes.linkedin || '').trim()) {
      lines.push('');
      lines.push(`> **Note:** ${p.notes.linkedin.trim()}`);
    }
    lines.push('');
  }
  if (p.channels.email.enabled) {
    const out = c.channelOutputs.email!;
    const em = p.channels.email;
    lines.push('### Email');
    lines.push(`Mix: **${em.mix}%** · bookings target: **${num(ceil(out.bk))}/mo**`);
    lines.push('');
    lines.push('| Output | Monthly | Weekly | Daily |');
    lines.push('| --- | ---: | ---: | ---: |');
    lines.push(
      `| Sends | ${num(ceil(out.sends))} | ${num(ceil(out.sendsPerWeek))} | ${num(ceil(out.sendsPerDay))} |`,
    );
    lines.push(`| Replies | ${num(ceil(out.replies))} | ${num(ceil(out.replies / wkDivisor))} | — |`);
    lines.push(
      `| Positive replies | ${num(ceil(out.positives))} | ${num(ceil(out.positives / wkDivisor))} | — |`,
    );
    lines.push(
      `| **Inboxes / Domains needed** | **${out.inboxesNeeded} / ${out.domainsNeeded}** | — | (${em.sendsPerInboxPerDay}/inbox · ${em.inboxesPerDomain} inboxes/domain) |`,
    );
    lines.push('');
    lines.push(`Rates: ${em.replyRate}% reply · ${em.prr}% PRR · ${em.abr}% ABR`);
    if ((p.notes.email || '').trim()) {
      lines.push('');
      lines.push(`> **Note:** ${p.notes.email.trim()}`);
    }
    lines.push('');
  }

  const tcap = c.team;
  const tt = p.team;
  lines.push('## Team capacity');
  lines.push('');
  lines.push('| Role | Count | Min/call | Hrs/day | Capacity/mo | Needed/mo | Loaded |');
  lines.push('| --- | ---: | ---: | ---: | ---: | ---: | ---: |');
  lines.push(
    `| Junior closer (call 1) | ${tt.jrCloserCount} | ${tt.jrMinPerCall} | ${tt.jrHoursPerDay} | ${num(ceil(tcap.jrCapacityCalls))} | ${num(ceil(c.shows1))} | ${pct(tcap.jrUtilization)} |`,
  );
  lines.push(
    `| Senior closer (call 2) | ${tt.srCloserCount} | ${tt.srMinPerCall} | ${tt.srHoursPerDay} | ${num(ceil(tcap.srCapacityCalls))} | ${num(ceil(c.shows2))} | ${pct(tcap.srUtilization)} |`,
  );
  if (tcap.jrShortfall > 0)
    lines.push(
      `> ⚠️ Junior shortfall — need **${tcap.jrClosersNeeded}** junior closers total (have ${tt.jrCloserCount})`,
    );
  if (tcap.srShortfall > 0)
    lines.push(
      `> ⚠️ Senior shortfall — need **${tcap.srClosersNeeded}** senior closers total (have ${tt.srCloserCount})`,
    );
  if ((p.notes.team || '').trim()) {
    lines.push('');
    lines.push(`> **Note:** ${p.notes.team.trim()}`);
  }
  lines.push('');

  if ((p.notes.announcements || '').trim()) {
    lines.push('## 📢 Announcements');
    lines.push('');
    lines.push(p.notes.announcements.trim());
    lines.push('');
  }
  if ((p.notes.premortem || '').trim()) {
    lines.push('## ⚠ Pre-mortem');
    lines.push('');
    lines.push(p.notes.premortem.trim());
    lines.push('');
  }
  if ((p.notes.team || '').trim()) {
    lines.push('## 👥 Team notes');
    lines.push('');
    lines.push(p.notes.team.trim());
    lines.push('');
  }
  if ((p.notes.ideas || '').trim()) {
    lines.push('## 💡 Ideas');
    lines.push('');
    lines.push(p.notes.ideas.trim());
    lines.push('');
  }

  return lines.join('\n');
}

// ============================================================
// Tracker entry report — markdown for a weekly/monthly actuals entry.
// ============================================================

export function generateTrackerMarkdown(
  kind: TrackerKind,
  entry: TrackerEntry,
  rows: TrackerRow[],
  fmt: Formatters,
  label: string,
  planMonthLabel: string,
): string {
  const { fmtNum } = fmt;
  const score = trackerEntryScore(rows, entry);
  const kindLabel = kind === 'weekly' ? 'Weekly' : 'Monthly';
  const lines: string[] = [];

  lines.push(`# ${label} — ${kindLabel} report`);
  lines.push('');
  const scoreLine = score.scored
    ? `${score.hit}/${score.scored} ahead · ${Math.round(score.pct ?? 0)}%`
    : 'no data yet';
  lines.push(`vs **${planMonthLabel}** war plan · ${scoreLine}`);
  lines.push('');

  lines.push('## Metrics');
  lines.push('');
  lines.push('| Metric | Target | Actual | Δ | Status |');
  lines.push('| --- | ---: | ---: | ---: | --- |');
  rows.forEach((r) => {
    if ('section' in r) {
      lines.push(`| **${r.section}** | | | | |`);
      return;
    }
    const eff = trackerEffectiveActual(r, entry.actuals);
    const actual = eff.value;
    const opts = { money: !!r.money, rate: !!r.rate };
    const delta = actual - r.target;
    const showDelta = !r.noDelta && actual > 0;
    const deltaTxt = showDelta ? (delta >= 0 ? '+' : '−') + fmtNum(Math.abs(delta), opts) : '—';
    const status = r.noDelta
      ? '—'
      : trackerStatus(r.target, actual, !!r.lowerBetter).label;
    lines.push(
      `| ${r.lbl} | ${fmtNum(r.target, opts)} | ${actual > 0 ? fmtNum(actual, opts) : '—'} | ${deltaTxt} | ${status} |`,
    );
  });
  lines.push('');

  NOTE_SECTIONS.forEach((n) => {
    const content = (entry.notes[n.k] || '').trim();
    if (!content) return;
    lines.push(`## ${n.icon} ${n.lbl}`);
    lines.push('');
    lines.push(noteToMarkdown(content));
    lines.push('');
  });

  return lines.join('\n');
}
