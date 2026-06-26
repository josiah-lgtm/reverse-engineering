import { TargetCard } from './TargetCard';
import { FunnelSnapshot } from './FunnelSnapshot';
import { EconomicsSection } from './EconomicsSection';
import { RevenuePerCloseRows } from './RevenuePerCloseRows';
import { ChannelMixSection } from './ChannelMixSection';
import { ChannelsOutreach } from './ChannelsOutreach';
import { TeamCapacitySection } from './TeamCapacitySection';
import { SettingsCard } from './SettingsCard';

export function ReverseEngineeringView() {
  return (
    <div className="container">
      <div className="header">
        <h1>Reverse Engineering</h1>
        <div className="sub">
          Set a <b>revenue</b> or <b>cash-collection</b> target. The math walks it backwards — through
          your sales funnel and channel mix — to tell you exactly how many sends, connections, and
          calls you need to hit it. Tune any conversion rate right on the funnel and watch everything
          update. Save a separate plan per month.
        </div>
      </div>

      <TargetCard />
      <FunnelSnapshot />
      <EconomicsSection />
      <RevenuePerCloseRows />
      <ChannelMixSection />
      <ChannelsOutreach />
      <TeamCapacitySection />
      <SettingsCard />

      <div className="footer">
        Revenue → closes → sales funnel → bookings → channel mix → outreach → infrastructure → team
        capacity. The war plan &amp; monthly notes now live in the <b>Monthly Planning</b> tab.
        <br />
        Everything autosaves. Switch months in the top bar to plan multiple scenarios.
      </div>
    </div>
  );
}
