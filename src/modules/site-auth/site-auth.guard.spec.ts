import { UnauthorizedException } from '@nestjs/common';
import { SiteAuthGuard } from './site-auth.guard.js';

function context(headers: Record<string, string | undefined>) {
  return {
    switchToHttp: () => ({ getRequest: () => ({ headers }) }),
  } as never;
}

describe('SiteAuthGuard', () => {
  it('rejects requests without a site key', async () => {
    const sites = { authenticatePublicSite: vi.fn() };
    const guard = new SiteAuthGuard(sites as never);

    await expect(guard.canActivate(context({ host: 'example.com' }))).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(sites.authenticatePublicSite).not.toHaveBeenCalled();
  });

  it('authenticates and attaches the resolved site', async () => {
    const site = { id: 'site-1', slug: 'example', status: 'ACTIVE' };
    const sites = { authenticatePublicSite: vi.fn().mockResolvedValue(site) };
    const request = { headers: { host: 'Example.com:443', 'x-site-key': 'secret' } };
    const context = { switchToHttp: () => ({ getRequest: () => request }) } as never;
    const guard = new SiteAuthGuard(sites as never);

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(sites.authenticatePublicSite).toHaveBeenCalledWith('Example.com', 'secret');
    expect(request).toHaveProperty('site', site);
  });
});