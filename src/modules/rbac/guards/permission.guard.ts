import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from './../decorators/permissions.decorator.js';

import type { FastifyRequest } from 'fastify';
import { PrismaService } from '../../../database/prisma.service.js';

@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredPermissions?.length) {
      return true;
    }

    const request = context.switchToHttp().getRequest<FastifyRequest>();

    const adminId = request.session.adminId;

    if (!adminId) {
      throw new ForbiddenException('Permission denied');
    }

    const adminRoles = await this.prisma.adminRole.findMany({
      where: { adminId },
      select: {
        role: {
          select: {
            permissions: {
              select: {
                permission: {
                  select: {
                    code: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    const permissions = new Set(
      adminRoles.flatMap((assignment) =>
        assignment.role.permissions.map(({ permission }) => permission.code),
      ),
    );
    if (!requiredPermissions.every((code) => permissions.has(code))) {
      throw new ForbiddenException('Insufficient permissions');
    }
    const hasAllPermissions = requiredPermissions.every((permission) =>
      permissions.has(permission),
    );

    if (!hasAllPermissions) {
      throw new ForbiddenException(
        'You do not have permission to perform this action',
      );
    }

    return true;
  }
}
