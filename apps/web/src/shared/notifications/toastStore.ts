import { create } from 'zustand';

export interface Toast {
  id: string;
  title: string;
  description?: string;
  /** Invoked when the body of the toast is clicked (before it is dismissed). */
  onClick?: () => void;
  /** Auto-dismiss delay in ms. `0` keeps it until dismissed manually. */
  durationMs: number;
}

export interface ToastInput {
  title: string;
  description?: string;
  onClick?: () => void;
  durationMs?: number;
}

interface ToastState {
  toasts: Toast[];
  push: (input: ToastInput) => string;
  dismiss: (id: string) => void;
  clear: () => void;
}

const DEFAULT_DURATION_MS = 8_000;
const MAX_VISIBLE = 4;

/**
 * Minimal ephemeral toast queue. Deliberately tiny — the app had no toast
 * primitive before, and real-time alerts are the only caller. Rendered by
 * `ToastHost`, which is mounted once in the dashboard shell.
 */
export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  push: (input) => {
    const id =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `toast-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const toast: Toast = {
      id,
      title: input.title,
      description: input.description,
      onClick: input.onClick,
      durationMs: input.durationMs ?? DEFAULT_DURATION_MS,
    };
    set((state) => ({
      toasts: [...state.toasts, toast].slice(-MAX_VISIBLE),
    }));
    return id;
  },
  dismiss: (id) =>
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
  clear: () => set({ toasts: [] }),
}));
