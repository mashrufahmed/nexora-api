import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import * as argon2 from 'argon2';
import { randomBytes } from 'node:crypto';
import { Prisma } from '../../database/generated/prisma/client.js';
import { PrismaService } from '../../database/prisma.service.js';
import { RedisService } from '../../redis/redis.service.js';
import { AuditService } from '../audit/audit.service.js';
import { SiteAccessService } from '../site-access/site-access.service.js';
import { CreateDomainDto } from './dto/create-domain.dto.js';
import { CreateSiteDto } from './dto/create-site.dto.js';
import { UpdateSiteDto } from './dto/update-site.dto.js';

@Injectable()
export class SitesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly redis: RedisService,
    private readonly siteAccess: SiteAccessService,
  ) {}

  private jsonValue(
    value: Record<string, unknown> | undefined,
  ): Prisma.InputJsonValue | undefined {
    return value === undefined
      ? undefined
      : (JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue);
  }

  private assertAccess(adminId: string, siteId: string) {
    return this.siteAccess.assertSiteAccess(adminId, siteId);
  }

  private validateSeo(value: Record<string, unknown> | undefined) {
    if (!value) return undefined;
    const allowed = new Set([
      'titleTemplate',
      'defaultDescription',
      'defaultOgMediaId',
      'noIndex',
    ]);
    for (const key of Object.keys(value))
      if (!allowed.has(key))
        throw new BadRequestException(`Unknown SEO setting: ${key}`);
    const titleTemplate = value.titleTemplate ?? '%s';
    if (
      typeof titleTemplate !== 'string' ||
      titleTemplate.length > 120 ||
      !titleTemplate.includes('%s')
    )
      throw new BadRequestException(
        'SEO titleTemplate must contain %s and be at most 120 characters',
      );
    if (
      value.defaultDescription !== undefined &&
      (typeof value.defaultDescription !== 'string' ||
        value.defaultDescription.length > 300)
    )
      throw new BadRequestException(
        'SEO defaultDescription must be at most 300 characters',
      );
    if (value.noIndex !== undefined && typeof value.noIndex !== 'boolean')
      throw new BadRequestException('SEO noIndex must be boolean');
    if (
      value.defaultOgMediaId !== undefined &&
      value.defaultOgMediaId !== null &&
      typeof value.defaultOgMediaId !== 'string'
    )
      throw new BadRequestException('SEO defaultOgMediaId must be a media id');
    return { ...value, titleTemplate };
  }

  private validateSettings(value: Record<string, unknown> | undefined) {
    if (!value) return undefined;
    const allowed = new Set([
      'language',
      'timeZone',
      'currency',
      'contactEmail',
      'supportEmail',
      'social',
      'footerText',
      'analyticsId',
      'affiliate',
    ]);
    for (const key of Object.keys(value))
      if (!allowed.has(key))
        throw new BadRequestException(`Unknown site setting: ${key}`);
    if (
      value.language !== undefined &&
      !['en', 'bn'].includes(String(value.language))
    )
      throw new BadRequestException('Unsupported language');
    if (value.timeZone !== undefined) {
      try {
        Intl.DateTimeFormat(undefined, { timeZone: String(value.timeZone) });
      } catch {
        throw new BadRequestException('Invalid timeZone');
      }
    }
    if (
      value.currency !== undefined &&
      !/^[A-Za-z]{3}$/.test(String(value.currency))
    )
      throw new BadRequestException('Currency must be a 3-letter ISO code');
    for (const key of ['contactEmail', 'supportEmail'])
      if (
        value[key] !== undefined &&
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value[key]))
      )
        throw new BadRequestException(`Invalid ${key}`);
    if (
      value.footerText !== undefined &&
      (typeof value.footerText !== 'string' || value.footerText.length > 200)
    )
      throw new BadRequestException(
        'footerText must be at most 200 characters',
      );
    if (
      value.analyticsId !== undefined &&
      !/^[A-Za-z0-9-]{3,30}$/.test(String(value.analyticsId))
    )
      throw new BadRequestException('Invalid analyticsId');
    if (
      value.affiliate !== undefined &&
      (!value.affiliate ||
        typeof value.affiliate !== 'object' ||
        !/^[A-Za-z0-9._-]{1,50}$/.test(
          String((value.affiliate as Record<string, unknown>).defaultTag ?? ''),
        ))
    )
      throw new BadRequestException('Invalid affiliate.defaultTag');
    if (
      value.social !== undefined &&
      (!value.social ||
        typeof value.social !== 'object' ||
        Object.values(value.social as Record<string, unknown>).some(
          (url) => typeof url !== 'string' || !url.startsWith('https://'),
        ))
    )
      throw new BadRequestException('Social URLs must use https');
    return value;
  }

  private async validateMediaReferences(
    siteId: string,
    branding: Pick<
      UpdateSiteDto,
      'logoMediaId' | 'darkLogoMediaId' | 'faviconMediaId'
    >,
    seo: Record<string, unknown> | undefined,
  ) {
    const ids = [
      branding.logoMediaId,
      branding.darkLogoMediaId,
      branding.faviconMediaId,
      typeof seo?.defaultOgMediaId === 'string' ? seo.defaultOgMediaId : null,
    ].filter((id): id is string => Boolean(id));
    if (!ids.length) return;
    const assets = await this.prisma.mediaAsset.findMany({
      where: {
        id: { in: ids },
        status: 'ACTIVE',
        OR: [{ siteId }, { siteId: null }],
      },
      select: { id: true, mimeType: true },
    });
    if (
      assets.length !== new Set(ids).size ||
      assets.some((asset) => !asset.mimeType.startsWith('image/'))
    )
      throw new BadRequestException(
        'Referenced media must be active accessible images',
      );
  }

  private async invalidateSiteCache(siteId: string) {
    const client = this.redis.getClient();
    const domains = await this.prisma.siteDomain.findMany({
      where: { siteId },
      select: { hostname: true },
    });
    if (domains.length)
      await client.del(
        ...domains.map(({ hostname }) => `hostname:${hostname}:site`),
      );
  }

  async create(dto: CreateSiteDto, adminId: string) {
    try {
      const site = await this.prisma.$transaction(async (tx) => {
        const created = await tx.site.create({
          data: {
            name: dto.name.trim(),
            slug: dto.slug.trim().toLowerCase(),
            settings: this.jsonValue(this.validateSettings(dto.settings)),
            seoSettings: this.jsonValue(this.validateSeo(dto.seoSettings)),
          },
        });
        await tx.userSiteAccess.create({
          data: { userId: adminId, siteId: created.id },
        });
        return created;
      });
      await this.audit.log({
        actorAdminId: adminId,
        action: 'site.created',
        entityType: 'site',
        entityId: site.id,
      });
      return site;
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('Site slug already exists');
      }
      throw error;
    }
  }

  async findAll(adminId: string) {
    const where = await this.siteAccess.accessibleSiteWhere(adminId);
    return this.prisma.site.findMany({
      where,
      include: { domains: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, adminId: string) {
    await this.assertAccess(adminId, id);
    const site = await this.prisma.site.findUnique({
      where: { id },
      include: { domains: true },
    });
    if (!site) throw new NotFoundException('Site not found');
    return site;
  }

  async update(id: string, dto: UpdateSiteDto, adminId: string) {
    await this.assertAccess(adminId, id);
    const settings = this.validateSettings(dto.settings);
    const seoSettings = this.validateSeo(dto.seoSettings);
    await this.validateMediaReferences(id, dto, seoSettings);
    try {
      const site = await this.prisma.site.update({
        where: { id },
        data: {
          ...(dto.name !== undefined && { name: dto.name.trim() }),
          ...(dto.status !== undefined && { status: dto.status }),
          ...(dto.settings !== undefined && {
            settings: this.jsonValue(settings),
          }),
          ...(dto.seoSettings !== undefined && {
            seoSettings: this.jsonValue(seoSettings),
          }),
          ...(dto.logoMediaId !== undefined && {
            logoMediaId: dto.logoMediaId,
          }),
          ...(dto.darkLogoMediaId !== undefined && {
            darkLogoMediaId: dto.darkLogoMediaId,
          }),
          ...(dto.faviconMediaId !== undefined && {
            faviconMediaId: dto.faviconMediaId,
          }),
        },
      });
      await this.audit.log({
        actorAdminId: adminId,
        action: 'site.updated',
        entityType: 'site',
        entityId: id,
      });
      await this.invalidateSiteCache(id);
      return site;
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('Site slug already exists');
      }
      throw error;
    }
  }

  async remove(id: string, adminId: string) {
    await this.assertAccess(adminId, id);
    const site = await this.prisma.site.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!site) throw new NotFoundException('Site not found');
    await this.invalidateSiteCache(id);
    await this.prisma.site.delete({ where: { id } });
    await this.audit.log({
      actorAdminId: adminId,
      action: 'site.deleted',
      entityType: 'site',
      entityId: id,
    });
    return { message: 'Site deleted successfully' };
  }

  async addDomain(siteId: string, dto: CreateDomainDto, adminId: string) {
    await this.assertAccess(adminId, siteId);
    const hostname = dto.hostname.trim().toLowerCase();
    try {
      const domain = await this.prisma.$transaction(async (tx) => {
        if (dto.isPrimary) {
          await tx.siteDomain.updateMany({
            where: { siteId },
            data: { isPrimary: false },
          });
        }
        return tx.siteDomain.create({
          data: { siteId, hostname, isPrimary: dto.isPrimary ?? false },
        });
      });
      await this.invalidateSiteCache(siteId);
      await this.audit.log({
        actorAdminId: adminId,
        action: 'site.domain.created',
        entityType: 'site_domain',
        entityId: domain.id,
      });
      return domain;
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('Hostname already belongs to a site');
      }
      throw error;
    }
  }

  async removeDomain(siteId: string, domainId: string, adminId: string) {
    await this.assertAccess(adminId, siteId);
    const domain = await this.prisma.siteDomain.findFirst({
      where: { id: domainId, siteId },
      select: { hostname: true, isPrimary: true },
    });
    if (!domain) throw new NotFoundException('Site domain not found');
    if (domain.isPrimary) {
      const replacement = await this.prisma.siteDomain.count({
        where: { siteId, id: { not: domainId } },
      });
      if (replacement > 0)
        throw new BadRequestException(
          'Set another domain as primary before removing this domain',
        );
    }
    await this.prisma.siteDomain.delete({ where: { id: domainId } });
    await this.invalidateSiteCache(siteId);
    await this.audit.log({
      actorAdminId: adminId,
      action: 'site.domain.deleted',
      entityType: 'site_domain',
      entityId: domainId,
    });
    return { message: 'Site domain removed successfully' };
  }

  async setPrimaryDomain(siteId: string, domainId: string, adminId: string) {
    await this.assertAccess(adminId, siteId);
    const domain = await this.prisma.siteDomain.findFirst({
      where: { id: domainId, siteId },
      select: { id: true },
    });
    if (!domain) throw new NotFoundException('Site domain not found');
    await this.prisma.$transaction(async (tx) => {
      await tx.siteDomain.updateMany({
        where: { siteId },
        data: { isPrimary: false },
      });
      await tx.siteDomain.update({
        where: { id: domainId },
        data: { isPrimary: true },
      });
    });
    await this.invalidateSiteCache(siteId);
    await this.audit.log({
      actorAdminId: adminId,
      action: 'site.domain.primary_changed',
      entityType: 'site_domain',
      entityId: domainId,
    });
    return this.prisma.siteDomain.findUnique({ where: { id: domainId } });
  }

  async createSecret(siteId: string, adminId: string) {
    await this.assertAccess(adminId, siteId);
    const secret = randomBytes(32).toString('base64url');
    const keyHash = await argon2.hash(secret, { type: argon2.argon2id });
    const created = await this.prisma.siteSecret.create({
      data: { siteId, keyHash },
    });
    await this.audit.log({
      actorAdminId: adminId,
      action: 'site.secret.created',
      entityType: 'site_secret',
      entityId: created.id,
    });
    return { id: created.id, secret, createdAt: created.createdAt };
  }

  async rotateSecret(siteId: string, adminId: string) {
    await this.assertAccess(adminId, siteId);
    const secret = randomBytes(32).toString('base64url');
    const keyHash = await argon2.hash(secret, { type: argon2.argon2id });
    const created = await this.prisma.$transaction(async (tx) => {
      await tx.siteSecret.updateMany({
        where: { siteId, status: 'ACTIVE' },
        data: { status: 'REVOKED', revokedAt: new Date() },
      });
      return tx.siteSecret.create({ data: { siteId, keyHash } });
    });
    await this.audit.log({
      actorAdminId: adminId,
      action: 'site.secret.rotated',
      entityType: 'site_secret',
      entityId: created.id,
    });
    return { id: created.id, secret, createdAt: created.createdAt };
  }

  async revokeSecret(siteId: string, secretId: string, adminId: string) {
    await this.assertAccess(adminId, siteId);
    const secret = await this.prisma.siteSecret.findFirst({
      where: { id: secretId, siteId, status: 'ACTIVE' },
    });
    if (!secret) throw new NotFoundException('Active site secret not found');
    await this.prisma.siteSecret.update({
      where: { id: secretId },
      data: { status: 'REVOKED', revokedAt: new Date() },
    });
    await this.audit.log({
      actorAdminId: adminId,
      action: 'site.secret.revoked',
      entityType: 'site_secret',
      entityId: secretId,
    });
    return { message: 'Site secret revoked successfully' };
  }

  async resolveHostname(hostname: string) {
    const normalizedHostname = hostname.trim().toLowerCase();
    const cacheKey = `hostname:${normalizedHostname}:site`;
    const client = this.redis.getClient();
    const cached = await client.get(cacheKey);
    if (cached)
      return JSON.parse(cached) as { id: string; slug: string; status: string };

    const site = await this.prisma.site.findFirst({
      where: {
        status: 'ACTIVE',
        domains: { some: { hostname: normalizedHostname } },
      },
      select: { id: true, slug: true, status: true },
    });
    if (!site) throw new NotFoundException('Site not found for hostname');
    await client.set(cacheKey, JSON.stringify(site), 'EX', 300);
    return site;
  }

  async authenticatePublicSite(hostname: string, siteKey: string) {
    const site = await this.resolveHostname(hostname);
    const secrets = await this.prisma.siteSecret.findMany({
      where: { siteId: site.id, status: 'ACTIVE' },
      select: { keyHash: true },
    });
    for (const secret of secrets) {
      if (await argon2.verify(secret.keyHash, siteKey)) return site;
    }
    throw new UnauthorizedException('Invalid site key');
  }
}
