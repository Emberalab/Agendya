import { PrismaService } from '../../database/prisma.service';
import { ensureUniqueSlug, slugify } from './slug.util';

describe('slugify', () => {
  it('lowercases and hyphenates a business name', () => {
    expect(slugify('María Belleza')).toBe('maria-belleza');
  });

  it('strips accents and special characters', () => {
    expect(slugify('Peluquería Ñañez & Co.')).toBe('peluqueria-nanez-co');
  });

  it('falls back to a default when nothing alphanumeric remains', () => {
    expect(slugify('!!!')).toBe('profesional');
  });
});

describe('ensureUniqueSlug', () => {
  it('returns the base slug when it is not taken', async () => {
    const prisma = {
      professional: { findFirst: jest.fn().mockResolvedValue(null) },
    };

    const slug = await ensureUniqueSlug(
      prisma as unknown as PrismaService,
      'maria-belleza',
    );

    expect(slug).toBe('maria-belleza');
  });

  it('appends an incrementing suffix until a free slug is found', async () => {
    const findFirst = jest
      .fn()
      .mockResolvedValueOnce({ id: 'a' })
      .mockResolvedValueOnce({ id: 'b' })
      .mockResolvedValueOnce(null);
    const prisma = { professional: { findFirst } };

    const slug = await ensureUniqueSlug(
      prisma as unknown as PrismaService,
      'maria-belleza',
    );

    expect(slug).toBe('maria-belleza-3');
    expect(findFirst).toHaveBeenCalledTimes(3);
  });
});
