import { useEffect, useRef } from 'react';
import type { ChangeEvent } from '../../engine/types';

function fmtAt(at: string): string {
  const d = new Date(at);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function fmtVal(v: ChangeEvent['from']): string {
  if (v == null || v === '') return '—';
  return String(v);
}

function describe(ev: ChangeEvent): string {
  if (ev.kind === 'save') return 'Saved to history';
  if (ev.kind === 'note') return `Note: ${fmtVal(ev.from)} → ${fmtVal(ev.to)}`;
  return `${fmtVal(ev.from)} → ${fmtVal(ev.to)}`;
}

export function CellNotePopover({
  left, top, value, events, onChange, onClose,
}: {
  left: number;
  top: number;
  value: string;
  events?: ChangeEvent[];
  onChange: (v: string) => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (ref.current?.contains(target)) return;
      if (target.closest('.note-btn')) return;
      onClose();
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [onClose]);

  const timeline = (events || []).slice().reverse(); // newest first

  return (
    <div
      className="hist-note-pop"
      ref={ref}
      style={{ display: 'block', position: 'fixed', left, top, width: 280 }}
    >
      <div className="hnp-head">
        <span className="hnp-title">Note</span>
        <button className="hnp-close" onClick={onClose}>
          ×
        </button>
      </div>
      <textarea
        className="hnp-textarea"
        rows={4}
        autoFocus
        value={value}
        placeholder="Add a note for this cell…"
        onChange={(e) => onChange(e.target.value)}
      />
      {timeline.length > 0 && (
        <div className="hnp-timeline">
          <div className="hnp-timeline-title">History · {timeline.length}</div>
          {timeline.slice(0, 12).map((ev, i) => (
            <div className={`hnp-event ${ev.kind}`} key={i}>
              <span className="hnp-when">{fmtAt(ev.at)}</span>
              <span className="hnp-what">{describe(ev)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
