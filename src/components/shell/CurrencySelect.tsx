import { useStore } from '../../state/store';
import type { Currency } from '../../engine/types';

const OPTIONS: { value: Currency; label: string }[] = [
  { value: 'GBP', label: '£ GBP' },
  { value: 'USD', label: '$ USD' },
  { value: 'EUR', label: '€ EUR' },
];

export function CurrencySelect() {
  const currency = useStore((s) => s.settings.currency);
  const setCurrency = useStore((s) => s.setCurrency);
  return (
    <div className="month-picker">
      <label htmlFor="currency-select">Currency</label>
      <select
        id="currency-select"
        value={currency}
        onChange={(e) => setCurrency(e.target.value as Currency)}
      >
        {OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}
