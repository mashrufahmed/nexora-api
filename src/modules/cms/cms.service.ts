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
import { AUDIT_ACTIONS } from '../audit/audit.constants.js';
import { SiteAccessService } from '../site-access/site-access.service.js';
import {
  CreateCategoryDto,
  UpdateCategoryDto,
} from './dto/create-category.dto.js';
import { CreateContentDto } from './dto/create-content.dto.js';
import { PublishContentDto } from './dto/publish-content.dto.js';
import { UpdateContentDto } from './dto/update-content.dto.js';
import { ContentListQueryDto } from './dto/content-list-query.dto.js';

@Injectable()
export class CmsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly siteAccess: SiteAccessService,
  ) {}

  private jsonValue(
    value: unknown,
  ): Prisma.InputJsonValue | undefined {
    return value === undefined
      ? undefined
      : (JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue);
  }

  private assertSiteAccess(adminId: string, siteId: string) {
    return this.siteAccess.assertSiteAccess(adminId, siteId);
  }

  private validateSections(value: unknown, allowEmpty = true) {
    if (!Array.isArray(value)) throw new BadRequestException('Sections must be an array');
    if (!allowEmpty && value.length === 0) throw new BadRequestException('At least one section is required');
    if (value.length > 100 || Buffer.byteLength(JSON.stringify(value), 'utf8') > 500_000)
      throw new BadRequestException('Sections exceed the maximum count or JSON size');
    const ids = new Set<string>();
    const anchors = new Set<string>();
    const allowedNodes = new Set(['doc', 'paragraph', 'text', 'heading', 'bulletList', 'orderedList', 'listItem', 'blockquote', 'horizontalRule', 'codeBlock', 'hardBreak', 'image', 'table', 'tableRow', 'tableCell', 'tableHeader', 'specs', 'prosCons', 'callout', 'faq', 'productCard', 'affiliateButton']);
    const allowedMarks = new Set(['bold', 'italic', 'underline', 'strike', 'code', 'link']);
    const validateRich = (node: unknown): void => {
      if (!node || typeof node !== 'object' || Array.isArray(node)) throw new BadRequestException('Rich text nodes must be objects');
      const item = node as Record<string, unknown>;
      if (typeof item.type !== 'string' || !allowedNodes.has(item.type)) throw new BadRequestException(`Unsupported rich text node: ${String(item.type)}`);
      if (item.type === 'text' && typeof item.text !== 'string') throw new BadRequestException('Text nodes require text');
      if (Array.isArray(item.marks)) for (const mark of item.marks) {
        if (!mark || typeof mark !== 'object' || typeof (mark as Record<string, unknown>).type !== 'string' || !allowedMarks.has((mark as Record<string, unknown>).type as string)) throw new BadRequestException('Unsupported rich text mark');
        const attrs = (mark as Record<string, unknown>).attrs;
        if ((mark as Record<string, unknown>).type === 'link' && attrs && typeof attrs === 'object') this.validateUrl((attrs as Record<string, unknown>).href);
      }
      if (item.type === 'image' && item.attrs && typeof item.attrs === 'object') {
        const src = (item.attrs as Record<string, unknown>).src;
        if (src !== undefined) this.validateUrl(src);
      }
      if (item.type === 'video') this.validateUrl((item.attrs as Record<string, unknown> | undefined)?.url);
      if (Array.isArray(item.content)) for (const child of item.content) validateRich(child);
    };
    const walk = (section: unknown, depth: number) => {
      if (!section || typeof section !== 'object' || Array.isArray(section)) throw new BadRequestException('Each section must be an object');
      const item = section as Record<string, unknown>;
      if (depth > 2 || typeof item.id !== 'string' || !/^[0-9a-f-]{36}$/i.test(item.id)) throw new BadRequestException('Invalid section depth or id');
      if (ids.has(item.id)) throw new BadRequestException('Section ids must be unique'); ids.add(item.id);
      if (typeof item.heading !== 'string' || item.heading.length < 1 || item.heading.length > 150) throw new BadRequestException('Section heading is invalid');
      if (typeof item.anchor !== 'string' || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(item.anchor) || anchors.has(item.anchor)) throw new BadRequestException('Section anchors must be unique slugs');
      anchors.add(item.anchor);
      if (item.body !== undefined) validateRich(item.body);
      if (item.blocks !== undefined) {
        if (!Array.isArray(item.blocks)) throw new BadRequestException('Section blocks must be an array');
        for (const block of item.blocks) this.validateBlock(block);
      }
      if (item.children !== undefined) {
        if (!Array.isArray(item.children)) throw new BadRequestException('Section children must be an array');
        if (depth === 2 && item.children.length) throw new BadRequestException('Sections support only two levels');
        for (const child of item.children) walk(child, depth + 1);
      }
    };
    for (const section of value) walk(section, 1);
  }

  private validateUrl(value: unknown) {
    if (typeof value !== 'string') throw new BadRequestException('URL must be a string');
    if (/^(?:javascript|data|vbscript):/i.test(value)) throw new BadRequestException('Unsafe URL scheme');
    if (!/^(?:https?:|mailto:|\/)/i.test(value)) throw new BadRequestException('Only http, https, mailto, or relative URLs are allowed');
  }

  private validateBlock(value: unknown) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new BadRequestException('Block must be an object');
    const block = value as Record<string, unknown>;
    const type = block.type;
    if (typeof type !== 'string' || !['specs', 'prosCons', 'callout', 'faq', 'productCard', 'affiliateButton'].includes(type)) throw new BadRequestException('Unsupported block type');
    if (type === 'specs' && (!Array.isArray(block.rows) || block.rows.length > 100)) throw new BadRequestException('Invalid specifications block');
    if (type === 'prosCons' && ((!Array.isArray(block.pros) || block.pros.length > 20) || (!Array.isArray(block.cons) || block.cons.length > 20))) throw new BadRequestException('Invalid pros and cons block');
    if (type === 'callout' && !['info', 'warning', 'tip', 'success'].includes(String(block.variant))) throw new BadRequestException('Invalid callout variant');
    if (type === 'faq' && (!Array.isArray(block.items) || block.items.length > 30)) throw new BadRequestException('Invalid FAQ block');
    if (type === 'productCard' && typeof block.productId !== 'string') throw new BadRequestException('Product card requires productId');
    if (type === 'affiliateButton' && (typeof block.affiliateLinkId !== 'string' || typeof block.label !== 'string')) throw new BadRequestException('Affiliate button requires link id and label');
  }

  async createContent(dto: CreateContentDto, adminId: string) {
    if (dto.sections !== undefined) this.validateSections(dto.sections);
    try {
      const content = await this.prisma.content.create({
        data: {
          createdById: adminId,
          type: dto.type,
          title: dto.title.trim(),
          slug: dto.slug.trim().toLowerCase(),
          description: dto.description?.trim(),
          sections: this.jsonValue(dto.sections),
        },
      });
      await this.audit.log({
        actorAdminId: adminId,
        action: 'content.created',
        entityType: 'content',
        entityId: content.id,
      });
      return content;
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      )
        throw new ConflictException('Content slug already exists');
      throw error;
    }
  }

  private async assertContentAccess(id: string, adminId: string) {
    const content = await this.prisma.content.findUnique({
      where: { id },
      select: {
        createdById: true,
        status: true,
        siteContents: { select: { siteId: true } },
      },
    });
    if (!content) throw new NotFoundException('Content not found');
    for (const siteContent of content.siteContents) {
      await this.assertSiteAccess(adminId, siteContent.siteId);
    }
    return content;
  }

  async listContent(adminId: string, query: ContentListQueryDto = new ContentListQueryDto()) {
    const siteWhere = await this.siteAccess.accessibleSiteWhere(adminId);
    const where = {
      where: {
        deletedAt: null,
        ...(query.type && { type: query.type }),
        ...(query.status && { status: query.status }),
        AND: [
          ...(query.search ? [{ OR: [{ title: { contains: query.search, mode: 'insensitive' as const } }, { slug: { contains: query.search, mode: 'insensitive' as const } }] }] : []),
          { OR: [
            { siteContents: { none: {} } },
            { siteContents: { some: { site: siteWhere, ...(query.siteId && { siteId: query.siteId }) } } },
          ] },
        ],
      },
      include: { siteContents: true },
      orderBy: { createdAt: 'desc' as const },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    };
    const [items, total] = await Promise.all([this.prisma.content.findMany(where), this.prisma.content.count({ where: where.where })]);
    return { items, page: query.page, limit: query.limit, total, totalPages: Math.ceil(total / query.limit) };
  }

  async getContent(id: string, adminId: string) {
    await this.assertContentAccess(id, adminId);
    const content = await this.prisma.content.findUnique({
      where: { id },
      include: {
        authors: true,
        siteContents: { include: { categories: true } },
      },
    });
    if (!content) throw new NotFoundException('Content not found');
    return content;
  }

  async updateContent(
    id: string,
    dto: UpdateContentDto,
    adminId: string,
    permissions: string[] = [],
  ) {
    if (dto.sections !== undefined) this.validateSections(dto.sections);
    const content = await this.assertContentAccess(id, adminId);
    const canUpdateAny = permissions.includes('content.update.any');
    const isOwnDraft =
      content.createdById === adminId && content.status === 'DRAFT';

    if (!canUpdateAny && !isOwnDraft) {
      throw new ForbiddenException(
        'Authors can only update their own draft content',
      );
    }
    try {
      const current = await this.prisma.content.findUnique({ where: { id }, select: { title: true, description: true, sections: true } });
      const content = await this.prisma.content.update({
        where: { id },
        data: {
          ...(dto.title !== undefined && { title: dto.title.trim() }),
          ...(dto.slug !== undefined && {
            slug: dto.slug.trim().toLowerCase(),
          }),
          ...(dto.description !== undefined && { description: dto.description.trim() }),
          ...(dto.sections !== undefined && { sections: this.jsonValue(dto.sections) }),
        },
      });
      if (current && (current.title !== content.title || current.description !== content.description || JSON.stringify(current.sections) !== JSON.stringify(content.sections))) {
        const latest = await this.prisma.contentRevision.findFirst({ where: { contentId: id }, orderBy: { revisionNumber: 'desc' }, select: { revisionNumber: true } });
        await this.prisma.contentRevision.create({ data: { contentId: id, revisionNumber: (latest?.revisionNumber ?? 0) + 1, title: content.title, description: content.description, sections: content.sections === null ? Prisma.JsonNull : content.sections, createdById: adminId } });
        const revisions = await this.prisma.contentRevision.findMany({ where: { contentId: id }, orderBy: { revisionNumber: 'desc' }, skip: 50, select: { id: true } });
        if (revisions.length) await this.prisma.contentRevision.deleteMany({ where: { id: { in: revisions.map((revision) => revision.id) } } });
      }
      await this.audit.log({
        actorAdminId: adminId,
        action: 'content.updated',
        entityType: 'content',
        entityId: id,
      });
      return content;
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      )
        throw new NotFoundException('Content not found');
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      )
        throw new ConflictException('Content slug already exists');
      throw error;
    }
  }

  async deleteContent(id: string, adminId: string) {
    await this.assertContentAccess(id, adminId);
    const content = await this.prisma.content.findUnique({
      where: { id },
      select: { id: true, status: true },
    });
    if (!content) throw new NotFoundException('Content not found');
    const publications = await this.prisma.siteContent.count({
      where: { contentId: id, status: { in: ['PUBLISHED', 'SCHEDULED'] } },
    });
    if (publications)
      throw new BadRequestException(
        'Content must be unpublished and unscheduled before deletion',
      );
    await this.prisma.content.update({ where: { id }, data: { deletedAt: new Date() } });
    await this.audit.log({
      actorAdminId: adminId,
      action: 'content.deleted',
      entityType: 'content',
      entityId: id,
    });
    return { message: 'Content deleted successfully' };
  }

  async listRevisions(id: string, adminId: string) {
    await this.assertContentAccess(id, adminId);
    return this.prisma.contentRevision.findMany({ where: { contentId: id }, orderBy: { revisionNumber: 'desc' }, take: 50 });
  }

  async getRevision(id: string, revisionId: string, adminId: string) {
    await this.assertContentAccess(id, adminId);
    const revision = await this.prisma.contentRevision.findFirst({ where: { id: revisionId, contentId: id } });
    if (!revision) throw new NotFoundException('Revision not found');
    return revision;
  }

  async restoreRevision(id: string, revisionId: string, adminId: string) {
    const revision = await this.getRevision(id, revisionId, adminId);
    return this.updateContent(id, { title: revision.title, description: revision.description ?? undefined, sections: Array.isArray(revision.sections) ? revision.sections : [] }, adminId, ['content.update.any']);
  }

  async transition(
    id: string,
    status: 'IN_REVIEW' | 'DRAFT' | 'APPROVED',
    adminId: string,
    reviewNote?: string,
  ) {
    const content = await this.prisma.content.findUnique({
      where: { id },
      select: { id: true, status: true },
    });
    if (!content) throw new NotFoundException('Content not found');
    const allowed: Record<string, string[]> = {
      DRAFT: ['IN_REVIEW'],
      IN_REVIEW: ['DRAFT', 'APPROVED'],
      APPROVED: ['DRAFT'],
    };
    if (!allowed[content.status]?.includes(status))
      throw new BadRequestException(
        `Invalid content transition: ${content.status} -> ${status}`,
      );
    const updated = await this.prisma.content.update({
      where: { id },
      data: { status, ...(reviewNote !== undefined && { reviewNote: reviewNote.trim() }) },
    });
    await this.audit.log({
      actorAdminId: adminId,
      action: 'content.status_changed',
      entityType: 'content',
      entityId: id,
      metadata: { from: content.status, to: status },
    });
    return updated;
  }

  async createCategory(
    siteId: string,
    dto: CreateCategoryDto,
    adminId: string,
  ) {
    await this.assertSiteAccess(adminId, siteId);
    if (dto.parentId) {
      const parent = await this.prisma.category.findFirst({
        where: { id: dto.parentId, siteId },
        select: { id: true },
      });
      if (!parent)
        throw new BadRequestException(
          'Parent category does not belong to this site',
        );
    }
    try {
      const category = await this.prisma.category.create({
        data: {
          siteId,
          name: dto.name.trim(),
          slug: dto.slug.trim().toLowerCase(),
          parentId: dto.parentId,
        },
      });
      await this.audit.log({
        actorAdminId: adminId,
        action: AUDIT_ACTIONS.CATEGORY_CREATED,
        entityType: 'category',
        entityId: category.id,
      });
      return category;
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      )
        throw new ConflictException(
          'Category slug already exists for this site',
        );
      throw error;
    }
  }

  async listCategories(siteId: string, adminId: string) {
    await this.assertSiteAccess(adminId, siteId);
    return this.prisma.category.findMany({
      where: { siteId },
      include: { children: true },
      orderBy: [{ parentId: 'asc' }, { name: 'asc' }],
    });
  }

  async updateCategory(id: string, dto: UpdateCategoryDto, adminId: string) {
    const category = await this.prisma.category.findUnique({
      where: { id },
      select: { siteId: true },
    });
    if (!category) throw new NotFoundException('Category not found');
    await this.assertSiteAccess(adminId, category.siteId);
    if (dto.parentId) {
      const parent = await this.prisma.category.findFirst({
        where: { id: dto.parentId, siteId: category.siteId },
        select: { id: true },
      });
      if (!parent || dto.parentId === id)
        throw new BadRequestException(
          'Parent category must belong to the same site and cannot be itself',
        );
    }
    try {
      const result = await this.prisma.category.update({
        where: { id },
        data: {
          ...(dto.name !== undefined && { name: dto.name.trim() }),
          ...(dto.slug !== undefined && {
            slug: dto.slug.trim().toLowerCase(),
          }),
          ...(dto.parentId !== undefined && { parentId: dto.parentId }),
        },
      });
      await this.audit.log({
        actorAdminId: adminId,
        action: 'category.updated',
        entityType: 'category',
        entityId: id,
      });
      return result;
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      )
        throw new ConflictException(
          'Category slug already exists for this site',
        );
      throw error;
    }
  }

  async deleteCategory(id: string, adminId: string) {
    const category = await this.prisma.category.findUnique({
      where: { id },
      select: { siteId: true },
    });
    if (!category) throw new NotFoundException('Category not found');
    await this.assertSiteAccess(adminId, category.siteId);
    const [children, assignments] = await Promise.all([
      this.prisma.category.count({ where: { parentId: id } }),
      this.prisma.siteContentCategory.count({ where: { categoryId: id } }),
    ]);
    if (children || assignments)
      throw new ConflictException('Category is still in use');
    await this.prisma.category.delete({ where: { id } });
    await this.audit.log({
      actorAdminId: adminId,
      action: 'category.deleted',
      entityType: 'category',
      entityId: id,
    });
    return { message: 'Category deleted successfully' };
  }

  async publish(id: string, dto: PublishContentDto, adminId: string) {
    await this.assertSiteAccess(adminId, dto.siteId);
    const content = await this.prisma.content.findUnique({
      where: { id },
      select: { id: true, status: true, slug: true },
    });
    if (!content) throw new NotFoundException('Content not found');
    if (content.status !== 'APPROVED')
      throw new BadRequestException(
        'Only reviewable or scheduled content can be published',
      );
    const slug = dto.slug?.trim().toLowerCase() || content.slug;
    const categories = dto.categoryIds ?? [];
    const tags = dto.tagIds ?? [];
    const categoryCount = await this.prisma.category.count({
      where: { id: { in: categories }, siteId: dto.siteId },
    });
    if (categoryCount !== categories.length)
      throw new BadRequestException(
        'All categories must belong to the selected site',
      );
    const tagCount = await this.prisma.tag.count({
      where: { id: { in: tags }, siteId: dto.siteId },
    });
    if (tagCount !== new Set(tags).size)
      throw new BadRequestException(
        'All tags must belong to the selected site',
      );
    try {
      const siteContent = await this.prisma.$transaction(async (tx) => {
        const publication = await tx.siteContent.upsert({
          where: { siteId_contentId: { siteId: dto.siteId, contentId: id } },
          create: {
            siteId: dto.siteId,
            contentId: id,
            slug,
            titleOverride: dto.titleOverride?.trim(),
            excerptOverride: dto.descriptionOverride?.trim(),
            seoMetadata: this.jsonValue(dto.seo),
            status: 'PUBLISHED',
            publishedAt: new Date(),
            categories: {
              create: categories.map((categoryId) => ({ categoryId })),
            },
            tags: { create: tags.map((tagId) => ({ tagId })) },
          },
          update: {
            slug,
            titleOverride: dto.titleOverride?.trim(),
            excerptOverride: dto.descriptionOverride?.trim(),
            seoMetadata: this.jsonValue(dto.seo),
            status: 'PUBLISHED',
            publishedAt: new Date(),
            categories: {
              deleteMany: {},
              create: categories.map((categoryId) => ({ categoryId })),
            },
            tags: {
              deleteMany: {},
              create: tags.map((tagId) => ({ tagId })),
            },
          },
        });
        await tx.content.update({
          where: { id },
          data: { status: 'APPROVED' },
        });
        return publication;
      });
      await this.audit.log({
        actorAdminId: adminId,
        action: 'content.published',
        entityType: 'site_content',
        entityId: siteContent.id,
      });
      return siteContent;
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      )
        throw new ConflictException(
          'Content is already published or slug is already used on this site',
        );
      throw error;
    }
  }
}
