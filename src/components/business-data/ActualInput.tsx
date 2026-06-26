import { useEffect, useRef, useState } from 'react';
import type { EntryId, TrackerKind, TrackerMetricRow } from '../../engine/types';
import { useStore } from '../../state/store';

/** Editable "actual" number cell — shared by the table and card views. */
export function ActualInput({
  kind,
  id,
  row,
  actuals,
}: {
  kind: TrackerKind;
  id: EntryId;
  row: TrackerMetricRow;
  actuals: Record<string, number>;
}) {
  const updateActual = useStore((s) => s.updateActual);
  const stored = Number(actuals[row.k]) || 0;
  const [draft, setDraft] = useState(stored ? String(stored) : '');
  const focused = useRef(false);
  useEffect(() => {
    if (!focused.current) setDraft(stored ? String(stored) : '');
  }, [stored]);
  const step = row.money ? '1' : '0.1';
  return (
    <input
      type="number"
      min={0}
      step={step}
      className="we-actual"
      placeholder="0"
      value={draft}
      onFocus={() => (focused.current = true)}
      onChange={(e) => {
        setDraft(e.target.value);
        const v = parseFloat(e.target.value);
        updateActual(kind, id, row.k, isFinite(v) ? v : null);
      }}
      onBlur={() => {
        focused.current = false;
        setDraft(stored ? String(stored) : '');
      }}
    />
  );
}
