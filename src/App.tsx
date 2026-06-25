import { useEffect } from 'react';
import { useStore } from './state/store';
import { TopBar } from './components/shell/TopBar';
import { SideNav } from './components/shell/SideNav';
import { ReverseEngineeringView } from './components/reverse-engineering/ReverseEngineeringView';
import { BusinessDataView } from './components/business-data/BusinessDataView';
import { HistoryView } from './components/history/HistoryView';
import { PlanModal } from './components/modal/PlanModal';
import { PrintArea } from './components/print/PrintArea';

export default function App() {
  const activeView = useStore((s) => s.activeView);
  const initHistory = useStore((s) => s.initHistory);

  useEffect(() => {
    initHistory();
  }, [initHistory]);

  return (
    <>
      <TopBar />
      <div className="app-shell">
        <SideNav />
        <main className="view-host">
          {activeView === 'reverse-engineering' && <ReverseEngineeringView />}
          {activeView === 'business-data' && <BusinessDataView />}
          {activeView === 'history' && <HistoryView />}
        </main>
      </div>
      <PlanModal />
      <PrintArea />
    </>
  );
}
