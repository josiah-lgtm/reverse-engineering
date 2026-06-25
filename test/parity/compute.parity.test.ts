import { describe, expect, it } from 'vitest';
import { compute } from '../../src/engine/compute';
import { defaultPlan } from '../../src/engine/defaults';
import type { Plan } from '../../src/engine/types';
import { clone, expectedComputed, firstDiff, makeRng, randomPlan, vendored } from './helpers';

function assertParity(plan: Plan, label: string) {
  const expected = expectedComputed(plan);
  const actual = compute(clone(plan));
  const diff = firstDiff(actual, expected);
  if (diff) {
    throw new Error(
      `Parity drift [${label}] at "${diff.path}": port=${JSON.stringify(diff.a)} original=${JSON.stringify(diff.b)}`,
    );
  }
  expect(diff).toBeNull();
}

describe('compute() parity vs original', () => {
  it('matches on the canonical default plan', () => {
    assertParity(vendored.defaultPlan(), 'vendored default');
  });

  it('TS defaultPlan computes identically to vendored defaultPlan', () => {
    const fromTs = compute(defaultPlan());
    const fromVendored = compute(vendored.defaultPlan());
    expect(firstDiff(fromTs, fromVendored)).toBeNull();
  });

  it('matches across 20,000 randomized plans', () => {
    const rng = makeRng(0xc0ffee);
    for (let i = 0; i < 20_000; i++) {
      assertParity(randomPlan(rng), `random #${i}`);
    }
  });

  describe('mandatory edge cases', () => {
    it('closeRate = 0 collapses the whole funnel to 0', () => {
      const p = vendored.defaultPlan();
      p.sales.closeRate = 0;
      assertParity(p, 'closeRate=0');
      expect(compute(p).bookings).toBe(0);
      expect(compute(p).offers).toBe(0);
    });

    it('packagePrice = 0 collapses closes and economics', () => {
      const p = vendored.defaultPlan();
      p.packagePrice = 0;
      assertParity(p, 'packagePrice=0');
      const c = compute(p);
      expect(c.closes).toBe(0);
      expect(c.economics.cacOverall).toBe(0);
      expect(c.economics.ltvCac).toBe(0);
    });

    it('LinkedIn disabled removes the linkedin key from channelOutputs', () => {
      const p = vendored.defaultPlan();
      p.channels.linkedin.enabled = false;
      assertParity(p, 'li disabled');
      const c = compute(p);
      expect(c.channelOutputs.linkedin).toBeUndefined();
      expect(c.channelOutputs.email).toBeDefined();
      expect(c.economics.totalMarketing).toBe(c.channelOutputs.email!.totalCost);
    });

    it('both channels disabled -> empty channelOutputs, zero marketing', () => {
      const p = vendored.defaultPlan();
      p.channels.linkedin.enabled = false;
      p.channels.email.enabled = false;
      assertParity(p, 'both disabled');
      const c = compute(p);
      expect(c.channelOutputs).toEqual({});
      expect(c.economics.totalMarketing).toBe(0);
    });

    it('jrMinPerCall = 0 -> closersNeeded = 0 (unguarded-division quirk)', () => {
      const p = vendored.defaultPlan();
      p.team.jrMinPerCall = 0;
      p.team.srMinPerCall = 0;
      assertParity(p, 'minPerCall=0');
      const c = compute(p);
      expect(c.team.jrClosersNeeded).toBe(0);
      expect(c.team.srClosersNeeded).toBe(0);
    });

    it('mix summing to 80 / 120 is not normalized', () => {
      const p80 = vendored.defaultPlan();
      p80.channels.linkedin.mix = 50;
      p80.channels.email.mix = 30;
      assertParity(p80, 'mix=80');
      const p120 = vendored.defaultPlan();
      p120.channels.linkedin.mix = 70;
      p120.channels.email.mix = 50;
      assertParity(p120, 'mix=120');
    });

    it('zero per-resource rates fall back to 30/30/3 defaults', () => {
      const p = vendored.defaultPlan();
      p.channels.linkedin.connectsPerProfilePerDay = 0;
      p.channels.email.sendsPerInboxPerDay = 0;
      p.channels.email.inboxesPerDomain = 0;
      assertParity(p, 'zero resource rates');
    });

    it('all-zero plan does not throw and matches original', () => {
      const p = vendored.defaultPlan();
      p.revenueTarget = 0;
      p.packagePrice = 0;
      (Object.keys(p.sales) as (keyof Plan['sales'])[]).forEach((k) => (p.sales[k] = 0));
      assertParity(p, 'all zero');
    });

    it('does not mutate the input plan', () => {
      const p = vendored.defaultPlan();
      p.cashPerClose = 999;
      p.contractPerClose = 888;
      const before = clone(p);
      compute(p);
      expect(firstDiff(p, before)).toBeNull();
    });
  });
});
