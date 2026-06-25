import type { TrackerKind } from '../../engine/types';
import type { HistoryDashboard as DashData } from '../../selectors/history';
import type { Formatters } from '../../format/formatters';

const HEADLINE: { k: string; lbl: string; money?: boolean }[] = [
  { k: 'wp_revenueTarget', lbl: 'Contracted revenue', money: true },
  { k: 'wp_cashCollectedTarget', lbl: 'Cash collected', money: true },
  { k: 'wp_closes', lbl: 'Closes' },
  { k: 'wp_bookings', lbl: 'Call 1 bookings' },
  { k: 'wp_marketing', lbl: 'Marketing spend', money: true },
  { k: 'wp_profit', lbl: 'Profit on M+S', money: true },
];

export function HistoryDashboard({
  kind, data, from, to, fmt,
}: {
  kind: TrackerKind;
  data: DashData;
  from: string;
  to: string;
  fmt: Formatters;
}) {
  const scoreCls =
    data.scorePct == null ? '' : data.scorePct >= 75 ? 'good' : data.scorePct >= 50 ? 'warn' : 'bad';

  return (
    <div className="hist-dashboard">
      <div className="hd-tile">
        <div className="lbl">{kind === 'weekly' ? 'Weeks' : 'Months'}</div>
        <div className="val">{data.count}</div>
        <div className="sub">
          {from} → {to}
        </div>
      </div>
      <div className="hd-tile">
        <div className="lbl">Hit rate</div>
        <div className={`val ${scoreCls}`}>{data.scorePct == null ? '—' : `${data.scorePct}%`}</div>
        <div className="sub">metrics at-or-above target</div>
      </div>
      {HEADLINE.map((h) => (
        <div className="hd-tile" key={h.k}>
          <div className="lbl">{h.lbl}</div>
          <div className="val">{fmt.fmtNum(data.totals[h.k] || 0, { money: h.money })}</div>
          <div className="sub">total · {kind}</div>
        </div>
      ))}
    </div>
  );
}
