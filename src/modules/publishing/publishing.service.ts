import {
  BadRequestException,
  Injectable,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service.js';
import { AuditService } from '../audit/audit.service.js';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { SiteAccessService } from '../site-access/site-access.service.js';

@Injectable()
export class PublishingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    @InjectQueue('scheduled-publishing') private readonly queue: Queue,
    private readonly siteAccess: SiteAccessService,
  ) {}
  private access(uid: string, sid: string) { return this.siteAccess.assertSiteAccess(uid, sid); }
  async scheduleContent(
    id: string,
    siteId: string,
    scheduledAt: string,
    uid: string,
  ) {
    await this.access(uid, siteId);
    const date = new Date(scheduledAt);
    if (date <= new Date())
      throw new BadRequestException('Scheduled time must be in the future');
    const siteContent = await this.prisma.siteContent.findUnique({
      where: { siteId_contentId: { siteId, contentId: id } },
      select: { id: true, status: true, scheduledAt: true },
    });
    if (!siteContent)
      throw new BadRequestException('Content is not published for this site');
    if (!['IN_REVIEW', 'DRAFT'].includes(siteContent.status))
      throw new BadRequestException('Only draft or review content can be scheduled');
    if (siteContent.scheduledAt)
      throw new BadRequestException('Content is already scheduled for this site');
    const result = await this.prisma.$transaction(async (tx) => {
      await tx.content.update({ where: { id }, data: { status: 'SCHEDULED' } });
      return tx.siteContent.update({
        where: { id: siteContent.id },
        data: { status: 'SCHEDULED', scheduledAt: date },
      });
    });
    await this.queue.add('publish-due', { limit: 100 }, { delay: Math.max(0, date.getTime() - Date.now()), removeOnComplete: true, removeOnFail: 1000 });
    await this.audit.log({
      actorAdminId: uid,
      action: 'content.scheduled',
      entityType: 'site_content',
      entityId: result.id,
    });
    return result;
  }
  async publishDue(limit = 100) {
    const due = await this.prisma.siteContent.findMany({
      where: { status: 'SCHEDULED', scheduledAt: { lte: new Date() } },
      select: { id: true, contentId: true },
      take: limit,
    });
    for (const item of due)
      await this.prisma.$transaction(async (tx) => {
        await tx.siteContent.update({
          where: { id: item.id },
          data: {
            status: 'PUBLISHED',
            publishedAt: new Date(),
            scheduledAt: null,
          },
        });
        await tx.content.update({
          where: { id: item.contentId },
          data: { status: 'PUBLISHED' },
        });
        await this.audit.log({
          action: 'content.published_scheduled',
          entityType: 'site_content',
          entityId: item.id,
          metadata: { contentId: item.contentId },
        });
      });
    return { published: due.length };
  }
}
