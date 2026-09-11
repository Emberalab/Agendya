import { create } from 'zustand';

export type AgendaViewMode = 'list' | 'calendar';

interface AgendaViewState {
  viewMode: AgendaViewMode;
  setViewMode: (mode: AgendaViewMode) => void;
}

/**
 * Remembers which Agenda view (Lista/Calendario) the professional last
 * selected, for as long as the app stays open in this tab.
 *
 * `/dashboard/agenda` is a real route (see AppRouter.tsx) nested under
 * DashboardLayout's <Outlet/>, so navigating to Servicios/Perfil/Horario and
 * back fully unmounts and remounts AgendaPage — a plain `useState` there
 * would reset to the default every time. Lifting just this one field into a
 * tiny, non-persisted Zustand store (the same pattern toastStore/
 * announcerStore already use for ephemeral cross-navigation UI state) fixes
 * that without a new dependency, without URL/query-param plumbing through
 * every sidebar link, and without over-persisting a within-session
 * convenience to localStorage.
 *
 * Deliberately NOT wrapped in `persist` (unlike themeStore.ts): this is a
 * "come back to where I was" convenience, not a durable cross-visit/
 * cross-device preference, so a full page reload intentionally falls back
 * to the product default (Lista) — same as a brand-new session.
 */
export const useAgendaViewStore = create<AgendaViewState>((set) => ({
  viewMode: 'list',
  setViewMode: (viewMode) => set({ viewMode }),
}));
