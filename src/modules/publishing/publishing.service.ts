import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service.js';
import { AuditService } from '../audit/audit.service.js';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@Injectable()
export class PublishingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    @InjectQueue('scheduled-publishing') private readonly queue: Queue,
  ) {}
  private async access(uid: string, sid: string) {
    const a = await this.prisma.adminUser.findUnique({
      where: { id: uid },
      select: { roles: { select: { role: { select: { name: true } } } } },
    });
    if (a?.roles.some(({ role }) => role.name === 'Super Admin')) return;
    if (
      !(await this.prisma.userSiteAccess.findUnique({
        where: { userId_siteId: { userId: uid, siteId: sid } },
        select: { id: true },
      }))
    )
      throw new ForbiddenException('You do not have access to this site');
  }
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
    const content = await this.prisma.content.findUnique({
      where: { id },
      select: { status: true },
    });
    if (!content) throw new NotFoundException('Content not found');
    if (!['IN_REVIEW', 'DRAFT'].includes(content.status))
      throw new BadRequestException(
        'Only draft or review content can be scheduled',
      );
    const siteContent = await this.prisma.siteContent.findUnique({
      where: { siteId_contentId: { siteId, contentId: id } },
      select: { id: true },
    });
    if (!siteContent)
      throw new BadRequestException('Content is not published for this site');
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
      });
    return { published: due.length };
  }
}
