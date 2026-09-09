// Web Push diagnostic. Reads the configured VAPID keys and every stored
// `PushSubscription`, then sends a real test notification to each device and
// prints the exact push-service response. Also lists the most recent
// `Notification` rows so you can confirm a booking actually created one.
//
//   node apps/api/scripts/push-doctor.mjs            # dry run: list only
//   node apps/api/scripts/push-doctor.mjs --send     # also send a test push
//
// Safe: the test push only goes to devices already registered for this account.
import { config } from 'dotenv';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import webpush from 'web-push';

const here = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(here, '../.env') });

const send = process.argv.includes('--send');
const pub = process.env.VAPID_PUBLIC_KEY;
const priv = process.env.VAPID_PRIVATE_KEY;
const subject = process.env.VAPID_SUBJECT ?? 'mailto:soporte@agendya.app';

console.log('VAPID_PUBLIC_KEY :', pub ? `set (${pub.length} chars)` : 'MISSING');
console.log('VAPID_PRIVATE_KEY:', priv ? `set (${priv.length} chars)` : 'MISSING');
console.log('VAPID_SUBJECT    :', subject);
if (!pub || !priv) {
  console.error('\n-> Push is DISABLED server-side. Set the keys in apps/api/.env and restart the API.');
  process.exit(1);
}
webpush.setVapidDetails(subject, pub, priv);

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const subs = await prisma.pushSubscription.findMany({
  orderBy: { createdAt: 'desc' },
  include: { professional: { select: { email: true, slug: true } } },
});

console.log(`\n${subs.length} PushSubscription row(s):`);
for (const s of subs) {
  const host = (() => {
    try {
      return new URL(s.endpoint).host;
    } catch {
      return '(bad endpoint)';
    }
  })();
  console.log(
    `  • ${host}  prof=${s.professional?.email ?? s.professionalId} slug=${s.professional?.slug ?? '?'}\n` +
      `    ua=${s.userAgent ?? '—'}  created=${s.createdAt.toISOString()}  lastActive=${s.lastActiveAt.toISOString()}`,
  );
}

const notifs = await prisma.notification.findMany({
  orderBy: { createdAt: 'desc' },
  take: 8,
  include: { professional: { select: { email: true } } },
});
console.log(`\nLast ${notifs.length} Notification row(s):`);
for (const n of notifs) {
  console.log(
    `  • ${n.createdAt.toISOString()}  ${n.type}  prof=${n.professional?.email}  "${n.title} — ${n.body}"  read=${n.readAt ? 'yes' : 'no'}`,
  );
}

if (!send) {
  console.log('\n(dry run — pass --send to deliver a test push to each device)');
  await prisma.$disconnect();
  process.exit(0);
}

const payload = JSON.stringify({
  title: 'Agendya — prueba de push',
  body: 'Si ves esto en el iPhone, Web Push funciona 🎉',
  notificationId: '00000000-0000-0000-0000-000000000000',
  bookingId: '00000000-0000-0000-0000-000000000000',
  startAt: new Date().toISOString(),
});

for (const s of subs) {
  const target = { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } };
  try {
    const res = await webpush.sendNotification(target, payload, { TTL: 60 });
    console.log(`\n[OK ${res.statusCode}] ${new URL(s.endpoint).host}`);
  } catch (err) {
    console.log(
      `\n[FAIL ${err?.statusCode ?? '?'}] ${(() => {
        try {
          return new URL(s.endpoint).host;
        } catch {
          return s.endpoint;
        }
      })()}`,
    );
    console.log('  body   :', String(err?.body ?? '').trim() || '(none)');
    console.log('  headers:', JSON.stringify(err?.headers ?? {}));
  }
}

await prisma.$disconnect();
