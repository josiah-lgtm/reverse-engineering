import { Section } from '../primitives/Card';
import { useComputed, usePlan } from '../../selectors/hooks';
import { useFormatters } from '../../format/useMoney';
import type { ChannelKey } from '../../engine/types';

function statusOfRatio(v: number): 'good' | 'warn' | 'bad' {
  return v >= 3 ? 'good' : v >= 2 ? 'warn' : 'bad';
}

export function EconomicsSection() {
  const plan = usePlan();
  const c = useComputed();
  const { num, money, pct, ceil } = useFormatters();
  const e = c.economics;
  const ltvCacStatus = statusOfRatio(e.ltvCac);
  const profitStatus = e.profitAfterSM > 0 ? 'good' : 'bad';

  const channels = (Object.keys(plan.channels) as ChannelKey[])
    .filter((k) => plan.channels[k].enabled && c.channelOutputs[k])
    .map((k) => ({ k, out: c.channelOutputs[k]!, ch: plan.channels[k] }));

  return (
    <Section
      title="Unit economics"
      summary={`LTV ${money(e.ltv)} · CAC ${money(e.cacOverall)} · ${
        e.ltvCac > 0 ? e.ltvCac.toFixed(1) + 'x ratio' : 'no closes'
      }`}
    >
      <div className="econ-card">
        <div className="econ-kpis">
          <div className="econ-kpi hero">
            <div className="lbl">LTV per close</div>
            <div className="val">{money(e.ltv)}</div>
            <div className="sub">
              program price ({money(c.cashPerClose)} cash + {money(c.contractPerClose)} contracted)
            </div>
          </div>
          <div className="econ-kpi">
            <div className="lbl">CAC overall</div>
            <div className="val">{money(e.cacOverall)}</div>
            <div className="sub">
              {money(e.totalSalesAndMarketing)} ÷ {num(ceil(c.closes))} closes
            </div>
          </div>
          <div className="econ-kpi">
            <div className="lbl">LTV : CAC</div>
            <div className={`val ${ltvCacStatus}`}>
              {e.ltvCac > 0 ? e.ltvCac.toFixed(1) + 'x' : '—'}
            </div>
            <div className="sub">
              {e.ltvCac >= 3 ? 'healthy' : e.ltvCac >= 2 ? 'borderline' : 'fix it'}
            </div>
          </div>
          <div className="econ-kpi">
            <div className="lbl">Marketing spend / mo</div>
            <div className="val">{money(e.totalMarketing)}</div>
            <div className="sub">channel infra + leads + sw</div>
          </div>
          <div className="econ-kpi">
            <div className="lbl">Commission spend / mo</div>
            <div className="val">{money(e.totalCommissions)}</div>
            <div className="sub">
              {money(c.team.jrCommissionTotal)} jr + {money(c.team.srCommissionTotal)} sr
            </div>
          </div>
          <div className="econ-kpi">
            <div className="lbl">Total S+M spend</div>
            <div className="val">{money(e.totalSalesAndMarketing)}</div>
            <div className="sub">marketing + commissions</div>
          </div>
          <div className="econ-kpi">
            <div className="lbl">Profit on M+S</div>
            <div className={`val ${profitStatus}`}>{money(e.profitAfterSM)}</div>
            <div className="sub">{pct(e.profitMarginAfterSM)} of revenue</div>
          </div>
        </div>

        <div className="econ-channels-grid">
          {channels.map(({ k, out, ch }) => {
            const lcStatus = statusOfRatio(out.ltvCac);
            return (
              <div key={k} className={`econ-channel ${k}`}>
                <div className="title-row">
                  <div className="name">
                    <span className="swatch" />
                    {ch.label}
                  </div>
                  <div style={{ color: 'var(--text-tertiary)', fontSize: 12 }}>
                    {num(ceil(out.bk))} bookings · {num(out.closesAttributable, 1)} closes
                  </div>
                </div>
                <div className="stat-row">
                  <span className="lbl">Total cost / mo</span>
                  <span className="val">{money(out.totalCost)}</span>
                </div>
                <div className="stat-row">
                  <span className="lbl">Messages per booking</span>
                  <span className="val">{num(ceil(out.messagesPerBooking))}</span>
                </div>
                <div className="stat-row">
                  <span className="lbl">Cost per booking</span>
                  <span className="val">{money(out.costPerBooking)}</span>
                </div>
                <div className="stat-row cac">
                  <span className="lbl">CAC (cost per close)</span>
                  <span className="val">{money(out.cac)}</span>
                </div>
                <div className={`stat-row ltvcac ${lcStatus}`}>
                  <span className="lbl">LTV : CAC</span>
                  <span className="val">{out.ltvCac > 0 ? out.ltvCac.toFixed(1) + 'x' : '—'}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Section>
  );
}
