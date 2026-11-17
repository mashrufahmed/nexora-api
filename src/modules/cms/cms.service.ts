import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../../database/generated/prisma/client.js';
import { PrismaService } from '../../database/prisma.service.js';
import { AuditService } from '../audit/audit.service.js';
import { CreateCategoryDto } from './dto/create-category.dto.js';
import { CreateContentDto } from './dto/create-content.dto.js';
import { PublishContentDto } from './dto/publish-content.dto.js';
import { UpdateContentDto } from './dto/update-content.dto.js';

@Injectable()
export class CmsService {
  constructor(private readonly prisma: PrismaService, private readonly audit: AuditService) {}

  private jsonValue(value: Record<string, unknown> | undefined): Prisma.InputJsonValue | undefined {
    return value === undefined ? undefined : JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
  }

  private async assertSiteAccess(adminId: string, siteId: string) {
    const admin = await this.prisma.adminUser.findUnique({ where: { id: adminId }, select: { roles: { select: { role: { select: { name: true } } } } } });
    if (admin?.roles.some(({ role }) => role.name === 'Super Admin')) return;
    const access = await this.prisma.userSiteAccess.findUnique({ where: { userId_siteId: { userId: adminId, siteId } }, select: { id: true } });
    if (!access) throw new ForbiddenException('You do not have access to this site');
  }

  async createContent(dto: CreateContentDto, adminId: string) {
    try {
      const content = await this.prisma.content.create({ data: { type: dto.type, title: dto.title.trim(), slug: dto.slug.trim().toLowerCase(), excerpt: dto.excerpt?.trim(), body: this.jsonValue(dto.body) } });
      await this.audit.log({ actorAdminId: adminId, action: 'content.created', entityType: 'content', entityId: content.id });
      return content;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') throw new ConflictException('Content slug already exists');
      throw error;
    }
  }

  async listContent() {
    return this.prisma.content.findMany({ include: { siteContents: true }, orderBy: { createdAt: 'desc' } });
  }

  async getContent(id: string) {
    const content = await this.prisma.content.findUnique({ where: { id }, include: { authors: true, siteContents: { include: { categories: true } } } });
    if (!content) throw new NotFoundException('Content not found');
    return content;
  }

  async updateContent(id: string, dto: UpdateContentDto, adminId: string) {
    try {
      const content = await this.prisma.content.update({ where: { id }, data: { ...(dto.title !== undefined && { title: dto.title.trim() }), ...(dto.slug !== undefined && { slug: dto.slug.trim().toLowerCase() }), ...(dto.excerpt !== undefined && { excerpt: dto.excerpt.trim() }), ...(dto.body !== undefined && { body: this.jsonValue(dto.body) }) } });
      await this.audit.log({ actorAdminId: adminId, action: 'content.updated', entityType: 'content', entityId: id });
      return content;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') throw new NotFoundException('Content not found');
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') throw new ConflictException('Content slug already exists');
      throw error;
    }
  }

  async deleteContent(id: string, adminId: string) {
    const content = await this.prisma.content.findUnique({ where: { id }, select: { id: true, status: true } });
    if (!content) throw new NotFoundException('Content not found');
    if (content.status === 'PUBLISHED') throw new BadRequestException('Published content must be archived before deletion');
    await this.prisma.content.delete({ where: { id } });
    await this.audit.log({ actorAdminId: adminId, action: 'content.deleted', entityType: 'content', entityId: id });
    return { message: 'Content deleted successfully' };
  }

  async transition(id: string, status: 'IN_REVIEW' | 'DRAFT' | 'SCHEDULED' | 'PUBLISHED' | 'ARCHIVED', adminId: string) {
    const content = await this.prisma.content.findUnique({ where: { id }, select: { id: true, status: true } });
    if (!content) throw new NotFoundException('Content not found');
    const allowed: Record<string, string[]> = { DRAFT: ['IN_REVIEW'], IN_REVIEW: ['DRAFT', 'SCHEDULED', 'PUBLISHED'], SCHEDULED: ['PUBLISHED'], PUBLISHED: ['ARCHIVED'], ARCHIVED: ['DRAFT'] };
    if (!allowed[content.status]?.includes(status)) throw new BadRequestException(`Invalid content transition: ${content.status} -> ${status}`);
    const updated = await this.prisma.content.update({ where: { id }, data: { status } });
    await this.audit.log({ actorAdminId: adminId, action: 'content.status_changed', entityType: 'content', entityId: id, metadata: { from: content.status, to: status } });
    return updated;
  }

  async createCategory(siteId: string, dto: CreateCategoryDto, adminId: string) {
    await this.assertSiteAccess(adminId, siteId);
    if (dto.parentId) {
      const parent = await this.prisma.category.findFirst({ where: { id: dto.parentId, siteId }, select: { id: true } });
      if (!parent) throw new BadRequestException('Parent category does not belong to this site');
    }
    try {
      return await this.prisma.category.create({ data: { siteId, name: dto.name.trim(), slug: dto.slug.trim().toLowerCase(), parentId: dto.parentId } });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') throw new ConflictException('Category slug already exists for this site');
      throw error;
    }
  }

  async publish(id: string, dto: PublishContentDto, adminId: string) {
    await this.assertSiteAccess(adminId, dto.siteId);
    const content = await this.prisma.content.findUnique({ where: { id }, select: { id: true, status: true, slug: true } });
    if (!content) throw new NotFoundException('Content not found');
    if (!['IN_REVIEW', 'SCHEDULED'].includes(content.status)) throw new BadRequestException('Only reviewable or scheduled content can be published');
    const slug = dto.slug?.trim().toLowerCase() || content.slug;
    const categories = dto.categoryIds ?? [];
    const categoryCount = await this.prisma.category.count({ where: { id: { in: categories }, siteId: dto.siteId } });
    if (categoryCount !== categories.length) throw new BadRequestException('All categories must belong to the selected site');
    try {
      const siteContent = await this.prisma.$transaction(async (tx) => {
        const publication = await tx.siteContent.create({ data: { siteId: dto.siteId, contentId: id, slug, status: 'PUBLISHED', publishedAt: new Date(), categories: { create: categories.map((categoryId) => ({ categoryId })) } } });
        await tx.content.update({ where: { id }, data: { status: 'PUBLISHED' } });
        return publication;
      });
      await this.audit.log({ actorAdminId: adminId, action: 'content.published', entityType: 'site_content', entityId: siteContent.id });
      return siteContent;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') throw new ConflictException('Content is already published or slug is already used on this site');
      throw error;
    }
  }
}