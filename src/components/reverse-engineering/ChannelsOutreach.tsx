import { Section } from '../primitives/Card';
import { DialRow } from '../primitives/DialRow';
import { useComputed, usePlan } from '../../selectors/hooks';
import { useFormatters } from '../../format/useMoney';
import { useStore } from '../../state/store';
import { cssVars } from '../../lib/css';
import type {
  ChannelKey,
  Computed,
  EmailChannel,
  LinkedInChannel,
  Plan,
} from '../../engine/types';
import type { Formatters } from '../../format/formatters';

interface FieldCfg {
  field: string;
  label: string;
  hint: string;
  min: number;
  max: number;
  step: number;
  unit: string;
}

function DialField({
  cfg,
  value,
  onChange,
}: {
  cfg: FieldCfg;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <DialRow
      label={cfg.label}
      hint={cfg.hint}
      min={cfg.min}
      max={cfg.max}
      step={cfg.step}
      unit={cfg.unit}
      value={value}
      onChange={onChange}
    />
  );
}

interface FunnelStep {
  lbl: string;
  val: number;
  hero?: boolean;
}

/** Per-channel activity funnel: top-volume activity down to closes. */
function ChannelFunnel({
  steps,
  fmt,
  wkDiv,
  mDiv,
}: {
  steps: FunnelStep[];
  fmt: Formatters;
  wkDiv: number;
  mDiv: number;
}) {
  const { num, ceil } = fmt;
  const max = steps[0]?.val || 0;
  return (
    <div className="ch-funnel">
      {steps.map((s) => {
        const w = max > 0 ? Math.max(5, (s.val / max) * 100) : 0;
        return (
          <div className={`funnel-row ${s.hero ? 'hero' : ''}`.trim()} key={s.lbl}>
            <div className="fr-bar" style={cssVars({ '--w': w + '%' })} />
            <div className="fr-content">
              <span className="fr-lbl">{s.lbl}</span>
              <span className="fr-val">{num(ceil(s.val))}</span>
            </div>
            <div className="fr-sub">
              {num(s.val / wkDiv, 1)} /wk · {num(s.val / mDiv, 1)} /day
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** Revenue/economics tiles shared by every channel body. */
function RevenueTiles({ out, c, fmt }: { out: { closesAttributable: number; cac: number; ltvCac: number }; c: Computed; fmt: Formatters }) {
  const { num, money } = fmt;
  const revAttr = out.closesAttributable * c.revPerClose;
  const cashAttr = out.closesAttributable * c.cashPerClose;
  return (
    <>
      <div className="ch-section-title">Revenue this channel must produce</div>
      <div className="outputs">
        <div className="out hero">
          <div className="lbl">Revenue / mo</div>
          <div className="val">{money(revAttr)}</div>
          <div className="sub">{num(out.closesAttributable, 1)} closes × {money(c.revPerClose)}</div>
        </div>
        <div className="out">
          <div className="lbl">Cash collected / mo</div>
          <div className="val">{money(cashAttr)}</div>
          <div className="sub">{money(c.cashPerClose)} per close</div>
        </div>
        <div className="out">
          <div className="lbl">CAC (this channel)</div>
          <div className="val">{money(out.cac)}</div>
          <div className="sub">marketing ÷ closes</div>
        </div>
        <div className="out">
          <div className="lbl">LTV : CAC</div>
          <div className="val">{out.ltvCac > 0 ? `${num(out.ltvCac, 1)}×` : '—'}</div>
          <div className="sub">{money(c.economics.ltv)} LTV</div>
        </div>
      </div>
    </>
  );
}

function LinkedInBody({ plan, c, fmt }: { plan: Plan; c: Computed; fmt: Formatters }) {
  const ch = plan.channels.linkedin;
  const out = c.channelOutputs.linkedin!;
  const bookings = c.channelBookings.linkedin;
  const { num, money, ceil, symbol } = fmt;
  const wkDiv = plan.workingDaysPerMonth / plan.workingDaysPerWeek;
  const mDiv = plan.workingDaysPerMonth;
  const updatePlan = useStore((s) => s.updatePlan);

  const conv: FieldCfg[] = [
    { field: 'acceptRate', label: 'Acceptance rate', hint: '% of connections that accept', min: 0, max: 100, step: 0.1, unit: '%' },
    { field: 'prr', label: 'Positive reply rate', hint: '% of accepts that reply positively', min: 0, max: 100, step: 0.1, unit: '%' },
    { field: 'csr', label: 'Calendly schedule rate', hint: '% of positives that click Calendly', min: 0, max: 100, step: 0.1, unit: '%' },
    { field: 'abr', label: 'Appointment book rate', hint: '% of Calendly clicks that book', min: 0, max: 100, step: 0.1, unit: '%' },
  ];
  const costs: FieldCfg[] = [
    { field: 'connectsPerProfilePerDay', label: 'Connects / profile / day', hint: 'daily connection request volume each profile can safely send', min: 1, max: 60, step: 1, unit: '/day' },
    { field: 'costPerProfile', label: '£ per sender profile / mo', hint: 'fixed subscription per profile', min: 0, max: 500, step: 5, unit: symbol + '/mo' },
    { field: 'costPerLead', label: '£ per connection (lead cost)', hint: 'data/list cost per outbound connection', min: 0, max: 5, step: 0.05, unit: symbol },
    { field: 'softwareCost', label: '£ additional software / mo', hint: 'Sales Nav, Heyreach, etc.', min: 0, max: 2000, step: 25, unit: symbol + '/mo' },
  ];

  const steps: FunnelStep[] = [
    { lbl: 'Connections sent', val: out.connections },
    { lbl: 'Accepts', val: out.accepts },
    { lbl: 'Positive replies', val: out.positives },
    { lbl: 'Calendly clicks', val: out.calendlyClicks },
    { lbl: 'Bookings', val: out.bk, hero: true },
  ];

  return (
    <>
      <div className="ch-section-title">Required activities &amp; infrastructure</div>
      <div className="outputs">
        <div className="out">
          <div className="lbl">Bookings target</div>
          <div className="val">{num(ceil(bookings))}</div>
          <div className="sub">{num(bookings / wkDiv, 1)} /wk · {num(bookings / mDiv, 1)} /day</div>
        </div>
        <div className="out hero">
          <div className="lbl">Connections / mo</div>
          <div className="val">{num(ceil(out.connections))}</div>
          <div className="sub">{num(ceil(out.connectionsPerWeek))} /wk · {num(ceil(out.connectionsPerDay))} /day</div>
        </div>
        <div className="out hero">
          <div className="lbl">Sender profiles</div>
          <div className="val">{out.profilesNeeded}</div>
          <div className="sub">{ch.connectsPerProfilePerDay}/day each</div>
        </div>
        <div className="out">
          <div className="lbl">Total cost / mo</div>
          <div className="val">{money(out.totalCost)}</div>
          <div className="sub">{money(out.profileCost)} profiles + {money(out.softwareCost)} sw</div>
        </div>
        <div className="out">
          <div className="lbl">Cost per booking</div>
          <div className="val">{money(out.costPerBooking)}</div>
          <div className="sub">{num(ceil(out.messagesPerBooking))} msgs / booking</div>
        </div>
      </div>

      <div className="ch-section-title">Funnel performance — activity → booking</div>
      <ChannelFunnel steps={steps} fmt={fmt} wkDiv={wkDiv} mDiv={mDiv} />

      <RevenueTiles out={out} c={c} fmt={fmt} />

      <div className="ch-section-title">Conversion rates</div>
      {conv.map((f) => (
        <DialField
          key={f.field}
          cfg={f}
          value={ch[f.field as keyof LinkedInChannel] as number}
          onChange={(v) => updatePlan((p) => void ((p.channels.linkedin as unknown as Record<string, number>)[f.field] = v))}
        />
      ))}
      <div className="ch-section-title">Costs</div>
      {costs.map((f) => (
        <DialField
          key={f.field}
          cfg={f}
          value={ch[f.field as keyof LinkedInChannel] as number}
          onChange={(v) => updatePlan((p) => void ((p.channels.linkedin as unknown as Record<string, number>)[f.field] = v))}
        />
      ))}
    </>
  );
}

function EmailBody({ plan, c, fmt }: { plan: Plan; c: Computed; fmt: Formatters }) {
  const ch = plan.channels.email;
  const out = c.channelOutputs.email!;
  const bookings = c.channelBookings.email;
  const { num, money, ceil, symbol } = fmt;
  const wkDiv = plan.workingDaysPerMonth / plan.workingDaysPerWeek;
  const mDiv = plan.workingDaysPerMonth;
  const updatePlan = useStore((s) => s.updatePlan);

  const conv: FieldCfg[] = [
    { field: 'replyRate', label: 'Reply rate', hint: '% of sends that reply (any reply)', min: 0, max: 100, step: 0.1, unit: '%' },
    { field: 'prr', label: 'Positive reply rate', hint: '% of replies that are positive', min: 0, max: 100, step: 0.1, unit: '%' },
    { field: 'abr', label: 'Appointment book rate', hint: '% of positives that book', min: 0, max: 100, step: 0.1, unit: '%' },
  ];
  const costs: FieldCfg[] = [
    { field: 'sendsPerInboxPerDay', label: 'Sends / inbox / day', hint: 'daily sending volume each inbox can safely do (warm-up + deliverability)', min: 1, max: 100, step: 1, unit: '/day' },
    { field: 'inboxesPerDomain', label: 'Inboxes / domain', hint: 'how many sending inboxes you set up per email domain', min: 1, max: 10, step: 1, unit: '' },
    { field: 'costPerInbox', label: '£ per inbox / mo', hint: 'fixed subscription per inbox', min: 0, max: 30, step: 0.5, unit: symbol + '/mo' },
    { field: 'costPerLead', label: '£ per send (lead/data cost)', hint: 'data enrichment cost per record sent', min: 0, max: 1, step: 0.01, unit: symbol },
    { field: 'softwareCost', label: '£ additional software / mo', hint: 'Instantly, Clay, etc.', min: 0, max: 2000, step: 25, unit: symbol + '/mo' },
  ];

  const steps: FunnelStep[] = [
    { lbl: 'Sends', val: out.sends },
    { lbl: 'Replies', val: out.replies },
    { lbl: 'Positive replies', val: out.positives },
    { lbl: 'Bookings', val: out.bk, hero: true },
  ];

  return (
    <>
      <div className="ch-section-title">Required activities &amp; infrastructure</div>
      <div className="outputs">
        <div className="out">
          <div className="lbl">Bookings target</div>
          <div className="val">{num(ceil(bookings))}</div>
          <div className="sub">{num(bookings / wkDiv, 1)} /wk · {num(bookings / mDiv, 1)} /day</div>
        </div>
        <div className="out hero">
          <div className="lbl">Sends / mo</div>
          <div className="val">{num(ceil(out.sends))}</div>
          <div className="sub">{num(ceil(out.sendsPerWeek))} /wk · {num(ceil(out.sendsPerDay))} /day</div>
        </div>
        <div className="out hero">
          <div className="lbl">Inboxes / Domains</div>
          <div className="val">{out.inboxesNeeded} / {out.domainsNeeded}</div>
          <div className="sub">{ch.sendsPerInboxPerDay}/inbox · {ch.inboxesPerDomain} inboxes/domain</div>
        </div>
        <div className="out">
          <div className="lbl">Total cost / mo</div>
          <div className="val">{money(out.totalCost)}</div>
          <div className="sub">{money(out.inboxCost)} inboxes + {money(out.softwareCost)} sw + {money(out.leadCost)} leads</div>
        </div>
        <div className="out">
          <div className="lbl">Cost per booking</div>
          <div className="val">{money(out.costPerBooking)}</div>
          <div className="sub">{num(ceil(out.messagesPerBooking))} msgs / booking</div>
        </div>
      </div>

      <div className="ch-section-title">Funnel performance — activity → booking</div>
      <ChannelFunnel steps={steps} fmt={fmt} wkDiv={wkDiv} mDiv={mDiv} />

      <RevenueTiles out={out} c={c} fmt={fmt} />

      <div className="ch-section-title">Conversion rates</div>
      {conv.map((f) => (
        <DialField
          key={f.field}
          cfg={f}
          value={ch[f.field as keyof EmailChannel] as number}
          onChange={(v) => updatePlan((p) => void ((p.channels.email as unknown as Record<string, number>)[f.field] = v))}
        />
      ))}
      <div className="ch-section-title">Costs</div>
      {costs.map((f) => (
        <DialField
          key={f.field}
          cfg={f}
          value={ch[f.field as keyof EmailChannel] as number}
          onChange={(v) => updatePlan((p) => void ((p.channels.email as unknown as Record<string, number>)[f.field] = v))}
        />
      ))}
    </>
  );
}

function ChannelCard({ k }: { k: ChannelKey }) {
  const plan = usePlan();
  const c = useComputed();
  const fmt = useFormatters();
  const updatePlan = useStore((s) => s.updatePlan);
  const ch = plan.channels[k];
  const out = c.channelOutputs[k];
  const { num, money, ceil } = fmt;

  let summary = 'disabled';
  if (k === 'linkedin' && c.channelOutputs.linkedin) {
    const o = c.channelOutputs.linkedin;
    summary = `${num(ceil(o.connections))} connects/mo · ${money(o.closesAttributable * c.revPerClose)}/mo`;
  } else if (k === 'email' && c.channelOutputs.email) {
    const o = c.channelOutputs.email;
    summary = `${num(ceil(o.sends))} sends/mo · ${money(o.closesAttributable * c.revPerClose)}/mo`;
  }

  return (
    <div className={`channel ${k} ${ch.open ? 'open' : ''}`.trim()}>
      <div
        className="channel-head"
        onClick={() => updatePlan((p) => void (p.channels[k].open = !p.channels[k].open))}
      >
        <div className="swatch" />
        <div className="name">{ch.label}</div>
        <div className="summary">{summary}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span className="mix-pct">{ch.mix}% mix</span>
          <span className="toggle">›</span>
        </div>
      </div>
      <div className="channel-body">
        {ch.open && out && k === 'linkedin' && <LinkedInBody plan={plan} c={c} fmt={fmt} />}
        {ch.open && out && k === 'email' && <EmailBody plan={plan} c={c} fmt={fmt} />}
      </div>
    </div>
  );
}

export function ChannelsOutreach() {
  const plan = usePlan();
  const keys = Object.keys(plan.channels) as ChannelKey[];
  return (
    <Section
      title="Channels — reverse-engineered by channel"
      summary="click a channel for its required activities, conversions, revenue & funnel"
    >
      <div>
        {keys.map((k) => (
          <ChannelCard key={k} k={k} />
        ))}
      </div>
    </Section>
  );
}
