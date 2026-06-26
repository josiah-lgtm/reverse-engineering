// ============================================================
// Domain types — faithful to the original single-file app's
// state shape (see defaultPlan / defaultState in the legacy code).
// ============================================================

export type MonthId = string; // "YYYY-MM"
export type EntryId = string; // weekly: "YYYY-MM-DD" (Monday) · monthly: "YYYY-MM"
export type Currency = 'GBP' | 'USD' | 'EUR';
export type TrackerKind = 'weekly' | 'monthly';
export type ViewKey = 'reverse-engineering' | 'monthly-planning' | 'business-data' | 'history';
/** Which figure the user drives the whole model from. */
export type TargetMode = 'revenue' | 'cash';

export interface SalesRates {
  show1Rate: number;
  qual1Rate: number;
  book2Rate: number;
  sched2Rate: number;
  show2Rate: number;
  qshow2Rate: number; // % of call-2 shows still qualified
  offerRate: number;
  closeRate: number;
}

export interface LinkedInChannel {
  enabled: boolean;
  mix: number; // % of demand allocation
  label: string; // 'LinkedIn'
  open: boolean; // UI accordion state (persisted as data)
  connectsPerProfilePerDay: number;
  acceptRate: number;
  prr: number; // positive reply rate
  csr: number;
  abr: number; // appointment/booking rate
  costPerProfile: number; // £/month per sender profile
  costPerLead: number; // £ per connection sent
  softwareCost: number; // £/month additional software
}

export interface EmailChannel {
  enabled: boolean;
  mix: number;
  label: string; // 'Email'
  open: boolean;
  sendsPerInboxPerDay: number;
  inboxesPerDomain: number;
  replyRate: number;
  prr: number;
  abr: number;
  costPerInbox: number; // £/month per inbox
  costPerLead: number; // £ per send
  softwareCost: number; // £/month additional software
}

export interface Channels {
  linkedin: LinkedInChannel;
  email: EmailChannel;
}

export type ChannelKey = keyof Channels;

export interface Team {
  jrCloserCount: number;
  jrMinPerCall: number;
  jrHoursPerDay: number;
  jrCommissionPerQshow: number; // £ per qualified call-2 show
  srCloserCount: number;
  srMinPerCall: number;
  srHoursPerDay: number;
  srCommissionPct: number; // % of cash collected per close
}

export interface PlanNotes {
  // Per-funnel-stage notes
  bookings: string;
  shows1: string;
  qual1: string;
  book2: string;
  shows2: string;
  qshows2: string;
  offers: string;
  closes: string;
  // Per-channel notes
  linkedin: string;
  email: string;
  // Per-team note (the source literal duplicated this key; it collapses to one)
  team: string;
  // Plan-level sections
  announcements: string;
  premortem: string;
  ideas: string;
  // War-plan per-row notes live here too (keys like 'wp_revenueTarget'),
  // matching the original's single loose notes bag.
  [key: string]: string;
}

export interface Plan {
  revenueTarget: number; // total contracted revenue target / month — ALWAYS the model driver
  /** Which figure the user types; the other is back-solved. Invariant: cashTarget = revenueTarget × cashCollectedPct%. */
  targetMode: TargetMode;
  /** Cash-collection target / month. Kept in sync with revenueTarget; the pinned figure when targetMode==='cash'. */
  cashTarget: number;
  packagePrice: number; // contracted price per close (= LTV)
  cashCollectedPct: number; // % upfront cash (slider)
  /** DERIVED cache — compute() is the source of truth. Persisted only for backward-compat. */
  cashPerClose: number;
  /** DERIVED cache — compute() is the source of truth. Persisted only for backward-compat. */
  contractPerClose: number;
  workingDaysPerMonth: number;
  workingDaysPerWeek: number;
  sales: SalesRates;
  channels: Channels;
  team: Team;
  notes: PlanNotes;
  notionPageUrl: string;
  notionPageId: string;
}

export type BdView = 'cards' | 'table';

export interface Settings {
  apiUrl: string;
  errorPct: number; // per-stage forecast variance %, default ±10
  currency: Currency;
  bdView: BdView; // Business Data layout: scorecard cards vs dense table
}

export interface NotesBlock {
  announcements: string;
  wins: string;
  blockers: string;
  premortem: string;
  bottleneck: string;
  bigplay: string;
}

/** One entry in an entry's append-only audit trail. */
export interface ChangeEvent {
  at: string; // ISO timestamp
  kind: 'actual' | 'note' | 'save';
  rowKey?: string; // metric key for 'actual'/'note'
  from?: string | number | null;
  to?: string | number | null;
}

export interface TrackerEntry {
  id: EntryId;
  planMonth: MonthId; // which plan this entry's actuals are compared against
  actuals: Record<string, number>; // keys: 'wp_*' volumes, 'cv_*' rates
  rowNotes: Record<string, string>; // per-metric inline notes
  notes: NotesBlock;
  openNotes: Record<string, boolean>; // which note sections are expanded
  notionPageId: string;
  notionPageUrl: string;
  savedToHistory?: boolean;
  savedAt?: string; // ISO string
  /** Append-only history of edits/saves (coalesced + capped). */
  changeLog?: ChangeEvent[];
}

