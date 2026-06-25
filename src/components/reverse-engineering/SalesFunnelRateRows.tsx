import { Section } from '../primitives/Card';
import { DialRow } from '../primitives/DialRow';
import { useComputed, usePlan } from '../../selectors/hooks';
import { useFormatters } from '../../format/useMoney';
import { useStore } from '../../state/store';
import type { SalesRates } from '../../engine/types';

const FIELDS: { k: keyof SalesRates; label: string; hint: string }[] = [
  { k: 'show1Rate', label: 'Call 1 show rate', hint: '% of bookings that show' },
  { k: 'qual1Rate', label: 'Call 1 qualification', hint: '% of shows that qualify' },
  { k: 'book2Rate', label: 'Call 2 booking', hint: '% of qualified that book call 2' },
  { k: 'sched2Rate', label: 'Call 2 scheduled', hint: '% of booked that confirm a slot' },
  { k: 'show2Rate', label: 'Call 2 show rate', hint: '% of scheduled that show' },
  { k: 'qshow2Rate', label: 'Call 2 qualified-show rate', hint: '% of call 2 shows still qualified' },
  { k: 'offerRate', label: 'Offer rate', hint: '% of qualified call 2s that get an offer' },
  { k: 'closeRate', label: 'Close rate', hint: '% of offers that close' },
];

export function SalesFunnelRateRows() {
  const plan = usePlan();
  const c = useComputed();
  const { num, pct, ceil } = useFormatters();
  const updatePlan = useStore((s) => s.updatePlan);

  return (
    <Section
      title="Sales funnel rates"
      summary={`${pct(c.bookingToClose * 100)} booking→close · ${num(ceil(c.bookings))} bookings/mo`}
    >
      <div>
        {FIELDS.map((f) => (
          <DialRow
            key={f.k}
            label={f.label}
            hint={f.hint}
            value={plan.sales[f.k]}
            min={0}
            max={100}
            step={1}
            unit="%"
            onChange={(v) => updatePlan((p) => void (p.sales[f.k] = v))}
          />
        ))}
      </div>
    </Section>
  );
}
