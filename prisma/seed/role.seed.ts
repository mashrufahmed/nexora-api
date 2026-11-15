import { PrismaClient } from '../../src/database/generated/prisma/client.js';
import { SYSTEM_ROLES } from './roles.js';

export async function seedSystemRoles(prisma: PrismaClient) {
  for (const role of SYSTEM_ROLES) {
    await prisma.role.upsert({
      where: { name: role.name },
      update: {
        description: role.description,
        isSystem: true,
      },
      create: {
        name: role.name,
        description: role.description,
        isSystem: true,
      },
    });
  }

  console.log(`System roles seeded: ${SYSTEM_ROLES.length}`);
}
