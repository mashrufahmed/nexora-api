import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service.js';
import { lockSuperAdminProtection } from '../../rbac/security/super-admin-lock.js';
import { SuperAdminProtectionService } from '../../rbac/security/super-admin-protection.service.js';
import { ActivateAdminDto } from './dto/activate-admin.dto.js';
import { AdminListQueryDto } from './dto/admin-list-query.dto.js';
import { UpdateAdminProfileDto } from './dto/update-admin-profile.dto.js';
import { UpdateAdminStatusDto } from './dto/update-admin-status.dto.js';

@Injectable()
export class AdminManagementService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly superAdminProtection: SuperAdminProtectionService,
  ) {}

  private readonly safeAdminSelect = {
    id: true,
    name: true,
    email: true,
    status: true,
    emailVerifiedAt: true,
    lastLoginAt: true,
    createdAt: true,
    updatedAt: true,
  } as const;

  // Admin list
  async findAll(query: AdminListQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;

    const search = query.search?.trim();

    const where = {
      ...(query.status && { status: query.status }),
      ...(search && {
        OR: [
          {
            name: {
              contains: search,
              mode: 'insensitive' as const,
            },
          },
          {
            email: {
              contains: search,
              mode: 'insensitive' as const,
            },
          },
        ],
      }),
    };

    const [data, total] = await Promise.all([
      this.prisma.adminUser.findMany({
        where,
        select: {
          ...this.safeAdminSelect,
          roles: {
            select: {
              role: {
                select: {
                  id: true,
                  name: true,
                  isSystem: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.adminUser.count({ where }),
    ]);

    return {
      data: data.map((admin) => ({
        ...admin,
        roles: admin.roles.map(({ role }) => role),
      })),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // Admin details
  async findOne(id: string) {
    const admin = await this.prisma.adminUser.findUnique({
      where: { id },
      select: {
        ...this.safeAdminSelect,
        roles: {
          select: {
            role: {
              select: {
                id: true,
                name: true,
                isSystem: true,
                permissions: {
                  select: {
                    permission: {
                      select: {
                        code: true,
                        name: true,
                        module: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!admin) {
      throw new NotFoundException('Admin not found');
    }

    const roles = admin.roles.map(({ role }) => ({
      id: role.id,
      name: role.name,
      isSystem: role.isSystem,
    }));

    const permissions = [
      ...new Map(
        admin.roles.flatMap(({ role }) =>
          role.permissions.map(({ permission }) => [
            permission.code,
            permission,
          ]),
        ),
      ).values(),
    ];

    return {
      ...admin,
      roles,
      permissions,
    };
  }

  // Update profile
  async updateProfile(id: string, dto: UpdateAdminProfileDto) {
    const admin = await this.prisma.adminUser.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!admin) {
      throw new NotFoundException('Admin not found');
    }

    return this.prisma.adminUser.update({
      where: { id },
      data: {
        name: dto.name.trim(),
      },
      select: this.safeAdminSelect,
    });
  }

  // Activate admin with role assignment
  async activate(id: string, dto: ActivateAdminDto) {
    const roleIds = [...new Set(dto.roleIds)];

    return this.prisma.$transaction(async (tx) => {
      await lockSuperAdminProtection(tx);
      const admin = await tx.adminUser.findUnique({
        where: { id },
        select: {
          id: true,
          status: true,
          emailVerifiedAt: true,
        },
      });

      if (!admin) {
        throw new NotFoundException('Admin not found');
      }

      if (!admin.emailVerifiedAt) {
        throw new BadRequestException(
          'Admin email must be verified before activation',
        );
      }

      const roles = await tx.role.findMany({
        where: { id: { in: roleIds } },
        select: { id: true },
      });

      if (roles.length !== roleIds.length) {
        throw new BadRequestException('One or more roles are invalid');
      }

      await tx.adminRole.createMany({
        data: roleIds.map((roleId) => ({
          adminId: id,
          roleId,
        })),
        skipDuplicates: true,
      });

      const updated = await tx.adminUser.update({
        where: { id },
        data: { status: 'ACTIVE' },
        select: this.safeAdminSelect,
      });

      return updated;
    });
  }

  // Deactivate or suspend admin
  async updateStatus(id: string, dto: UpdateAdminStatusDto, actorId: string) {
    if (dto.status === 'ACTIVE') {
      throw new BadRequestException(
        'Use activation endpoint to activate an admin',
      );
    }

    if (id === actorId) {
      throw new ForbiddenException('You cannot deactivate or suspend yourself');
    }

    return this.prisma.$transaction(async (tx) => {
      // 🔐 Super Admin protection lock
      await lockSuperAdminProtection(tx);

      // Check Super Admin protection inside transaction
      await this.superAdminProtection.assertCanRemoveSuperAdmin(id);

      const admin = await tx.adminUser.findUnique({
        where: { id },
        select: { id: true },
      });

      if (!admin) {
        throw new NotFoundException('Admin not found');
      }

      return tx.adminUser.update({
        where: { id },
        data: { status: dto.status },
        select: this.safeAdminSelect,
      });
    });
  }
  async revokeAdminSessions(adminId: string) {
    await this.prisma.adminUser.update({
      where: { id: adminId },
      data: {
        sessionVersion: {
          increment: 1,
        },
      },
    });
  }
}
