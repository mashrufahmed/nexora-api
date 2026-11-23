import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { createHash, randomUUID } from 'node:crypto';
import { Prisma } from '../../database/generated/prisma/client.js';
import { PrismaService } from '../../database/prisma.service.js';
import { AuditService } from '../audit/audit.service.js';
import { SiteAccessService } from '../site-access/site-access.service.js';
import { AffiliateLinkDto, MerchantDto, UpdateMerchantDto } from './dto/affiliate.dto.js';
@Injectable()
export class AffiliateService {
  private readonly clickQueue: Queue;
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    @InjectQueue('affiliate-clicks') clickQueue: Queue,
    private readonly siteAccess: SiteAccessService,
  ) { this.clickQueue = clickQueue; }
  private access(adminId: string, siteId: string) { return this.siteAccess.assertSiteAccess(adminId, siteId); }
  private safeUrl(value: string, label: string) {
    let parsed: URL;
    try { parsed = new URL(value); } catch { throw new BadRequestException(`${label} must be a valid URL`); }
    if (!['http:', 'https:'].includes(parsed.protocol) || parsed.username || parsed.password) throw new BadRequestException(`${label} must be a public HTTP(S) URL`);
    const host = parsed.hostname.toLowerCase();
    if (host === 'localhost' || host === '::1' || /^(127\.|10\.|192\.168\.|169\.254\.)/.test(host) || /^172\.(1[6-9]|2\d|3[0-1])\./.test(host)) throw new BadRequestException(`${label} host is not allowed`);
    return parsed.toString();
  }
  async merchant(dto: MerchantDto, adminId: string) {
    try {
      const m = await this.prisma.merchant.create({
        data: {
          name: dto.name.trim(),
          slug: dto.slug.trim().toLowerCase(),
          website: dto.website,
        },
      });
      await this.audit.log({
        actorAdminId: adminId,
        action: 'merchant.created',
        entityType: 'merchant',
        entityId: m.id,
      });
      return m;
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2002'
      )
        throw new ConflictException('Merchant slug already exists');
      throw e;
    }
  }
  async listMerchants() { return this.prisma.merchant.findMany({ orderBy: { name: 'asc' } }); }
  async updateMerchant(id: string, dto: UpdateMerchantDto, adminId: string) {
    try { const merchant = await this.prisma.merchant.update({ where: { id }, data: { ...(dto.name !== undefined && { name: dto.name.trim() }), ...(dto.slug !== undefined && { slug: dto.slug.trim().toLowerCase() }), ...(dto.website !== undefined && { website: dto.website }), ...(dto.status !== undefined && { status: dto.status }) } }); await this.audit.log({ actorAdminId: adminId, action: 'merchant.updated', entityType: 'merchant', entityId: id }); return merchant; }
    catch (error) { if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') throw new NotFoundException('Merchant not found'); if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') throw new ConflictException('Merchant slug already exists'); throw error; }
  }
  async deleteMerchant(id: string, adminId: string) {
    try { await this.prisma.merchant.delete({ where: { id } }); } catch (error) { if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') throw new NotFoundException('Merchant not found'); if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') throw new ConflictException('Merchant cannot be deleted while affiliate links exist'); throw error; }
    await this.audit.log({ actorAdminId: adminId, action: 'merchant.deleted', entityType: 'merchant', entityId: id }); return { message: 'Merchant deleted successfully' };
  }
  async createLink(dto: AffiliateLinkDto, adminId: string) {
    await this.access(adminId, dto.siteId);
    const destinationUrl = this.safeUrl(dto.destinationUrl, 'Destination URL');
    const trackingUrl = dto.trackingUrl ? this.safeUrl(dto.trackingUrl, 'Tracking URL') : undefined;
    if (
      dto.siteProductId &&
      !(await this.prisma.siteProduct.findFirst({
        where: { id: dto.siteProductId, siteId: dto.siteId },
        select: { id: true },
      }))
    )
      throw new BadRequestException(
        'Site product does not belong to this site',
      );
    if (
      !(await this.prisma.merchant.findUnique({
        where: { id: dto.merchantId },
        select: { id: true },
      }))
    )
      throw new BadRequestException('Merchant not found');
    let tagId = dto.tagId;
    if (tagId) {
      const tag = await this.prisma.tag.findFirst({ where: { id: tagId, siteId: dto.siteId }, select: { id: true } });
      if (!tag) throw new BadRequestException('Tag does not belong to this site');
    } else {
      const site = await this.prisma.site.findUnique({ where: { id: dto.siteId }, select: { settings: true } });
      const settings = site?.settings && typeof site.settings === 'object' && !Array.isArray(site.settings) ? site.settings as Record<string, unknown> : {};
      const affiliate = settings.affiliate && typeof settings.affiliate === 'object' && !Array.isArray(settings.affiliate) ? settings.affiliate as Record<string, unknown> : {};
      const defaultTag = typeof affiliate.defaultTag === 'string' ? affiliate.defaultTag : undefined;
      if (defaultTag) tagId = (await this.prisma.tag.findFirst({ where: { siteId: dto.siteId, slug: defaultTag }, select: { id: true } }))?.id;
    }
    const link = await this.prisma.affiliateLink.create({
      data: {
        siteId: dto.siteId,
        siteProductId: dto.siteProductId,
        merchantId: dto.merchantId,
        destinationUrl,
        trackingUrl,
        tagId,
        status: dto.status,
      },
    });
    await this.audit.log({
      actorAdminId: adminId,
      action: 'affiliate_link.created',
      entityType: 'affiliate_link',
      entityId: link.id,
    });
    return link;
  }
  async list(siteId: string, adminId: string) {
    await this.access(adminId, siteId);
    return this.prisma.affiliateLink.findMany({
      where: { siteId },
      include: { merchant: true, siteProduct: true },
      orderBy: { createdAt: 'desc' },
    });
  }
  async updateLink(
    id: string,
    dto: Partial<AffiliateLinkDto>,
    adminId: string,
  ) {
    const current = await this.prisma.affiliateLink.findUnique({
      where: { id },
      select: { siteId: true },
    });
    if (!current) throw new NotFoundException('Affiliate link not found');
    await this.access(adminId, current.siteId);
    if (
      dto.siteProductId &&
      !(await this.prisma.siteProduct.findFirst({
        where: { id: dto.siteProductId, siteId: current.siteId },
        select: { id: true },
      }))
    )
      throw new BadRequestException(
        'Site product does not belong to this site',
      );
    if (dto.merchantId && !(await this.prisma.merchant.findUnique({ where: { id: dto.merchantId }, select: { id: true } }))) throw new BadRequestException('Merchant not found');
    if (dto.tagId && !(await this.prisma.tag.findFirst({ where: { id: dto.tagId, siteId: current.siteId }, select: { id: true } }))) throw new BadRequestException('Tag does not belong to this site');
    const link = await this.prisma.affiliateLink.update({
      where: { id },
      data: {
        ...(dto.siteProductId !== undefined && {
          siteProductId: dto.siteProductId,
        }),
        ...(dto.merchantId !== undefined && { merchantId: dto.merchantId }),
        ...(dto.tagId !== undefined && { tagId: dto.tagId }),
        ...(dto.destinationUrl !== undefined && {
          destinationUrl: this.safeUrl(dto.destinationUrl, 'Destination URL'),
        }),
        ...(dto.trackingUrl !== undefined && { trackingUrl: dto.trackingUrl ? this.safeUrl(dto.trackingUrl, 'Tracking URL') : null }),
        ...(dto.status !== undefined && { status: dto.status }),
      },
    });
    await this.audit.log({
      actorAdminId: adminId,
      action: 'affiliate_link.updated',
      entityType: 'affiliate_link',
      entityId: id,
    });
    return link;
  }
  async deleteLink(id: string, adminId: string) {
    const current = await this.prisma.affiliateLink.findUnique({
      where: { id },
      select: { siteId: true },
    });
    if (!current) throw new NotFoundException('Affiliate link not found');
    await this.access(adminId, current.siteId);
    await this.prisma.affiliateLink.delete({ where: { id } });
    await this.audit.log({
      actorAdminId: adminId,
      action: 'affiliate_link.deleted',
      entityType: 'affiliate_link',
      entityId: id,
    });
    return { message: 'Affiliate link deleted successfully' };
  }
  async redirect(id: string, referrer?: string, userAgent?: string) {
    const link = await this.prisma.affiliateLink.findFirst({
      where: { id, status: 'ACTIVE' },
      select: { id: true, siteId: true, destinationUrl: true },
    });
    if (!link) throw new NotFoundException('Affiliate link not found');
    const dedupeKey = randomUUID();
    await this.clickQueue.add(
      'record',
      {
        affiliateLinkId: link.id,
        siteId: link.siteId,
        referrer,
        userAgentHash: userAgent
          ? createHash('sha256').update(userAgent).digest('hex')
          : undefined,
        dedupeKey,
      },
      { jobId: `affiliate-click:${dedupeKey}`, removeOnComplete: true, removeOnFail: 1000, attempts: 3, backoff: { type: 'exponential', delay: 1000 } },
    );
    return { url: link.destinationUrl };
  }
  async recordClick(data: {
    affiliateLinkId: string;
    siteId: string;
    referrer?: string;
    userAgentHash?: string;
    dedupeKey?: string;
  }) {
    const dedupeKey = data.dedupeKey ?? randomUUID();
    return this.prisma.affiliateClick.upsert({ where: { dedupeKey }, create: { ...data, dedupeKey }, update: {} });
  }
}
