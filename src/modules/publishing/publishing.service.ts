import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service.js';
import { AuditService } from '../audit/audit.service.js';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { SiteAccessService } from '../site-access/site-access.service.js';
import { UpdatePublicationDto } from './dto/update-publication.dto.js';

@Injectable()
export class PublishingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    @InjectQueue('scheduled-publishing') private readonly queue: Queue,
    private readonly siteAccess: SiteAccessService,
  ) {}
  private access(uid: string, sid: string) {
    return this.siteAccess.assertSiteAccess(uid, sid);
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
    const siteContent = await this.prisma.siteContent.findUnique({
      where: { siteId_contentId: { siteId, contentId: id } },
      select: { id: true, status: true, scheduledAt: true },
    });
    if (!siteContent)
      throw new BadRequestException('Content is not published for this site');
    if (!['DRAFT', 'IN_REVIEW', 'PUBLISHED'].includes(siteContent.status))
      throw new BadRequestException(
        'Only draft, review, or published content can be scheduled',
      );
    if (siteContent.scheduledAt)
      throw new BadRequestException(
        'Content is already scheduled for this site',
      );
    const result = await this.prisma.$transaction(async (tx) => {
      return tx.siteContent.update({
        where: { id: siteContent.id },
        data: { status: 'SCHEDULED', scheduledAt: date },
      });
    });
    await this.queue.add(
      'publish-due',
      { siteContentId: result.id, limit: 100 },
      {
        jobId: `publish-due:${result.id}`,
        delay: Math.max(0, date.getTime() - Date.now()),
        removeOnComplete: true,
        removeOnFail: 1000,
      },
    );
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
        const updated = await tx.siteContent.updateMany({
          where: { id: item.id, status: 'SCHEDULED' },
          data: {
            status: 'PUBLISHED',
            publishedAt: new Date(),
            scheduledAt: null,
          },
        });
        if (updated.count === 0) return;
        await this.audit.log({
          action: 'content.published_scheduled',
          entityType: 'site_content',
          entityId: item.id,
          metadata: { contentId: item.contentId },
        });
      });
    return { published: due.length };
  }

  async updatePublication(
    publicationId: string,
    dto: UpdatePublicationDto,
    uid: string,
  ) {
    const current = await this.prisma.siteContent.findUnique({
      where: { id: publicationId },
      include: { categories: true, tags: true },
    });
    if (!current) throw new BadRequestException('Publication not found');
    await this.access(uid, current.siteId);
    const slug = dto.slug?.trim().toLowerCase();
    if (slug && slug !== current.slug) {
      const existing = await this.prisma.redirect.findFirst({
        where: {
          siteId: current.siteId,
          fromPath: `/${slug}`,
          status: 'ACTIVE',
        },
      });
      if (existing)
        throw new BadRequestException(
          'Publication slug is already used by a redirect',
        );
    }
    const result = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.siteContent.update({
        where: { id: publicationId },
        data: {
          ...(slug !== undefined && { slug }),
          ...(dto.titleOverride !== undefined && {
            titleOverride: dto.titleOverride.trim(),
          }),
          ...(dto.descriptionOverride !== undefined && {
            excerptOverride: dto.descriptionOverride.trim(),
          }),
          ...(dto.seo !== undefined && {
            seoMetadata: JSON.parse(JSON.stringify(dto.seo)),
          }),
          ...(dto.isFeatured !== undefined && { isFeatured: dto.isFeatured }),
        },
      });
      if (dto.categoryIds) {
        await tx.siteContentCategory.deleteMany({
          where: { siteContentId: publicationId },
        });
        await tx.siteContentCategory.createMany({
          data: dto.categoryIds.map((categoryId) => ({
            siteContentId: publicationId,
            categoryId,
          })),
        });
      }
      if (dto.tagIds) {
        await tx.siteContentTag.deleteMany({
          where: { siteContentId: publicationId },
        });
        await tx.siteContentTag.createMany({
          data: dto.tagIds.map((tagId) => ({
            siteContentId: publicationId,
            tagId,
          })),
        });
      }
      if (slug && slug !== current.slug && current.status === 'PUBLISHED') {
        await tx.redirect.upsert({
          where: {
            siteId_fromPath: {
              siteId: current.siteId,
              fromPath: `/${current.slug}`,
            },
          },
          create: {
            siteId: current.siteId,
            fromPath: `/${current.slug}`,
            toPath: `/${slug}`,
            statusCode: 301,
          },
          update: { toPath: `/${slug}`, status: 'ACTIVE', statusCode: 301 },
        });
      }
      return updated;
    });
    await this.audit.log({
      actorAdminId: uid,
      action: 'publication.updated',
      entityType: 'site_content',
      entityId: publicationId,
    });
    return result;
  }

  async archivePublication(publicationId: string, uid: string) {
    const current = await this.prisma.siteContent.findUnique({
      where: { id: publicationId },
      select: { siteId: true, status: true },
    });
    if (!current) throw new BadRequestException('Publication not found');
    await this.access(uid, current.siteId);
    return this.prisma.siteContent.update({
      where: { id: publicationId },
      data: { status: 'ARCHIVED', scheduledAt: null },
    });
  }

  async republishPublication(publicationId: string, uid: string) {
    const current = await this.prisma.siteContent.findUnique({
      where: { id: publicationId },
      select: { siteId: true, status: true },
    });
    if (!current) throw new BadRequestException('Publication not found');
    await this.access(uid, current.siteId);
    return this.prisma.siteContent.update({
      where: { id: publicationId },
      data: { status: 'PUBLISHED', publishedAt: new Date(), scheduledAt: null },
    });
  }

  async unpublishPublication(publicationId: string, uid: string) {
    const current = await this.prisma.siteContent.findUnique({
      where: { id: publicationId },
      select: { siteId: true },
    });
    if (!current) throw new BadRequestException('Publication not found');
    await this.access(uid, current.siteId);
    await this.prisma.siteContent.delete({ where: { id: publicationId } });
    return { message: 'Publication unpublished successfully' };
  }
}
