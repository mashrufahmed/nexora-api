import { PrismaClient } from '../../src/database/generated/prisma/client.js';
import { SYSTEM_ROLES } from './roles.js';

export async function seedRolePermissions(prisma: PrismaClient) {
  const allPermissions = await prisma.permission.findMany({
    select: {
      id: true,
      code: true,
    },
  });

  const permissionMap = new Map(
    allPermissions.map((permission) => [permission.code, permission.id]),
  );

  for (const roleDefinition of SYSTEM_ROLES) {
    const role = await prisma.role.findUniqueOrThrow({
      where: { name: roleDefinition.name },
      select: { id: true },
    });

    const permissionCodes =
      roleDefinition.permissions === '*'
        ? allPermissions.map(({ code }) => code)
        : [...roleDefinition.permissions];

    const permissionIds = permissionCodes.map((code) => {
      const id = permissionMap.get(code);

      if (!id) {
        throw new Error(`Permission not found in seed: ${code}`);
      }

      return id;
    });

    await prisma.rolePermission.createMany({
      data: permissionIds.map((permissionId) => ({
        roleId: role.id,
        permissionId,
      })),
      skipDuplicates: true,
    });
  }

  console.log('System role permissions seeded');
}
