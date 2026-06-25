import { useStore } from '../../state/store';
import type { ViewKey } from '../../engine/types';

const NAV: { view: ViewKey; label: string }[] = [
  { view: 'reverse-engineering', label: 'Reverse Engineering' },
  { view: 'business-data', label: 'Business Data' },
  { view: 'history', label: 'History' },
];

export function SideNav() {
  const activeView = useStore((s) => s.activeView);
  const setActiveView = useStore((s) => s.setActiveView);
  return (
    <aside className="sidenav">
      {NAV.map((n) => (
        <button
          key={n.view}
          type="button"
          className={`nav-item ${activeView === n.view ? 'active' : ''}`.trim()}
          onClick={() => setActiveView(n.view)}
        >
          <span className="dot" />
          {n.label}
        </button>
      ))}
    </aside>
  );
}
