import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import App from './App';

describe('App', () => {
  it('redirects an unauthenticated visitor to the login page', async () => {
    const queryClient = new QueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>,
    );

    // The login route is lazily loaded (see AppRouter), so it arrives after a
    // dynamic import() rather than synchronously. Allow well beyond Testing
    // Library's 1s default: under the full parallel suite that chunk (Zod +
    // react-hook-form + the waitlist form) can take over a second to load.
    expect(
      await screen.findByRole(
        'heading',
        { name: 'Inicia sesión' },
        { timeout: 5000 },
      ),
    ).toBeInTheDocument();
  });
});
