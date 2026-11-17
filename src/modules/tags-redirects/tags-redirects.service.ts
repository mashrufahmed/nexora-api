import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../database/generated/prisma/client.js';
import { PrismaService } from '../../database/prisma.service.js';
import { AuditService } from '../audit/audit.service.js';
import { RedirectDto, TagDto } from './dto/tags-redirects.dto.js';
@Injectable()
export class TagsRedirectsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}
  private async access(uid: string, sid: string) {
    const a = await this.prisma.adminUser.findUnique({
      where: { id: uid },
      select: { roles: { select: { role: { select: { name: true } } } } },
    });
    if (a?.roles.some(({ role }) => role.name === 'Super Admin')) return;
    if (
      !(await this.prisma.userSiteAccess.findUnique({
        where: { userId_siteId: { userId: uid, siteId: sid } },
        select: { id: true },
      }))
    )
      throw new ForbiddenException('You do not have access to this site');
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
    if (count !== tagIds.length)
      throw new NotFoundException('Tag does not belong to this site');
    await this.prisma.$transaction(async (tx) => {
      await tx.siteContentTag.deleteMany({
        where: { siteContentId: contentId },
      });
      await tx.siteContentTag.createMany({
        data: tagIds.map((tagId) => ({ siteContentId: contentId, tagId })),
      });
    });
    return { assigned: tagIds.length };
  }
  async redirect(d: RedirectDto, uid: string) {
    await this.access(uid, d.siteId);
    if (!d.fromPath.startsWith('/') || !d.toPath.startsWith('/'))
      throw new ConflictException('Redirect paths must be internal paths');
    return this.prisma.redirect.create({
      data: {
        siteId: d.siteId,
        fromPath: d.fromPath,
        toPath: d.toPath,
        statusCode: d.statusCode,
      },
    });
  }
  async resolve(siteId: string, path: string) {
    return this.prisma.redirect.findFirst({
      where: { siteId, fromPath: path, status: 'ACTIVE' },
      select: { toPath: true, statusCode: true },
    });
  }
}
