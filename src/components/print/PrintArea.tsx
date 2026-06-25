import { Fragment, useEffect } from 'react';
import { NOTE_SECTIONS, TRACKERS } from '../../engine/constants';
import { fmtMonth } from '../../engine/dates';
import { compute } from '../../engine/compute';
import {
  trackerEffectiveActual,
  trackerEntryScore,
  trackerStatus,
  trackerTargetRows,
} from '../../engine/tracker';
import { isSectionRow } from '../../engine/types';
import type { EntryId, TrackerEntry, TrackerKind } from '../../engine/types';
import { useFormatters } from '../../format/useMoney';
import type { Formatters } from '../../format/formatters';
import { useStore } from '../../state/store';
import { usePrintStore } from '../../state/printStore';

function PrintSheet({
  kind, id, entry, fmt,
}: {
  kind: TrackerKind;
  id: EntryId;
  entry: TrackerEntry;
  fmt: Formatters;
}) {
  const t = TRACKERS[kind];
  const months = useStore((s) => s.months);
  const activeMonth = useStore((s) => s.activeMonth);
  const planObj = months[entry.planMonth] ?? months[activeMonth];
  const rows = trackerTargetRows(kind, planObj, compute(planObj), fmt);
  const score = trackerEntryScore(rows, entry);

  // Split rows into section groups for KPI tables.
  const groups: { section: string; rows: typeof rows }[] = [];
  rows.forEach((r) => {
    if (isSectionRow(r)) groups.push({ section: r.section, rows: [] });
    else if (groups.length) groups[groups.length - 1].rows.push(r);
  });

  return (
    <div className="we-print-area">
      <header className="pdf-header">
        <div className="pdf-brand">
          🏆 Agency Advanta — {kind === 'weekly' ? 'Weekly' : 'Monthly'} Team Meeting
        </div>
        <div className="pdf-meta-row">
          <span className="pdf-date">{t.fmtLabel(id)}</span>
          <span className="pdf-sep">·</span>
          <span className="pdf-plan">vs {fmtMonth(entry.planMonth)} war plan</span>
          {score.scored ? (
            <span className="pdf-agg-pill">
              {score.hit}/{score.scored} ahead · {Math.round(score.pct ?? 0)}%
            </span>
          ) : null}
        </div>
      </header>
      <div className="pdf-tagline">Number #1 B2B Outbound Advisory In The World</div>
      <div className="pdf-tagline pdf-tagline-pillars">🏆 Mastery · ⬆ Simplicity · 💀 Sacrifice</div>

      {NOTE_SECTIONS.map((n) => {
        const content = (entry.notes[n.k] || '').trim();
        if (!content) return null;
        return (
          <div className="pdf-note-card" key={n.k}>
            <div className="pdf-note-h2">
              <span className="pdf-note-icon">{n.icon}</span>
              {n.lbl}
            </div>
            <div className="pdf-note-body">{content}</div>
          </div>
        );
      })}

      {groups.map((g) => (
        <Fragment key={g.section}>
          <div className="pdf-section-h2">{g.section}</div>
          <table className="pdf-kpi-table">
            <thead>
              <tr>
                <th>Metric</th>
                <th className="num">{t.targetHeader}</th>
                <th className="num">Actual</th>
                <th className="num">Δ</th>
                <th className="num">Status</th>
                <th className="pdf-note-cell">Context</th>
              </tr>
            </thead>
            <tbody>
              {g.rows.map((r) => {
                if (isSectionRow(r)) return null;
                const eff = trackerEffectiveActual(r, entry.actuals);
                const actual = eff.value;
                const opts = { money: !!r.money, rate: !!r.rate };
                const delta = actual - r.target;
                const showDelta = !r.noDelta && actual > 0;
                const status = r.noDelta
                  ? { cls: 'neutral', label: '—' }
                  : trackerStatus(r.target, actual, !!r.lowerBetter);
                return (
                  <tr key={r.k}>
                    <td>{r.lbl}</td>
                    <td className="num">{fmt.fmtNum(r.target, opts)}</td>
                    <td className="num">{actual > 0 ? fmt.fmtNum(actual, opts) : '—'}</td>
                    <td className="num">
                      {showDelta ? (delta >= 0 ? '+' : '−') + fmt.fmtNum(Math.abs(delta), opts) : '—'}
                    </td>
                    <td className="num">
                      <span className={`pdf-status-pill ${status.cls}`}>{status.label}</span>
                    </td>
                    <td className="pdf-note-cell">{r.conv || ''}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Fragment>
      ))}
    </div>
  );
}

/** Renders the print sheet for the requested entry and triggers window.print(). */
export function PrintArea() {
  const fmt = useFormatters();
  const request = usePrintStore((s) => s.request);
  const nonce = usePrintStore((s) => s.nonce);
  const clear = usePrintStore((s) => s.clear);
  const entry = useStore((s) =>
    request ? (request.kind === 'weekly' ? s.weeklyEntries : s.monthlyEntries)[request.id] : undefined,
  );

  useEffect(() => {
    if (!request || !entry) return;
    const tm = setTimeout(() => {
      window.print();
      clear();
    }, 60);
    return () => clearTimeout(tm);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nonce]);

  if (!request || !entry) return null;
  return <PrintSheet kind={request.kind} id={request.id} entry={entry} fmt={fmt} />;
}
