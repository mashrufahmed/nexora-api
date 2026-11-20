import { ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermissionGuard } from './permission.guard.js';

describe('PermissionGuard', () => {
  function context(adminId?: string) {
    return {
      getHandler: () => ({}),
      getClass: () => ({}),
      switchToHttp: () => ({ getRequest: () => ({ session: { adminId } }) }),
    } as never;
  }

  it('allows a request when all required permissions are assigned', async () => {
    const reflector = {
      getAllAndOverride: () => ['content.read'],
    } as unknown as Reflector;
    const prisma = {
      adminRole: {
        findMany: async () => [
          { role: { permissions: [{ permission: { code: 'content.read' } }] } },
        ],
      },
    } as never;

    await expect(
      new PermissionGuard(reflector, prisma).canActivate(context('admin-1')),
    ).resolves.toBe(true);
  });

  it('rejects a request when a required permission is missing', async () => {
    const reflector = {
      getAllAndOverride: () => ['content.publish'],
    } as unknown as Reflector;
    const prisma = { adminRole: { findMany: async () => [] } } as never;

    await expect(
      new PermissionGuard(reflector, prisma).canActivate(context('admin-1')),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
