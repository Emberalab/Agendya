import { describe, expect, it } from 'vitest';
import { publicBookingUrl, publicSiteOrigin } from './publicSiteUrl';

describe('publicSiteOrigin', () => {
  it('falls back to window.location.origin when VITE_PUBLIC_SITE_URL is unset', () => {
    expect(publicSiteOrigin()).toBe(window.location.origin);
  });
});

describe('publicBookingUrl', () => {
  it('joins origin and slug without a double slash', () => {
    expect(publicBookingUrl('maria-belleza')).toBe(
      `${window.location.origin}/maria-belleza`,
    );
  });
});
