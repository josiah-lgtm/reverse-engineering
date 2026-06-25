// ============================================================
// Factory defaults — faithful ports of defaultPlan / defaultState
// / defaultSettings / emptyNotes / createEntry from the original.
// ============================================================

import { TRACKERS } from './constants';
import { currentMonthId } from './dates';
import type {
  EntryId,
  MonthId,
  NotesBlock,
  Plan,
  Settings,
  State,
  TrackerEntry,
  TrackerKind,
} from './types';

export function defaultPlan(): Plan {
  return {
    revenueTarget: 120000, // total contracted revenue target / month
    packagePrice: 15000, // contracted price per close (the program price = LTV)
    cashCollectedPct: 67, // % of contracted revenue paid upfront in cash
    cashPerClose: 10050, // DERIVED cache (compute recomputes)
    contractPerClose: 4950, // DERIVED cache (compute recomputes)
    workingDaysPerMonth: 22,
    workingDaysPerWeek: 5,
    sales: {
      show1Rate: 65,
      qual1Rate: 70,
      book2Rate: 70,
      sched2Rate: 80,
      show2Rate: 80,
      qshow2Rate: 85,
      offerRate: 90,
      closeRate: 35,
    },
    channels: {
      linkedin: {
        enabled: true,
        mix: 60,
        label: 'LinkedIn',
        open: true,
        connectsPerProfilePerDay: 30,
        acceptRate: 20,
        prr: 6.24,
        csr: 80,
        abr: 50,
        costPerProfile: 75,
        costPerLead: 0,
        softwareCost: 250,
      },
      email: {
        enabled: true,
        mix: 40,
        label: 'Email',
        open: true,
        sendsPerInboxPerDay: 30,
        inboxesPerDomain: 3,
        replyRate: 2,
        prr: 25,
        abr: 30,
        costPerInbox: 8,
        costPerLead: 0.05,
        softwareCost: 350,
      },
    },
    team: {
      jrCloserCount: 2,
      jrMinPerCall: 20,
      jrHoursPerDay: 6,
      jrCommissionPerQshow: 50,
      srCloserCount: 1,
      srMinPerCall: 45,
      srHoursPerDay: 6,
      srCommissionPct: 10,
    },
    notes: {
      bookings: '',
      shows1: '',
      qual1: '',
      book2: '',
      shows2: '',
      qshows2: '',
      offers: '',
      closes: '',
      linkedin: '',
      email: '',
      team: '',
      announcements: '',
      premortem: '',
      ideas: '',
    },
    notionPageUrl: '',
    notionPageId: '',
  };
}

export function defaultSettings(): Settings {
  return {
    apiUrl: '',
    errorPct: 10,
    currency: 'GBP',
  };
}

export function defaultState(today: Date = new Date()): State {
  const monthId = currentMonthId(today);
  return {
    activeMonth: monthId,
    activeView: 'reverse-engineering',
    months: { [monthId]: defaultPlan() },
    businessData: {},
    weeklyEntries: {},
    monthlyEntries: {},
    activeWeeklyId: null,
    activeMonthlyId: null,
    history: { kind: 'weekly', preset: 'all', from: '', to: '' },
    settings: defaultSettings(),
  };
}

export function emptyNotes(): NotesBlock {
  return {
    announcements: '',
    wins: '',
    blockers: '',
    premortem: '',
    bottleneck: '',
    bigplay: '',
  };
}

export function createEntry(
  kind: TrackerKind,
  id: EntryId,
  months: Record<MonthId, Plan>,
  activeMonth: MonthId,
): TrackerEntry {
  const inferred = TRACKERS[kind].inferPlanMonth(id);
  const planMonth = months[inferred] ? inferred : activeMonth;
  return {
    id,
    planMonth,
    actuals: {},
    rowNotes: {},
    notes: emptyNotes(),
    openNotes: {},
    notionPageId: '',
    notionPageUrl: '',
  };
}
