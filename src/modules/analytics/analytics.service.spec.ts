import { AnalyticsService } from './analytics.service.js';

describe('AnalyticsService', () => {
  it('combines event and affiliate click counts for a site', async () => {
    const prisma = { analyticsEvent: { count: vi.fn().mockResolvedValueOnce(4).mockResolvedValueOnce(2) }, affiliateClick: { count: vi.fn().mockResolvedValue(3) } } as never;
    const service = new AnalyticsService(prisma, { assertSiteAccess: vi.fn(async () => undefined) } as never);
    await expect(service.summary('site-1', 'admin-1')).resolves.toEqual({ pageViews: 4, affiliateClicks: 5 });
  });
});