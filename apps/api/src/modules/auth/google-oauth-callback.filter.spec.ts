import {
  ArgumentsHost,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { GoogleOauthCallbackFilter } from './google-oauth-callback.filter';
import { WAITLIST_REQUIRED_CODE } from './professional-allowlist';

function hostFor(user?: { email: string }) {
  const redirect = jest.fn();
  const host = {
    switchToHttp: () => ({
      getResponse: () => ({ redirect }),
      getRequest: () => ({ user }),
    }),
  } as unknown as ArgumentsHost;
  return { host, redirect };
}

describe('GoogleOauthCallbackFilter', () => {
  const previous = process.env.WEB_URL;
  const filter = new GoogleOauthCallbackFilter();

  beforeEach(() => {
    process.env.WEB_URL = 'http://localhost:5173';
  });

  afterAll(() => {
    if (previous === undefined) {
      delete process.env.WEB_URL;
    } else {
      process.env.WEB_URL = previous;
    }
  });

  it('sends waitlisted Google users to the in-app waitlist with their email', () => {
    const { host, redirect } = hostFor({ email: 'intruso@gmail.com' });
    filter.catch(
      new ForbiddenException({
        code: WAITLIST_REQUIRED_CODE,
        message: 'lista de espera',
      }),
      host,
    );
    expect(redirect).toHaveBeenCalledWith(
      'http://localhost:5173/register?waitlist=1&email=intruso%40gmail.com',
    );
  });

  it('sends a broken OAuth callback to login instead of JSON', () => {
    const { host, redirect } = hostFor();
    filter.catch(
      new ForbiddenException('Solicitud de autenticación inválida.'),
      host,
    );
    expect(redirect).toHaveBeenCalledWith(
      'http://localhost:5173/login?error=oauth',
    );
  });

  it('treats a failed Google token exchange as a login error', () => {
    const { host, redirect } = hostFor();
    filter.catch(new UnauthorizedException(), host);
    expect(redirect).toHaveBeenCalledWith(
      'http://localhost:5173/login?error=oauth',
    );
  });
});
