import { useMemo } from 'react';
import { compute } from '../engine/compute';
import type { Computed, Plan, Settings } from '../engine/types';
import { useStore } from '../state/store';

/** The active month's plan. */
export function usePlan(): Plan {
  return useStore((s) => s.months[s.activeMonth]);
}

export function useSettings(): Settings {
  return useStore((s) => s.settings);
}

/** Memoized compute() of the active plan — the single source of truth for all RE panels. */
export function useComputed(): Computed {
  const plan = usePlan();
  return useMemo(() => compute(plan), [plan]);
}

/** Compute for an arbitrary month (used by trackers/history referencing other plans). */
export function useComputedFor(monthId: string): { plan: Plan; computed: Computed } {
  const plan = useStore((s) => s.months[monthId] ?? s.months[s.activeMonth]);
  return useMemo(() => ({ plan, computed: compute(plan) }), [plan]);
}
