import { NOTE_SECTIONS } from '../../engine/constants';
import { BulletTextArea } from '../primitives/BulletTextArea';
import type { EntryId, TrackerEntry, TrackerKind } from '../../engine/types';
import { useStore } from '../../state/store';

export function NoteStack({
  kind, id, entry,
}: {
  kind: TrackerKind;
  id: EntryId;
  entry: TrackerEntry;
}) {
  const setEntryNote = useStore((s) => s.setEntryNote);
  const toggleEntryNoteOpen = useStore((s) => s.toggleEntryNoteOpen);

  return (
    <div className="note-stack">
      {NOTE_SECTIONS.map((n) => {
        const val = entry.notes[n.k] || '';
        const hasContent = !!val.trim();
        const open = !!entry.openNotes[n.k] || hasContent;
        return (
          <div
            key={n.k}
            className={`note-section ${open ? 'open' : ''} ${hasContent ? 'has-content' : ''}`.trim()}
          >
            <button
              type="button"
              className="note-toggle"
              onClick={() => toggleEntryNoteOpen(kind, id, n.k)}
            >
              <span className="note-icon">{n.icon}</span>
              <span className="note-lbl">{n.lbl}</span>
              {hasContent && <span className="note-dot" title="has content" />}
              <span className="note-caret">▾</span>
            </button>
            {open && (
              <div className="note-body">
                <BulletTextArea
                  value={val}
                  placeholder={n.placeholder}
                  onChange={(v) => setEntryNote(kind, id, n.k, v)}
                />
                <div className="note-hint">
                  Tip: type <kbd>-</kbd> + <kbd>space</kbd> → a • bullet appears · <kbd>Enter</kbd>{' '}
                  continues the list · empty bullet + <kbd>Enter</kbd> exits
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
