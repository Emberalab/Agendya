import { PrismaService } from '../../database/prisma.service';

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

  return base || 'profesional';
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
