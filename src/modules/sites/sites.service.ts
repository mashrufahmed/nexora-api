import {
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

  private assertAccess(adminId: string, siteId: string) { return this.siteAccess.assertSiteAccess(adminId, siteId); }

  async create(dto: CreateSiteDto, adminId: string) {
    try {
      const site = await this.prisma.$transaction(async (tx) => {
        const created = await tx.site.create({
          data: {
            name: dto.name.trim(),
            slug: dto.slug.trim().toLowerCase(),
            settings: this.jsonValue(dto.settings),
            seoSettings: this.jsonValue(dto.seoSettings),
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
    try {
      const site = await this.prisma.site.update({
        where: { id },
        data: {
          ...(dto.name !== undefined && { name: dto.name.trim() }),
          ...(dto.slug !== undefined && {
            slug: dto.slug.trim().toLowerCase(),
          }),
          ...(dto.status !== undefined && { status: dto.status }),
          ...(dto.settings !== undefined && {
            settings: this.jsonValue(dto.settings),
          }),
          ...(dto.seoSettings !== undefined && {
            seoSettings: this.jsonValue(dto.seoSettings),
          }),
        },
      });
      await this.audit.log({
        actorAdminId: adminId,
        action: 'site.updated',
        entityType: 'site',
        entityId: id,
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

  async remove(id: string, adminId: string) {
    await this.assertAccess(adminId, id);
    const site = await this.prisma.site.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!site) throw new NotFoundException('Site not found');
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
