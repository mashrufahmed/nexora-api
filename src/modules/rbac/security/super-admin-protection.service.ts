import { ForbiddenException, Injectable } from '@nestjs/common';
import { Prisma } from '../../../database/generated/prisma/client.js';
import { PrismaService } from '../../../database/prisma.service.js';

@Injectable()
export class SuperAdminProtectionService {
  constructor(private readonly prisma: PrismaService) {}

  async assertCanRemoveSuperAdmin(
    adminId: string,
    tx: Prisma.TransactionClient,
  ): Promise<void> {
    const admin = await tx.adminUser.findUnique({
      where: { id: adminId },
      include: {
        roles: {
          include: {
            role: true,
          },
        },
      },
    });

    if (!admin) {
      return;
    }

    const isSuperAdmin = admin.roles.some(
      ({ role }) => role.name === 'Super Admin',
    );

    if (!isSuperAdmin || admin.status !== 'ACTIVE') {
      return;
    }

    const activeSuperAdmins = await tx.adminUser.count({
      where: {
        status: 'ACTIVE',
        roles: {
          some: {
            role: {
              name: 'Super Admin',
            },
          },
        },
      },
    });

    if (activeSuperAdmins <= 1) {
      throw new ForbiddenException('Cannot remove the last active Super Admin');
    }
  }

  async assertCanDeleteSystemRole(roleId: string): Promise<void> {
    const role = await this.prisma.role.findUnique({
      where: { id: roleId },
      select: {
        name: true,
        isSystem: true,
      },
    });

    if (role && (role.name === 'Super Admin' || role.isSystem)) {
      throw new ForbiddenException(
        'System roles and Super Admin role cannot be deleted',
      );
    }
  }
}
