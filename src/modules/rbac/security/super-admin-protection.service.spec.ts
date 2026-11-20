import { ForbiddenException } from '@nestjs/common';
import { SuperAdminProtectionService } from './super-admin-protection.service.js';

describe('SuperAdminProtectionService', () => {
  it('rejects removing the last active Super Admin', async () => {
    const tx = {
      adminUser: {
        findUnique: async () => ({ status: 'ACTIVE', roles: [{ role: { name: 'Super Admin' } }] }),
        count: async () => 1,
      },
    } as never;
    await expect(new SuperAdminProtectionService({} as never).assertCanRemoveSuperAdmin('admin-1', tx)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('allows removing one of multiple active Super Admins', async () => {
    const tx = {
      adminUser: {
        findUnique: async () => ({ status: 'ACTIVE', roles: [{ role: { name: 'Super Admin' } }] }),
        count: async () => 2,
      },
    } as never;
    await expect(new SuperAdminProtectionService({} as never).assertCanRemoveSuperAdmin('admin-1', tx)).resolves.toBeUndefined();
  });
});