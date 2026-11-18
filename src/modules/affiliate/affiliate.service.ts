import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { createHash } from 'node:crypto';
import { Prisma } from '../../database/generated/prisma/client.js';
import { PrismaService } from '../../database/prisma.service.js';
import { AuditService } from '../audit/audit.service.js';
import { AffiliateLinkDto, MerchantDto } from './dto/affiliate.dto.js';
@Injectable()
export class AffiliateService {
  private readonly clickQueue: Queue;
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    @InjectQueue('affiliate-clicks') clickQueue: Queue,
  ) { this.clickQueue = clickQueue; }
  private async access(adminId: string, siteId: string) {
    const a = await this.prisma.adminUser.findUnique({
      where: { id: adminId },
      select: { roles: { select: { role: { select: { name: true } } } } },
    });
    if (a?.roles.some(({ role }) => role.name === 'Super Admin')) return;
    if (
      !(await this.prisma.userSiteAccess.findUnique({
        where: { userId_siteId: { userId: adminId, siteId } },
        select: { id: true },
      }))
    )
      throw new ForbiddenException('You do not have access to this site');
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
  async createLink(dto: AffiliateLinkDto, adminId: string) {
    await this.access(adminId, dto.siteId);
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
    const link = await this.prisma.affiliateLink.create({
      data: {
        siteId: dto.siteId,
        siteProductId: dto.siteProductId,
        merchantId: dto.merchantId,
        destinationUrl: dto.destinationUrl,
        trackingUrl: dto.trackingUrl,
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
    const link = await this.prisma.affiliateLink.update({
      where: { id },
      data: {
        ...(dto.siteProductId !== undefined && {
          siteProductId: dto.siteProductId,
        }),
        ...(dto.merchantId !== undefined && { merchantId: dto.merchantId }),
        ...(dto.destinationUrl !== undefined && {
          destinationUrl: dto.destinationUrl,
        }),
        ...(dto.trackingUrl !== undefined && { trackingUrl: dto.trackingUrl }),
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
    await this.clickQueue.add(
      'record',
      {
        affiliateLinkId: link.id,
        siteId: link.siteId,
        referrer,
        userAgentHash: userAgent
          ? createHash('sha256').update(userAgent).digest('hex')
          : undefined,
      },
      { removeOnComplete: true, removeOnFail: 1000 },
    );
    return { url: link.destinationUrl };
  }
  async recordClick(data: {
    affiliateLinkId: string;
    siteId: string;
    referrer?: string;
    userAgentHash?: string;
  }) {
    return this.prisma.affiliateClick.create({ data });
  }
}
