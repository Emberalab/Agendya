import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { RegisterPage } from './RegisterPage';

vi.mock('./hooks/useRegister', () => ({
  useRegister: () => ({
    mutate: vi.fn(),
    isPending: false,
    isError: false,
    error: null,
  }),
}));

function renderPage(initialEntry = '/register') {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialEntry]}>
        <RegisterPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('RegisterPage', () => {
  it('explains swapped business name and email fields', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.type(
      screen.getByLabelText('Nombre de tu negocio *'),
      'info@agendya.co',
    );
    await user.type(
      screen.getByLabelText('Correo electrónico *'),
      'AgendyaSuperAdmin',
    );
    await user.type(screen.getByLabelText('Contraseña *'), 'secret123');
    await user.click(
      screen.getByRole('checkbox', {
        name: /acepto los términos/i,
      }),
    );
    await user.click(
      screen.getByRole('button', { name: 'Crear cuenta gratis' }),
    );

    expect(
      await screen.findByText(/esto parece un correo/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/aquí va el correo/i)).toBeInTheDocument();
    expect(
      screen.getByText(/revisa los campos marcados/i),
    ).toBeInTheDocument();
  });

  it('asks to accept the terms when the rest of the form is valid', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.type(
      screen.getByLabelText('Nombre de tu negocio *'),
      'María Belleza',
    );
    await user.type(
      screen.getByLabelText('Correo electrónico *'),
      'maria@salon.com',
    );
    await user.type(screen.getByLabelText('Contraseña *'), 'secret123');
    await user.click(
      screen.getByRole('button', { name: 'Crear cuenta gratis' }),
    );

    expect(
      await screen.findByText(/marca la casilla para aceptar los términos/i),
    ).toBeInTheDocument();
  });

  it('prefills the email from the query string', () => {
    renderPage('/register?email=mimiyin%40ynnord.top');

    expect(screen.getByLabelText('Correo electrónico *')).toHaveValue(
      'mimiyin@ynnord.top',
    );
  });
});
