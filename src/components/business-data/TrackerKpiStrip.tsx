import { trackerEffectiveActual, trackerStatus } from '../../engine/tracker';
import { isSectionRow } from '../../engine/types';
import type { TrackerEntry, TrackerMetricRow, TrackerRow } from '../../engine/types';
import { useFormatters } from '../../format/useMoney';

// Headline metrics surfaced as auto-totals at the top of each entry.
const HEADLINE: { k: string; lbl: string }[] = [
  { k: 'wp_revenueTarget', lbl: 'Contracted revenue' },
  { k: 'wp_cashCollectedTarget', lbl: 'Cash collected' },
  { k: 'wp_closes', lbl: 'Closes' },
  { k: 'wp_bookings', lbl: 'Call 1 bookings' },
];

export function TrackerKpiStrip({ rows, entry }: { rows: TrackerRow[]; entry: TrackerEntry }) {
  const { fmtNum } = useFormatters();
  const actuals = entry.actuals || {};
  const byKey = new Map<string, TrackerMetricRow>();
  for (const r of rows) if (!isSectionRow(r)) byKey.set(r.k, r);

  return (
    <div className="bd-kpi-strip">
      {HEADLINE.map((h) => {
        const r = byKey.get(h.k);
        if (!r) return null;
        const opts = { money: !!r.money, rate: !!r.rate };
        const eff = trackerEffectiveActual(r, actuals);
        const hasActual = eff.value > 0;
        const status = trackerStatus(r.target, eff.value, !!r.lowerBetter);
        return (
          <div className={`bd-kpi ${status.cls}`} key={h.k}>
            <div className="bk-lbl">{h.lbl}</div>
            <div className="bk-actual">{hasActual ? fmtNum(eff.value, opts) : '—'}</div>
            <div className="bk-target">target {fmtNum(r.target, opts)}</div>
            {hasActual && <span className={`we-status-pill ${status.cls}`}>{status.label}</span>}
          </div>
        );
      })}
    </div>
  );
}
