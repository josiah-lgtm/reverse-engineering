import { TrackerSection } from './TrackerSection';

export function BusinessDataView() {
  return (
    <div className="container">
      <div className="header">
        <h1>Business Data</h1>
        <div className="sub">
          Log what actually happened each week and month, side by side with the war-plan targets your
          Reverse Engineering plan implies. Auto-derives conversion rates and spend from your volume
          actuals, scores each entry, and pushes finished entries to History &amp; Notion.
        </div>
      </div>
      <TrackerSection kind="weekly" />
      <TrackerSection kind="monthly" />
      <div className="footer">
        Targets come from the active month's war plan. Switch the “Compare to war plan for” month on
        any entry to benchmark against a different plan.
      </div>
    </div>
  );
}
