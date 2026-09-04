// Seeds a handful of example services for one professional.
//
//   node --env-file=.env prisma/seed-services.mjs                 # first professional
//   node --env-file=.env prisma/seed-services.mjs pro@example.com # by email
//
// Safe to re-run: services whose name already exists (non-deleted) are skipped.

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const pesos = (n) => n * 100;

const EXAMPLES = [
  {
    name: 'Corte de cabello',
    description:
      'Corte clásico o moderno adaptado a tus facciones, incluye lavado y peinado rápido para un acabado impecable.',
    durationMinutes: 40,
    priceCents: pesos(20000),
    isActive: true,
    homeServiceEnabled: true,
    homeDurationMinutes: 90,
    homePriceCents: pesos(50000),
  },
  {
    name: 'Tinte completo',
    description:
      'Aplicación de color global de alta calidad con protección para tu cabello.',
    durationMinutes: 90,
    priceCents: pesos(85000),
    isActive: true,
    homeServiceEnabled: true,
    homeDurationMinutes: 120,
    homePriceCents: pesos(110000),
  },
  {
    name: 'Manicure básico',
    description:
      'Cuidado de uñas, remoción de cutícula, exfoliación y esmaltado tradicional.',
    durationMinutes: 30,
    priceCents: pesos(15000),
    isActive: false,
    homeServiceEnabled: true,
    homeDurationMinutes: 45,
    homePriceCents: pesos(22000),
  },
  {
    name: 'Corte y barba',
    description:
      'Servicio premium que combina corte de cabello estilizado y perfilado de barba.',
    durationMinutes: 50,
    priceCents: pesos(25000),
    isActive: true,
    homeServiceEnabled: true,
    homeDurationMinutes: 80,
    homePriceCents: pesos(40000),
  },
];

async function main() {
  const email = process.argv[2];
  const professional = email
    ? await prisma.professional.findUnique({ where: { email } })
    : await prisma.professional.findFirst({ orderBy: { createdAt: 'asc' } });

  if (!professional) {
    throw new Error(
      email
        ? `No professional found with email ${email}`
        : 'No professionals in the database — register one first.',
    );
  }

  const existing = await prisma.service.findMany({
    where: { professionalId: professional.id, deletedAt: null },
    select: { name: true },
  });
  const taken = new Set(existing.map((s) => s.name));
  let sortOrder = existing.length;

  for (const example of EXAMPLES) {
    if (taken.has(example.name)) {
      console.log(`• skipped "${example.name}" (already exists)`);
      continue;
    }
    await prisma.service.create({
      data: { ...example, professionalId: professional.id, sortOrder: sortOrder++ },
    });
    console.log(`✓ created "${example.name}"`);
  }

  console.log(`\nDone for ${professional.email}.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
