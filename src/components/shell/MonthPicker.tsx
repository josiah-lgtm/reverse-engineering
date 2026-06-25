import { useStore } from '../../state/store';
import { fmtMonth } from '../../engine/dates';

export function MonthPicker() {
  const months = useStore((s) => s.months);
  const activeMonth = useStore((s) => s.activeMonth);
  const setActiveMonth = useStore((s) => s.setActiveMonth);
  const addMonth = useStore((s) => s.addMonth);

  const ids = Object.keys(months).sort();

  function handleAdd() {
    const input = window.prompt('New month (YYYY-MM):', activeMonth);
    if (!input) return;
    const id = input.trim();
    if (!/^\d{4}-\d{2}$/.test(id)) {
      window.alert('Please enter a month as YYYY-MM (e.g. 2026-07).');
      return;
    }
    addMonth(id);
  }

  return (
    <div className="month-picker" id="month-picker-wrap">
      <label htmlFor="month-select">Month</label>
      <select
        id="month-select"
        value={activeMonth}
        onChange={(e) => setActiveMonth(e.target.value)}
      >
        {ids.map((id) => (
          <option key={id} value={id}>
            {fmtMonth(id)}
          </option>
        ))}
      </select>
      <button id="add-month-btn" title="New month" onClick={handleAdd}>
        +
      </button>
    </div>
  );
}
