import { BadRequestException } from '@nestjs/common';
import { PublishingService } from './publishing.service.js';

describe('PublishingService', () => {
  const access = { assertSiteAccess: vi.fn(async () => undefined) } as never;
  const audit = { log: vi.fn(async () => undefined) } as never;

  it('rejects scheduling content that is already scheduled for the site', async () => {
    const prisma = { siteContent: { findUnique: vi.fn(async () => ({ id: 'site-content-1', status: 'SCHEDULED', scheduledAt: new Date() })) } } as never;
    const service = new PublishingService(prisma, audit, { add: vi.fn() } as never, access);
    await expect(service.scheduleContent('content-1', 'site-1', new Date(Date.now() + 60_000).toISOString(), 'admin-1')).rejects.toBeInstanceOf(BadRequestException);
  });

  it('queues a future site content publication', async () => {
    const add = vi.fn(async () => undefined);
    const tx = { content: { update: vi.fn() }, siteContent: { update: vi.fn(async () => ({ id: 'site-content-1', status: 'SCHEDULED' })) } };
    const prisma = { siteContent: { findUnique: vi.fn(async () => ({ id: 'site-content-1', status: 'DRAFT', scheduledAt: null })) }, $transaction: vi.fn(async (callback: (value: typeof tx) => unknown) => callback(tx)) } as never;
    const service = new PublishingService(prisma, audit, { add } as never, access);
    await expect(service.scheduleContent('content-1', 'site-1', new Date(Date.now() + 60_000).toISOString(), 'admin-1')).resolves.toMatchObject({ id: 'site-content-1' });
    expect(add).toHaveBeenCalledWith('publish-due', { limit: 100, siteContentId: 'site-content-1' }, expect.objectContaining({ delay: expect.any(Number), jobId: 'publish-due:site-content-1' }));
  });
});