import { Section } from '../primitives/Card';
import { DialRow } from '../primitives/DialRow';
import { useComputed, usePlan } from '../../selectors/hooks';
import { useFormatters } from '../../format/useMoney';
import { useStore } from '../../state/store';
import type { Formatters } from '../../format/formatters';
import type { Team } from '../../engine/types';

function statusOf(util: number): 'good' | 'warn' | 'bad' {
  if (util > 100) return 'bad';
  if (util > 85) return 'warn';
  return 'good';
}

interface CapCardProps {
  role: 'junior' | 'senior';
  label: string;
  needed: number;
  capacity: number;
  util: number;
  count: number;
  perRepCap: number;
  shortfall: number;
  closersNeeded: number;
  plan: { workingDaysPerMonth: number; workingDaysPerWeek: number };
  fmt: Formatters;
}

function CapCard({
  role, label, needed, capacity, util, count, perRepCap, shortfall, closersNeeded, plan, fmt,
}: CapCardProps) {
  const { num, pct, ceil } = fmt;
  const s = statusOf(util);
  // statusOf returns 'good' for the bar's ok state; the original used 'ok' class.
  const barCls = util > 100 ? 'bad' : util > 85 ? 'warn' : 'ok';
  const wkDiv = plan.workingDaysPerMonth / plan.workingDaysPerWeek;
  const mDiv = plan.workingDaysPerMonth;
  const remaining = capacity - needed;

  return (
    <div className="cap-card cap-role-card">
      <div className="cap-role-head">
        <div>
          <div className="lbl">{label}</div>
          <div className={`val ${s}`}>{pct(util)} loaded</div>
        </div>
        <div className="cap-headcount">{count} on team</div>
      </div>
      <div className="bar">
        <div className={`bar-fill ${barCls}`} style={{ width: `${Math.min(100, util).toFixed(1)}%` }} />
      </div>
      <table className="cap-periods">
        <thead>
          <tr>
            <th />
            <th className="num">Daily</th>
            <th className="num">Weekly</th>
            <th className="num">Monthly</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Bookings to cover</td>
            <td className="num">{num(needed / mDiv, 1)}</td>
            <td className="num">{num(needed / wkDiv, 1)}</td>
            <td className="num">{num(ceil(needed))}</td>
          </tr>
          <tr>
            <td>Booking capacity</td>
            <td className="num">{num(capacity / mDiv, 1)}</td>
            <td className="num">{num(capacity / wkDiv, 1)}</td>
            <td className="num">{num(ceil(capacity))}</td>
          </tr>
          <tr className={`slack-row ${remaining < 0 ? 'short' : 'ok'}`}>
            <td>{remaining < 0 ? 'Short by' : 'Slack'}</td>
            <td className="num">{num(Math.abs(remaining) / mDiv, 1)}</td>
            <td className="num">{num(Math.abs(remaining) / wkDiv, 1)}</td>
            <td className="num">{num(ceil(Math.abs(remaining)))}</td>
          </tr>
        </tbody>
      </table>
      <div className={`cap-rec ${shortfall > 0 ? 'warn' : 'ok'}`}>
        {shortfall > 0 ? (
          <>
            <b>Hire {closersNeeded - count} more</b> — {closersNeeded} total needed, you have {count}.
            Each {role} covers {num(ceil(perRepCap))} bookings/mo.
          </>
        ) : (
          <>Covered — each {role} covers {num(ceil(perRepCap))} bookings/mo.</>
        )}
      </div>
    </div>
  );
}

const CAP_ROWS: { k: keyof Team; label: string; hint: string; min: number; max: number; step: number; unit: string | null }[] = [
  { k: 'jrCloserCount', label: 'Junior closers (count)', hint: 'people who run call 1', min: 0, max: 20, step: 1, unit: '' },
  { k: 'jrMinPerCall', label: 'Call 1 length', hint: 'minutes per call 1', min: 5, max: 60, step: 5, unit: 'min' },
  { k: 'jrHoursPerDay', label: 'Junior productive hrs / day', hint: 'hours each junior actually spends on calls per workday', min: 0, max: 12, step: 0.5, unit: 'hrs' },
  { k: 'jrCommissionPerQshow', label: 'Junior commission per qualified show', hint: '£ paid to junior per qualified call-2 show on closer calendar', min: 0, max: 500, step: 5, unit: null },
  { k: 'srCloserCount', label: 'Senior closers (count)', hint: 'people who run call 2', min: 0, max: 20, step: 1, unit: '' },
  { k: 'srMinPerCall', label: 'Call 2 length', hint: 'minutes per call 2', min: 15, max: 120, step: 5, unit: 'min' },
  { k: 'srHoursPerDay', label: 'Senior productive hrs / day', hint: 'hours each senior actually spends on calls per workday', min: 0, max: 12, step: 0.5, unit: 'hrs' },
  { k: 'srCommissionPct', label: 'Closer commission (% of cash collected)', hint: '% of cash per close paid as commission', min: 0, max: 30, step: 0.5, unit: '%' },
];

export function TeamCapacitySection() {
  const plan = usePlan();
  const c = useComputed();
  const fmt = useFormatters();
  const { num, money, ceil, symbol } = fmt;
  const updatePlan = useStore((s) => s.updatePlan);
  const t = plan.team;
  const cap = c.team;

  return (
    <Section
      title="Team capacity"
      summary={`${num(ceil(c.bookings))} call 1 bookings + ${num(ceil(c.book2))} call 2 bookings · ${money(cap.totalCommissions)} commissions/mo`}
    >
      <div className="capacity-grid">
        <CapCard
          role="junior"
          label={`Junior closer · call 1 (${t.jrMinPerCall} min)`}
          needed={c.bookings}
          capacity={cap.jrCapacityCalls}
          util={cap.jrUtilization}
          count={t.jrCloserCount}
          perRepCap={cap.jrCapacityCalls / Math.max(1, t.jrCloserCount)}
          shortfall={cap.jrShortfall}
          closersNeeded={cap.jrClosersNeeded}
          plan={plan}
          fmt={fmt}
        />
        <CapCard
          role="senior"
          label={`Senior closer · call 2 (${t.srMinPerCall} min)`}
          needed={c.book2}
          capacity={cap.srCapacityCalls}
          util={cap.srUtilization}
          count={t.srCloserCount}
          perRepCap={cap.srCapacityCalls / Math.max(1, t.srCloserCount)}
          shortfall={cap.srShortfall}
          closersNeeded={cap.srClosersNeeded}
          plan={plan}
          fmt={fmt}
        />
      </div>
      <div>
        {CAP_ROWS.map((r) => (
          <DialRow
            key={r.k}
            label={r.label}
            hint={r.hint}
            value={t[r.k]}
            min={r.min}
            max={r.max}
            step={r.step}
            unit={r.unit === null ? symbol : r.unit}
            onChange={(v) => updatePlan((p) => void (p.team[r.k] = v))}
          />
        ))}
      </div>
    </Section>
  );
}
