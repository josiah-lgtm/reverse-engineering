import { useEffect, useRef } from 'react';

export function CellNotePopover({
  left, top, value, onChange, onClose,
}: {
  left: number;
  top: number;
  value: string;
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
    </div>
  );
}
