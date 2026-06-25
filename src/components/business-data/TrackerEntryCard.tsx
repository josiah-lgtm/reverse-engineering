import { useEffect, useMemo, useState } from 'react';
import { TRACKERS } from '../../engine/constants';
import { fmtMonth } from '../../engine/dates';
import { trackerEntryScore, trackerTargetRows } from '../../engine/tracker';
import { generateTrackerMarkdown } from '../../engine/markdown';
import { compute } from '../../engine/compute';
import type { EntryId, TrackerEntry, TrackerKind } from '../../engine/types';
import { useFormatters } from '../../format/useMoney';
import { useStore } from '../../state/store';
import { useModalStore } from '../../state/modalStore';
import { usePrintStore } from '../../state/printStore';
import { TrackerTable } from './TrackerTable';
import { NoteStack } from './NoteSection';

export function TrackerEntryCard({
  kind, id, entry,
}: {
  kind: TrackerKind;
  id: EntryId;
  entry: TrackerEntry;
}) {
  const t = TRACKERS[kind];
  const fmt = useFormatters();
  const months = useStore((s) => s.months);
  const activeMonth = useStore((s) => s.activeMonth);
  const renameEntry = useStore((s) => s.trackerRename);
  const setEntryPlanMonth = useStore((s) => s.setEntryPlanMonth);
  const saveToHistory = useStore((s) => s.saveToHistory);
  const openPlanModal = useModalStore((s) => s.openPlanModal);
  const requestPrint = usePrintStore((s) => s.requestPrint);

  const planForCols = months[entry.planMonth] ?? months[activeMonth];
  const rows = useMemo(
    () => trackerTargetRows(kind, planForCols, compute(planForCols), fmt),
    [kind, planForCols, fmt],
  );
  const score = trackerEntryScore(rows, entry);
  const [idDraft, setIdDraft] = useState(id);
  useEffect(() => setIdDraft(id), [id]);

  const planMonths = Object.keys(months).sort().reverse();

  function publish() {
    const md = generateTrackerMarkdown(kind, entry, rows, fmt, t.fmtLabel(id), fmtMonth(entry.planMonth));
    openPlanModal({
      target: { source: 'tracker', kind, id },
      title: `${t.fmtLabel(id)} — ${kind === 'weekly' ? 'Weekly' : 'Monthly'} report`,
      markdown: md,
    });
  }

  return (
    <div className="we-card open">
      <div className="we-head static">
        <div>
          <div className="lbl">{t.fmtLabel(id)}</div>
          <div className="summary">vs {fmtMonth(entry.planMonth)} war plan</div>
        </div>
        {score.scored ? (
          <span className={`we-score ${score.cls}`}>
            {score.hit}/{score.scored} ahead · {Math.round(score.pct ?? 0)}%
          </span>
        ) : (
          <span className="we-score">no data yet</span>
        )}
        <div />
        <div />
      </div>
      <div className="we-body">
        <div className="we-meta">
          <div>
            <label>{kind === 'weekly' ? 'Week starting (Monday)' : 'Month'}</label>
            <input
              type={t.pickerInputType}
              value={idDraft}
              onChange={(e) => setIdDraft(e.target.value)}
              onBlur={() => idDraft && idDraft !== id && renameEntry(kind, id, idDraft)}
            />
          </div>
          <div>
            <label>Compare to war plan for</label>
            <select
              value={entry.planMonth}
              onChange={(e) => setEntryPlanMonth(kind, id, e.target.value)}
            >
              {planMonths.map((m) => (
                <option key={m} value={m}>
                  {fmtMonth(m)}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <TrackerTable kind={kind} id={id} rows={rows} entry={entry} targetHeader={t.targetHeader} />
        </div>

        <NoteStack kind={kind} id={id} entry={entry} />

        <div className="we-row-actions">
          <button className="ghost" onClick={() => requestPrint(kind, id)}>
            Print / Save as PDF
          </button>
          <button className="primary" onClick={publish}>
            Publish to Notion →
          </button>
          <button
            className="primary"
            style={{ background: 'var(--good)', color: '#0a1a0a' }}
            onClick={() => saveToHistory(kind, id)}
          >
            {entry.savedToHistory ? '✓ In History — re-save' : '✓ Save to History'}
          </button>
        </div>
        <div style={{ textAlign: 'right', fontSize: 11, color: 'var(--text-tertiary)', marginTop: 6 }}>
          Every field already autosaves — clicking <b>Save to History</b> marks this entry as final
          and surfaces it on the History page.
        </div>
      </div>
    </div>
  );
}
