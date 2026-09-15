// Provisions the first Backoffice SUPER_ADMIN. There is no self-registration
// or bootstrap UI for InternalUser by design (see the Backoffice plan) — this
// is the one-time manual step, after which that SUPER_ADMIN creates every
// other internal account from the Backoffice "Internal Users" screen.
//
// Safe to re-run: an existing user with the given email just gets their
// password reset and role confirmed as SUPER_ADMIN, nothing is duplicated.
//
//   node --env-file=.env scripts/seed-backoffice.mjs <email> <name> <password>
//
// Example:
//   node --env-file=.env scripts/seed-backoffice.mjs jorge@agendya.app "Jorge Herrera" 'a-strong-password'

import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import bcrypt from 'bcrypt';

const [, , email, name, password] = process.argv;

if (!email || !name || !password) {
  console.error(
    'Uso: node --env-file=.env scripts/seed-backoffice.mjs <email> <nombre> <contraseña>',
  );
  process.exit(1);
}
if (password.length < 8) {
  console.error('La contraseña debe tener al menos 8 caracteres.');
  process.exit(1);
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

async function main() {
  const passwordHash = await bcrypt.hash(password, 10);
  const normalizedEmail = email.trim().toLowerCase();

  const user = await prisma.internalUser.upsert({
    where: { email: normalizedEmail },
    update: { passwordHash, name, role: 'SUPER_ADMIN', isActive: true },
    create: {
      email: normalizedEmail,
      name,
      passwordHash,
      role: 'SUPER_ADMIN',
      isActive: true,
    },
  });

  console.log(`Listo: ${user.email} es SUPER_ADMIN del Backoffice.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
