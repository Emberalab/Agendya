import { create } from 'zustand';

interface AnnouncerState {
  message: string;
  /** Bumped on every announce so an identical message re-fires the live region. */
  nonce: number;
  announce: (message: string) => void;
}

export const useAnnouncerStore = create<AnnouncerState>((set) => ({
  message: '',
  nonce: 0,
  announce: (message) => set((state) => ({ message, nonce: state.nonce + 1 })),
}));

/** Imperative announce, callable from hooks/effects. */
export const announce = (message: string) =>
  useAnnouncerStore.getState().announce(message);
