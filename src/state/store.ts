// ============================================================
// Zustand store — single source of truth. Persists the State slice as raw
// JSON under `reverseEngineering_v2` (the original's exact format, so
// existing user data loads), debounced 200ms, with a transient saveStatus.
// ============================================================

import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { Draft } from 'immer';
import { TRACKERS } from '../engine/constants';
import { createEntry, defaultPlan, defaultState, emptyNotes } from '../engine/defaults';
import type {
  Currency,
  EntryId,
  MonthId,
  NotesBlock,
  Plan,
  State,
  TrackerKind,
  ViewKey,
} from '../engine/types';
import { presetToRange } from '../selectors/history';
import { normalizeState } from './normalize';

const STORAGE_KEY = 'reverseEngineering_v2';

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

export type PublishTarget =
  | { source: 'warplan' }
  | { source: 'tracker'; kind: TrackerKind; id: EntryId };

interface Actions {
  // shell
  setActiveView: (view: ViewKey) => void;
  setActiveMonth: (id: MonthId) => void;
  addMonth: (id: MonthId) => void;
  resetMonth: () => void;
  resetAll: () => void;
  importState: (raw: unknown) => void;
  setCurrency: (c: Currency) => void;
  setApiUrl: (url: string) => void;
  setErrorPct: (n: number) => void;
  // plan
  updatePlan: (recipe: (plan: Draft<Plan>) => void) => void;
  setPlanNote: (key: string, value: string) => void;
  // trackers
  trackerAdd: (kind: TrackerKind) => void;
  trackerDuplicate: (kind: TrackerKind) => void;
  trackerDelete: (kind: TrackerKind, id: EntryId) => void;
  trackerSetActive: (kind: TrackerKind, id: EntryId) => void;
  trackerRename: (kind: TrackerKind, oldId: EntryId, newId: EntryId) => void;
  setEntryPlanMonth: (kind: TrackerKind, id: EntryId, month: MonthId) => void;
  updateActual: (kind: TrackerKind, id: EntryId, rowKey: string, value: number | null) => void;
  setRowNote: (kind: TrackerKind, id: EntryId, rowKey: string, value: string) => void;
  setEntryNote: (kind: TrackerKind, id: EntryId, sectionKey: keyof NotesBlock, value: string) => void;
  toggleEntryNoteOpen: (kind: TrackerKind, id: EntryId, sectionKey: keyof NotesBlock) => void;
  saveToHistory: (kind: TrackerKind, id: EntryId) => void;
  savePublishResult: (target: PublishTarget, pageId: string, pageUrl: string) => void;
  // history
  setHistoryKind: (kind: TrackerKind) => void;
  setHistoryFrom: (date: string) => void;
  setHistoryTo: (date: string) => void;
  applyHistoryPreset: (preset: string) => void;
  initHistory: () => void;
  flashEntry: (id: EntryId | null) => void;
}

export interface Store extends State, Actions {
  saveStatus: SaveStatus;
  flashEntryId: EntryId | null;
}

function loadInitial(): State {
  if (typeof localStorage === 'undefined') return defaultState();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return normalizeState(raw ? JSON.parse(raw) : null);
  } catch (e) {
    console.error('Failed to load state', e);
    return defaultState();
  }
}

function entriesFor(s: Draft<State>, kind: TrackerKind) {
  return kind === 'weekly' ? s.weeklyEntries : s.monthlyEntries;
}

function setActiveId(s: Draft<State>, kind: TrackerKind, id: EntryId | null) {
  if (kind === 'weekly') s.activeWeeklyId = id;
  else s.activeMonthlyId = id;
}

