import { Section } from '../primitives/Card';
import { DialRow } from '../primitives/DialRow';
import { useComputed, usePlan } from '../../selectors/hooks';
import { useFormatters } from '../../format/useMoney';
import { useStore } from '../../state/store';

export function RevenuePerCloseRows() {
  const plan = usePlan();
  const c = useComputed();
  const { num, money, ceil, symbol } = useFormatters();
  const updatePlan = useStore((s) => s.updatePlan);

  return (
    <Section
      title="Revenue per close"
      summary={`${money(c.packagePrice)} program price · ${num(ceil(c.closes))} closes/mo`}
    >
      <div>
        <DialRow
          label="Program price"
          hint="contracted price per close (= LTV)"
          value={plan.packagePrice}
          min={500}
          max={50000}
          step={250}
          unit={symbol}
          onChange={(v) => updatePlan((p) => void (p.packagePrice = v))}
        />
        <DialRow
          label="Working days / month"
          value={plan.workingDaysPerMonth}
          min={1}
          max={31}
          step={1}
          onChange={(v) => updatePlan((p) => void (p.workingDaysPerMonth = v))}
        />
        <DialRow
          label="Working days / week"
          value={plan.workingDaysPerWeek}
          min={1}
          max={7}
          step={1}
          onChange={(v) => updatePlan((p) => void (p.workingDaysPerWeek = v))}
        />
      </div>
    </Section>
  );
}
