import { Section } from '../primitives/Card';
import { DialRow } from '../primitives/DialRow';
import { usePlan } from '../../selectors/hooks';
import { useStore } from '../../state/store';
import type { ChannelKey } from '../../engine/types';

export function ChannelMixSection() {
  const plan = usePlan();
  const updatePlan = useStore((s) => s.updatePlan);
  const keys = Object.keys(plan.channels) as ChannelKey[];
  const totalMix = keys
    .filter((k) => plan.channels[k].enabled)
    .reduce((s, k) => s + (plan.channels[k].mix || 0), 0);
  const offBalance = Math.abs(totalMix - 100) > 1;

  function rebalance() {
    updatePlan((p) => {
      const sum = keys.reduce((s, k) => s + (p.channels[k].enabled ? p.channels[k].mix : 0), 0);
      if (sum === 0) {
        const enabled = keys.filter((k) => p.channels[k].enabled);
        const each = 100 / enabled.length;
        enabled.forEach((k) => (p.channels[k].mix = Math.round(each)));
      } else {
        keys.forEach((k) => {
          if (p.channels[k].enabled) p.channels[k].mix = Math.round((p.channels[k].mix / sum) * 100);
        });
      }
    });
  }

  return (
    <Section
      title="Channel mix · % of bookings from each channel"
      summary={`mix total ${totalMix}% (should be 100%)`}
    >
      {offBalance && (
        <div
          style={{
            background: 'var(--warn-tint)',
            color: 'var(--warn)',
            padding: '12px 18px',
            borderRadius: 10,
            fontSize: 13.5,
            marginBottom: 12,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}
        >
          Mix sums to {totalMix}% — should be 100%.
          <button
            onClick={rebalance}
            style={{ marginLeft: 'auto', padding: '6px 14px', borderRadius: 7 }}
          >
            Rebalance to 100%
          </button>
        </div>
      )}
      <div>
        {keys.map((k) => {
          const ch = plan.channels[k];
          return (
            <DialRow
              key={k}
              label={ch.label}
              hint={ch.enabled ? 'enabled' : 'disabled'}
              value={ch.mix}
              min={0}
              max={100}
              step={1}
              unit="%"
              onChange={(v) => updatePlan((p) => void (p.channels[k].mix = v))}
            />
          );
        })}
      </div>
    </Section>
  );
}
