import { beforeEach, describe, expect, it } from 'vitest';
import { defaultState } from '../../src/engine/defaults';
import { useStore } from '../../src/state/store';

const TODAY = new Date(2026, 5, 15);

// Seed one weekly entry to mutate.
function seedEntry() {
  useStore.setState({ ...defaultState(TODAY) });
  useStore.getState().trackerAdd('weekly');
  const id = useStore.getState().activeWeeklyId!;
  return id;
}
const log = (id: string) => useStore.getState().weeklyEntries[id].changeLog || [];

describe('change log — append-only audit trail', () => {
  beforeEach(() => seedEntry());

  it('records an actual edit with from/to', () => {
    const id = useStore.getState().activeWeeklyId!;
    useStore.getState().updateActual('weekly', id, 'wp_closes', 5);
    const l = log(id);
    expect(l.length).toBe(1);
    expect(l[0]).toMatchObject({ kind: 'actual', rowKey: 'wp_closes', from: null, to: 5 });
  });

  it('coalesces rapid edits to the same field into one event (keeps original from)', () => {
    const id = useStore.getState().activeWeeklyId!;
    useStore.getState().updateActual('weekly', id, 'wp_closes', 5);
    useStore.getState().updateActual('weekly', id, 'wp_closes', 8);
    useStore.getState().updateActual('weekly', id, 'wp_closes', 12);
    const l = log(id);
    expect(l.length).toBe(1);
    expect(l[0]).toMatchObject({ from: null, to: 12 });
  });

  it('keeps distinct fields as separate events', () => {
    const id = useStore.getState().activeWeeklyId!;
    useStore.getState().updateActual('weekly', id, 'wp_closes', 5);
    useStore.getState().updateActual('weekly', id, 'wp_bookings', 30);
    expect(log(id).length).toBe(2);
  });

  it('drops the event when a value is edited back to its original within the window', () => {
    const id = useStore.getState().activeWeeklyId!;
    useStore.getState().updateActual('weekly', id, 'wp_closes', 5); // null -> 5
    useStore.getState().updateActual('weekly', id, 'wp_closes', null); // 5 -> null (== original) -> drop
    expect(log(id).length).toBe(0);
  });

  it('logs note edits and a save marker', () => {
    const id = useStore.getState().activeWeeklyId!;
    useStore.getState().setRowNote('weekly', id, 'wp_closes', 'great week');
    useStore.getState().saveToHistory('weekly', id);
    const l = log(id);
    expect(l.some((e) => e.kind === 'note' && e.to === 'great week')).toBe(true);
    expect(l.some((e) => e.kind === 'save')).toBe(true);
  });

  it('ignores no-op writes (same value)', () => {
    const id = useStore.getState().activeWeeklyId!;
    useStore.getState().updateActual('weekly', id, 'wp_closes', 5);
    const before = log(id).length;
    useStore.getState().updateActual('weekly', id, 'wp_closes', 5); // same -> coalesced no-op
    expect(log(id).length).toBe(before);
    expect(log(id)[0].to).toBe(5);
  });
});
