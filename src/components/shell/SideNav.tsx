import { useStore } from '../../state/store';
import { viewToPath } from '../../routing';
import type { ViewKey } from '../../engine/types';

const NAV: { view: ViewKey; label: string }[] = [
  { view: 'reverse-engineering', label: 'Reverse Engineering' },
  { view: 'monthly-planning', label: 'Monthly Planning' },
  { view: 'business-data', label: 'Business Data' },
  { view: 'history', label: 'History' },
];

export function SideNav() {
  const activeView = useStore((s) => s.activeView);
  const setActiveView = useStore((s) => s.setActiveView);
  return (
    <aside className="sidenav">
      {NAV.map((n) => (
        <a
          key={n.view}
          href={viewToPath(n.view)}
          className={`nav-item ${activeView === n.view ? 'active' : ''}`.trim()}
          onClick={(e) => {
            // Let modified clicks (new tab / window) use the real href.
            if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
            e.preventDefault();
            setActiveView(n.view);
          }}
        >
          <span className="dot" />
          {n.label}
        </a>
      ))}
    </aside>
  );
}
