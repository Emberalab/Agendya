import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { LegalPage } from './LegalPage';

import type { LegalSection } from './content/terms';

describe('LegalPage', () => {
  const mockSections: LegalSection[] = [
    {
      title: '1. Introducción',
      content: [
        'Este es un texto de prueba.',
        ['Item de lista 1', 'Item de lista 2'],
      ],
    },
    {
      title: '2. Sección con subsecciones',
      content: [
        {
          title: '2.1 Subsección',
          items: ['Subitem 1', 'Subitem 2'],
        },
      ],
    },
  ];

  it('should render title', () => {
    render(
      <MemoryRouter>
        <LegalPage
          title="Términos de uso"
          sections={mockSections}
          lastUpdated="27 de septiembre de 2026"
        />
      </MemoryRouter>,
    );

    expect(screen.getByText('Términos de uso')).toBeInTheDocument();
  });

  it('should render last updated date', () => {
    render(
      <MemoryRouter>
        <LegalPage
          title="Política de privacidad"
          sections={mockSections}
          lastUpdated="27 de septiembre de 2026"
        />
      </MemoryRouter>,
    );

    expect(screen.getByText(/27 de septiembre de 2026/)).toBeInTheDocument();
  });

  it('should render section titles', () => {
    render(
      <MemoryRouter>
        <LegalPage
          title="Términos"
          sections={mockSections}
          lastUpdated="2026-09-27"
        />
      </MemoryRouter>,
    );

    expect(screen.getByText('1. Introducción')).toBeInTheDocument();
    expect(screen.getByText('2. Sección con subsecciones')).toBeInTheDocument();
  });

  it('should render paragraph content', () => {
    render(
      <MemoryRouter>
        <LegalPage
          title="Términos"
          sections={mockSections}
          lastUpdated="2026-09-27"
        />
      </MemoryRouter>,
    );

    expect(screen.getByText('Este es un texto de prueba.')).toBeInTheDocument();
  });

  it('should render list items', () => {
    render(
      <MemoryRouter>
        <LegalPage
          title="Términos"
          sections={mockSections}
          lastUpdated="2026-09-27"
        />
      </MemoryRouter>,
    );

    expect(screen.getByText('Item de lista 1')).toBeInTheDocument();
    expect(screen.getByText('Item de lista 2')).toBeInTheDocument();
  });

  it('should render subsections with nested lists', () => {
    render(
      <MemoryRouter>
        <LegalPage
          title="Términos"
          sections={mockSections}
          lastUpdated="2026-09-27"
        />
      </MemoryRouter>,
    );

    expect(screen.getByText('2.1 Subsección')).toBeInTheDocument();
    expect(screen.getByText('Subitem 1')).toBeInTheDocument();
    expect(screen.getByText('Subitem 2')).toBeInTheDocument();
  });

  it('should have a back button', () => {
    render(
      <MemoryRouter>
        <LegalPage
          title="Términos"
          sections={mockSections}
          lastUpdated="2026-09-27"
        />
      </MemoryRouter>,
    );

    expect(screen.getByRole('button', { name: /volver/i })).toBeInTheDocument();
  });
});
