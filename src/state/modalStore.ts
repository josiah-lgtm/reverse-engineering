import { create } from 'zustand';
import type { PublishTarget } from './store';

interface ModalState {
  open: boolean;
  target: PublishTarget | null;
  title: string;
  markdown: string;
  openPlanModal: (args: { target: PublishTarget; title: string; markdown: string }) => void;
  closePlanModal: () => void;
}

/** Transient state for the shared publish modal (war plan + tracker entries). */
export const useModalStore = create<ModalState>((set) => ({
  open: false,
  target: null,
  title: '',
  markdown: '',
  openPlanModal: ({ target, title, markdown }) => set({ open: true, target, title, markdown }),
  closePlanModal: () => set({ open: false }),
}));
