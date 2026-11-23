import { NewsletterService } from './newsletter.service.js';

describe('NewsletterService', () => {
  it('returns an anti-enumeration response after sending confirmation', async () => {
    const prisma = {
      newsletterSubscriber: {
        upsert: vi.fn().mockResolvedValue({ id: 'subscriber-1' }),
      },
    } as never;
    const verification = {
      issue: vi.fn().mockResolvedValue('verification-token'),
    } as never;
    const mail = { sendMail: vi.fn().mockResolvedValue(undefined) } as never;
    const service = new NewsletterService(
      prisma,
      { log: vi.fn() } as never,
      verification,
      mail,
      { assertSiteAccess: vi.fn() } as never,
      undefined,
    );
    await expect(
      service.subscribe({ siteId: 'site-1', email: 'person@example.com' }),
    ).resolves.toEqual({
      message: expect.stringContaining('confirmation'),
    });
  });
});
