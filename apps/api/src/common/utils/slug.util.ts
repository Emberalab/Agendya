import { PrismaService } from '../../database/prisma.service';
import { isReservedSlug } from '@agendya/types';

export function slugify(text: string): string {
  const base = text
    .normalize('NFD')
    .replace(
      new RegExp(
        `[${String.fromCharCode(0x0300)}-${String.fromCharCode(0x036f)}]`,
        'g',
      ),
      '',
    )
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50);

  const slug = base || 'profesional';

  // If the slug is reserved, append "-negocio" to make it valid

  if (isReservedSlug(slug)) {
    return `${slug}-negocio`;
  }

  return slug;
}

export async function ensureUniqueSlug(
  prisma: PrismaService,
  baseSlug: string,
  excludeProfessionalId?: string,
): Promise<string> {
  let candidate = baseSlug;
  let suffix = 1;

  while (
    await prisma.professional.findFirst({
      where: {
        slug: candidate,
        ...(excludeProfessionalId
          ? { id: { not: excludeProfessionalId } }
          : {}),
      },
    })
  ) {
    suffix += 1;
    candidate = `${baseSlug}-${suffix}`;
  }

  return candidate;
}