export const useStore = create<Store>()(
  immer((set) => ({
    ...loadInitial(),
    saveStatus: 'saved',
    flashEntryId: null,

    // ── shell ──────────────────────────────────────────────
    setActiveView: (view) => set((s) => void (s.activeView = view)),
    setActiveMonth: (id) =>
      set((s) => {
        if (s.months[id]) s.activeMonth = id;
      }),
    addMonth: (id) =>
      set((s) => {
        if (!/^\d{4}-\d{2}$/.test(id) || s.months[id]) return;
        const seed = JSON.parse(JSON.stringify(s.months[s.activeMonth])) as Plan;
        seed.notionPageId = '';
        seed.notionPageUrl = '';
        s.months[id] = seed;
        s.activeMonth = id;
      }),
    resetMonth: () => set((s) => void (s.months[s.activeMonth] = defaultPlan())),
    resetAll: () =>
      set((s) => {
        Object.assign(s, defaultState());
        s.flashEntryId = null;
      }),
    importState: (raw) =>
      set((s) => {
        Object.assign(s, normalizeState(raw));
        s.flashEntryId = null;
      }),
    setCurrency: (c) => set((s) => void (s.settings.currency = c)),
    setApiUrl: (url) => set((s) => void (s.settings.apiUrl = url)),
    setErrorPct: (n) => set((s) => void (s.settings.errorPct = n)),

    // ── plan ───────────────────────────────────────────────
    updatePlan: (recipe) => set((s) => recipe(s.months[s.activeMonth])),
    setPlanNote: (key, value) => set((s) => void (s.months[s.activeMonth].notes[key] = value)),

    // ── trackers ───────────────────────────────────────────
    trackerAdd: (kind) =>
      set((s) => {
        const map = entriesFor(s, kind);
        const id = TRACKERS[kind].suggestId();
        if (!map[id]) map[id] = createEntry(kind, id, s.months, s.activeMonth);
        setActiveId(s, kind, id);
      }),
    trackerDuplicate: (kind) =>
      set((s) => {
        const map = entriesFor(s, kind);
        const srcId = kind === 'weekly' ? s.activeWeeklyId : s.activeMonthlyId;
        if (!srcId || !map[srcId]) return;
        let newId = TRACKERS[kind].incrementId(srcId, 1);
        while (map[newId]) newId = TRACKERS[kind].incrementId(newId, 1);
        const src = map[srcId];
        const e = createEntry(kind, newId, s.months, s.activeMonth);
        e.actuals = { ...src.actuals };
        e.notes = { ...emptyNotes(), ...src.notes };
        e.openNotes = { ...src.openNotes };
        // rowNotes intentionally NOT carried forward.
        map[newId] = e;
        setActiveId(s, kind, newId);
      }),
    trackerDelete: (kind, id) =>
      set((s) => {
        const map = entriesFor(s, kind);
        if (!map[id]) return;
        delete map[id];
        const remaining = Object.keys(map).sort().reverse();
        setActiveId(s, kind, remaining[0] || null);
      }),
    trackerSetActive: (kind, id) => set((s) => setActiveId(s, kind, id)),
    trackerRename: (kind, oldId, newId) =>
      set((s) => {
        const map = entriesFor(s, kind);
        if (!newId || newId === oldId || map[newId] || !map[oldId]) return;
        const e = map[oldId];
        e.id = newId;
        map[newId] = e;
        delete map[oldId];
        const activeId = kind === 'weekly' ? s.activeWeeklyId : s.activeMonthlyId;
        if (activeId === oldId) setActiveId(s, kind, newId);
      }),
    setEntryPlanMonth: (kind, id, month) =>
      set((s) => {
        const e = entriesFor(s, kind)[id];
        if (e) e.planMonth = month;
      }),
    updateActual: (kind, id, rowKey, value) =>
      set((s) => {
        const e = entriesFor(s, kind)[id];
        if (!e) return;
        if (value != null && isFinite(value) && value > 0) e.actuals[rowKey] = value;
        else delete e.actuals[rowKey];
      }),
    setRowNote: (kind, id, rowKey, value) =>
      set((s) => {
        const e = entriesFor(s, kind)[id];
        if (!e) return;
        if (value.trim()) e.rowNotes[rowKey] = value;
        else delete e.rowNotes[rowKey];
      }),
    setEntryNote: (kind, id, sectionKey, value) =>
      set((s) => {
        const e = entriesFor(s, kind)[id];
        if (e) e.notes[sectionKey] = value;
      }),
    toggleEntryNoteOpen: (kind, id, sectionKey) =>
      set((s) => {
        const e = entriesFor(s, kind)[id];
        if (e) e.openNotes[sectionKey] = !e.openNotes[sectionKey];
      }),
    saveToHistory: (kind, id) =>
      set((s) => {
        const e = entriesFor(s, kind)[id];
        if (!e) return;
        e.savedToHistory = true;
        e.savedAt = new Date().toISOString();
        s.activeView = 'history';
        if (s.history!.kind !== kind) s.history!.kind = kind;
        const { from, to } = s.history!;
        const inRange =
          kind === 'monthly' ? `${id}-31` >= from && `${id}-01` <= to : id >= from && id <= to;
        if (s.history!.preset !== 'all' && !inRange) {
          const r = presetToRange('all', s as unknown as State);
          s.history!.from = r.from;
          s.history!.to = r.to;
          s.history!.preset = 'all';
        }
        s.flashEntryId = id;
      }),
    savePublishResult: (target, pageId, pageUrl) =>
      set((s) => {
        if (target.source === 'warplan') {
          const p = s.months[s.activeMonth];
          p.notionPageId = pageId;
          p.notionPageUrl = pageUrl;
        } else {
          const e = entriesFor(s, target.kind)[target.id];
          if (e) {
            e.notionPageId = pageId;
            e.notionPageUrl = pageUrl;
          }
        }
      }),

    // ── history ────────────────────────────────────────────
    setHistoryKind: (kind) => set((s) => void (s.history!.kind = kind)),
    setHistoryFrom: (date) =>
      set((s) => {
        s.history!.from = date;
        s.history!.preset = 'custom';
      }),
    setHistoryTo: (date) =>
      set((s) => {
        s.history!.to = date;
        s.history!.preset = 'custom';
      }),
    applyHistoryPreset: (preset) =>
      set((s) => {
        const { from, to } = presetToRange(preset, s as unknown as State);
        s.history!.from = from;
        s.history!.to = to;
        s.history!.preset = preset;
      }),
    initHistory: () =>
      set((s) => {
        if (!s.history) s.history = { kind: 'weekly', preset: 'all', from: '', to: '' };
        const h = s.history;
        if (!h.from || !h.to) {
          const r = presetToRange(h.preset, s as unknown as State);
          h.from = r.from;
          h.to = r.to;
        }
        if (!h._migratedToAll) {
          if (h.preset === '8w') {
            const ids = [...Object.keys(s.weeklyEntries), ...Object.keys(s.monthlyEntries)].sort();
            const earliest = ids[0] || '';
            if (earliest && earliest < h.from) {
              const r = presetToRange('all', s as unknown as State);
              h.from = r.from;
              h.to = r.to;
              h.preset = 'all';
            }
          }
          h._migratedToAll = true;
        }
      }),
    flashEntry: (id) => set((s) => void (s.flashEntryId = id)),
  })),
);

