import { useEffect, useRef, useState } from 'react';
import { fmtMonth } from '../../engine/dates';
import { useComputed, usePlan } from '../../selectors/hooks';
import { useFormatters } from '../../format/useMoney';
import { useStore } from '../../state/store';
import { cssVars } from '../../lib/css';

export function TargetCard() {
  const plan = usePlan();
  const c = useComputed();
  const { money, num, symbol } = useFormatters();
  const activeMonth = useStore((s) => s.activeMonth);
  const setTargetMode = useStore((s) => s.setTargetMode);
  const setRevenueTarget = useStore((s) => s.setRevenueTarget);
  const setCashTarget = useStore((s) => s.setCashTarget);
  const setCashPct = useStore((s) => s.setCashPct);

  const wkDiv = plan.workingDaysPerMonth / plan.workingDaysPerWeek;
  const mDiv = plan.workingDaysPerMonth;
  const cashPct = plan.cashCollectedPct || 0;
  const mode = plan.targetMode;

  // Each editable input keeps a local draft while focused so typing doesn't fight
  // the store; the displayed value rounds to whole units (state stays precise).
  const [revDraft, setRevDraft] = useState(String(Math.round(plan.revenueTarget)));
  const revFocused = useRef(false);
  useEffect(() => {
    if (!revFocused.current) setRevDraft(String(Math.round(plan.revenueTarget)));
  }, [plan.revenueTarget]);

  const [cashDraft, setCashDraft] = useState(String(Math.round(plan.cashTarget)));
  const cashFocused = useRef(false);
  useEffect(() => {
    if (!cashFocused.current) setCashDraft(String(Math.round(plan.cashTarget)));
  }, [plan.cashTarget]);

  return (
    <section className="target-card">
      <div className="target-card-top">
        <div className="target-month-lbl">
          <span id="active-month-label">{fmtMonth(activeMonth)}</span>
        </div>
        <div className="target-mode-toggle" role="group" aria-label="Drive the plan from">
          <span className="tmt-label">Drive from</span>
          <div className="hc-toggle">
            <button
              type="button"
              className={`hc-toggle-btn ${mode === 'revenue' ? 'active' : ''}`.trim()}
              onClick={() => setTargetMode('revenue')}
            >
              Revenue
            </button>
            <button
              type="button"
              className={`hc-toggle-btn ${mode === 'cash' ? 'active' : ''}`.trim()}
              onClick={() => setTargetMode('cash')}
            >
              Cash collected
            </button>
          </div>
        </div>
      </div>

      {mode === 'revenue' ? (
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
                setRevenueTarget(parseFloat(e.target.value) || 0);
              }}
              onBlur={() => {
                revFocused.current = false;
                setRevDraft(String(Math.round(plan.revenueTarget)));
              }}
            />
            <span className="period">/ month</span>
          </div>
          <div className="target-sub">
            {money(plan.revenueTarget / wkDiv)} /wk · {money(plan.revenueTarget / mDiv)} /day · total
            contracted value sold this month
          </div>
        </div>
      ) : (
        <div className="target-input-col cash" style={{ marginBottom: 24 }}>
          <div className="lbl">Cash collected target</div>
          <div className="input-wrap">
            <span className="currency">{symbol}</span>
            <input
              id="cash-target"
              type="number"
              min={0}
              step={1000}
              value={cashDraft}
              onFocus={() => (cashFocused.current = true)}
              onChange={(e) => {
                setCashDraft(e.target.value);
                setCashTarget(parseFloat(e.target.value) || 0);
              }}
              onBlur={() => {
                cashFocused.current = false;
                setCashDraft(String(Math.round(plan.cashTarget)));
              }}
            />
            <span className="period">/ month</span>
          </div>
          <div className="target-sub">
            {money(plan.cashTarget / wkDiv)} /wk · {money(plan.cashTarget / mDiv)} /day · upfront cash
            you want to collect this month
          </div>
        </div>
      )}

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
              onChange={(e) => setCashPct(parseInt(e.target.value, 10) || 0)}
            />
            <span className="dial-pct-val">{cashPct}%</span>
          </div>
          <div className="target-sub">
            {mode === 'cash'
              ? 'in cash mode, this fixes the cash target and back-solves the contracted revenue you need'
              : 'how much of contracted revenue lands as upfront cash'}
          </div>
        </div>
        <div className="dial-derived">
          {mode === 'revenue' ? (
            <>
              <div className="rev-stat-lbl">Cash collected target</div>
              <div className="rev-stat-val">{money(c.cashCollectedTarget)}</div>
              <div className="rev-stat-sub">
                = {cashPct}% of {money(plan.revenueTarget)} contracted
              </div>
            </>
          ) : (
            <>
              <div className="rev-stat-lbl">Contracted revenue needed</div>
              <div className="rev-stat-val">{money(plan.revenueTarget)}</div>
              <div className="rev-stat-sub">
                = {money(plan.cashTarget)} cash ÷ {cashPct}%
              </div>
            </>
          )}
        </div>
      </div>

      <div
        className="target-derived"
        style={{ marginTop: 24, paddingTop: 24, borderTop: '1px solid var(--separator)' }}
      >
        <div className="rev-stat" id="rev-stat-closes">
          <div className="rev-stat-lbl">Closes needed · the bridge to your funnel</div>
          <div className="rev-stat-val">{num(c.closes, 1)}</div>
          <div className="rev-stat-sub">
            {money(c.packagePrice)} per close · {num(c.closes / wkDiv, 1)} /wk ·{' '}
            {num(c.closes / mDiv, 1)} /day
          </div>
        </div>
        <div className="rev-stat" id="rev-stat-bothtargets">
          <div className="rev-stat-lbl">Both targets, side by side</div>
          <div className="rev-stat-val">
            {money(plan.revenueTarget)}
            <span style={{ color: 'var(--text-quaternary)', margin: '0 8px', fontWeight: 400 }}>
              ·
            </span>
            <span style={{ color: 'var(--accent-hover)' }}>{money(plan.cashTarget)}</span>
          </div>
          <div className="rev-stat-sub">contracted revenue · cash collected</div>
        </div>
      </div>
    </section>
  );
}
