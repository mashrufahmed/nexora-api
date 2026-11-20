import { Prisma } from '../../../database/generated/prisma/client.js';

export async function lockSuperAdminProtection(
  tx: Prisma.TransactionClient,
): Promise<void> {
  await tx.$queryRaw`
    SELECT 1
    FROM (SELECT pg_advisory_xact_lock(741852963)) AS advisory_lock
  `;
}