export interface HistoryRange {
  kind: TrackerKind;
  preset: string; // 'all' | '4w' | '8w' | '13w' | 'ytd' | 'custom'
  from: string; // ISO date 'YYYY-MM-DD'
  to: string; // ISO date 'YYYY-MM-DD'
  _migratedToAll?: boolean;
}

export interface State {
  activeMonth: MonthId;
  activeView: ViewKey;
  months: Record<MonthId, Plan>;
  /** LEGACY — migrated into monthlyEntries; kept but no longer authored. */
  businessData: Record<string, Record<string, unknown>>;
  weeklyEntries: Record<EntryId, TrackerEntry>;
  monthlyEntries: Record<EntryId, TrackerEntry>;
  activeWeeklyId?: EntryId | null;
  activeMonthlyId?: EntryId | null;
  history?: HistoryRange;
  settings: Settings;
}

// ============================================================
// compute() output
// ============================================================

export interface LinkedInOut {
  bk: number;
  calendlyClicks: number;
  positives: number;
  accepts: number;
  connections: number;
  connectionsPerWeek: number;
  connectionsPerDay: number;
  profilesNeeded: number;
  profileCost: number;
  leadCost: number;
  softwareCost: number;
  totalCost: number;
  closesAttributable: number;
  costPerBooking: number;
  cac: number;
  messagesPerBooking: number;
  ltvCac: number;
}

export interface EmailOut {
  bk: number;
  positives: number;
  replies: number;
  sends: number;
  sendsPerWeek: number;
  sendsPerDay: number;
  inboxesNeeded: number;
  domainsNeeded: number;
  inboxCost: number;
  leadCost: number;
  softwareCost: number;
  totalCost: number;
  closesAttributable: number;
  costPerBooking: number;
  cac: number;
  messagesPerBooking: number;
  ltvCac: number;
}

/** Partial map — only ENABLED channels get a key (matches the original `out`). */
export interface ChannelOutputs {
  linkedin?: LinkedInOut;
  email?: EmailOut;
}

export interface TeamComputed {
  jrMinutesNeeded: number;
  srMinutesNeeded: number;
  jrMinutesAvailable: number;
  srMinutesAvailable: number;
  jrCapacityCalls: number;
  srCapacityCalls: number;
  jrUtilization: number;
  srUtilization: number;
  jrShortfall: number;
  srShortfall: number;
  jrClosersNeeded: number;
  srClosersNeeded: number;
  jrCommissionTotal: number;
  srCommissionTotal: number;
  totalCommissions: number;
}

export interface EconomicsComputed {
  ltv: number;
  totalMarketing: number;
  totalCommissions: number;
  totalSalesAndMarketing: number;
  cacOverall: number;
  ltvCac: number;
  profitAfterSM: number;
  profitMarginAfterSM: number;
}

export interface Computed {
  revPerClose: number;
  closes: number;
  bookings: number;
  bookingToClose: number;
  cashCollectedTarget: number;
  packagePrice: number;
  cashCollectedMo: number;
  contractedRevenueMo: number;
  bookingsPerWeek: number;
  bookingsPerDay: number;
  closesPerWeek: number;
  closesPerDay: number;
  offers: number;
  qshows2: number;
  shows2: number;
  sched2: number;
  book2: number;
  qual1: number;
  shows1: number;
  channelBookings: Record<string, number>;
  channelOutputs: ChannelOutputs;
  team: TeamComputed;
  economics: EconomicsComputed;
  /** Derived here instead of being mutated onto the Plan (original wrote these back). */
  cashPerClose: number;
  contractPerClose: number;
}

// ============================================================
// Row models (war plan + trackers)
// ============================================================

export interface FunnelStage {
  lbl: string;
  noteKey: keyof PlanNotes;
  valKey: keyof Pick<
    Computed,
    'bookings' | 'shows1' | 'qual1' | 'book2' | 'shows2' | 'qshows2' | 'offers' | 'closes'
  >;
  hero?: boolean;
  /** Conversion rate(s) that turn the PREVIOUS displayed stage into this one (top stage has none). */
  rateKeys?: (keyof SalesRates)[];
}

export interface SectionRow {
  section: string;
}

export interface WarPlanDataRow {
  k: string;
  lbl: string;
  mo: number; // monthly value (source of truth)
  money?: boolean;
  pct?: boolean;
  conv?: string;
}

export type WarPlanRow = SectionRow | WarPlanDataRow;

export interface TrackerMetricRow {
  k: string;
  lbl: string;
  target: number;
  money?: boolean;
  rate?: boolean;
  conv?: string;
  lowerBetter?: boolean;
  noDelta?: boolean;
  derive?: (actuals: Record<string, number>) => number | null;
}

export type TrackerRow = SectionRow | TrackerMetricRow;

export function isSectionRow(r: WarPlanRow | TrackerRow): r is SectionRow {
  return (r as SectionRow).section !== undefined;
}

export interface NoteSection {
  k: keyof NotesBlock;
  icon: string;
  lbl: string;
  placeholder: string;
}
