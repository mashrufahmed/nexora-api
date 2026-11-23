import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../database/generated/prisma/client.js';
import { PrismaService } from '../../database/prisma.service.js';
import { AuditService } from '../audit/audit.service.js';
import { SiteAccessService } from '../site-access/site-access.service.js';
import { AssignAuthorsDto } from './dto/assign-author.dto.js';
import { CreateAuthorDto } from './dto/create-author.dto.js';
import { UpdateAuthorDto } from './dto/update-author.dto.js';
import { AuthorListQueryDto } from './dto/author-list-query.dto.js';

@Injectable()
export class AuthorsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly siteAccess: SiteAccessService,
  ) {}
  private json(
    value: Record<string, unknown> | undefined,
  ): Prisma.InputJsonValue | undefined {
    return value === undefined
      ? undefined
      : (JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue);
  }
  private access(adminId: string, siteId?: string) { return siteId ? this.siteAccess.assertSiteAccess(adminId, siteId) : Promise.resolve(); }
  async create(dto: CreateAuthorDto, adminId: string) {
    await this.access(adminId, dto.siteId);
    try {
      const author = await this.prisma.author.create({
        data: {
          siteId: dto.siteId,
          name: dto.name.trim(),
          slug: dto.slug.trim().toLowerCase(),
          avatarMediaId: dto.avatarMediaId,
          bio: dto.bio?.trim(),
          shortBio: dto.shortBio?.trim(),
          designation: dto.designation?.trim(),
          website: dto.website?.trim(),
          socialLinks: this.json(dto.socialLinks),
          email: dto.email?.trim().toLowerCase(),
        },
      });
      await this.audit.log({
        actorAdminId: adminId,
        action: 'author.created',
        entityType: 'author',
        entityId: author.id,
      });
      return author;
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      )
        throw new ConflictException('Author slug already exists for this site');
      throw error;
    }
  }
  async list(adminId: string, query: AuthorListQueryDto = new AuthorListQueryDto()) {
    await this.access(adminId, query.siteId);
    const where = query.siteId === undefined
      ? { site: await this.siteAccess.accessibleSiteWhere(adminId), ...(query.search && { OR: [{ name: { contains: query.search, mode: 'insensitive' as const } }, { slug: { contains: query.search, mode: 'insensitive' as const } }] }) }
      : { siteId: query.siteId, ...(query.search && { OR: [{ name: { contains: query.search, mode: 'insensitive' as const } }, { slug: { contains: query.search, mode: 'insensitive' as const } }] }) };
    const [items, total] = await Promise.all([
      this.prisma.author.findMany({ where, orderBy: { name: 'asc' }, skip: (query.page - 1) * query.limit, take: query.limit }),
      this.prisma.author.count({ where }),
    ]);
    return { items, page: query.page, limit: query.limit, total, totalPages: Math.ceil(total / query.limit) };
  }
  async update(id: string, dto: UpdateAuthorDto, adminId: string) {
    const current = await this.prisma.author.findUnique({
      where: { id },
      select: { siteId: true },
    });
    if (!current) throw new NotFoundException('Author not found');
    await this.access(adminId, dto.siteId ?? current.siteId ?? undefined);
    const author = await this.prisma.author.update({
      where: { id },
      data: {
        ...(dto.siteId !== undefined && { siteId: dto.siteId }),
        ...(dto.name !== undefined && { name: dto.name.trim() }),
        ...(dto.slug !== undefined && { slug: dto.slug.trim().toLowerCase() }),
        ...(dto.avatarMediaId !== undefined && {
          avatarMediaId: dto.avatarMediaId,
        }),
        ...(dto.bio !== undefined && { bio: dto.bio.trim() }),
        ...(dto.shortBio !== undefined && { shortBio: dto.shortBio.trim() }),
        ...(dto.designation !== undefined && {
          designation: dto.designation.trim(),
        }),
        ...(dto.website !== undefined && { website: dto.website.trim() }),
        ...(dto.socialLinks !== undefined && {
          socialLinks: this.json(dto.socialLinks),
        }),
        ...(dto.email !== undefined && {
          email: dto.email.trim().toLowerCase(),
        }),
      },
    });
    await this.audit.log({
      actorAdminId: adminId,
      action: 'author.updated',
      entityType: 'author',
      entityId: id,
    });
    return author;
  }
  async remove(id: string, adminId: string) {
    const author = await this.prisma.author.findUnique({
      where: { id },
      select: { siteId: true },
    });
    if (!author) throw new NotFoundException('Author not found');
    await this.access(adminId, author.siteId ?? undefined);
    const links = await this.prisma.contentAuthor.count({
      where: { authorId: id },
    });
    if (links) throw new ConflictException('Author is assigned to content');
    await this.prisma.author.delete({ where: { id } });
    await this.audit.log({
      actorAdminId: adminId,
      action: 'author.deleted',
      entityType: 'author',
      entityId: id,
    });
    return { message: 'Author deleted successfully' };
  }
  async assign(contentId: string, dto: AssignAuthorsDto, adminId: string) {
    const content = await this.prisma.content.findUnique({
      where: { id: contentId },
      select: { id: true },
    });
    if (!content) throw new NotFoundException('Content not found');
    const ids = dto.authors.map((item) => item.authorId);
    const authors = await this.prisma.author.count({
      where: { id: { in: ids }, status: 'ACTIVE' },
    });
    if (authors !== ids.length)
      throw new NotFoundException('One or more authors not found');
    const result = await this.prisma.$transaction(async (tx) => {
      await tx.contentAuthor.deleteMany({ where: { contentId } });
      return tx.contentAuthor.createMany({
        data: dto.authors.map((item) => ({
          contentId,
          authorId: item.authorId,
          position: item.position,
        })),
      });
    });
    await this.audit.log({
      actorAdminId: adminId,
      action: 'content.authors.updated',
      entityType: 'content',
      entityId: contentId,
    });
    return result;
  }
}
