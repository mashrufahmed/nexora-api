import { PrismaClient } from '../../src/database/generated/prisma/client.js';
import { PERMISSIONS } from './permissions.js';

export async function seedPermissions(prisma: PrismaClient) {
  for (const permission of PERMISSIONS) {
    await prisma.permission.upsert({
      where: { code: permission.code },
      update: {
        name: permission.name,
        module: permission.module,
      },
      create: {
        name: permission.name,
        code: permission.code,
        module: permission.module,
      },
    });
  }

  console.log(`Permissions seeded: ${PERMISSIONS.length}`);
}
