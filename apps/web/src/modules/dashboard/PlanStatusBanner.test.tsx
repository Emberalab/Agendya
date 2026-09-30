import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import type { ProfessionalProfile } from '@agendya/types';
import { PlanStatusBanner } from './PlanStatusBanner';

const DAY = 24 * 60 * 60 * 1000;

const PROFILE: ProfessionalProfile = {
  id: '11111111-1111-4111-8111-111111111111',
  email: 'pro@example.com',
  businessName: 'Salón',
  slug: 'salon',
  category: null,
  photoUrl: null,
  logoUrl: null,
  coverImageUrl: null,
  brandColor: null,
  description: null,
  timezone: 'America/Bogota',
  cancellationPolicyHours: 24,
  plan: 'FREE',
  billingInterval: null,
  planExpiresAt: null,
  planCancelledAt: null,
  effectivePlan: 'FREE',
  trial: null,
  bookingsThisMonth: 0,
  serviceCount: 0,
  monthlyBookingLimit: 100,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

function renderBanner(profile: ProfessionalProfile) {
  return render(
    <MemoryRouter>
      <PlanStatusBanner profile={profile} />
    </MemoryRouter>,
  );
}

describe('PlanStatusBanner', () => {
  it('renders nothing for a plain FREE account', () => {
    const { container } = renderBanner(PROFILE);
    expect(container).toBeEmptyDOMElement();
  });

  it('tells the professional they have full access and when the trial ends', () => {
    renderBanner({
      ...PROFILE,
      effectivePlan: 'BUSINESS',
      monthlyBookingLimit: null,
      trial: {
        startedAt: new Date(Date.now() - 18 * DAY).toISOString(),
        endsAt: new Date(Date.now() + 11.5 * DAY).toISOString(),
        active: true,
      },
    });
    expect(
      screen.getByText(
        'Estás disfrutando de acceso completo durante tu período de prueba.',
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent(/termina en 12 días/);
  });

  it('trusts the server flag: no banner for an ended trial', () => {
    const { container } = renderBanner({
      ...PROFILE,
      trial: {
        startedAt: new Date(Date.now() - 40 * DAY).toISOString(),
        endsAt: new Date(Date.now() - 10 * DAY).toISOString(),
        active: false,
      },
    });
    expect(container).toBeEmptyDOMElement();
  });
});
