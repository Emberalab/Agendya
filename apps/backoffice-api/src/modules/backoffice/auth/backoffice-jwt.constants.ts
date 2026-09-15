/**
 * Audience claim stamped on every Backoffice JWT. This — not just a
 * different secret or lookup table — is what stops a customer-facing
 * (`Professional`) token from being accepted by `/backoffice/*` routes:
 * passport-jwt checks the `aud` claim before `InternalJwtStrategy.validate`
 * ever runs, and the professional-facing `JwtStrategy` never sets this
 * audience when it signs a token.
 */
export const BACKOFFICE_JWT_AUDIENCE = 'agendya-backoffice';
