import { UnauthorizedException } from '@nestjs/common';
import { PublicAuthGuard } from './public-auth.guard.js';

const context = (request: { headers: Record<string, string> }) => ({
  switchToHttp: () => ({ getRequest: () => request, getResponse: () => ({ header: vi.fn() }) }),
}) as never;

describe('PublicAuthGuard', () => {
  it('requires authentication headers', async () => {
    const guard = new PublicAuthGuard({ get: () => undefined } as never, {} as never);
    await expect(guard.canActivate(context({ headers: {} }))).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('uses the internal service key and X-Site-Host', async () => {
    const site = { id: 'site-1', slug: 'example', status: 'ACTIVE' };
    const guard = new PublicAuthGuard({ get: (key: string) => key === 'PUBLIC_SERVICE_KEY' ? 'internal-key' : undefined } as never, { resolveHostname: vi.fn().mockResolvedValue(site) } as never);
    const request = { headers: { 'x-service-key': 'internal-key', 'x-site-host': 'example.com' } };
    await expect(guard.canActivate(context(request))).resolves.toBe(true);
    expect(request).toHaveProperty('site', site);
  });
});