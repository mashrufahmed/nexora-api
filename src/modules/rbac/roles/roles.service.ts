import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { Prisma } from '../../../database/generated/prisma/client.js';
import { PrismaService } from '../../../database/prisma.service.js';
import { AuditContext } from '../../../types/index.js';
import { CreateRoleDto } from '../dto/create-role.dto.js';
import { UpdateRoleDto } from '../dto/update-role.dto.js';
import { SuperAdminProtectionService } from '../security/super-admin-protection.service.js';
import { AuditService } from '../../audit/audit.service.js';

@Injectable()
export class RolesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly superAdminProtection: SuperAdminProtectionService,
    private readonly auditService: AuditService,
  ) {}

  async create(dto: CreateRoleDto, audit: AuditContext) {
    const name = dto.name.trim();

    if (!name) {
      throw new BadRequestException('Role name is required');
    }

    try {
      const role = await this.prisma.role.create({
        data: {
          name: dto.name.trim(),
          description: dto.description?.trim() || null,
        },
      });

      await this.auditService.log({
        actorAdminId: audit.actorAdminId,
        action: 'role.created',
        entityType: 'role',
        entityId: role.id,
        metadata: {
          name: role.name,
        },
        ipAddress: audit.ipAddress,
        userAgent: audit.userAgent,
      });

      return role;
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('Role already exists');
      }

      throw error;
    }
  }

  async findAll(page = 1, limit = 10, search?: string) {
    page = Math.max(1, page);
    limit = Math.min(Math.max(1, limit), 100);

    const where = search
      ? {
          name: {
            contains: search.trim(),
            mode: 'insensitive' as const,
          },
        }
      : {};

    const [data, total] = await Promise.all([
      this.prisma.role.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: {
              admins: true,
              permissions: true,
            },
          },
        },
      }),
      this.prisma.role.count({ where }),
    ]);

    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const role = await this.prisma.role.findUnique({
      where: { id },
      include: {
        permissions: {
          include: {
            permission: true,
          },
        },
        admins: {
          include: {
            admin: {
              select: {
                id: true,
                name: true,
                email: true,
                status: true,
              },
            },
          },
        },
      },
    });

    if (!role) {
      throw new NotFoundException('Role not found');
    }

    return role;
  }

  async update(id: string, dto: UpdateRoleDto) {
    const role = await this.prisma.role.findUnique({
      where: { id },
    });

    if (!role) {
      throw new NotFoundException('Role not found');
    }

    if (role.isSystem) {
      throw new BadRequestException('System role cannot be modified');
    }

    if (role.name === 'Super Admin') {
      throw new BadRequestException('Super Admin role cannot be modified');
    }

    try {
      return await this.prisma.role.update({
        where: { id },
        data: {
          ...(dto.name !== undefined && {
            name: dto.name.trim(),
          }),
          ...(dto.description !== undefined && {
            description: dto.description?.trim() || null,
          }),
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('Role already exists');
      }

      throw error;
    }
  }

  async remove(id: string) {
    const role = await this.prisma.role.findUnique({
      where: { id },
    });

    if (!role) {
      throw new NotFoundException('Role not found');
    }

    if (role.isSystem) {
      throw new BadRequestException('System role cannot be deleted');
    }

    await this.superAdminProtection.assertCanDeleteSystemRole(id);

    await this.prisma.role.delete({
      where: { id },
    });

    return {
      message: 'Role deleted successfully',
    };
  }
}
