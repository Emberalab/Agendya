export default () => ({
  port: parseInt(process.env.PORT ?? '4000', 10),
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN ?? '7d',
  },
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackUrl:
      process.env.GOOGLE_CALLBACK_URL ??
      'http://localhost:4000/auth/google/callback',
  },
  slotGridMinutes: parseInt(process.env.SLOT_GRID_MINUTES ?? '15', 10),
  resendApiKey: process.env.RESEND_API_KEY,
  cloudinaryUrl: process.env.CLOUDINARY_URL,
  webUrl: (process.env.WEB_URL ?? 'http://localhost:5173').replace(/\/+$/, ''),
  // Public booking origin (`agendya.co`). Empty locally / on hosted-dev where
  // the dashboard and `/:slug` share one host. Used for CORS and cancel links.
  publicWebUrl: (process.env.PUBLIC_WEB_URL ?? '').replace(/\/+$/, ''),
  // Web Push (VAPID). All three must be set for push delivery to be active;
  // with any missing, the push endpoints report "disabled" and the notification
  // feed simply falls back to SSE + the persisted row. Generate a keypair with
  // `npx web-push generate-vapid-keys`.
  webPush: {
    publicKey: process.env.VAPID_PUBLIC_KEY,
    privateKey: process.env.VAPID_PRIVATE_KEY,
    // `mailto:` (or https) contact the push service can reach if a payload
    // misbehaves — required by the Web Push spec.
    subject: process.env.VAPID_SUBJECT ?? 'mailto:soporte@agendya.app',
  },
});
