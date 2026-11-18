import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../database/generated/prisma/client.js';
import { PrismaService } from '../../database/prisma.service.js';
import { AuditService } from '../audit/audit.service.js';
import { CreateTemplateDto } from './dto/create-template.dto.js';
import { UpdateTemplateDto } from './dto/update-template.dto.js';

@Injectable()
export class PageBuilderService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}
  private json(value: Record<string, unknown>): Prisma.InputJsonValue {
    return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
  }
  private validate(config: Record<string, unknown>) {
    const root = config['content'];
    if (!Array.isArray(root))
      throw new BadRequestException('Page config must contain a content array');
    for (const block of root) {
      if (
        !block ||
        typeof block !== 'object' ||
        typeof (block as Record<string, unknown>)['type'] !== 'string'
      )
        throw new BadRequestException('Each page block must contain a type');
    }
  }
  private async access(adminId: string, siteId: string) {
    const admin = await this.prisma.adminUser.findUnique({
      where: { id: adminId },
      select: { roles: { select: { role: { select: { name: true } } } } },
    });
    if (admin?.roles.some(({ role }) => role.name === 'Super Admin')) return;
    const access = await this.prisma.userSiteAccess.findUnique({
      where: { userId_siteId: { userId: adminId, siteId } },
      select: { id: true },
    });
    if (!access)
      throw new ForbiddenException('You do not have access to this site');
  }
  async create(dto: CreateTemplateDto, adminId: string) {
    await this.access(adminId, dto.siteId);
    this.validate(dto.config);
    try {
      const template = await this.prisma.pageTemplate.create({
        data: {
          siteId: dto.siteId,
          name: dto.name.trim(),
          type: dto.type.trim(),
          revisions: {
            create: {
              revisionNumber: 1,
              config: this.json(dto.config),
              createdBy: adminId,
            },
          },
        },
        include: { revisions: true },
      });
      await this.audit.log({
        actorAdminId: adminId,
        action: 'page_template.created',
        entityType: 'page_template',
        entityId: template.id,
      });
      return template;
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      )
        throw new ConflictException(
          'Template name already exists for this site',
        );
      throw error;
    }
  }
  async list(siteId: string, adminId: string) {
    await this.access(adminId, siteId);
    return this.prisma.pageTemplate.findMany({
      where: { siteId },
      include: { revisions: { orderBy: { revisionNumber: 'desc' }, take: 1 } },
      orderBy: { updatedAt: 'desc' },
    });
  }
  async update(id: string, dto: UpdateTemplateDto, adminId: string) {
    const template = await this.prisma.pageTemplate.findUnique({
      where: { id },
      select: { siteId: true, id: true },
    });
    if (!template) throw new NotFoundException('Page template not found');
    await this.access(adminId, template.siteId);
    this.validate(dto.config);
    const latest = await this.prisma.pageTemplateRevision.findFirst({
      where: { pageTemplateId: id },
      orderBy: { revisionNumber: 'desc' },
      select: { revisionNumber: true },
    });
    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.pageTemplate.update({
        where: { id },
        data: {
          ...(dto.name !== undefined && { name: dto.name.trim() }),
          ...(dto.type !== undefined && { type: dto.type.trim() }),
          status: 'DRAFT',
        },
      });
      return tx.pageTemplateRevision.create({
        data: {
          pageTemplateId: id,
          revisionNumber: (latest?.revisionNumber ?? 0) + 1,
          config: this.json(dto.config),
          createdBy: adminId,
        },
      });
    });
    await this.audit.log({
      actorAdminId: adminId,
      action: 'page_template.revision_created',
      entityType: 'page_template',
      entityId: id,
    });
    return updated;
  }
  async publish(id: string, revisionId: string, adminId: string) {
    const template = await this.prisma.pageTemplate.findUnique({
      where: { id },
      select: { siteId: true },
    });
    if (!template) throw new NotFoundException('Page template not found');
    await this.access(adminId, template.siteId);
    const revision = await this.prisma.pageTemplateRevision.findFirst({
      where: { id: revisionId, pageTemplateId: id, publishedAt: null },
    });
    if (!revision) throw new NotFoundException('Draft revision not found');
    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.pageTemplateRevision.update({
        where: { id: revisionId },
        data: { publishedAt: new Date() },
      });
      return tx.pageTemplate.update({
        where: { id },
        data: { currentRevisionId: revisionId, status: 'PUBLISHED' },
      });
    });
    await this.audit.log({
      actorAdminId: adminId,
      action: 'page_template.published',
      entityType: 'page_template',
      entityId: id,
    });
    return updated;
  }
  async versions(id: string, adminId: string) {
    const template = await this.prisma.pageTemplate.findUnique({
      where: { id },
      select: { siteId: true },
    });
    if (!template) throw new NotFoundException('Page template not found');
    await this.access(adminId, template.siteId);
    return this.prisma.pageTemplateRevision.findMany({
      where: { pageTemplateId: id },
      orderBy: { revisionNumber: 'desc' },
    });
  }
  async preview(id: string, revisionId: string, adminId: string) {
    const template = await this.prisma.pageTemplate.findUnique({
      where: { id },
      select: { siteId: true },
    });
    if (!template) throw new NotFoundException('Page template not found');
    await this.access(adminId, template.siteId);
    const revision = await this.prisma.pageTemplateRevision.findFirst({
      where: { id: revisionId, pageTemplateId: id },
      select: {
        id: true,
        revisionNumber: true,
        config: true,
        publishedAt: true,
      },
    });
    if (!revision) throw new NotFoundException('Template revision not found');
    return { templateId: id, revision };
  }
  async restore(id: string, revisionId: string, adminId: string) {
    const template = await this.prisma.pageTemplate.findUnique({
      where: { id },
      select: { siteId: true },
    });
    if (!template) throw new NotFoundException('Page template not found');
    await this.access(adminId, template.siteId);
    const source = await this.prisma.pageTemplateRevision.findFirst({
      where: { id: revisionId, pageTemplateId: id },
      select: { config: true },
    });
    if (!source) throw new NotFoundException('Template revision not found');
    const latest = await this.prisma.pageTemplateRevision.findFirst({
      where: { pageTemplateId: id },
      orderBy: { revisionNumber: 'desc' },
      select: { revisionNumber: true },
    });
    const revision = await this.prisma.$transaction(async (tx) => {
      await tx.pageTemplate.update({
        where: { id },
        data: { status: 'DRAFT' },
      });
      return tx.pageTemplateRevision.create({
        data: {
          pageTemplateId: id,
          revisionNumber: (latest?.revisionNumber ?? 0) + 1,
          config: JSON.parse(
            JSON.stringify(source.config),
          ) as Prisma.InputJsonValue,
          createdBy: adminId,
        },
      });
    });
    await this.audit.log({
      actorAdminId: adminId,
      action: 'page_template.revision_restored',
      entityType: 'page_template',
      entityId: id,
      metadata: { sourceRevisionId: revisionId },
    });
    return revision;
  }
}
