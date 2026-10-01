import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import './styles/tailwind.css';
import App from './App.tsx';
import { isBackofficeApiError } from './modules/backoffice/shared/backofficeApiClient';
import { initSessionSync } from './modules/backoffice/auth/sessionSync';

// Retry only what can succeed on a second try: a 4xx (permission, not
// found, validation) won't, and the default 3 retries with backoff kept an
// agent staring at "Cargando…" for ~7s before any error state appeared.
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) =>
        !(isBackofficeApiError(error) && error.status < 500) &&
        failureCount < 1,
    },
  },
});

// Wait (≤150ms, only when this tab has no session) for an open tab to hand
// over a non-remembered session before the router decides login vs. app.
void initSessionSync().finally(() =>
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </StrictMode>,
  ),
);
