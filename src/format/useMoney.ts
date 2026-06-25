import { useMemo } from 'react';
import { useStore } from '../state/store';
import { makeFormatters, type Formatters } from './formatters';

/** Currency-bound formatters (num/money/pct/ceil/fmtNum), reactive to settings. */
export function useFormatters(): Formatters {
  const currency = useStore((s) => s.settings.currency);
  return useMemo(() => makeFormatters(currency), [currency]);
}
