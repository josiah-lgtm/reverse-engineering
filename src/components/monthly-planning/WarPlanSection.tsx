import { useState } from 'react';
import { Section } from '../primitives/Card';
import { fmtMonth } from '../../engine/dates';
import { buildWarPlanRows, warPlanCells } from '../../engine/warplan';
import { generatePlanMarkdown } from '../../engine/markdown';
import { isSectionRow } from '../../engine/types';
import { useComputed, usePlan } from '../../selectors/hooks';
import { useFormatters } from '../../format/useMoney';
import { useStore } from '../../state/store';
import { useModalStore } from '../../state/modalStore';

export function WarPlanSection() {
  const plan = usePlan();
  const c = useComputed();
  const fmt = useFormatters();
  const { num, ceil } = fmt;
  const activeMonth = useStore((s) => s.activeMonth);
  const updatePlan = useStore((s) => s.updatePlan);
  const setPlanNote = useStore((s) => s.setPlanNote);
  const openPlanModal = useModalStore((s) => s.openPlanModal);
  const [open, setOpen] = useState<Record<string, boolean>>({});

  const rows = buildWarPlanRows(plan, c, fmt);

  function sendToNotion() {
    const md = generatePlanMarkdown(plan, c, fmtMonth(activeMonth), fmt);
    openPlanModal({
      target: { source: 'warplan' },
      title: `${fmtMonth(activeMonth)} — Plan`,
      markdown: md,
    });
  }

  return (
    <Section
      title="War plan — daily · weekly · monthly"
      summary={`${num(ceil(c.bookings))} bookings → ${num(ceil(c.closes))} closes`}
    >
      <div className="warplan-card">
        <div className="warplan-meta">
          <div className="warplan-month">{fmtMonth(activeMonth)} war plan</div>
          <div className="warplan-sub">
            Every number you need to hit + the conversion rate that produces it. Click ✎ on any row
            to add a note.
          </div>
        </div>
        <div>
          <table className="warplan-table">
            <thead>
              <tr>
                <th>Metric</th>
                <th className="num">Daily</th>
                <th className="num">Weekly</th>
                <th className="num">Monthly</th>
                <th>Conversion / context</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => {
                if (isSectionRow(r)) {
                  return (
                    <tr className="section-row" key={`s${i}`}>
                      <td colSpan={5}>{r.section}</td>
                    </tr>
                  );
                }
                const note = plan.notes[r.k] || '';
                const hasNote = note.trim().length > 0;
                const cells = warPlanCells(r, plan, fmt);
                const isOpen = !!open[r.k];
                return (
                  <FragmentRow
                    key={r.k}
                    label={r.lbl}
                    cells={cells}
                    conv={r.conv ?? ''}
                    hasNote={hasNote}
                    isOpen={isOpen}
                    note={note}
                    onToggle={() => setOpen((o) => ({ ...o, [r.k]: !o[r.k] }))}
                    onNote={(v) => setPlanNote(r.k, v)}
                  />
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="warplan-actions">
          <input
            type="url"
            className="field"
            placeholder="Optional: your Notion plan URL"
            value={plan.notionPageUrl}
            onChange={(e) => updatePlan((p) => void (p.notionPageUrl = e.target.value))}
          />
          <button className="primary" onClick={sendToNotion}>
            Send war plan to Notion →
          </button>
        </div>
      </div>
    </Section>
  );
}

interface FragmentRowProps {
  label: string;
  cells: { daily: string; weekly: string; monthly: string };
  conv: string;
  hasNote: boolean;
  isOpen: boolean;
  note: string;
  onToggle: () => void;
  onNote: (v: string) => void;
}

function FragmentRow({
  label, cells, conv, hasNote, isOpen, note, onToggle, onNote,
}: FragmentRowProps) {
  return (
    <>
      <tr className={`${hasNote ? 'has-note' : ''} ${isOpen ? 'note-open' : ''}`.trim()}>
        <td className="lbl">
          {label}
          <button
            type="button"
            className="note-btn"
            title={hasNote ? 'Edit note' : 'Add note'}
            onClick={onToggle}
          >
            {hasNote ? '✎' : '+'}
          </button>
        </td>
        <td className="num">{cells.daily}</td>
        <td className="num">{cells.weekly}</td>
        <td className="num">{cells.monthly}</td>
        <td className="conv">{conv}</td>
      </tr>
      {isOpen && (
        <tr className="note-row">
          <td colSpan={5}>
            <textarea
              autoFocus
              value={note}
              placeholder={`add note for ${label}…`}
              onChange={(e) => onNote(e.target.value)}
            />
          </td>
        </tr>
      )}
    </>
  );
}
