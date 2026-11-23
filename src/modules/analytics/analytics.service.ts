import { BadRequestException, Injectable } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { PrismaService } from '../../database/prisma.service.js';
import { AnalyticsEventDto } from './dto/analytics.dto.js';
import { SiteAccessService } from '../site-access/site-access.service.js';
@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService, private readonly siteAccess: SiteAccessService) {}
  private access(uid: string, sid: string) { return this.siteAccess.assertSiteAccess(uid, sid); }
  async record(d: AnalyticsEventDto) {
    return this.prisma.analyticsEvent.create({
      data: {
        siteId: d.siteId,
        type: d.type,
        path: d.path,
        entityType: d.entityType,
        entityId: d.entityId,
        referrer: d.referrer,
        userAgentHash: d.userAgent
          ? createHash('sha256').update(d.userAgent).digest('hex')
          : undefined,
      },
    });
  }
  async summary(siteId: string, uid: string) {
    await this.access(uid, siteId);
    const [pageViews, affiliateEvents, clicks] = await Promise.all([
      this.prisma.analyticsEvent.count({
        where: { siteId, type: 'PAGE_VIEW' },
      }),
      this.prisma.analyticsEvent.count({
        where: { siteId, type: 'AFFILIATE_CLICK' },
      }),
      this.prisma.affiliateClick.count({ where: { siteId } }),
    ]);
    return { pageViews, affiliateClicks: affiliateEvents + clicks };
  }
  async report(siteId: string, uid: string, from?: string, to?: string) {
    await this.access(uid, siteId);
    const start = from ? new Date(from) : new Date(0);
    const end = to ? new Date(to) : new Date();
    if (start > end) throw new BadRequestException('Analytics start must precede end');
    const [events, clicks] = await Promise.all([
      this.prisma.analyticsEvent.groupBy({
        by: ['type', 'path'],
        where: { siteId, occurredAt: { gte: start, lte: end } },
        _count: { _all: true },
      }),
      this.prisma.affiliateClick.groupBy({
        by: ['affiliateLinkId'],
        where: { siteId, clickedAt: { gte: start, lte: end } },
        _count: { _all: true },
      }),
    ]);
    return { from: start, to: end, events, affiliateClicks: clicks };
  }
}
