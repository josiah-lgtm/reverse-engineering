import { useEffect, useRef, useState } from 'react';
import { fmtMonth } from '../../engine/dates';
import { useComputed, usePlan } from '../../selectors/hooks';
import { useFormatters } from '../../format/useMoney';
import { useStore } from '../../state/store';
import { cssVars } from '../../lib/css';

export function TargetCard() {
  const plan = usePlan();
  const c = useComputed();
  const { money, symbol } = useFormatters();
  const activeMonth = useStore((s) => s.activeMonth);
  const updatePlan = useStore((s) => s.updatePlan);

  const wkDiv = plan.workingDaysPerMonth / plan.workingDaysPerWeek;
  const mDiv = plan.workingDaysPerMonth;

  const [revDraft, setRevDraft] = useState(String(plan.revenueTarget));
  const revFocused = useRef(false);
  useEffect(() => {
    if (!revFocused.current) setRevDraft(String(plan.revenueTarget));
  }, [plan.revenueTarget]);

  const cashPct = plan.cashCollectedPct || 0;

  return (
    <section className="target-card">
      <div className="target-month-lbl">
        <span id="active-month-label">{fmtMonth(activeMonth)}</span>
      </div>

      <div className="target-input-col revenue" style={{ marginBottom: 24 }}>
        <div className="lbl">Contracted revenue target</div>
        <div className="input-wrap">
          <span className="currency">{symbol}</span>
          <input
            id="rev-target"
            type="number"
            min={0}
            step={1000}
            value={revDraft}
            onFocus={() => (revFocused.current = true)}
            onChange={(e) => {
              setRevDraft(e.target.value);
              updatePlan((p) => void (p.revenueTarget = parseFloat(e.target.value) || 0));
            }}
            onBlur={() => {
              revFocused.current = false;
              setRevDraft(String(plan.revenueTarget));
            }}
          />
          <span className="period">/ month</span>
        </div>
        <div className="target-sub">
          {money(plan.revenueTarget / wkDiv)} /wk · {money(plan.revenueTarget / mDiv)} /day · total
          contracted value sold this month
        </div>
      </div>

      <div className="cash-dial-row">
        <div className="dial-col">
          <div className="lbl">Cash collected · % of contracted</div>
          <div className="dial-slider-wrap">
            <input
              id="cash-pct"
              type="range"
              min={0}
              max={100}
              step={1}
              value={cashPct}
              style={cssVars({ '--pct': cashPct + '%' })}
              onChange={(e) =>
                updatePlan((p) => void (p.cashCollectedPct = parseInt(e.target.value, 10) || 0))
              }
            />
            <span className="dial-pct-val">{cashPct}%</span>
          </div>
          <div className="target-sub">
            drag the dial to set how much of contracted revenue comes in as cash upfront
          </div>
        </div>
        <div className="dial-derived">
          <div className="rev-stat-lbl">Cash collected target</div>
          <div className="rev-stat-val">{money(c.cashCollectedTarget)}</div>
          <div className="rev-stat-sub">
            {money(c.cashCollectedTarget / wkDiv)} /wk · {money(c.cashCollectedTarget / mDiv)} /day ·
            upfront cash from new sales
          </div>
        </div>
      </div>

      <div
        className="target-derived"
        style={{ marginTop: 24, paddingTop: 24, borderTop: '1px solid var(--separator)' }}
      >
        <div className="rev-stat" id="rev-stat-cash">
          <div className="rev-stat-lbl">Cash collected · derived from closes</div>
          <div className="rev-stat-val">{money(c.cashCollectedMo)}</div>
          <div className="rev-stat-sub">
            {money(c.cashCollectedMo / wkDiv)} /wk · {money(c.cashCollectedMo / mDiv)} /day
          </div>
        </div>
        <div className="rev-stat" id="rev-stat-contract">
          <div className="rev-stat-lbl">Contracted revenue · derived from closes</div>
          <div className="rev-stat-val">{money(c.contractedRevenueMo)}</div>
          <div className="rev-stat-sub">
            {money(c.contractedRevenueMo / wkDiv)} /wk · {money(c.contractedRevenueMo / mDiv)} /day
          </div>
        </div>
      </div>
    </section>
  );
}
