import { TargetCard } from './TargetCard';
import { FunnelSnapshot } from './FunnelSnapshot';
import { EconomicsSection } from './EconomicsSection';
import { RevenuePerCloseRows } from './RevenuePerCloseRows';
import { SalesFunnelRateRows } from './SalesFunnelRateRows';
import { ChannelMixSection } from './ChannelMixSection';
import { ChannelsOutreach } from './ChannelsOutreach';
import { TeamCapacitySection } from './TeamCapacitySection';
import { WarPlanSection } from './WarPlanSection';
import { MonthlyPlanNotes } from './MonthlyPlanNotes';
import { SettingsCard } from './SettingsCard';

export function ReverseEngineeringView() {
  return (
    <div className="container">
      <div className="header">
        <h1>Reverse Engineering</h1>
        <div className="sub">
          Set a revenue target. The math walks it backwards — through your sales funnel and channel
          mix — to tell you exactly how many sends, connections, and calls you need to hit it. Save a
          separate plan per month.
        </div>
      </div>

      <TargetCard />
      <FunnelSnapshot />
      <EconomicsSection />
      <RevenuePerCloseRows />
      <SalesFunnelRateRows />
      <ChannelMixSection />
      <ChannelsOutreach />
      <TeamCapacitySection />
      <WarPlanSection />
      <MonthlyPlanNotes />
      <SettingsCard />

      <div className="footer">
        Revenue → closes → sales funnel → bookings → channel mix → outreach → infrastructure → team
        capacity → notes &amp; ideas.
        <br />
        Everything autosaves to localStorage. Switch months in the top bar to plan multiple
        scenarios.
      </div>
    </div>
  );
}
