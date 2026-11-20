import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

import type { FastifyRequest } from 'fastify';
import { PrismaService } from '../../../database/prisma.service.js';

@Injectable()
export class AdminAuthGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<FastifyRequest>();

    const adminId = request.session.adminId;

    if (!adminId) {
      throw new UnauthorizedException('Authentication required');
    }

    const admin = await this.prisma.adminUser.findUnique({
      where: {
        id: request.session.adminId,
      },
      select: {
        id: true,
        name: true,
        email: true,
        status: true,
        emailVerifiedAt: true,
        lastLoginAt: true,
        sessionVersion: true,
        roles: {
          select: {
            role: { select: { id: true, name: true } },
          },
        },
        siteAccess: {
          select: { siteId: true },
        },
      },
    });

    if (
      !admin ||
      admin.status !== 'ACTIVE' ||
      !admin.emailVerifiedAt ||
      admin.sessionVersion !== request.session.sessionVersion
    ) {
      try {
        await request.session.destroy();
      } catch {
        // Ignore cleanup failure.
      }
      throw new UnauthorizedException('Session expired. Please login again.');
    }

    const permissions = await this.prisma.rolePermission.findMany({
      where: {
        role: { admins: { some: { adminId: admin.id } } },
      },
      select: { permission: { select: { code: true } } },
    });

    request.admin = {
      ...admin,
      roles: admin.roles.map(({ role }) => role),
      permissions: [...new Set(permissions.map(({ permission }) => permission.code))],
      siteAccess: admin.siteAccess.map(({ siteId }) => siteId),
    };

    return true;
  }
}
