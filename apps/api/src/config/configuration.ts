export default () => ({
  port: parseInt(process.env.PORT ?? '4000', 10),
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN ?? '7d',
  },
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackUrl: process.env.GOOGLE_CALLBACK_URL ?? 'http://localhost:4000/auth/google/callback',
  },
  slotGridMinutes: parseInt(process.env.SLOT_GRID_MINUTES ?? '15', 10),
  resendApiKey: process.env.RESEND_API_KEY,
  cloudinaryUrl: process.env.CLOUDINARY_URL,
  webUrl: process.env.WEB_URL ?? 'http://localhost:5173',
});
