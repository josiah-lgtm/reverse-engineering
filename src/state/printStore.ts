import { create } from 'zustand';
import type { EntryId, TrackerKind } from '../engine/types';

interface PrintState {
  request: { kind: TrackerKind; id: EntryId } | null;
  /** Generation counter — bumped on each request so PrintArea can re-trigger window.print(). */
  nonce: number;
  requestPrint: (kind: TrackerKind, id: EntryId) => void;
  clear: () => void;
}

export const usePrintStore = create<PrintState>((set) => ({
  request: null,
  nonce: 0,
  requestPrint: (kind, id) => set((s) => ({ request: { kind, id }, nonce: s.nonce + 1 })),
  clear: () => set({ request: null }),
}));
