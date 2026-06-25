import { describe, expect, it } from 'vitest';
import { normalizeState } from '../../src/state/normalize';
import { defaultPlan } from '../../src/engine/defaults';
import {
  fmtWeekLabel,
  incrementMonthId,
  incrementWeekId,
  weekStartFor,
} from '../../src/engine/dates';
import { fmtNum, makeFormatters, money, num, pct } from '../../src/format/formatters';

const TODAY = new Date(2026, 5, 15); // 2026-06-15 (local)

describe('normalizeState — migrations', () => {
  it('null -> defaults', () => {
    const s = normalizeState(null, TODAY);
    expect(s.activeMonth).toBe('2026-06');
    expect(Object.keys(s.months)).toEqual(['2026-06']);
    expect(s.settings.currency).toBe('GBP');
  });

  it('v1 flat blob -> v2 AND full backfill in the same pass (fixes early-return bug)', () => {
    const v1 = { revenueTarget: 90000, packagePrice: 10000, sales: { closeRate: 40 } };
    const s = normalizeState(v1, TODAY);
    expect(s.months['2026-06'].revenueTarget).toBe(90000);
    expect(s.months['2026-06'].packagePrice).toBe(10000);
    expect(s.months['2026-06'].sales.closeRate).toBe(40);
    // new fields backfilled despite being a v1 migration
    expect(s.months['2026-06'].sales.qshow2Rate).toBe(85);
    expect(s.months['2026-06'].team.jrCommissionPerQshow).toBe(50);
    // top-level slices present (original early-returned and skipped these)
    expect(s.settings).toBeDefined();
    expect(s.weeklyEntries).toEqual({});
    expect(s.monthlyEntries).toEqual({});
    expect(s.history).toBeDefined();
    expect(s.activeView).toBe('reverse-engineering');
  });

  it('partial v2 plan gets new funnel stage + team backfilled', () => {
    const v2 = {
      activeMonth: '2026-05',
      months: { '2026-05': { revenueTarget: 50000, sales: { show1Rate: 60 } } },
    };
    const s = normalizeState(v2, TODAY);
    const p = s.months['2026-05'];
    expect(p.sales.show1Rate).toBe(60);
    expect(p.sales.qshow2Rate).toBe(85);
    expect(p.team).toBeDefined();
    expect(p.channels.linkedin.acceptRate).toBe(20);
  });

  it('legacy pricing migration: cashPerClose/contractPerClose -> packagePrice + pct', () => {
    const v2 = {
      activeMonth: '2026-06',
      months: { '2026-06': { revenueTarget: 100000, cashPerClose: 8000, contractPerClose: 2000 } },
    };
    const s = normalizeState(v2, TODAY);
    const p = s.months['2026-06'];
    // Migration now runs first, so the old total price + cash split are preserved.
    expect(p.packagePrice).toBe(10000); // 8000 + 2000
    expect(p.cashCollectedPct).toBe(80); // 8000 / 10000
  });

  it('team-commission migration: jrCommissionPerCall -> jrCommissionPerQshow', () => {
    const v2 = {
      activeMonth: '2026-06',
      months: {
        '2026-06': {
          revenueTarget: 100000,
          packagePrice: 15000,
          cashCollectedPct: 67,
          team: { jrCommissionPerCall: 75, srCommissionPerClose: 1005 },
        },
      },
    };
    const s = normalizeState(v2, TODAY);
    const t = s.months['2026-06'].team;
    expect(t.jrCommissionPerQshow).toBe(75);
    expect((t as unknown as Record<string, unknown>).jrCommissionPerCall).toBeUndefined();
    expect(t.srCommissionPct).toBeGreaterThan(0);
  });

  it('BD_MAP: legacy businessData -> monthlyEntries (positive values only)', () => {
    const v2 = {
      activeMonth: '2026-06',
      months: { '2026-06': defaultPlan() },
      businessData: {
        '2026-06': { revenueActual: 80000, closesActual: 0, bookingsActual: 120, notes: 'good month' },
      },
    };
    const s = normalizeState(v2, TODAY);
    const e = s.monthlyEntries['2026-06'];
    expect(e.actuals.wp_revenueTarget).toBe(80000);
    expect(e.actuals.wp_bookings).toBe(120);
    expect(e.actuals.wp_closes).toBeUndefined(); // 0 dropped
    expect(e.notes.wins).toBe('good month');
  });

  it('weekly entry legacy string notes -> wins', () => {
    const v2 = {
      activeMonth: '2026-06',
      months: { '2026-06': defaultPlan() },
      weeklyEntries: { '2026-06-01': { id: '2026-06-01', planMonth: '2026-06', notes: 'all good' } },
    };
    const s = normalizeState(v2, TODAY);
    expect(s.weeklyEntries['2026-06-01'].notes.wins).toBe('all good');
    expect(s.weeklyEntries['2026-06-01'].notes.bottleneck).toBe('');
  });

  it('corrupt input -> defaults, never throws', () => {
    expect(normalizeState('not an object', TODAY).activeMonth).toBe('2026-06');
    expect(normalizeState(42, TODAY).activeMonth).toBe('2026-06');
    expect(normalizeState({ months: 'broken' }, TODAY).activeMonth).toBe('2026-06');
  });
});

describe('date helpers', () => {
  it('weekStartFor snaps to Monday', () => {
    expect(weekStartFor(new Date(2026, 5, 17))).toBe('2026-06-15'); // Wed -> Mon
    expect(weekStartFor(new Date(2026, 5, 14))).toBe('2026-06-08'); // Sun -> prev Mon
    expect(weekStartFor(new Date(2026, 5, 15))).toBe('2026-06-15'); // Mon
  });
  it('incrementWeekId / incrementMonthId', () => {
    expect(incrementWeekId('2026-06-15', 1)).toBe('2026-06-22');
    expect(incrementMonthId('2026-12', 1)).toBe('2027-01');
    expect(incrementMonthId('2026-06', -1)).toBe('2026-05');
  });
  it('fmtWeekLabel same vs cross month', () => {
    expect(fmtWeekLabel('2026-06-15')).toBe('Week of Jun 15–21, 2026');
    expect(fmtWeekLabel('2026-06-29')).toBe('Week of Jun 29 – Jul 5, 2026');
  });
});

describe('formatters', () => {
  it('num/money/pct em-dash on non-finite', () => {
    expect(num(null)).toBe('—');
    expect(num(Infinity)).toBe('—');
    expect(money(NaN, '£')).toBe('—');
    expect(pct(undefined)).toBe('—');
  });
  it('money + num en-GB grouping, symbol swap', () => {
    expect(money(120000, '£')).toBe('£120,000');
    expect(money(120000, '$')).toBe('$120,000');
    expect(num(1234.5, 1)).toBe('1,234.5');
    expect(pct(35.25)).toBe('35.3%');
  });
  it('fmtNum thresholds + currency (no GBP fallback path)', () => {
    expect(fmtNum(1234.6, { money: true }, 'EUR')).toBe('€1,235');
    expect(fmtNum(12.34, { rate: true })).toBe('12.3%');
    expect(fmtNum(150.7)).toBe('151');
    expect(fmtNum(12.34)).toBe('12.3');
    expect(makeFormatters('USD').symbol).toBe('$');
  });
});
