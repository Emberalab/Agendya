import { describe, expect, it } from 'vitest';
import { cloudinaryImageUrl } from './cloudinary';

const BASE =
  'https://res.cloudinary.com/demo/image/upload/v1699999999/agendya/cover_abc.jpg';

describe('cloudinaryImageUrl', () => {
  it('injects f_auto,q_auto for a plain delivery URL', () => {
    expect(cloudinaryImageUrl(BASE)).toBe(
      'https://res.cloudinary.com/demo/image/upload/f_auto,q_auto/v1699999999/agendya/cover_abc.jpg',
    );
  });

  it('adds a width cap when asked', () => {
    expect(cloudinaryImageUrl(BASE, { width: 800 })).toBe(
      'https://res.cloudinary.com/demo/image/upload/f_auto,q_auto,c_limit,w_800/v1699999999/agendya/cover_abc.jpg',
    );
  });

  it('rounds a fractional width', () => {
    expect(cloudinaryImageUrl(BASE, { width: 175.5 })).toContain('w_176');
  });

  it('leaves an already-transformed URL alone', () => {
    const transformed =
      'https://res.cloudinary.com/demo/image/upload/f_auto,q_auto/v1/x.jpg';
    expect(cloudinaryImageUrl(transformed)).toBe(transformed);
  });

  it('passes through non-Cloudinary URLs', () => {
    expect(cloudinaryImageUrl('blob:http://localhost/abc-123')).toBe(
      'blob:http://localhost/abc-123',
    );
    expect(cloudinaryImageUrl('https://example.com/a/image/upload/x.jpg')).toBe(
      'https://example.com/a/image/upload/x.jpg',
    );
  });

  it('passes through an empty string', () => {
    expect(cloudinaryImageUrl('')).toBe('');
  });
});
