import { describe, expect, it } from 'vitest';
import { compute } from '../../src/engine/compute';
import {
  trackerEffectiveActual,
  trackerEntryScore,
  trackerStatus,
  trackerTargetRows,
} from '../../src/engine/tracker';
import { makeFormatters } from '../../src/format/formatters';
import type { Currency, Plan, TrackerEntry, TrackerKind, TrackerMetricRow } from '../../src/engine/types';
import { clone, makeRng, randomPlan, vendored } from './helpers';

// @ts-expect-error — vendored CommonJS reference, no .d.ts
import trk from './original-tracker.cjs';
const { vendorTrackerData } = trk as {
  vendorTrackerData: (
    kind: TrackerKind,
    plan: Plan,
    planMonth: string,
    currency: Currency,
    actuals: Record<string, number>,
  ) => { rows: unknown[]; score: unknown };
};

const MONTH = '2026-06';

function portTrackerData(
  kind: TrackerKind,
  plan: Plan,
  currency: Currency,
  actuals: Record<string, number>,
) {
  const c = compute(clone(plan));
  const fmt = makeFormatters(currency);
  const rows = trackerTargetRows(kind, plan, c, fmt);
  const norm = rows.map((r) =>
    'section' in r
      ? { section: r.section }
      : {
          k: r.k,
          lbl: r.lbl,
          target: r.target,
          money: !!r.money,
          rate: !!r.rate,
          lowerBetter: !!r.lowerBetter,
          noDelta: !!r.noDelta,
          conv: r.conv == null ? null : r.conv,
          derived: r.derive ? r.derive(actuals) : null,
          eff: trackerEffectiveActual(r as TrackerMetricRow, actuals),
          status: (() => {
            const e = trackerEffectiveActual(r as TrackerMetricRow, actuals);
            return trackerStatus(r.target, e.value, r.lowerBetter);
          })(),
        },
  );
  const entry = { planMonth: MONTH, actuals } as TrackerEntry;
  const score = trackerEntryScore(rows, entry);
  return { rows: norm, score };
}

function randomActuals(plan: Plan, rng: () => number): Record<string, number> {
  const keys = [
    'wp_revenueTarget', 'wp_cashCollectedTarget', 'wp_closes', 'wp_offers', 'wp_qshows2',
    'wp_shows2', 'wp_book2', 'wp_qual1', 'wp_shows1', 'wp_bookings',
    'wp_li_connections', 'wp_li_accepts', 'wp_li_positives', 'wp_li_calendly', 'wp_li_bookings', 'wp_li_profiles',
    'wp_em_sends', 'wp_em_replies', 'wp_em_positives', 'wp_em_bookings', 'wp_em_inboxes',
    'wp_marketing', 'wp_commissions', 'wp_total_sm', 'wp_profit',
    'cv_show1', 'cv_close', // sometimes manual rate overrides
  ];
  const a: Record<string, number> = {};
  keys.forEach((k) => {
    const roll = rng();
    if (roll < 0.4) return; // ~40% blank
    if (roll < 0.45) {
      a[k] = 0; // explicit zero (engine treats as not-entered)
    } else {
      a[k] = Math.round(rng() * 200000) / (k.startsWith('cv_') ? 2000 : 1);
    }
  });
  void plan;
  return a;
}

describe('tracker engine parity vs original', () => {
  it('matches default plan, both kinds', () => {
    (['weekly', 'monthly'] as TrackerKind[]).forEach((kind) => {
      const actuals = { wp_bookings: 30, wp_shows1: 20, wp_closes: 2, wp_offers: 5, wp_marketing: 400 };
      const expected = vendorTrackerData(kind, clone(vendored.defaultPlan()), MONTH, 'GBP', actuals);
      const actual = portTrackerData(kind, vendored.defaultPlan(), 'GBP', actuals);
      expect(actual).toEqual(expected);
    });
  });

  it('matches across 4,000 randomized plans + actuals (both kinds, all currencies)', () => {
    const rng = makeRng(0xfeed);
    const kinds: TrackerKind[] = ['weekly', 'monthly'];
    const currencies: Currency[] = ['GBP', 'USD', 'EUR'];
    for (let i = 0; i < 4000; i++) {
      const plan = randomPlan(rng);
      const kind = kinds[i % 2];
      const currency = currencies[i % 3];
      const actuals = randomActuals(plan, rng);
      const expected = vendorTrackerData(kind, clone(plan), MONTH, currency, clone(actuals));
      const actual = portTrackerData(kind, plan, currency, actuals);
      if (JSON.stringify(actual) !== JSON.stringify(expected)) {
        // Pinpoint the first divergent row for a readable failure.
        const ea = actual.rows as Record<string, unknown>[];
        const ee = expected.rows as Record<string, unknown>[];
        for (let j = 0; j < Math.max(ea.length, ee.length); j++) {
          if (JSON.stringify(ea[j]) !== JSON.stringify(ee[j])) {
            throw new Error(
              `Tracker drift [random #${i} ${kind}/${currency}] row ${j}:\n  port: ${JSON.stringify(ea[j])}\n  orig: ${JSON.stringify(ee[j])}`,
            );
          }
        }
        expect(actual.score).toEqual(expected.score);
      }
      expect(actual).toEqual(expected);
    }
  });

  describe('documented quirks', () => {
    it('ratePct returns null when an operand is 0', () => {
      const fmt = makeFormatters('GBP');
      const c = compute(vendored.defaultPlan());
      const rows = trackerTargetRows('monthly', vendored.defaultPlan(), c, fmt);
      const cvShow1 = rows.find((r) => 'k' in r && r.k === 'cv_show1') as TrackerMetricRow;
      expect(cvShow1.derive!({ wp_shows1: 10, wp_bookings: 0 })).toBeNull();
      expect(cvShow1.derive!({ wp_shows1: 0, wp_bookings: 10 })).toBeNull();
      expect(cvShow1.derive!({ wp_shows1: 10, wp_bookings: 20 })).toBeCloseTo(50, 9);
    });

    it('score uses RAW actuals, not the derived effective value', () => {
      const fmt = makeFormatters('GBP');
      const plan = vendored.defaultPlan();
      const c = compute(plan);
      const rows = trackerTargetRows('monthly', plan, c, fmt);
      // Only volume actuals entered; derived rate/spend rows have a value in-table
      // but contribute nothing to the score (no raw actual).
      const entry = { planMonth: MONTH, actuals: { wp_bookings: 9999 } } as unknown as TrackerEntry;
      const score = trackerEntryScore(rows, entry);
      expect(score.scored).toBe(1);
      expect(score.hit).toBe(1);
    });
  });
});
