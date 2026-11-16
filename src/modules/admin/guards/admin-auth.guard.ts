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

    request.admin = admin;

    return true;
  }
}
