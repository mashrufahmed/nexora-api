import { ForbiddenException } from '@nestjs/common';
import { SiteAccessService } from './site-access.service.js';

describe('SiteAccessService', () => {
  it('allows Super Admin without a UserSiteAccess row', async () => {
    const prisma = {
      adminUser: { findUnique: async () => ({ roles: [{ role: { name: 'Super Admin' } }] }) },
      userSiteAccess: { findUnique: async () => null },
    } as never;
    await expect(new SiteAccessService(prisma).assertSiteAccess('admin-1', 'site-2')).resolves.toBeUndefined();
  });

  it('rejects an administrator without access to the requested site', async () => {
    const prisma = {
      adminUser: { findUnique: async () => ({ roles: [{ role: { name: 'Editor' } }] }) },
      userSiteAccess: { findUnique: async () => null },
    } as never;
    await expect(new SiteAccessService(prisma).assertSiteAccess('admin-1', 'site-2')).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('returns an access filter for non-super administrators', async () => {
    const prisma = { adminUser: { findUnique: async () => ({ roles: [] }) } } as never;
    await expect(new SiteAccessService(prisma).accessibleSiteWhere('admin-1')).resolves.toEqual({ userAccess: { some: { userId: 'admin-1' } } });
  });
});