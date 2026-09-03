/**
 * Builds a structurally valid but unsigned JWT. The frontend only base64-decodes
 * the payload (`GoogleCallbackPage`) and never verifies the signature, so this is
 * enough to stand in for a real access token in E2E runs. Not a secret.
 */
export function makeFakeJwt(payload: Record<string, unknown>): string {
  const encode = (value: unknown): string =>
    Buffer.from(JSON.stringify(value))
      .toString('base64')
      .replace(/=+$/, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');

  const nowSeconds = Math.floor(Date.now() / 1000);

  return [
    encode({ alg: 'HS256', typ: 'JWT' }),
    encode({ iat: nowSeconds, exp: nowSeconds + 60 * 60 * 24 * 7, ...payload }),
    'e2e-not-a-real-signature',
  ].join('.');
}
