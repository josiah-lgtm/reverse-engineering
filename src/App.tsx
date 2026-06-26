import { useEffect, useRef } from 'react';
import { useStore } from './state/store';
import { pathToView, viewToPath } from './routing';
import { TopBar } from './components/shell/TopBar';
import { SideNav } from './components/shell/SideNav';
import { ReverseEngineeringView } from './components/reverse-engineering/ReverseEngineeringView';
import { MonthlyPlanningView } from './components/monthly-planning/MonthlyPlanningView';
import { BusinessDataView } from './components/business-data/BusinessDataView';
import { HistoryView } from './components/history/HistoryView';
import { PlanModal } from './components/modal/PlanModal';
import { PrintArea } from './components/print/PrintArea';

export default function App() {
  const activeView = useStore((s) => s.activeView);
  const setActiveView = useStore((s) => s.setActiveView);
  const initHistory = useStore((s) => s.initHistory);

  useEffect(() => {
    initHistory();
  }, [initHistory]);

  // ── URL ⇄ view sync (deep-linkable, shareable paths) ──────────────
  // On mount: a deep-linked path wins over the persisted view; otherwise
  // normalize the URL to the current view. Back/forward updates the store.
  useEffect(() => {
    const fromUrl = pathToView(window.location.pathname);
    if (fromUrl) {
      setActiveView(fromUrl);
    } else {
      const path = viewToPath(useStore.getState().activeView);
      if (window.location.pathname !== path) window.history.replaceState(null, '', path);
    }
    const onPop = () => {
      const v = pathToView(window.location.pathname);
      if (v) setActiveView(v);
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, [setActiveView]);

  // view -> URL (skip the first run; the mount effect handles initial sync).
  const firstRun = useRef(true);
  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }
    const path = viewToPath(activeView);
    if (window.location.pathname !== path) window.history.pushState(null, '', path);
  }, [activeView]);

  return (
    <>
      <TopBar />
      <div className="app-shell">
        <SideNav />
        <main className="view-host">
          {activeView === 'reverse-engineering' && <ReverseEngineeringView />}
          {activeView === 'monthly-planning' && <MonthlyPlanningView />}
          {activeView === 'business-data' && <BusinessDataView />}
          {activeView === 'history' && <HistoryView />}
        </main>
      </div>
      <PlanModal />
      <PrintArea />
    </>
  );
}
