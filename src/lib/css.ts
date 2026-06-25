import type { CSSProperties } from 'react';

/** Allow CSS custom properties (e.g. `--pct`) in a typed style object. */
export function cssVars(vars: Record<string, string | number>): CSSProperties {
  return vars as CSSProperties;
}