// ── Debounced raw-JSON persistence (matches the original format) ──────────
const PERSIST_KEYS: (keyof State)[] = [
  'activeMonth', 'activeView', 'months', 'businessData', 'weeklyEntries',
  'monthlyEntries', 'activeWeeklyId', 'activeMonthlyId', 'history', 'settings',
];

function persistedSlice(s: Store): State {
  const o = {} as Record<string, unknown>;
  PERSIST_KEYS.forEach((k) => (o[k] = s[k]));
  return o as unknown as State;
}

if (typeof localStorage !== 'undefined') {
  let lastSerialized = JSON.stringify(persistedSlice(useStore.getState()));
  let timer: ReturnType<typeof setTimeout> | undefined;
  let suppress = false;

  useStore.subscribe((state) => {
    if (suppress) return;
    const ser = JSON.stringify(persistedSlice(state));
    if (ser === lastSerialized) return;
    lastSerialized = ser;
    if (state.saveStatus !== 'saving') {
      suppress = true;
      useStore.setState({ saveStatus: 'saving' });
      suppress = false;
    }
    clearTimeout(timer);
    timer = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, ser);
        suppress = true;
        useStore.setState({ saveStatus: 'saved' });
        suppress = false;
      } catch (e) {
        suppress = true;
        useStore.setState({ saveStatus: 'error' });
        suppress = false;
        console.error('Save failed', e);
      }
    }, 200);
  });
}

/** Serialize the current persisted state slice (for Export JSON). */
export function exportStateJSON(): string {
  return JSON.stringify(persistedSlice(useStore.getState()), null, 2);
}

export { STORAGE_KEY };
