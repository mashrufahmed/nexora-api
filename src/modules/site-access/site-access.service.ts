import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service.js';

@Injectable()
export class SiteAccessService {
  constructor(private readonly prisma: PrismaService) {}

  async assertSiteAccess(adminId: string, siteId: string): Promise<void> {
    const admin = await this.prisma.adminUser.findUnique({
      where: { id: adminId },
      select: { roles: { select: { role: { select: { name: true } } } } },
    });

    if (admin?.roles.some(({ role }) => role.name === 'Super Admin')) return;

    const access = await this.prisma.userSiteAccess.findUnique({
      where: { userId_siteId: { userId: adminId, siteId } },
      select: { id: true },
    });

    if (!access) throw new ForbiddenException('You do not have access to this site');
  }

  async canAccessSite(adminId: string, siteId: string): Promise<boolean> {
    try {
      await this.assertSiteAccess(adminId, siteId);
      return true;
    } catch (error) {
      if (error instanceof ForbiddenException) return false;
      throw error;
    }
  }

  async accessibleSiteWhere(adminId: string) {
    const admin = await this.prisma.adminUser.findUnique({
      where: { id: adminId },
      select: { roles: { select: { role: { select: { name: true } } } } },
    });
    if (admin?.roles.some(({ role }) => role.name === 'Super Admin')) return undefined;
    return { userAccess: { some: { userId: adminId } } };
  }
}