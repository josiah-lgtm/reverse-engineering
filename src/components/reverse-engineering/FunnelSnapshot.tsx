import { FUNNEL_STAGES } from '../../engine/constants';
import { useComputed, usePlan } from '../../selectors/hooks';
import { useFormatters } from '../../format/useMoney';
import { useStore } from '../../state/store';

export function FunnelSnapshot() {
  const plan = usePlan();
  const c = useComputed();
  const { num, money, pct, ceil } = useFormatters();
  const errorPct = useStore((s) => s.settings.errorPct);

  const wkDivisor = plan.workingDaysPerMonth / plan.workingDaysPerWeek;
  const mDivisor = plan.workingDaysPerMonth;
  const eps = (errorPct || 0) / 100;
  const errorAtStage = (i: number) => (eps > 0 ? Math.sqrt(i + 1) * eps : 0);

  return (
    <section className="funnel-snapshot">
      <div className="head">
        <span className="title">Full funnel — what you need each month</span>
        <span className="summary">
          {pct(c.bookingToClose * 100)} booking→close · {money(c.revPerClose)}/close ·{' '}
          {money(plan.revenueTarget)} target
        </span>
      </div>
      <div className="funnel-stages">
        {FUNNEL_STAGES.map((s, i) => {
          const val = c[s.valKey];
          const err = errorAtStage(s.hero ? (i === 0 ? FUNNEL_STAGES.length - 1 : 0) : 0);
          return (
            <div key={s.valKey} className={`funnel-stage ${s.hero ? 'hero' : ''}`.trim()}>
              <div className="lbl">{s.lbl}</div>
              <div className="val">
                {num(ceil(val))}
                {s.hero && err > 0 && <div className="err-chip">±{(err * 100).toFixed(0)}%</div>}
              </div>
              <div className="sub">
                {num(val / wkDivisor, 1)} /wk · {num(val / mDivisor, 1)} /day
              </div>
              {i < FUNNEL_STAGES.length - 1 && <span className="funnel-arrow">›</span>}
            </div>
          );
        })}
      </div>
    </section>
  );
}
