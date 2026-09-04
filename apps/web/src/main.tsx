import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import './styles/tailwind.css';
import './main.scss';
// Side-effect import: applies the persisted/system theme to <html> as soon as
// the app boots, independent of whether the (lazily-loaded) theme toggle is
// ever rendered. index.html already set it before first paint to avoid a
// flash; this keeps the store in sync from here on.
import './shared/theme/themeStore';
import App from './App.tsx';

const queryClient = new QueryClient();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>,
);
