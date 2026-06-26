import { useStore } from '../../state/store';
import logo from '../../assets/logo.png';
import { MonthPicker } from './MonthPicker';
import { CurrencySelect } from './CurrencySelect';
import { SaveStatus } from './SaveStatus';
import type { ViewKey } from '../../engine/types';

const TITLES: Record<ViewKey, string> = {
  'reverse-engineering': 'REVERSE ENGINEERING',
  'monthly-planning': 'MONTHLY PLANNING',
  'business-data': 'BUSINESS DATA',
  history: 'HISTORY',
};

export function TopBar() {
  const activeView = useStore((s) => s.activeView);
  const resetMonth = useStore((s) => s.resetMonth);
  const isRE = activeView === 'reverse-engineering';
  // Both RE and Monthly Planning operate on the active month's plan.
  const isMonthScoped = isRE || activeView === 'monthly-planning';

  return (
    <header className="topbar">
      <div className="brand">
        <img src={logo} alt="" />
        <span className="name">Agency Advanta</span>
      </div>
      <span className="title" id="topbar-view-title">
        {TITLES[activeView]}
      </span>
      {isMonthScoped && <MonthPicker />}
      <CurrencySelect />
      <span className="spacer" />
      <SaveStatus />
      {isRE && (
        <button
          className="ghost"
          onClick={() => {
            if (window.confirm('Reset this month to defaults? This clears your inputs for the active month.')) {
              resetMonth();
            }
          }}
        >
          Reset month
        </button>
      )}
    </header>
  );
}
