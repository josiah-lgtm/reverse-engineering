// Shared parity-test helpers: a seeded PRNG, a random-plan generator,
// and a strict deep-equality reporter (Object.is semantics, so it catches
// NaN/Infinity/-0 drift as well as ordinary value drift).

import type { Plan } from '../../src/engine/types';

// @ts-expect-error — vendored CommonJS reference, no .d.ts
import original from './original-compute.cjs';

export const vendored = original as {
  defaultPlan: () => Plan;
  originalCompute: (p: Plan) => Record<string, unknown>;
};

export function clone<T>(v: T): T {
  return JSON.parse(JSON.stringify(v)) as T;
}

/** mulberry32 — small, deterministic PRNG. */
export function makeRng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function randomPlan(rng: () => number): Plan {
  const r = (min: number, max: number) => min + rng() * (max - min);
  const ri = (min: number, max: number) => Math.floor(r(min, max + 1));
  const maybeZero = (min: number, max: number) => (rng() < 0.15 ? 0 : r(min, max));

  const p = vendored.defaultPlan();
  p.revenueTarget = Math.round(r(0, 500_000));
  p.packagePrice = rng() < 0.1 ? 0 : Math.round(r(500, 60_000));
  p.cashCollectedPct = ri(0, 100);
  p.workingDaysPerMonth = ri(1, 31);
  p.workingDaysPerWeek = ri(1, 7);

  (Object.keys(p.sales) as (keyof Plan['sales'])[]).forEach((k) => {
    p.sales[k] = Math.round(r(0, 100) * 10) / 10;
  });

  p.channels.linkedin.enabled = rng() < 0.85;
  p.channels.email.enabled = rng() < 0.85;
  p.channels.linkedin.mix = ri(0, 100);
  p.channels.email.mix = ri(0, 100);
  p.channels.linkedin.acceptRate = r(0, 100);
  p.channels.linkedin.prr = r(0, 100);
  p.channels.linkedin.csr = r(0, 100);
  p.channels.linkedin.abr = r(0, 100);
  p.channels.linkedin.connectsPerProfilePerDay = rng() < 0.1 ? 0 : ri(1, 60);
  p.channels.linkedin.costPerProfile = Math.round(r(0, 200));
  p.channels.linkedin.costPerLead = Math.round(r(0, 5) * 100) / 100;
  p.channels.linkedin.softwareCost = Math.round(r(0, 1000));
  p.channels.email.replyRate = r(0, 100);
  p.channels.email.prr = r(0, 100);
  p.channels.email.abr = r(0, 100);
  p.channels.email.sendsPerInboxPerDay = rng() < 0.1 ? 0 : ri(1, 60);
  p.channels.email.inboxesPerDomain = rng() < 0.1 ? 0 : ri(1, 5);
  p.channels.email.costPerInbox = Math.round(r(0, 50));
  p.channels.email.costPerLead = Math.round(r(0, 1) * 1000) / 1000;
  p.channels.email.softwareCost = Math.round(r(0, 1000));

  p.team.jrCloserCount = ri(0, 6);
  p.team.srCloserCount = ri(0, 6);
  p.team.jrMinPerCall = maybeZero(5, 60);
  p.team.srMinPerCall = maybeZero(5, 90);
  p.team.jrHoursPerDay = maybeZero(0, 10);
  p.team.srHoursPerDay = maybeZero(0, 10);
  p.team.jrCommissionPerQshow = Math.round(r(0, 200));
  p.team.srCommissionPct = ri(0, 30);
  return p;
}

export interface Diff {
  path: string;
  a: unknown;
  b: unknown;
}

/** Strict recursive comparison. Returns the first difference (or null). */
export function firstDiff(a: unknown, b: unknown, path = ''): Diff | null {
  if (typeof a === 'number' || typeof b === 'number') {
    if (!Object.is(a, b)) return { path, a, b };
    return null;
  }
  if (a === b) return null;
  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) {
    return { path, a, b };
  }
  const ka = Object.keys(a as object).sort();
  const kb = Object.keys(b as object).sort();
  if (ka.length !== kb.length || ka.some((k, i) => k !== kb[i])) {
    return { path, a: ka, b: kb };
  }
  for (const k of ka) {
    const d = firstDiff(
      (a as Record<string, unknown>)[k],
      (b as Record<string, unknown>)[k],
      path ? `${path}.${k}` : k,
    );
    if (d) return d;
  }
  return null;
}

/**
 * The original mutates cashPerClose/contractPerClose onto the input plan and
 * does NOT return them; the TS port returns them on Computed. Run the vendored
 * compute, then attach those two derived fields so the shapes line up.
 */
export function expectedComputed(plan: Plan): Record<string, unknown> {
  const input = clone(plan);
  const out = vendored.originalCompute(input);
  return { ...out, cashPerClose: input.cashPerClose, contractPerClose: input.contractPerClose };
}
