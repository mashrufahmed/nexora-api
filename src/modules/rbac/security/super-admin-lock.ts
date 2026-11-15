import { Prisma } from '../../../database/generated/prisma/client.js';

export async function lockSuperAdminProtection(
  tx: Prisma.TransactionClient,
): Promise<void> {
  await tx.$executeRaw`
    SELECT pg_advisory_xact_lock(741852963)
  `;
}
