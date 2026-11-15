import { PrismaClient } from '../../src/database/generated/prisma/client.js';

export async function bootstrapAdmin(prisma: PrismaClient) {
  const email = process.env.BOOTSTRAP_ADMIN_EMAIL?.trim().toLowerCase();

  if (!email) {
    console.log('Bootstrap admin email not configured; skipped');
    return;
  }

  await prisma.$transaction(async (tx) => {
    // Never bootstrap over an existing admin-role assignment.
    const existingAssignments = await tx.adminRole.count();

    if (existingAssignments > 0) {
      console.log('Admin role assignments exist; bootstrap skipped');
      return;
    }

    const admin = await tx.adminUser.findUnique({
      where: { email },
      select: {
        id: true,
        status: true,
        emailVerifiedAt: true,
      },
    });

    if (!admin) {
      console.log('Bootstrap admin account not found; skipped');
      return;
    }

    if (admin.status !== 'ACTIVE' || !admin.emailVerifiedAt) {
      console.log('Bootstrap admin must be ACTIVE and email verified; skipped');
      return;
    }

    const role = await tx.role.findUnique({
      where: { name: 'Super Admin' },
      select: { id: true },
    });

    if (!role) {
      throw new Error('Super Admin role not found');
    }

    await tx.adminRole.create({
      data: {
        adminId: admin.id,
        roleId: role.id,
      },
    });

    console.log(`Super Admin role assigned to ${email}`);
  });
}
