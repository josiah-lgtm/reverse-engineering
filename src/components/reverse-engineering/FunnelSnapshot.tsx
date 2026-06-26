import { Fragment, useEffect, useRef, useState } from 'react';
import { FUNNEL_STAGES, SALES_RATE_SHORT } from '../../engine/constants';
import type { SalesRates } from '../../engine/types';
import { useComputed, usePlan } from '../../selectors/hooks';
import { useFormatters } from '../../format/useMoney';
import { useStore } from '../../state/store';
import { cssVars } from '../../lib/css';

/** Compact inline editor for one conversion rate — a slider + number, live. */
function RateInline({ rateKey }: { rateKey: keyof SalesRates }) {
  const value = usePlan().sales[rateKey];
  const updatePlan = useStore((s) => s.updatePlan);
  const [draft, setDraft] = useState(String(value));
  const focused = useRef(false);
  useEffect(() => {
    if (!focused.current) setDraft(String(value));
  }, [value]);

  const set = (v: number) =>
    updatePlan((p) => void (p.sales[rateKey] = Math.max(0, Math.min(100, v || 0))));

  return (
    <div className="fcc">
      <span className="fcc-label">{SALES_RATE_SHORT[rateKey]}</span>
      <input
        type="range"
        min={0}
        max={100}
        step={1}
        value={value}
        style={cssVars({ '--pct': value + '%' })}
        onChange={(e) => set(parseInt(e.target.value, 10) || 0)}
      />
      <span className="fcc-num">
        <input
          type="number"
          min={0}
          max={100}
          value={draft}
          onFocus={() => (focused.current = true)}
          onChange={(e) => {
            setDraft(e.target.value);
            set(parseFloat(e.target.value) || 0);
          }}
          onBlur={() => {
            focused.current = false;
            setDraft(String(value));
          }}
        />
        %
      </span>
    </div>
  );
}

export function FunnelSnapshot() {
  const plan = usePlan();
  const c = useComputed();
  const { num, money, pct, ceil } = useFormatters();
  const errorPct = useStore((s) => s.settings.errorPct);

  const wkDivisor = plan.workingDaysPerMonth / plan.workingDaysPerWeek;
  const mDivisor = plan.workingDaysPerMonth;
  const eps = (errorPct || 0) / 100;
  const errorAtStage = (i: number) => (eps > 0 ? Math.sqrt(i + 1) * eps : 0);

  const maxVal = c[FUNNEL_STAGES[0].valKey] || 0; // bookings — the top, widest stage

  return (
    <section className="funnel-snapshot">
      <div className="head">
        <span className="title">Full funnel — what you need each month</span>
        <span className="summary">
          {pct(c.bookingToClose * 100)} booking→close · {money(c.revPerClose)}/close ·{' '}
          {money(plan.revenueTarget)} target
        </span>
      </div>
      <div className="funnel-hint">
        Drag a conversion rate to see the whole funnel — and everything downstream — update instantly.
      </div>
      <div className="funnel-flow">
        {FUNNEL_STAGES.map((s, i) => {
          const val = c[s.valKey];
          const w = maxVal > 0 ? Math.max(4, (val / maxVal) * 100) : 0;
          const err = errorAtStage(s.hero ? (i === 0 ? FUNNEL_STAGES.length - 1 : 0) : 0);
          return (
            <Fragment key={s.valKey}>
              {s.rateKeys && s.rateKeys.length > 0 && (
                <div className="funnel-conv">
                  <span className="funnel-conv-arrow">↓</span>
                  {s.rateKeys.map((rk) => (
                    <RateInline key={rk} rateKey={rk} />
                  ))}
                </div>
              )}
              <div className={`funnel-row ${s.hero ? 'hero' : ''}`.trim()}>
                <div className="fr-bar" style={cssVars({ '--w': w + '%' })} />
                <div className="fr-content">
                  <span className="fr-lbl">{s.lbl}</span>
                  <span className="fr-val">
                    {num(ceil(val))}
                    {s.hero && err > 0 && <span className="err-chip">±{(err * 100).toFixed(0)}%</span>}
                  </span>
                </div>
                <div className="fr-sub">
                  {num(val / wkDivisor, 1)} /wk · {num(val / mDivisor, 1)} /day
                </div>
              </div>
            </Fragment>
          );
        })}
      </div>
    </section>
  );
}
