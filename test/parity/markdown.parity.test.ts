import { describe, expect, it } from 'vitest';
import { compute } from '../../src/engine/compute';
import { generatePlanMarkdown } from '../../src/engine/markdown';
import { fmtMonth } from '../../src/engine/dates';
import { makeFormatters } from '../../src/format/formatters';
import type { Currency, Plan } from '../../src/engine/types';
import { clone, makeRng, randomPlan, vendored } from './helpers';

// @ts-expect-error — vendored CommonJS reference, no .d.ts
import md from './original-markdown.cjs';
const { genMarkdown } = md as { genMarkdown: (p: Plan, monthId: string, currency: Currency) => string };

const MONTH = '2026-06';

function portMarkdown(plan: Plan, monthId: string, currency: Currency): string {
  const c = compute(clone(plan));
  return generatePlanMarkdown(plan, c, fmtMonth(monthId), makeFormatters(currency));
}

function assertMarkdownParity(plan: Plan, currency: Currency, label: string) {
  const expected = genMarkdown(clone(plan), MONTH, currency);
  const actual = portMarkdown(plan, MONTH, currency);
  if (actual !== expected) {
    // Find first differing line for a readable failure.
    const a = actual.split('\n');
    const b = expected.split('\n');
    const n = Math.max(a.length, b.length);
    for (let i = 0; i < n; i++) {
      if (a[i] !== b[i]) {
        throw new Error(
          `Markdown drift [${label}] line ${i + 1}:\n  port:     ${JSON.stringify(a[i])}\n  original: ${JSON.stringify(b[i])}`,
        );
      }
    }
  }
  expect(actual).toBe(expected);
}

describe('generatePlanMarkdown() parity vs original', () => {
  it('byte-matches on the default plan (GBP)', () => {
    assertMarkdownParity(vendored.defaultPlan(), 'GBP', 'default');
  });

  it('byte-matches across currencies', () => {
    (['GBP', 'USD', 'EUR'] as Currency[]).forEach((cur) => {
      assertMarkdownParity(vendored.defaultPlan(), cur, `default ${cur}`);
    });
  });

  it('byte-matches with notes set (escaping, blockquotes, sections)', () => {
    const p = vendored.defaultPlan();
    p.notes.linkedin = 'Watch | the | accept rate\nsecond line';
    p.notes.email = 'Spread sending load';
    p.notes.team = 'Daniel ready for senior';
    p.notes.announcements = 'New SDR starts June 5';
    p.notes.premortem = 'Accept rate dipping';
    p.notes.ideas = 'Trial a 3rd domain';
    assertMarkdownParity(p, 'GBP', 'with notes');
  });

  it('byte-matches with channels disabled', () => {
    const p1 = vendored.defaultPlan();
    p1.channels.linkedin.enabled = false;
    assertMarkdownParity(p1, 'GBP', 'no linkedin');
    const p2 = vendored.defaultPlan();
    p2.channels.email.enabled = false;
    assertMarkdownParity(p2, 'GBP', 'no email');
  });

  it('byte-matches across 3,000 randomized plans', () => {
    const rng = makeRng(0x5eed);
    const currencies: Currency[] = ['GBP', 'USD', 'EUR'];
    for (let i = 0; i < 3000; i++) {
      const p = randomPlan(rng);
      assertMarkdownParity(p, currencies[i % 3], `random #${i}`);
    }
  });
});
