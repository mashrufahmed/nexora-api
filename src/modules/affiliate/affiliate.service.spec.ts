import { BadRequestException } from '@nestjs/common';
import { AffiliateService } from './affiliate.service.js';

describe('AffiliateService', () => {
  const audit = { log: async () => undefined } as never;
  const access = { assertSiteAccess: async () => undefined } as never;

  it('rejects private destination URLs', async () => {
    const prisma = {
      siteProduct: { findFirst: async () => null },
      merchant: { findUnique: async () => ({ id: 'merchant-1' }) },
      affiliateLink: { create: async () => undefined },
    } as never;
    const service = new AffiliateService(prisma, audit, { add: async () => undefined } as never, access);
    await expect(service.createLink({ siteId: 'site-1', merchantId: 'merchant-1', destinationUrl: 'http://127.0.0.1/admin', status: 'ACTIVE' }, 'admin-1')).rejects.toBeInstanceOf(BadRequestException);
  });

  it('queues an active redirect and hashes the user agent', async () => {
    const add = vi.fn(async () => undefined);
    const prisma = {
      affiliateLink: { findFirst: async () => ({ id: 'link-1', siteId: 'site-1', destinationUrl: 'https://merchant.example/item' }) },
    } as never;
    const service = new AffiliateService(prisma, audit, { add } as never, access);
    await expect(service.redirect('link-1', 'https://example.com', 'test-agent')).resolves.toEqual({ url: 'https://merchant.example/item' });
    expect(add).toHaveBeenCalledWith('record', expect.objectContaining({ affiliateLinkId: 'link-1', siteId: 'site-1', referrer: 'https://example.com', userAgentHash: expect.any(String) }), expect.objectContaining({ attempts: 3 }));
  });
});