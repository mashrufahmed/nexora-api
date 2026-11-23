import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../database/generated/prisma/client.js';
import { PrismaService } from '../../database/prisma.service.js';
import { AuditService } from '../audit/audit.service.js';
import { SiteAccessService } from '../site-access/site-access.service.js';
import {
  RedirectDto,
  TagDto,
  UpdateRedirectDto,
  UpdateTagDto,
} from './dto/tags-redirects.dto.js';

@Injectable()
export class TagsRedirectsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly siteAccess: SiteAccessService,
  ) {}
  private access(uid: string, sid: string) {
    return this.siteAccess.assertSiteAccess(uid, sid);
  }
  private async assertNoRedirectChain(
    siteId: string,
    fromPath: string,
    toPath: string,
    ignoreId?: string,
  ) {
    if (fromPath === toPath)
      throw new ConflictException('Redirect cannot point to itself');
    const visited = new Set<string>([fromPath]);
    let current = toPath;
    for (let depth = 0; depth < 20; depth += 1) {
      if (visited.has(current))
        throw new ConflictException('Redirect would create a loop');
      visited.add(current);
      const next = await this.prisma.redirect.findFirst({
        where: {
          siteId,
          fromPath: current,
          status: 'ACTIVE',
          ...(ignoreId ? { NOT: { id: ignoreId } } : {}),
        },
        select: { toPath: true },
      });
      if (!next) return;
      current = next.toPath;
    }
    throw new ConflictException('Redirect chain is too deep');
  }
  async tag(d: TagDto, uid: string) {
    await this.access(uid, d.siteId);
    try {
      const x = await this.prisma.tag.create({
        data: {
          siteId: d.siteId,
          name: d.name.trim(),
          slug: d.slug.trim().toLowerCase(),
        },
      });
      await this.audit.log({
        actorAdminId: uid,
        action: 'tag.created',
        entityType: 'tag',
        entityId: x.id,
      });
      return x;
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2002'
      )
        throw new ConflictException('Tag slug already exists');
      throw e;
    }
  }
  async listTags(siteId: string, uid: string) {
    await this.access(uid, siteId);
    return this.prisma.tag.findMany({
      where: { siteId },
      orderBy: { name: 'asc' },
    });
  }
  async updateTag(id: string, d: UpdateTagDto, uid: string) {
    const t = await this.prisma.tag.findUnique({
      where: { id },
      select: { siteId: true },
    });
    if (!t) throw new NotFoundException('Tag not found');
    await this.access(uid, t.siteId);
    try {
      return await this.prisma.tag
        .update({
          where: { id },
          data: {
            ...(d.name !== undefined && { name: d.name.trim() }),
            ...(d.slug !== undefined && { slug: d.slug.trim().toLowerCase() }),
          },
        })
        .then(async (result) => {
          await this.audit.log({
            actorAdminId: uid,
            action: 'tag.updated',
            entityType: 'tag',
            entityId: id,
          });
          return result;
        });
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2002'
      )
        throw new ConflictException('Tag slug already exists');
      throw e;
    }
  }
  async deleteTag(id: string, uid: string) {
    const t = await this.prisma.tag.findUnique({
      where: { id },
      select: { siteId: true },
    });
    if (!t) throw new NotFoundException('Tag not found');
    await this.access(uid, t.siteId);
    if (await this.prisma.siteContentTag.count({ where: { tagId: id } }))
      throw new ConflictException('Tag is still assigned to content');
    await this.prisma.tag.delete({ where: { id } });
    await this.audit.log({
      actorAdminId: uid,
      action: 'tag.deleted',
      entityType: 'tag',
      entityId: id,
    });
    return { message: 'Tag deleted successfully' };
  }
  async assign(contentId: string, tagIds: string[], uid: string) {
    const content = await this.prisma.siteContent.findUnique({
      where: { id: contentId },
      select: { siteId: true },
    });
    if (!content) throw new NotFoundException('Site content not found');
    await this.access(uid, content.siteId);
    const count = await this.prisma.tag.count({
      where: { id: { in: tagIds }, siteId: content.siteId },
    });
    if (count !== new Set(tagIds).size || count !== tagIds.length)
      throw new NotFoundException('Tag does not belong to this site');
    await this.prisma.$transaction(async (tx) => {
      await tx.siteContentTag.deleteMany({
        where: { siteContentId: contentId },
      });
      await tx.siteContentTag.createMany({
        data: tagIds.map((tagId) => ({ siteContentId: contentId, tagId })),
      });
    });
    await this.audit.log({
      actorAdminId: uid,
      action: 'content.tags_updated',
      entityType: 'site_content',
      entityId: contentId,
      metadata: { tagCount: tagIds.length },
    });
    return { assigned: tagIds.length };
  }
  async listRedirects(siteId: string, uid: string) {
    await this.access(uid, siteId);
    return this.prisma.redirect.findMany({
      where: { siteId },
      orderBy: { createdAt: 'desc' },
    });
  }
  async redirect(d: RedirectDto, uid: string) {
    await this.access(uid, d.siteId);
    if (!d.fromPath.startsWith('/') || !d.toPath.startsWith('/'))
      throw new ConflictException('Redirect paths must be internal paths');
    await this.assertNoRedirectChain(d.siteId, d.fromPath, d.toPath);
    try {
      const result = await this.prisma.redirect.create({
        data: {
          siteId: d.siteId,
          fromPath: d.fromPath,
          toPath: d.toPath,
          statusCode: d.statusCode,
        },
      });
      await this.audit.log({
        actorAdminId: uid,
        action: 'redirect.created',
        entityType: 'redirect',
        entityId: result.id,
      });
      return result;
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2002'
      )
        throw new ConflictException(
          'Redirect source path already exists for this site',
        );
      throw e;
    }
  }
  async updateRedirect(id: string, d: UpdateRedirectDto, uid: string) {
    const r = await this.prisma.redirect.findUnique({
      where: { id },
      select: { siteId: true },
    });
    if (!r) throw new NotFoundException('Redirect not found');
    await this.access(uid, r.siteId);
    if (
      (d.fromPath && !d.fromPath.startsWith('/')) ||
      (d.toPath && !d.toPath.startsWith('/'))
    )
      throw new ConflictException('Redirect paths must be internal paths');
    const fromPath =
      d.fromPath ??
      (
        await this.prisma.redirect.findUnique({
          where: { id },
          select: { fromPath: true },
        })
      )?.fromPath;
    const toPath =
      d.toPath ??
      (
        await this.prisma.redirect.findUnique({
          where: { id },
          select: { toPath: true },
        })
      )?.toPath;
    if (!fromPath || !toPath) throw new NotFoundException('Redirect not found');
    await this.assertNoRedirectChain(r.siteId, fromPath, toPath, id);
    const result = await this.prisma.redirect.update({
      where: { id },
      data: {
        ...(d.fromPath !== undefined && { fromPath: d.fromPath }),
        ...(d.toPath !== undefined && { toPath: d.toPath }),
        ...(d.statusCode !== undefined && { statusCode: d.statusCode }),
        ...(d.active !== undefined && {
          status: d.active ? 'ACTIVE' : 'INACTIVE',
        }),
      },
    });
    await this.audit.log({
      actorAdminId: uid,
      action: 'redirect.updated',
      entityType: 'redirect',
      entityId: id,
    });
    return result;
  }
  async deleteRedirect(id: string, uid: string) {
    const r = await this.prisma.redirect.findUnique({
      where: { id },
      select: { siteId: true },
    });
    if (!r) throw new NotFoundException('Redirect not found');
    await this.access(uid, r.siteId);
    await this.prisma.redirect.delete({ where: { id } });
    await this.audit.log({
      actorAdminId: uid,
      action: 'redirect.deleted',
      entityType: 'redirect',
      entityId: id,
    });
    return { message: 'Redirect deleted successfully' };
  }
  async resolve(siteId: string, path: string) {
    const visited = new Set<string>();
    let current = path;
    let statusCode = 301;
    for (let depth = 0; depth < 20; depth += 1) {
      if (visited.has(current))
        throw new ConflictException('Redirect resolution loop detected');
      visited.add(current);
      const redirect = await this.prisma.redirect.findFirst({
        where: { siteId, fromPath: current, status: 'ACTIVE' },
        select: { toPath: true, statusCode: true },
      });
      if (!redirect)
        return current === path ? null : { toPath: current, statusCode };
      statusCode = redirect.statusCode;
      current = redirect.toPath;
    }
    throw new ConflictException('Redirect chain is too deep');
  }
}
