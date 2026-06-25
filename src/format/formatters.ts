// ============================================================
// Number formatters — pure ports of num / money / pct / ceil / fmtNum.
// The currency SYMBOL is injected (the original read a global); the
// en-GB locale is hard-coded exactly as before (only the symbol swaps).
// ============================================================

import { CURRENCY_SYMBOLS } from '../engine/constants';
import type { Currency } from '../engine/types';

const EM_DASH = '—';

export function num(n: number | null | undefined, decimals = 0): string {
  if (n == null || !isFinite(n)) return EM_DASH;
  return n.toLocaleString('en-GB', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function money(n: number | null | undefined, symbol: string): string {
  if (n == null || !isFinite(n)) return EM_DASH;
  return symbol + n.toLocaleString('en-GB', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

export function pct(n: number | null | undefined): string {
  return n == null || !isFinite(n) ? EM_DASH : n.toFixed(1) + '%';
}

export function ceil(n: number): number {
  return isFinite(n) ? Math.ceil(n) : 0;
}

export interface FmtNumOpts {
  money?: boolean;
  rate?: boolean;
}

/**
 * Tracker/history number formatter. Differs from money(): rounds via Math.round
 * and looks up the symbol with NO GBP fallback (matches the original fmtNum).
 */
export function fmtNum(
  v: number | null | undefined,
  opts: FmtNumOpts = {},
  currency: Currency = 'GBP',
): string {
  if (v == null || !isFinite(v)) return EM_DASH;
  if (opts.money) return CURRENCY_SYMBOLS[currency] + Math.round(v).toLocaleString('en-GB');
  if (opts.rate) return v.toFixed(1) + '%';
  if (Math.abs(v) >= 100) return Math.round(v).toLocaleString('en-GB');
  return v.toFixed(1);
}

/** Bind money/num/pct + a currency-aware fmtNum to a fixed currency. */
export function makeFormatters(currency: Currency) {
  const symbol = CURRENCY_SYMBOLS[currency] ?? '£';
  return {
    symbol,
    num,
    money: (n: number | null | undefined) => money(n, symbol),
    pct,
    ceil,
    fmtNum: (v: number | null | undefined, opts: FmtNumOpts = {}) => fmtNum(v, opts, currency),
  };
}

export type Formatters = ReturnType<typeof makeFormatters>;
