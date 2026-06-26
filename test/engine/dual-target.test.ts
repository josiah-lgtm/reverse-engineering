import { beforeEach, describe, expect, it } from 'vitest';
import { normalizeState } from '../../src/state/normalize';
import { compute } from '../../src/engine/compute';
import { defaultPlan, defaultState } from '../../src/engine/defaults';
import { useStore } from '../../src/state/store';

const TODAY = new Date(2026, 5, 15); // 2026-06-15

// Invariant under test: cashTarget = revenueTarget × cashCollectedPct%.
describe('dual targets — data model', () => {
  it('defaultPlan satisfies the invariant and defaults to revenue mode', () => {
    const p = defaultPlan();
    expect(p.targetMode).toBe('revenue');
    expect(p.cashTarget).toBeCloseTo((p.revenueTarget * p.cashCollectedPct) / 100, 6);
  });

  it("normalize backfills cashTarget from the plan's OWN revenue/pct, not the literal default", () => {
    const v2 = {
      activeMonth: '2026-06',
      months: { '2026-06': { revenueTarget: 90000, packagePrice: 15000, cashCollectedPct: 50 } },
    };
    const p = normalizeState(v2, TODAY).months['2026-06'];
    expect(p.targetMode).toBe('revenue');
    expect(p.cashTarget).toBe(45000); // 90000 × 50%
  });

  it('legacy pricing-migrated plan backfills cashTarget against the MIGRATED pct', () => {
    const v2 = {
      activeMonth: '2026-06',
      months: { '2026-06': { revenueTarget: 100000, cashPerClose: 8000, contractPerClose: 2000 } },
    };
    const p = normalizeState(v2, TODAY).months['2026-06'];
    // pricing migration -> packagePrice 10000, cashCollectedPct 80
    expect(p.packagePrice).toBe(10000);
    expect(p.cashCollectedPct).toBe(80);
    expect(p.cashTarget).toBe(80000); // 100000 × 80% (NOT the stale 80400 default)
  });

  it('compute() reproduces the cash target exactly when the invariant holds', () => {
    const c = compute(defaultPlan());
    const p = defaultPlan();
    expect(c.cashCollectedTarget).toBeCloseTo(p.cashTarget, 6);
  });
});

describe('dual targets — store actions keep the invariant', () => {
  beforeEach(() => useStore.setState({ ...defaultState(TODAY) }));
  const plan = () => useStore.getState().months[useStore.getState().activeMonth];

  it('setRevenueTarget updates cashTarget = revenue × pct', () => {
    useStore.getState().setCashPct(60);
    useStore.getState().setRevenueTarget(200000);
    expect(plan().revenueTarget).toBe(200000);
    expect(plan().cashTarget).toBe(120000);
  });

  it('setCashTarget back-solves revenue = cash ÷ pct', () => {
    useStore.getState().setCashPct(50);
    useStore.getState().setTargetMode('cash');
    useStore.getState().setCashTarget(60000);
    expect(plan().cashTarget).toBe(60000);
    expect(plan().revenueTarget).toBe(120000); // 60000 / 0.5
  });

  it('setCashPct in cash mode keeps cash pinned and re-solves revenue', () => {
    useStore.getState().setTargetMode('cash');
    useStore.getState().setCashTarget(50000);
    useStore.getState().setCashPct(25);
    expect(plan().cashTarget).toBe(50000);
    expect(plan().revenueTarget).toBe(200000); // 50000 / 0.25
  });

  it('setCashPct in revenue mode keeps revenue pinned and re-derives cash', () => {
    useStore.getState().setTargetMode('revenue');
    useStore.getState().setRevenueTarget(100000);
    useStore.getState().setCashPct(40);
    expect(plan().revenueTarget).toBe(100000);
    expect(plan().cashTarget).toBe(40000);
  });
});
