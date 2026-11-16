import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service.js';
import { lockSuperAdminProtection } from '../security/super-admin-lock.js';
import { SuperAdminProtectionService } from '../security/super-admin-protection.service.js';

@Injectable()
export class AssignmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly superAdminProtection: SuperAdminProtectionService,
  ) {}

  // Assign permissions to a role
  async assignPermissions(roleId: string, permissionIds: string[]) {
    const uniqueIds = [...new Set(permissionIds)];

    return this.prisma.$transaction(async (tx) => {
      const role = await tx.role.findUnique({
        where: { id: roleId },
        select: { id: true },
      });

      if (!role) {
        throw new NotFoundException('Role not found');
      }

      const permissions = await tx.permission.findMany({
        where: { id: { in: uniqueIds } },
        select: { id: true },
      });

      if (permissions.length !== uniqueIds.length) {
        throw new BadRequestException('One or more permissions are invalid');
      }

      await tx.rolePermission.createMany({
        data: uniqueIds.map((permissionId) => ({
          roleId,
          permissionId,
        })),
        skipDuplicates: true,
      });

      return tx.role.findUnique({
        where: { id: roleId },
        include: {
          permissions: {
            include: { permission: true },
          },
        },
      });
    });
  }

  // Remove permission from role
  async removePermission(roleId: string, permissionId: string) {
    const assignment = await this.prisma.rolePermission.findFirst({
      where: { roleId, permissionId },
    });

    if (!assignment) {
      throw new NotFoundException('Role permission assignment not found');
    }

    await this.prisma.rolePermission.delete({
      where: { id: assignment.id },
    });

    return {
      message: 'Permission removed from role',
    };
  }

  // Assign roles to admin

  async assignRoles(adminId: string, roleIds: string[], actorId: string) {
    const uniqueIds = [...new Set(roleIds)];

    return this.prisma.$transaction(async (tx) => {
      const admin = await tx.adminUser.findUnique({
        where: { id: adminId },
        select: { id: true },
      });

      if (!admin) {
        throw new NotFoundException('Admin not found');
      }

      const roles = await tx.role.findMany({
        where: { id: { in: uniqueIds } },
        select: {
          id: true,
          name: true,
        },
      });

      if (roles.length !== uniqueIds.length) {
        throw new BadRequestException('One or more roles are invalid');
      }

      const assigningSuperAdmin = roles.some(
        (role) => role.name === 'Super Admin',
      );

      if (assigningSuperAdmin) {
        const actor = await tx.adminUser.findFirst({
          where: {
            id: actorId,
            status: 'ACTIVE',
            roles: {
              some: {
                role: {
                  name: 'Super Admin',
                },
              },
            },
          },
          select: { id: true },
        });

        if (!actor) {
          throw new ForbiddenException(
            'Only an active Super Admin can assign the Super Admin role',
          );
        }
      }

      await tx.adminRole.createMany({
        data: uniqueIds.map((roleId) => ({
          adminId,
          roleId,
        })),
        skipDuplicates: true,
      });

      return tx.adminUser.findUnique({
        where: { id: adminId },
        include: {
          roles: {
            include: { role: true },
          },
        },
      });
    });
  }

  // Remove role from admin

  async removeRole(adminId: string, roleId: string) {
    return this.prisma.$transaction(async (tx) => {
      // Serialize Super Admin protection operations
      await lockSuperAdminProtection(tx);

      const role = await tx.role.findUnique({
        where: { id: roleId },
        select: { name: true },
      });

      if (!role) {
        throw new NotFoundException('Role not found');
      }

      if (role.name === 'Super Admin') {
        await this.superAdminProtection.assertCanRemoveSuperAdmin(adminId, tx);
      }

      const assignment = await tx.adminRole.findUnique({
        where: {
          adminId_roleId: {
            adminId,
            roleId,
          },
        },
      });

      if (!assignment) {
        throw new NotFoundException('Admin role assignment not found');
      }

      await tx.adminRole.delete({
        where: { id: assignment.id },
      });

      return {
        message: 'Role removed from admin',
      };
    });
  }

  // Get admin's assigned roles and effective permissions
  async getAdminAccess(adminId: string) {
    const admin = await this.prisma.adminUser.findUnique({
      where: { id: adminId },
      select: {
        id: true,
        name: true,
        email: true,
        status: true,
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
                        id: true,
                        name: true,
                        code: true,
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

    const permissions = new Map<
      string,
      {
        id: string;
        name: string;
        code: string;
        module: string;
      }
    >();

    for (const assignment of admin.roles) {
      for (const relation of assignment.role.permissions) {
        permissions.set(relation.permission.code, relation.permission);
      }
    }

    return {
      admin: {
        id: admin.id,
        name: admin.name,
        email: admin.email,
        status: admin.status,
      },
      roles: admin.roles.map(({ role }) => ({
        id: role.id,
        name: role.name,
        isSystem: role.isSystem,
      })),
      permissions: [...permissions.values()],
      permissionCodes: [...permissions.keys()],
    };
  }
}
