import { PrismaPg } from '@prisma/adapter-pg';
import 'dotenv/config';
import { Pool } from 'pg';
import { PrismaClient } from '../src/database/generated/prisma/client.js';
import { bootstrapAdmin } from './seed/bootstrap-admin.seed.js';
import { seedPermissions } from './seed/permission.seed.js';
import { seedRolePermissions } from './seed/role-permission.seed.js';
import { seedSystemRoles } from './seed/role.seed.js';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  await seedPermissions(prisma);
  await seedSystemRoles(prisma);
  await seedRolePermissions(prisma);
  await bootstrapAdmin(prisma);

  console.log('Nexora RBAC bootstrap completed');
}

main()
  .catch((error: unknown) => {
    console.error('RBAC seed failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
