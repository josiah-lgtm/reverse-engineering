import { WarPlanSection } from './WarPlanSection';
import { MonthlyPlanNotes } from './MonthlyPlanNotes';

export function MonthlyPlanningView() {
  return (
    <div className="container">
      <div className="header">
        <h1>Monthly Planning</h1>
        <div className="sub">
          This month's plan in one place — every target broken down to a daily, weekly, and monthly
          number, plus your announcements, pre-mortem, team notes, and ideas. Switch months in the top
          bar; publish the whole plan to Notion when it's ready.
        </div>
      </div>

      <WarPlanSection />
      <MonthlyPlanNotes />

      <div className="footer">
        Targets come from this month's Reverse Engineering plan. Change the revenue/cash target or any
        conversion rate there and this plan updates automatically.
      </div>
    </div>
  );
}
